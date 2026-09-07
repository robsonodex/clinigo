/**
 * SCRIPT DE MIGRACAO SEGURA: Supabase Storage -> Cloudflare R2
 *
 * MODO DE SEGURANCA RIGIDO (ZERO PERDA DE DADOS):
 * 1. Processamento em lotes (25 arquivos por lote).
 * 2. Retomavel (Resumable): se interrompido, retoma exatamente de onde parou.
 * 3. Validação criptográfica rigorosa: hash SHA-256 de origem == hash SHA-256 de destino.
 * 4. Manifesto de auditoria persistido em disco (JSON e CSV) em scripts/manifests/.
 * 5. Se o hash falhar, o arquivo e marcado como 'pendente'/'falha' e o banco NAO e alterado.
 * 6. Atualização do banco de dados (file_url = r2://...) apenas com 100% de sucesso no hash.
 * 7. REGRA ABSOLUTA: NENHUM dado ou arquivo original e deletado do Supabase Storage.
 *
 * Uso:
 *   npx tsx scripts/migrate-storage-to-r2.ts --dry-run
 *   npx tsx scripts/migrate-storage-to-r2.ts --execute
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Carregar variaveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'clinigo'
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)

const BATCH_SIZE = 25
const MANIFESTS_DIR = path.resolve(process.cwd(), 'scripts', 'manifests')
const TODAY_STR = new Date().toISOString().split('T')[0]
const MANIFEST_JSON_PATH = path.join(MANIFESTS_DIR, `manifest_migracao_r2_${TODAY_STR}.json`)
const MANIFEST_CSV_PATH = path.join(MANIFESTS_DIR, `manifest_migracao_r2_${TODAY_STR}.csv`)

export interface ManifestItem {
    id: string
    file_name: string
    original_path: string
    r2_key: string
    size_bytes: number
    source_sha256: string | null
    target_sha256: string | null
    status: 'sucesso' | 'falha' | 'pendente'
    error_message: string | null
    timestamp: string
}

function calculateSha256(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

function loadExistingManifest(): Map<string, ManifestItem> {
    const map = new Map<string, ManifestItem>()
    if (fs.existsSync(MANIFEST_JSON_PATH)) {
        try {
            const raw = fs.readFileSync(MANIFEST_JSON_PATH, 'utf-8')
            const items: ManifestItem[] = JSON.parse(raw)
            for (const item of items) {
                map.set(item.id, item)
            }
            console.log(`Manifesto anterior carregado com ${map.size} registros salvos.`)
        } catch (e) {
            console.warn('Nao foi possivel ler manifesto anterior, criando novo.', e)
        }
    }
    return map
}

function saveManifest(map: Map<string, ManifestItem>) {
    if (!fs.existsSync(MANIFESTS_DIR)) {
        fs.mkdirSync(MANIFESTS_DIR, { recursive: true })
    }

    const items = Array.from(map.values())
    fs.writeFileSync(MANIFEST_JSON_PATH, JSON.stringify(items, null, 2), 'utf-8')

    // Gerar CSV correspondente
    const headers = 'id,file_name,size_bytes,status,source_sha256,target_sha256,original_path,r2_key,timestamp,error_message\n'
    const rows = items.map(item => {
        const safeName = `"${(item.file_name || '').replace(/"/g, '""')}"`
        const safeErr = item.error_message ? `"${item.error_message.replace(/"/g, '""')}"` : '""'
        return `${item.id},${safeName},${item.size_bytes},${item.status},${item.source_sha256 || ''},${item.target_sha256 || ''},"${item.original_path}","${item.r2_key}",${item.timestamp},${safeErr}`
    }).join('\n')

    fs.writeFileSync(MANIFEST_CSV_PATH, headers + rows, 'utf-8')
}

async function main() {
    const args = process.argv.slice(2)
    const isExecute = args.includes('--execute')
    const isDryRun = !isExecute || args.includes('--dry-run')

    console.log('=============================================================================')
    console.log('CLINIGO - MIGRACAO SEGURA DE STORAGE: SUPABASE -> CLOUDFLARE R2')
    console.log('=============================================================================')
    console.log(`MODO: ${isDryRun ? 'DRY-RUN (Simulacao de Auditoria)' : 'EXECUCAO REAL COM AUDITORIA (--execute)'}`)
    console.log(`TAMANHO DO LOTE: ${BATCH_SIZE} arquivos por lote`)
    console.log(`BUCKET DE DESTINO: ${R2_BUCKET_NAME}`)
    console.log(`DATA/HORA: ${new Date().toISOString()}`)
    console.log('-----------------------------------------------------------------------------')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('ERRO FATAL: Variaveis do Supabase nao configuradas.')
        process.exit(1)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    if (isExecute) {
        if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
            console.error('ERRO FATAL: Credenciais do Cloudflare R2 nao configuradas nas variaveis de ambiente.')
            console.error('Necessario: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME')
            process.exit(1)
        }
    }

    let r2Client: S3Client | null = null
    if (isExecute && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT) {
        r2Client = new S3Client({
            region: 'auto',
            endpoint: R2_ENDPOINT,
            credentials: {
                accessKeyId: R2_ACCESS_KEY_ID,
                secretAccessKey: R2_SECRET_ACCESS_KEY,
            },
        })
    }

    // 1. Carregar ou inicializar manifesto de auditoria
    const manifestMap = loadExistingManifest()

    // 2. Consultar registros de documentos no banco
    console.log('[1/4] Consultando registros de patient_documents no Supabase...')
    const { data: documents, error: fetchError } = await supabase
        .from('patient_documents')
        .select(`
            id,
            patient_id,
            file_name,
            file_url,
            file_size,
            file_type,
            category,
            patient:patients!patient_documents_patient_id_fkey(id, clinic_id)
        `)
        .order('created_at', { ascending: true })

    if (fetchError || !documents) {
        console.error('Falha ao consultar patient_documents:', fetchError)
        process.exit(1)
    }

    const totalDocuments = documents.length
    console.log(`Total de documentos registrados no banco: ${totalDocuments}`)

    // 3. Filtrar pendentes (aqueles que ainda nao apontam para r2:// e nao estao com sucesso no manifesto)
    const toProcess = documents.filter(doc => {
        const manifestItem = manifestMap.get(doc.id)
        if (manifestItem && manifestItem.status === 'sucesso') {
            return false // ja migrado com sucesso comprovado
        }
        if (doc.file_url && doc.file_url.startsWith('r2://')) {
            // Ja esta apontado para R2 no banco
            if (!manifestItem) {
                manifestMap.set(doc.id, {
                    id: doc.id,
                    file_name: doc.file_name || 'arquivo',
                    original_path: doc.file_url,
                    r2_key: doc.file_url,
                    size_bytes: doc.file_size || 0,
                    source_sha256: null,
                    target_sha256: null,
                    status: 'sucesso',
                    error_message: null,
                    timestamp: new Date().toISOString(),
                })
            }
            return false
        }
        return true
    })

    const alreadyCompleted = totalDocuments - toProcess.length
    console.log(`- Ja migrados com sucesso: ${alreadyCompleted}`)
    console.log(`- Pendentes para processar: ${toProcess.length}`)
    console.log('-----------------------------------------------------------------------------')

    if (toProcess.length === 0) {
        console.log('Todos os 411 documentos ja foram migrados com sucesso!')
        saveManifest(manifestMap)
        console.log(`Manifesto salvo em: ${MANIFEST_JSON_PATH}`)
        return
    }

    if (isDryRun) {
        console.log('[DRY-RUN] Simulando processamento em lotes...')
        let simulatedSize = 0
        toProcess.forEach((doc, idx) => {
            simulatedSize += doc.file_size || 0
            if (idx < 5 || idx === toProcess.length - 1) {
                console.log(`[DRY-RUN LOTE] Item ${idx + 1}/${toProcess.length} | ID: ${doc.id} | Tamanho: ${doc.file_size || 0} bytes`)
            }
        })
        console.log(`Volume total a migrar na simulacao: ${(simulatedSize / (1024 * 1024)).toFixed(2)} MB`)
        console.log('Para iniciar a migracao real, execute com a flag --execute.')
        return
    }

    // 4. Execucao Real em Lotes
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE)
    console.log(`[2/4] Iniciando migracao real dividida em ${totalBatches} lotes...`)

    let totalSuccess = alreadyCompleted
    let totalFailures = 0
    let processedInSession = 0

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const batchStart = batchIdx * BATCH_SIZE
        const batchEnd = Math.min(batchStart + BATCH_SIZE, toProcess.length)
        const currentBatch = toProcess.slice(batchStart, batchEnd)
        const batchNumber = batchIdx + 1

        console.log(`\n-----------------------------------------------------------------------------`)
        console.log(`[LOTE ${batchNumber}/${totalBatches}] Processando itens ${batchStart + 1} ate ${batchEnd} (de ${toProcess.length} pendentes)...`)
        console.log(`-----------------------------------------------------------------------------`)

        for (const doc of currentBatch) {
            processedInSession++
            const currentItemIndex = batchStart + currentBatch.indexOf(doc) + 1
            const originalUrl = doc.file_url || ''
            const clinicId = (doc.patient as any)?.clinic_id || 'general'
            const patientId = doc.patient_id || 'unassigned'

            // Extrair caminho no Supabase
            let supabasePath = originalUrl.replace(/^supabase:\/\//, '')
            if (supabasePath.includes('patient-documents/')) {
                supabasePath = supabasePath.split('patient-documents/')[1].split('?')[0]
            }

            if (!supabasePath || supabasePath.startsWith('http')) {
                console.warn(`[PULAR] Item ${currentItemIndex}: URL invalida/nao-relativa: ${originalUrl}`)
                manifestMap.set(doc.id, {
                    id: doc.id,
                    file_name: doc.file_name || 'arquivo',
                    original_path: originalUrl,
                    r2_key: '',
                    size_bytes: doc.file_size || 0,
                    source_sha256: null,
                    target_sha256: null,
                    status: 'pendente',
                    error_message: 'URL invalida ou externa',
                    timestamp: new Date().toISOString(),
                })
                totalFailures++
                continue
            }

            let attempt = 0
            let migrated = false
            const maxAttempts = 3
            let lastError: string | null = null
            let sourceSha256: string | null = null
            let targetSha256: string | null = null
            let finalR2Key: string = ''

            while (attempt < maxAttempts && !migrated) {
                attempt++
                try {
                    // A. Baixar do Supabase Storage
                    const { data: fileBlob, error: downloadError } = await supabase.storage
                        .from('patient-documents')
                        .download(supabasePath)

                    if (downloadError || !fileBlob) {
                        throw new Error(`Erro de download Supabase: ${downloadError?.message || 'Arquivo nao encontrado'}`)
                    }

                    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
                    sourceSha256 = calculateSha256(fileBuffer)

                    // B. Chave R2 padronizada
                    const sanitizedName = (doc.file_name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_')
                    const uniqueId = crypto.randomUUID().substring(0, 8)
                    finalR2Key = `${clinicId}/patient-documents/${patientId}/${uniqueId}-${sanitizedName}`

                    // C. Upload para Cloudflare R2
                    const putCommand = new PutObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: finalR2Key,
                        Body: fileBuffer,
                        ContentType: doc.file_type || 'application/octet-stream',
                        Metadata: {
                            clinicId,
                            patientId,
                            originalName: encodeURIComponent(doc.file_name || ''),
                            sha256: sourceSha256,
                            migratedAt: new Date().toISOString(),
                        },
                    })
                    await r2Client!.send(putCommand)

                    // D. Download de volta do R2 para validacao criptografica rigorosa
                    const getCommand = new GetObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: finalR2Key,
                    })
                    const r2Object = await r2Client!.send(getCommand)
                    const r2Buffer = await streamToBuffer(r2Object.Body)
                    targetSha256 = calculateSha256(r2Buffer)

                    // E. Comparacao estrita de integridade
                    if (sourceSha256 !== targetSha256) {
                        throw new Error(`Inconsistencia de integridade: SHA-256 Supabase (${sourceSha256}) != R2 (${targetSha256})`)
                    }

                    // F. Atualizacao no banco de dados com chave segura r2://
                    const newFileUrl = `r2://${finalR2Key}`
                    const { error: updateError } = await supabase
                        .from('patient_documents')
                        .update({ file_url: newFileUrl })
                        .eq('id', doc.id)

                    if (updateError) {
                        throw new Error(`Falha ao atualizar ponteiro no banco: ${updateError.message}`)
                    }

                    migrated = true
                    totalSuccess++
                    manifestMap.set(doc.id, {
                        id: doc.id,
                        file_name: doc.file_name || 'arquivo',
                        original_path: supabasePath,
                        r2_key: finalR2Key,
                        size_bytes: fileBuffer.length,
                        source_sha256: sourceSha256,
                        target_sha256: targetSha256,
                        status: 'sucesso',
                        error_message: null,
                        timestamp: new Date().toISOString(),
                    })

                    console.log(`[OK] (${currentItemIndex}/${toProcess.length}) ID: ${doc.id} | SHA256: ${sourceSha256.substring(0, 10)}... | R2: ${finalR2Key}`)
                } catch (err: any) {
                    lastError = err?.message || 'Erro desconhecido'
                    console.warn(`[AVISO] Tentativa ${attempt}/${maxAttempts} falhou para ID ${doc.id}: ${lastError}`)
                    if (attempt === maxAttempts) {
                        totalFailures++
                        manifestMap.set(doc.id, {
                            id: doc.id,
                            file_name: doc.file_name || 'arquivo',
                            original_path: supabasePath,
                            r2_key: finalR2Key,
                            size_bytes: doc.file_size || 0,
                            source_sha256: sourceSha256,
                            target_sha256: targetSha256,
                            status: 'falha',
                            error_message: lastError,
                            timestamp: new Date().toISOString(),
                        })
                        console.error(`[FALHA REGISTRADA] ID ${doc.id} mantido no Supabase sem alteracao no banco.`)
                    }
                }
            }

            // Salvar manifesto progressivamente em disco
            saveManifest(manifestMap)
        }

        console.log(`[STATUS LOTE ${batchNumber}/${totalBatches}] Salvo em disco. Total migrado com sucesso: ${totalSuccess}/${totalDocuments}`)
    }

    console.log('\n=============================================================================')
    console.log('[3/4] MIGRACAO CONCLUIDA!')
    console.log('=============================================================================')
    console.log(`- Total de arquivos no banco: ${totalDocuments}`)
    console.log(`- Migrados com sucesso total (SHA-256 validado): ${totalSuccess}`)
    console.log(`- Falhas / Pendentes: ${totalFailures}`)
    console.log(`- Manifesto salvo em JSON: ${MANIFEST_JSON_PATH}`)
    console.log(`- Manifesto salvo em CSV:  ${MANIFEST_CSV_PATH}`)
    console.log('-----------------------------------------------------------------------------')
    console.log('[4/4] GARANTIA DE SEGURANCA E ZERO PERDA:')
    console.log('Nenhum arquivo do Supabase Storage foi removido. Todos continuam preservados.')
    console.log('=============================================================================')
}

main().catch(err => {
    console.error('Erro nao tratado na execucao da migracao:', err)
    process.exit(1)
})
