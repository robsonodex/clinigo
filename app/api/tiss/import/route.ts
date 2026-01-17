/**
 * TISS Import - Importação de Guias via Excel
 * POST /api/tiss/import
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

// Force Node.js runtime for xlsx
export const runtime = 'nodejs'

interface TissGuideRow {
    numero_guia?: string
    paciente_nome?: string
    paciente_cpf?: string
    procedimento_codigo?: string
    procedimento_nome?: string
    valor_total?: number | string
    data_execucao?: string | Date
    operadora?: string
    tipo_guia?: string
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            )
        }

        // Get clinic_id from user
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', session.user.id)
            .single()

        const clinicId = (user as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json(
                { error: 'Clínica não encontrada' },
                { status: 400 }
            )
        }

        // Parse FormData
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'Nenhum arquivo enviado' },
                { status: 400 }
            )
        }

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
            'application/vnd.ms-excel', // xls
            'text/csv'
        ]

        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
            return NextResponse.json(
                { error: 'Formato inválido. Use Excel (.xlsx, .xls) ou CSV' },
                { status: 400 }
            )
        }

        // Read file content
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Parse Excel/CSV
        let workbook: XLSX.WorkBook
        try {
            workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
        } catch (parseError) {
            console.error('Excel parse error:', parseError)
            return NextResponse.json(
                { error: 'Erro ao ler arquivo. Verifique se o formato está correto.' },
                { status: 400 }
            )
        }

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) {
            return NextResponse.json(
                { error: 'Planilha vazia' },
                { status: 400 }
            )
        }

        const sheet = workbook.Sheets[sheetName]
        const rows: TissGuideRow[] = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            raw: false
        })

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Nenhum dado encontrado na planilha' },
                { status: 400 }
            )
        }

        // Normalize column names (handle variations)
        const normalizeColumnName = (name: string): string => {
            return name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove accents
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '')
        }

        const columnMappings: Record<string, keyof TissGuideRow> = {
            'numero_guia': 'numero_guia',
            'guia': 'numero_guia',
            'numero': 'numero_guia',
            'paciente_nome': 'paciente_nome',
            'paciente': 'paciente_nome',
            'nome': 'paciente_nome',
            'nome_paciente': 'paciente_nome',
            'cpf': 'paciente_cpf',
            'paciente_cpf': 'paciente_cpf',
            'cpf_paciente': 'paciente_cpf',
            'procedimento_codigo': 'procedimento_codigo',
            'codigo': 'procedimento_codigo',
            'cod_procedimento': 'procedimento_codigo',
            'procedimento_nome': 'procedimento_nome',
            'procedimento': 'procedimento_nome',
            'descricao': 'procedimento_nome',
            'valor_total': 'valor_total',
            'valor': 'valor_total',
            'total': 'valor_total',
            'data_execucao': 'data_execucao',
            'data': 'data_execucao',
            'data_atendimento': 'data_execucao',
            'operadora': 'operadora',
            'convenio': 'operadora',
            'tipo_guia': 'tipo_guia',
            'tipo': 'tipo_guia'
        }

        // Process rows
        const guidesToInsert: any[] = []
        const errors: { row: number; error: string }[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            const rowNumber = i + 2 // +2 because Excel starts at 1 and header is row 1

            // Normalize row keys
            const normalizedRow: Partial<TissGuideRow> = {}
            for (const [key, value] of Object.entries(row)) {
                const normalizedKey = normalizeColumnName(key)
                const mappedKey = columnMappings[normalizedKey]
                if (mappedKey) {
                    (normalizedRow as any)[mappedKey] = value
                }
            }

            // Validate required fields
            if (!normalizedRow.paciente_nome) {
                errors.push({ row: rowNumber, error: 'Nome do paciente obrigatório' })
                continue
            }

            // Parse valor
            let valor = 0
            if (normalizedRow.valor_total) {
                const valorStr = String(normalizedRow.valor_total)
                    .replace(/[R$\s]/g, '')
                    .replace('.', '')
                    .replace(',', '.')
                valor = parseFloat(valorStr) || 0
            }

            // Parse date
            let dataExecucao: string | null = null
            if (normalizedRow.data_execucao) {
                if (normalizedRow.data_execucao instanceof Date) {
                    dataExecucao = normalizedRow.data_execucao.toISOString().split('T')[0]
                } else {
                    // Try to parse various date formats
                    const dateStr = String(normalizedRow.data_execucao)
                    const dateMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
                    if (dateMatch) {
                        dataExecucao = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
                    } else {
                        dataExecucao = dateStr
                    }
                }
            }

            // Generate guide number if not provided
            const numeroGuia = normalizedRow.numero_guia || `IMP-${Date.now()}-${i}`

            guidesToInsert.push({
                clinic_id: clinicId,
                numero_guia: numeroGuia,
                paciente_nome: normalizedRow.paciente_nome,
                paciente_cpf: normalizedRow.paciente_cpf || null,
                procedimento_codigo: normalizedRow.procedimento_codigo || null,
                procedimento_nome: normalizedRow.procedimento_nome || null,
                valor_total: valor,
                data_execucao: dataExecucao,
                operadora_nome: normalizedRow.operadora || null,
                tipo: normalizedRow.tipo_guia || 'SP_SADT',
                status: 'PENDING',
                created_by: session.user.id,
                origem: 'IMPORT'
            })
        }

        if (guidesToInsert.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Nenhuma guia válida encontrada',
                errors
            }, { status: 400 })
        }

        // Insert guides in batch
        const { data: inserted, error: insertError } = await (supabase
            .from('tiss_guides') as any)
            .insert(guidesToInsert)
            .select('id')

        if (insertError) {
            console.error('TISS insert error:', insertError)
            return NextResponse.json({
                success: false,
                error: `Erro ao salvar guias: ${insertError.message}`
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: guidesToInsert.length,
            inserted: inserted?.length || guidesToInsert.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `${guidesToInsert.length} guia(s) importada(s) com sucesso${errors.length > 0 ? ` (${errors.length} erro(s))` : ''}`
        })

    } catch (error) {
        console.error('TISS import error:', error)
        return NextResponse.json(
            { error: 'Erro ao importar planilha', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        )
    }
}
