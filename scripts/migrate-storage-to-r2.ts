/**
 * SCRIPT DE MIGRACAO SEGURA: Supabase Storage -> Cloudflare R2
 *
 * Modo padrao: --dry-run (nao altera nada, apenas analisa, conta e calcula o volume)
 * Modo execucao: --execute (executa a copia, valida checksum SHA-256 e atualiza ponteiros)
 *
 * REGRA DE SEGURANCA:
 * NENHUM arquivo e removido do Supabase Storage durante este script.
 * Os dados originais permanecem 100% intactos como backup seguro.
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

// Carregar variaveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'clinigo-patient-documents'
const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)

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

async function main() {
    const args = process.argv.slice(2)
    const isExecute = args.includes('--execute')
    const isDryRun = !isExecute || args.includes('--dry-run')

    console.log('=============================================================================')
    console.log('CLINIGO - MIGRACAO DE STORAGE: SUPABASE -> CLOUDFLARE R2')
    console.log('=============================================================================')
    console.log(`MODO: ${isDryRun ? 'DRY-RUN (Simulacao segura sem alteracoes)' : 'EXECUCAO REAL (--execute)'}`)
    console.log(`DATA/HORA: ${new Date().toISOString()}`)
    console.log('-----------------------------------------------------------------------------')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        console.error('ERRO FATAL: Variaveis do Supabase nao configuradas (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).')
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

    // 1. Buscar todos os documentos de pacientes
    console.log('[1/4] Consultando registros de patient_documents no banco...')
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

    console.log(`Total de documentos registrados no banco: ${documents.length}`)

    // 2. Analisar quais precisam de migracao
    const alreadyOnR2 = documents.filter(d => d.file_url && d.file_url.startsWith('r2://'))
    const pendingMigration = documents.filter(d => !d.file_url || !d.file_url.startsWith('r2://'))

    console.log(`- Ja armazenados no Cloudflare R2: ${alreadyOnR2.length}`)
    console.log(`- Pendentes para migracao: ${pendingMigration.length}`)
    console.log('-----------------------------------------------------------------------------')

    if (pendingMigration.length === 0) {
        console.log('Nenhum documento pendente de migracao. Todos ja estao no Cloudflare R2.')
        return
    }

    let totalSizeBytes = 0
    let processedCount = 0
    let successCount = 0
    let failureCount = 0
    let skippedCount = 0

    console.log(isDryRun ? '[2/4] Simulando migracao dos arquivos...' : '[2/4] Iniciando transferencia com validacao de integridade SHA-256...')

    for (const doc of pendingMigration) {
        processedCount++
        const originalUrl = doc.file_url || ''
        const clinicId = (doc.patient as any)?.clinic_id || 'general'
        const patientId = doc.patient_id || 'unassigned'

        // Extrair caminho relativo no bucket Supabase
        let supabasePath = originalUrl.replace(/^supabase:\/\//, '')
        if (supabasePath.includes('patient-documents/')) {
            supabasePath = supabasePath.split('patient-documents/')[1].split('?')[0]
        }

        if (!supabasePath || supabasePath.startsWith('http')) {
            // URL externa ou invalida
            console.log(`[PULAR] (${processedCount}/${pendingMigration.length}) Documento ID ${doc.id}: URL nao reconhecida no Supabase Storage: ${originalUrl}`)
            skippedCount++
            continue
        }

        // Estimar tamanho
        totalSizeBytes += doc.file_size || 0

        if (isDryRun) {
            if (processedCount <= 10 || processedCount === pendingMigration.length) {
                console.log(`[DRY-RUN] (${processedCount}/${pendingMigration.length}) ID: ${doc.id} | Supabase: ${supabasePath} | Tamanho: ${doc.file_size || 0} bytes`)
            } else if (processedCount === 11) {
                console.log('... (ocultando listagem intermediaria no log)')
            }
            successCount++
            continue
        }

        // MODO EXECUCAO REAL (--execute)
        let attempt = 0
        let migrated = false
        const maxAttempts = 3

        while (attempt < maxAttempts && !migrated) {
            attempt++
            try {
                // A. Baixar do Supabase Storage
                const { data: fileBlob, error: downloadError } = await supabase.storage
                    .from('patient-documents')
                    .download(supabasePath)

                if (downloadError || !fileBlob) {
                    throw new Error(`Erro ao baixar do Supabase: ${downloadError?.message || 'Arquivo nao encontrado'}`)
                }

                const fileBuffer = Buffer.from(await fileBlob.arrayBuffer())
                const sourceSha256 = calculateSha256(fileBuffer)

                // B. Gerar chave R2 padronizada
                const sanitizedName = (doc.file_name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_')
                const uniqueId = crypto.randomUUID().substring(0, 8)
                const r2StorageKey = `${clinicId}/patient-documents/${patientId}/${uniqueId}-${sanitizedName}`

                // C. Upload para Cloudflare R2
                const putCommand = new PutObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: r2StorageKey,
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

                // D. Validar integridade lendo de volta do R2
                const getCommand = new GetObjectCommand({
                    Bucket: R2_BUCKET_NAME,
                    Key: r2StorageKey,
                })
                const r2Object = await r2Client!.send(getCommand)
                const r2Buffer = await streamToBuffer(r2Object.Body)
                const targetSha256 = calculateSha256(r2Buffer)

                if (sourceSha256 !== targetSha256) {
                    throw new Error(`Inconsistencia de integridade: SHA-256 Supabase (${sourceSha256}) != R2 (${targetSha256})`)
                }

                // E. Atualizar ponteiro no banco de dados para a nova chave R2
                const newFileUrl = `r2://${r2StorageKey}`
                const { error: updateError } = await supabase
                    .from('patient_documents')
                    .update({ file_url: newFileUrl })
                    .eq('id', doc.id)

                if (updateError) {
                    throw new Error(`Falha ao atualizar ponteiro no banco: ${updateError.message}`)
                }

                console.log(`[SUCESSO] (${processedCount}/${pendingMigration.length}) ID: ${doc.id} -> ${newFileUrl} (SHA256 validado: ${sourceSha256.substring(0, 10)}...)`)
                migrated = true
                successCount++
            } catch (err: any) {
                console.warn(`[TENTATIVA ${attempt}/${maxAttempts}] Falha no documento ID ${doc.id}: ${err.message}`)
                if (attempt === maxAttempts) {
                    console.error(`[FALHA DEFINITIVA] Documento ID ${doc.id} nao foi migrado.`)
                    failureCount++
                }
            }
        }
    }

    console.log('-----------------------------------------------------------------------------')
    console.log('[3/4] RESUMO DA OPERACAO:')
    console.log(`- Total analisado: ${processedCount}`)
    console.log(`- Sucesso: ${successCount}`)
    console.log(`- Falhas: ${failureCount}`)
    console.log(`- Ignorados: ${skippedCount}`)
    console.log(`- Volume estimado: ${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`)
    console.log('-----------------------------------------------------------------------------')
    console.log('[4/4] SEGURANCA:')
    console.log('Nenhum arquivo do Supabase Storage foi deletado. Os dados originais permanecem intactos.')
    console.log('=============================================================================')
}

main().catch(err => {
    console.error('Erro nao tratado no script de migracao:', err)
    process.exit(1)
})
