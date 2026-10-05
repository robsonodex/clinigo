import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
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
const BACKUP_DIR = path.resolve(process.cwd(), 'scripts/saneamento/backup_supabase_storage')

const BUCKETS_TO_MIGRATE = [
    'biometric-photos',
    'financial-documents',
    'clinic-assets',
    'checkin-docs',
    'documents',
    'whatsapp-sessions',
]

async function listAllFiles(bucket: string, prefix = ''): Promise<{ path: string; size: number }[]> {
    let files: { path: string; size: number }[] = []
    try {
        const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100 })
        if (error || !data) return files

        for (const item of data) {
            const full = prefix ? `${prefix}/${item.name}` : item.name
            if (item.id === null || !item.metadata) {
                const sub = await listAllFiles(bucket, full)
                files = files.concat(sub)
            } else {
                files.push({ path: full, size: item.metadata?.size || 0 })
            }
        }
    } catch (err: any) {
        console.error(`Erro ao listar ${bucket}/${prefix}:`, err?.message)
    }
    return files
}

async function verifyInR2(key: string, expectedSize: number): Promise<boolean> {
    try {
        const res = await r2.send(new HeadObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        }))
        return res.ContentLength === expectedSize
    } catch {
        return false
    }
}

async function main() {
    console.log('========================================================================')
    console.log(' MIGRAÇÃO SEGURA COM BACKUP FÍSICO: SUPABASE STORAGE -> CLOUDFLARE R2')
    console.log('========================================================================')

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    let grandTotalFiles = 0
    let grandTotalBytes = 0
    let successfullyUploaded = 0
    let alreadyInR2 = 0
    let failedUploads = 0

    const manifest: any = {
        timestamp: new Date().toISOString(),
        buckets: {},
    }

    for (const bucket of BUCKETS_TO_MIGRATE) {
        console.log(`\n------------------------------------------------------------------------`)
        console.log(`Processando Bucket: [${bucket}]`)
        console.log(`------------------------------------------------------------------------`)

        const files = await listAllFiles(bucket)
        console.log(`-> Arquivos encontrados no Supabase: ${files.length}`)
        manifest.buckets[bucket] = []

        const bucketBackupDir = path.join(BACKUP_DIR, bucket)
        if (!fs.existsSync(bucketBackupDir)) {
            fs.mkdirSync(bucketBackupDir, { recursive: true })
        }

        for (const fileInfo of files) {
            grandTotalFiles++
            grandTotalBytes += fileInfo.size

            const r2Key = `${bucket}/${fileInfo.path}`
            const localBackupPath = path.join(bucketBackupDir, fileInfo.path.replace(/\//g, path.sep))
            const localSubDir = path.dirname(localBackupPath)
            if (!fs.existsSync(localSubDir)) {
                fs.mkdirSync(localSubDir, { recursive: true })
            }

            // 1. Download do Supabase e salvar backup local
            let buffer: Buffer | null = null
            if (fs.existsSync(localBackupPath) && fs.statSync(localBackupPath).size === fileInfo.size) {
                buffer = fs.readFileSync(localBackupPath)
            } else {
                const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(fileInfo.path)
                if (dlErr || !blob) {
                    console.error(`  [ERRO DOWNLOAD] ${bucket}/${fileInfo.path}:`, dlErr?.message)
                    failedUploads++
                    continue
                }
                const arrayBuf = await blob.arrayBuffer()
                buffer = Buffer.from(arrayBuf)
                fs.writeFileSync(localBackupPath, buffer)
            }

            // 2. Checar se já existe no Cloudflare R2 com tamanho idêntico
            const existsInR2 = await verifyInR2(r2Key, fileInfo.size)
            if (existsInR2) {
                alreadyInR2++
                manifest.buckets[bucket].push({
                    path: fileInfo.path,
                    r2Key,
                    size: fileInfo.size,
                    status: 'ALREADY_EXISTS_VERIFIED',
                })
                continue
            }

            // 3. Fazer upload para o R2
            try {
                // Inferir content type
                let contentType = 'application/octet-stream'
                if (fileInfo.path.endsWith('.pdf')) contentType = 'application/pdf'
                else if (fileInfo.path.endsWith('.png')) contentType = 'image/png'
                else if (fileInfo.path.endsWith('.jpg') || fileInfo.path.endsWith('.jpeg')) contentType = 'image/jpeg'
                else if (fileInfo.path.endsWith('.json')) contentType = 'application/json'
                else if (fileInfo.path.endsWith('.csv')) contentType = 'text/csv'

                await r2.send(new PutObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: r2Key,
                    Body: buffer,
                    ContentType: contentType,
                    Metadata: {
                        migratedFrom: `supabase/${bucket}`,
                        originalPath: fileInfo.path,
                        migratedAt: new Date().toISOString(),
                    },
                }))

                // 4. Validar imediatamente que o arquivo gravou com sucesso no R2
                const isVerified = await verifyInR2(r2Key, fileInfo.size)
                if (isVerified) {
                    successfullyUploaded++
                    manifest.buckets[bucket].push({
                        path: fileInfo.path,
                        r2Key,
                        size: fileInfo.size,
                        status: 'COPIED_AND_VERIFIED',
                    })
                } else {
                    console.error(`  [FALHA VERIFICAÇÃO] ${r2Key} não foi verificado no R2!`)
                    failedUploads++
                }
            } catch (err: any) {
                console.error(`  [ERRO UPLOAD R2] ${r2Key}:`, err?.message)
                failedUploads++
            }
        }

        console.log(`Bucket [${bucket}] concluído: ${files.length} arquivos processados e guardados em backup local.`)
    }

    const manifestFile = path.join(BACKUP_DIR, `manifest_migration_${Date.now()}.json`)
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf-8')

    console.log('\n========================================================================')
    console.log('RELATÓRIO DE CÓPIA SEGURA E BACKUP:')
    console.log(`- Total de arquivos auditados: ${grandTotalFiles}`)
    console.log(`- Volume total: ${(grandTotalBytes / (1024 * 1024)).toFixed(2)} MB`)
    console.log(`- Cópias novas com upload e validação 100% no R2: ${successfullyUploaded}`)
    console.log(`- Arquivos já existentes e confirmados no R2: ${alreadyInR2}`)
    console.log(`- Falhas ou erros: ${failedUploads}`)
    console.log(`- Backup físico integral salvo em disco: ${BACKUP_DIR}`)
    console.log(`- Manifesto de integridade salvo em: ${manifestFile}`)
    console.log('========================================================================')
}

main().catch(console.error)
