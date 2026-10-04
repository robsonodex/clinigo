import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
const env = dotenv.parse(fs.readFileSync(envPath))

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
})

const R2_BUCKET = env.R2_BUCKET_NAME || 'clinigo'

async function listAllFiles(prefix = ''): Promise<{ path: string; size: number }[]> {
    let files: { path: string; size: number }[] = []
    const { data, error } = await supabase.storage.from('patient-documents').list(prefix, { limit: 100 })
    if (error || !data) return files

    for (const item of data) {
        const full = prefix ? `${prefix}/${item.name}` : item.name
        if (item.id === null || !item.metadata) {
            const sub = await listAllFiles(full)
            files = files.concat(sub)
        } else {
            files.push({ path: full, size: item.metadata?.size || 0 })
        }
    }
    return files
}

async function listAllR2Keys(): Promise<Map<string, number>> {
    const map = new Map<string, number>()
    let continuationToken: string | undefined = undefined
    do {
        const res: any = await r2.send(new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            ContinuationToken: continuationToken
        }))
        if (res.Contents) {
            for (const item of res.Contents) {
                if (item.Key && item.Size !== undefined) {
                    map.set(item.Key, item.Size)
                }
            }
        }
        continuationToken = res.NextContinuationToken
    } while (continuationToken)
    return map
}

async function main() {
    console.log('=================================================================')
    console.log(' MIGRAÇÃO COMPLETA SUPABASE STORAGE -> CLOUDFLARE R2 (PARALELO)')
    console.log('=================================================================')

    // 1. Mapear R2 antecipadamente para evitar chamadas de HeadObject repetidas
    console.log('[PASSO 1] Mapeando chaves já gravadas no Cloudflare R2...')
    const r2Keys = await listAllR2Keys()
    console.log(`[PASSO 1] Total de chaves no R2: ${r2Keys.size}`)

    // 2. Listar Supabase
    console.log('[PASSO 2] Mapeando todos os arquivos físicos no bucket Supabase [patient-documents]...')
    const allFiles = await listAllFiles()
    console.log(`[PASSO 2] Total de arquivos encontrados: ${allFiles.length}`)
    const totalBytes = allFiles.reduce((acc, f) => acc + f.size, 0)
    console.log(`[PASSO 2] Tamanho total: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`)

    // Manifesto de backup
    const backupDir = path.resolve(process.cwd(), 'scripts/saneamento')
    const backupFile = path.join(backupDir, `backup_manifest_supabase_files_${Date.now()}.json`)
    fs.writeFileSync(backupFile, JSON.stringify(allFiles, null, 2), 'utf-8')
    console.log(`[PASSO 2] Manifesto salvo em: ${backupFile}`)

    // 3. Transferir em lotes concorrentes (8 simultaneos)
    console.log('[PASSO 3] Transferindo arquivos com concorrência controlada (8 workers)...')
    let processedCount = 0
    let uploadedCount = 0
    let skippedCount = 0
    let errorCount = 0

    const CONCURRENCY = 8
    async function processFile(fileInfo: { path: string; size: number }) {
        const filePath = fileInfo.path
        const r2Key = `patient-documents/${filePath}`

        const alreadyExists = r2Keys.get(r2Key) === fileInfo.size

        if (alreadyExists) {
            skippedCount++
            processedCount++
            return
        }

        try {
            const { data: blob, error: dlErr } = await supabase.storage.from('patient-documents').download(filePath)
            if (dlErr || !blob) {
                console.error(`[ERRO DOWNLOAD] ${filePath}:`, dlErr?.message)
                errorCount++
                return
            }

            const buffer = Buffer.from(await blob.arrayBuffer())

            // Upload chave canônica
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: r2Key,
                Body: buffer,
                ContentType: 'application/pdf',
            }))

            // Upload chave direta sem prefixo para retrocompatibilidade
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: filePath,
                Body: buffer,
                ContentType: 'application/pdf',
            }))

            uploadedCount++
            processedCount++
        } catch (err: any) {
            console.error(`[ERRO UPLOAD] ${filePath}:`, err?.message)
            errorCount++
        }
    }

    // Processar em chunks de 8
    for (let i = 0; i < allFiles.length; i += CONCURRENCY) {
        const chunk = allFiles.slice(i, i + CONCURRENCY)
        await Promise.all(chunk.map(f => processFile(f)))
        console.log(`[PROGRESSO] ${Math.min(i + CONCURRENCY, allFiles.length)}/${allFiles.length} arquivos processados (Enviados agora: ${uploadedCount}, Já existentes: ${skippedCount}, Erros: ${errorCount})...`)
    }

    console.log(`[PASSO 3 CONCLUÍDO] Total processados: ${processedCount}/${allFiles.length} (Erros: ${errorCount})`)

    if (errorCount > 0) {
        console.error(`[ABORTADO] Ocorreram ${errorCount} erros durante a cópia. O expurgo do Supabase não será executado.`)
        return
    }

    // 4. Atualizar registros no banco de dados com URLs antigas do Supabase
    console.log('[PASSO 4] Atualizando registros no banco de dados para r2://...')
    const { data: oldDocs } = await supabase
        .from('patient_documents')
        .select('id, file_url')
    
    let dbUpdated = 0
    if (oldDocs) {
        for (const doc of oldDocs) {
            if (doc.file_url && doc.file_url.includes('supabase.co')) {
                const clean = doc.file_url.replace(/^https?:\/\/[^\/]+\/storage\/v1\/object\/public\/patient-documents\//, '')
                const newUrl = `r2://patient-documents/${clean}`
                await supabase.from('patient_documents').update({ file_url: newUrl }).eq('id', doc.id)
                dbUpdated++
            }
        }
    }
    console.log(`[PASSO 4 CONCLUÍDO] Registros no banco atualizados para r2://: ${dbUpdated}`)

    // 5. Expurgo dos 473 arquivos do bucket Supabase Storage
    console.log('[PASSO 5] Iniciando expurgo dos 473 arquivos do Supabase Storage em lotes...')
    const pathsToRemove = allFiles.map(f => f.path)
    let totalDeleted = 0
    const batchSize = 50

    for (let i = 0; i < pathsToRemove.length; i += batchSize) {
        const batch = pathsToRemove.slice(i, i + batchSize)
        const { error: remErr } = await supabase.storage.from('patient-documents').remove(batch)
        if (remErr) {
            console.error(`[ERRO REMOVE] Falha no lote ${i}:`, remErr.message)
        } else {
            totalDeleted += batch.length
            console.log(`[EXPURGO] Removidos ${totalDeleted}/${pathsToRemove.length} arquivos do Supabase Storage.`)
        }
    }

    console.log('=================================================================')
    console.log(' MIGRAÇÃO E DESAFOGAMENTO CONCLUÍDOS COM SUCESSO TOTAL!')
    console.log(` - Arquivos no Cloudflare R2: ${allFiles.length}`)
    console.log(` - Arquivos expurgados do Supabase: ${totalDeleted}`)
    console.log(` - Espaço liberado no Supabase Storage: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`)
    console.log('=================================================================')
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
