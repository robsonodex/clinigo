/**
 * CliniGo - Serviço Central de Dossiê de Portabilidade e Backup LGPD
 * Padrão Corporativo Healthtech Internacional
 * 
 * Responsabilidades:
 * - Raio-X em tempo real da volumetria da clínica (DB + Cloudflare R2)
 * - Extração e conversão de tabelas em Excel (.xlsx) e CSV (UTF-8 com BOM)
 * - Coleta e empacotamento de arquivos originais do Cloudflare R2
 * - Compilação de dossiês clínicos em documentos formatados
 * - Geração de manifesto probatório com SHA-256
 * - Upload do pacote ZIP para o Cloudflare R2 e emissão de Signed URL temporária
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { getR2Client } from '@/lib/services/storage/r2-client'
import {
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as XLSX from 'xlsx'
import archiver from 'archiver'
import crypto from 'crypto'
import { Readable } from 'stream'

export interface BackupOverview {
    clinicId: string
    clinicName: string
    patientsCount: number
    appointmentsCount: number
    medicalRecordsCount: number
    doctorsCount: number
    financialEntriesCount: number
    r2FilesCount: number
    r2TotalSizeBytes: number
}

export interface BackupGenerationResult {
    success: boolean
    fileName: string
    fileSizeBytes: number
    formattedSize: string
    hashSha256: string
    downloadUrl: string
    expiresAt: string
    r2Key: string
    summary: {
        tablesExported: number
        r2FilesDownloaded: number
        recordsTotal: number
    }
}

/**
 * Retorna o Raio-X volumétrico da clínica em tempo real
 */
export async function getClinicBackupOverview(clinicId: string): Promise<BackupOverview> {
    const supabase = createServiceRoleClient()

    // 1. Dados cadastrais da clinica
    const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .select('name')
        .eq('id', clinicId)
        .single()

    if (clinicErr || !clinic) {
        throw new Error(`Clínica não encontrada: ${clinicErr?.message || 'ID inválido'}`)
    }

    // 2. Contagens do Banco de Dados
    const [
        { count: patientsCount },
        { count: appointmentsCount },
        { count: medicalRecordsCount },
        { count: doctorsCount },
        { count: financialEntriesCount },
    ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('medical_records').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('financial_entries').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    ])

    // 3. Contagens de Arquivos no Cloudflare R2
    let r2FilesCount = 0
    let r2TotalSizeBytes = 0

    try {
        const r2 = getR2Client()
        const bucketName = process.env.R2_BUCKET_NAME || 'clinigo'
        let continuationToken: string | undefined = undefined

        do {
            const r2Res = await r2.send(new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: `${clinicId}/`,
                ContinuationToken: continuationToken,
            }))

            if (r2Res.Contents) {
                for (const item of r2Res.Contents) {
                    if (item.Key && !item.Key.endsWith('/')) {
                        r2FilesCount++
                        r2TotalSizeBytes += item.Size || 0
                    }
                }
            }
            continuationToken = r2Res.NextContinuationToken
        } while (continuationToken)
    } catch (err: any) {
        console.warn(`[BACKUP_OVERVIEW] Aviso ao consultar R2: ${err?.message}`)
    }

    return {
        clinicId,
        clinicName: clinic.name,
        patientsCount: patientsCount || 0,
        appointmentsCount: appointmentsCount || 0,
        medicalRecordsCount: medicalRecordsCount || 0,
        doctorsCount: doctorsCount || 0,
        financialEntriesCount: financialEntriesCount || 0,
        r2FilesCount,
        r2TotalSizeBytes,
    }
}

function formatCSVValue(val: any): string {
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') {
        val = JSON.stringify(val)
    } else {
        val = String(val)
    }
    const escaped = val.replace(/"/g, '""')
    return `"${escaped}"`
}

function convertJsonToCSV(items: any[]): string {
    if (!items || items.length === 0) return ''
    const headers = Object.keys(items[0])
    const headerRow = headers.map(h => `"${h}"`).join(';')
    const rows = items.map(item => {
        return headers.map(h => formatCSVValue(item[h])).join(';')
    })
    return '\ufeff' + [headerRow, ...rows].join('\r\n')
}

async function streamToBuffer(readable: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

/**
 * Gera o pacote completo de portabilidade ZIP e envia ao Cloudflare R2
 */
export async function generateClinicBackupPackage(
    clinicId: string,
    options: {
        includeExcelAndCsv?: boolean
        includeR2Files?: boolean
        includeDossiers?: boolean
    } = {}
): Promise<BackupGenerationResult> {
    const {
        includeExcelAndCsv = true,
        includeR2Files = true,
        includeDossiers = true,
    } = options

    const supabase = createServiceRoleClient()
    const r2 = getR2Client()
    const bucketName = process.env.R2_BUCKET_NAME || 'clinigo'

    // 1. Validar e buscar dados da clínica
    const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .select('id, name, cnpj, created_at')
        .eq('id', clinicId)
        .single()

    if (clinicErr || !clinic) {
        throw new Error(`Clínica não encontrada: ${clinicErr?.message || 'ID inválido'}`)
    }

    const clinicSlug = clinic.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const zipFileName = `dossie_portabilidade_${clinicSlug}_${timestampStr}.zip`
    const r2ZipKey = `dossiers-lgpd/${clinicId}/${zipFileName}`

    // 2. Inicializar o Archiver (ZIP Stream)
    const archive = archiver('zip', { zlib: { level: 9 } })
    const zipBuffers: Buffer[] = []

    archive.on('data', chunk => zipBuffers.push(chunk))

    const manifestFiles: Array<{ nome: string; tamanho_bytes: number; sha256: string }> = []
    let totalRecordsCount = 0
    let tablesExportedCount = 0

    // 3. Extrair Tabelas e Gerar Planilhas (Excel e CSV)
    if (includeExcelAndCsv) {
        const workbook = XLSX.utils.book_new()

        const tablesToExport = [
            { name: 'patients', label: 'Pacientes', sheetName: 'Pacientes' },
            { name: 'doctors', label: 'Profissionais', sheetName: 'Profissionais' },
            { name: 'therapeutic_plans', label: 'Planos Terapêuticos', sheetName: 'Planos_Terapeuticos' },
            { name: 'health_insurances', label: 'Convênios', sheetName: 'Convenios' },
            { name: 'financial_entries', label: 'Financeiro', sheetName: 'Financeiro' },
            { name: 'schedules', label: 'Escalas e Horários', sheetName: 'Escalas' },
            { name: 'doctor_patient_rates', label: 'Repasses Profissionais', sheetName: 'Repasses' },
        ]

        for (const t of tablesToExport) {
            const { data } = await supabase
                .from(t.name)
                .select('*')
                .eq('clinic_id', clinicId)
                .limit(5000)

            if (data && data.length > 0) {
                totalRecordsCount += data.length
                tablesExportedCount++

                // Adiciona aba no Excel consolidado
                const worksheet = XLSX.utils.json_to_sheet(data)
                XLSX.utils.book_append_sheet(workbook, worksheet, t.sheetName)

                // Adiciona CSV individual
                const csvData = convertJsonToCSV(data)
                const csvBuffer = Buffer.from(csvData, 'utf8')
                const csvPath = `01_PLANILHAS_EXCEL_E_CSV/${t.name}.csv`
                archive.append(csvBuffer, { name: csvPath })

                const csvHash = crypto.createHash('sha256').update(csvBuffer).digest('hex')
                manifestFiles.push({ nome: csvPath, tamanho_bytes: csvBuffer.length, sha256: csvHash })
            }
        }

        // Exportar Agendamentos (paginado até 50.000)
        let allAppointments: any[] = []
        let apptFrom = 0
        const apptStep = 1000
        let hasMoreAppts = true

        while (hasMoreAppts && apptFrom < 50000) {
            const { data: apptBatch } = await supabase
                .from('appointments')
                .select('*')
                .eq('clinic_id', clinicId)
                .range(apptFrom, apptFrom + apptStep - 1)

            if (apptBatch && apptBatch.length > 0) {
                allAppointments = allAppointments.concat(apptBatch)
                apptFrom += apptStep
                if (apptBatch.length < apptStep) hasMoreAppts = false
            } else {
                hasMoreAppts = false
            }
        }

        if (allAppointments.length > 0) {
            totalRecordsCount += allAppointments.length
            tablesExportedCount++

            const apptCsv = convertJsonToCSV(allAppointments)
            const apptCsvBuffer = Buffer.from(apptCsv, 'utf8')
            const apptCsvPath = `01_PLANILHAS_EXCEL_E_CSV/agendamentos_historico_${allAppointments.length}_registros.csv`
            archive.append(apptCsvBuffer, { name: apptCsvPath })

            const apptHash = crypto.createHash('sha256').update(apptCsvBuffer).digest('hex')
            manifestFiles.push({ nome: apptCsvPath, tamanho_bytes: apptCsvBuffer.length, sha256: apptHash })
        }

        // Finaliza o arquivo Excel consolidado (.xlsx)
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
        const excelPath = `01_PLANILHAS_EXCEL_E_CSV/Base_Consolidada_${clinicSlug}.xlsx`
        archive.append(excelBuffer, { name: excelPath })

        const excelHash = crypto.createHash('sha256').update(excelBuffer).digest('hex')
        manifestFiles.push({ nome: excelPath, tamanho_bytes: excelBuffer.length, sha256: excelHash })
    }

    // 4. Compilar Dossiês de Prontuários em Documentos Formatados
    if (includeDossiers) {
        const { data: records } = await supabase
            .from('medical_records')
            .select('id, patient_id, doctor_id, date, title, content, diagnosis, created_at')
            .eq('clinic_id', clinicId)
            .order('date', { ascending: true })

        if (records && records.length > 0) {
            totalRecordsCount += records.length

            // Busca nomes dos pacientes para organizar as pastas
            const { data: patientList } = await supabase
                .from('patients')
                .select('id, name, cpf, birth_date')
                .eq('clinic_id', clinicId)

            const patientMap = new Map((patientList || []).map(p => [p.id, p]))

            // Agrupa prontuários por paciente
            const groupedRecords = new Map<string, any[]>()
            for (const r of records) {
                const list = groupedRecords.get(r.patient_id) || []
                list.push(r)
                groupedRecords.set(r.patient_id, list)
            }

            for (const [patientId, pRecords] of groupedRecords.entries()) {
                const patientInfo = patientMap.get(patientId)
                const safePatientName = (patientInfo?.name || `Paciente_${patientId}`)
                    .replace(/[^a-zA-Z0-9]/g, '_')
                    .substring(0, 40)

                let docContent = `# PRONTUÁRIO CLÍNICO E EVOLUÇÕES TERAPÊUTICAS\n`
                docContent += `Instituição: ${clinic.name}\n`
                docContent += `Paciente: ${patientInfo?.name || 'Não identificado'}\n`
                docContent += `CPF: ${patientInfo?.cpf || 'Não informado'} | Nascimento: ${patientInfo?.birth_date || 'Não informado'}\n`
                docContent += `Total de Atendimentos Registrados: ${pRecords.length}\n`
                docContent += `Data de Emissão do Dossiê: ${new Date().toLocaleDateString('pt-BR')}\n`
                docContent += `\n================================================================================\n\n`

                for (const item of pRecords) {
                    docContent += `[ATENDIMENTO EM ${item.date || item.created_at}]\n`
                    if (item.title) docContent += `Título: ${item.title}\n`
                    if (item.diagnosis) docContent += `Diagnóstico/CID: ${item.diagnosis}\n`
                    docContent += `Evolução Clínica:\n${item.content || 'Sem texto registrado'}\n`
                    docContent += `--------------------------------------------------------------------------------\n\n`
                }

                const docBuffer = Buffer.from(docContent, 'utf8')
                const docPath = `03_DOSSIES_CLINICOS_PRONTUARIOS/${safePatientName}_Prontuario.txt`
                archive.append(docBuffer, { name: docPath })

                const docHash = crypto.createHash('sha256').update(docBuffer).digest('hex')
                manifestFiles.push({ nome: docPath, tamanho_bytes: docBuffer.length, sha256: docHash })
            }
        }
    }

    // 5. Coleta e Download dos Arquivos Originais do Cloudflare R2
    let downloadedR2Count = 0
    if (includeR2Files) {
        try {
            let continuationToken: string | undefined = undefined
            do {
                const r2Res = await r2.send(new ListObjectsV2Command({
                    Bucket: bucketName,
                    Prefix: `${clinicId}/`,
                    ContinuationToken: continuationToken,
                }))

                if (r2Res.Contents) {
                    for (const item of r2Res.Contents) {
                        if (!item.Key || item.Key.endsWith('/')) continue

                        const getCmd = new GetObjectCommand({
                            Bucket: bucketName,
                            Key: item.Key,
                        })

                        const objRes = await r2.send(getCmd)
                        if (objRes.Body) {
                            const fileBuffer = await streamToBuffer(objRes.Body as Readable)
                            const cleanSubPath = item.Key.replace(`${clinicId}/`, '')
                            const archivePath = `02_ARQUIVOS_ORIGINAIS_R2/${cleanSubPath}`

                            archive.append(fileBuffer, { name: archivePath })
                            downloadedR2Count++

                            const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
                            manifestFiles.push({ nome: archivePath, tamanho_bytes: fileBuffer.length, sha256: fileHash })
                        }
                    }
                }
                continuationToken = r2Res.NextContinuationToken
            } while (continuationToken)
        } catch (r2Err: any) {
            console.warn(`[BACKUP_ZIP] Erro ao incorporar arquivos do R2: ${r2Err?.message}`)
        }
    }

    // 6. Manifesto Probatório e Guia de Portabilidade LGPD
    const manifesto = {
        plataforma: 'CliniGo Healthtech Solutions',
        instituicao: clinic.name,
        clinic_id: clinic.id,
        gerado_em_utc: new Date().toISOString(),
        finalidade: 'Portabilidade Integral de Dados (LGPD Art. 18, V)',
        arquivos_empacotados: manifestFiles,
        total_arquivos: manifestFiles.length,
    }

    const manifestoBuffer = Buffer.from(JSON.stringify(manifesto, null, 2), 'utf8')
    archive.append(manifestoBuffer, { name: 'MANIFESTO_EXPORTACAO_LGPD.json' })

    const termoGuia = `# PACOTE OFICIAL DE PORTABILIDADE LGPD
Instituição: ${clinic.name}
Data de Compilação: ${new Date().toLocaleDateString('pt-BR')}

Este pacote contém os dados estruturados da instituição para migração em formatos abertos:
- 01_PLANILHAS_EXCEL_E_CSV/: Planilha consolidada em Excel (.xlsx) e tabelas em CSV (UTF-8 com BOM).
- 02_ARQUIVOS_ORIGINAIS_R2/: Todos os relatórios, laudos e fotos anexados originalmente.
- 03_DOSSIES_CLINICOS_PRONTUARIOS/: Dossiês de prontuários organizados por paciente.

A integridade probatória de cada arquivo está garantida pelo hash SHA-256 no MANIFESTO_EXPORTACAO_LGPD.json.
`
    archive.append(Buffer.from(termoGuia, 'utf8'), { name: 'INSTRUCOES_E_TERMO_PORTABILIDADE.md' })

    // 7. Finalizar a criação do arquivo ZIP em memória
    await archive.finalize()

    // Aguardar conclusão da concatenação do buffer
    await new Promise(resolve => archive.on('end', resolve))
    const finalZipBuffer = Buffer.concat(zipBuffers)
    const finalZipHash = crypto.createHash('sha256').update(finalZipBuffer).digest('hex')

    // 8. Upload do ZIP Final de volta para o Cloudflare R2
    const putCmd = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2ZipKey,
        Body: finalZipBuffer,
        ContentType: 'application/zip',
        Metadata: {
            clinicId,
            clinicName: encodeURIComponent(clinic.name),
            sha256: finalZipHash,
            generatedAt: new Date().toISOString(),
        },
    })

    await r2.send(putCmd)

    // 9. Gerar URL assinada de download (7 dias de validade = 604.800 segundos)
    const getZipCmd = new GetObjectCommand({
        Bucket: bucketName,
        Key: r2ZipKey,
    })

    const signedDownloadUrl = await getSignedUrl(r2, getZipCmd, {
        expiresIn: 7 * 24 * 3600,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    const sizeInMB = (finalZipBuffer.length / (1024 * 1024)).toFixed(2)

    return {
        success: true,
        fileName: zipFileName,
        fileSizeBytes: finalZipBuffer.length,
        formattedSize: `${sizeInMB} MB`,
        hashSha256: finalZipHash,
        downloadUrl: signedDownloadUrl,
        expiresAt,
        r2Key: r2ZipKey,
        summary: {
            tablesExported: tablesExportedCount,
            r2FilesDownloaded: downloadedR2Count,
            recordsTotal: totalRecordsCount,
        },
    }
}
