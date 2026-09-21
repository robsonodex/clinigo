// lib/utils/export-patients.ts
// CliniGO - Utilitários de Exportação de Dados de Pacientes (Excel e CSV)

export interface PatientExportItem {
    id?: string
    full_name: string
    cpf?: string | null
    phone?: string | null
    email?: string | null
    date_of_birth?: string | null
    gender?: string | null
    billing_type?: 'particular' | 'convenio' | 'ambos' | string | null
    health_insurance_id?: string | null
    insurance_card_number?: string | null
    insurance_validity?: string | null
    insurance_plan_name?: string | null
    health_insurances?: {
        id?: string
        name?: string
        code?: string
    } | null
    is_active?: boolean
    created_at?: string
}

function formatDateBR(dateString?: string | null): string {
    if (!dateString) return '-'
    try {
        const datePart = dateString.split('T')[0]
        const [year, month, day] = datePart.split('-')
        if (year && month && day) {
            return `${day}/${month}/${year}`
        }
        const d = new Date(dateString)
        if (isNaN(d.getTime())) return '-'
        return d.toLocaleDateString('pt-BR')
    } catch {
        return '-'
    }
}

function formatGender(gender?: string | null): string {
    if (!gender) return '-'
    const g = gender.toUpperCase()
    if (g === 'M') return 'Masculino'
    if (g === 'F') return 'Feminino'
    if (g === 'O') return 'Outro'
    return gender
}

function formatBillingType(billingType?: string | null): string {
    if (!billingType) return 'Particular'
    if (billingType === 'particular') return 'Particular'
    if (billingType === 'convenio') return 'Convênio'
    if (billingType === 'ambos') return 'Particular / Convênio'
    return billingType
}

/**
 * Exporta a listagem de pacientes para formato Excel (.xlsx) estilizado
 */
export async function exportPatientsToExcel(
    patients: PatientExportItem[],
    filenamePrefix: string = 'relatorio_pacientes'
): Promise<void> {
    if (!patients || patients.length === 0) {
        throw new Error('Nenhum paciente disponível para exportação.')
    }

    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CliniGO'
    wb.lastModifiedBy = 'CliniGO Enterprise'
    wb.created = new Date()
    wb.modified = new Date()

    const ws = wb.addWorksheet('Pacientes', {
        views: [{ showGridLines: true }],
    })

    // Cabeçalho Institucional
    ws.mergeCells('A1:L1')
    ws.getCell('A1').value = 'RELATÓRIO GERAL DE PACIENTES'
    ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0F172A' } }
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(1).height = 24

    ws.mergeCells('A2:L2')
    ws.getCell('A2').value = 'CliniGO - Sistema de Gestão Clínica Integrada'
    ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF64748B' } }
    ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(2).height = 18

    const todayStr = new Date().toLocaleDateString('pt-BR')
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    ws.mergeCells('A3:L3')
    ws.getCell('A3').value = `Emissão: ${todayStr} às ${timeStr} | Registros: ${patients.length}`
    ws.getCell('A3').font = { size: 9, bold: true, color: { argb: 'FF475569' } }
    ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(3).height = 18

    // Linha de cabeçalho das colunas
    const startRow = 5
    const headers = [
        'Nome Completo',
        'CPF',
        'Telefone / WhatsApp',
        'E-mail',
        'Data Nascimento',
        'Gênero',
        'Tipo Faturamento',
        'Convênio',
        'Plano',
        'Nº Carteirinha',
        'Status',
        'Data de Cadastro',
    ]

    const headerRow = ws.getRow(startRow)
    headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        cell.alignment = { vertical: 'middle', horizontal: idx === 0 ? 'left' : 'center' }
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF0F172A' } },
            bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
            left: { style: 'thin', color: { argb: 'FF334155' } },
            right: { style: 'thin', color: { argb: 'FF334155' } },
        }
    })
    headerRow.height = 24

    // Preenchimento de dados
    let currentRow = startRow + 1
    patients.forEach((p, index) => {
        const r = ws.getRow(currentRow)
        const isEven = index % 2 === 0
        const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

        r.getCell(1).value = p.full_name || '-'
        r.getCell(2).value = p.cpf || '-'
        r.getCell(3).value = p.phone || '-'
        r.getCell(4).value = p.email || '-'
        r.getCell(5).value = formatDateBR(p.date_of_birth)
        r.getCell(6).value = formatGender(p.gender)
        r.getCell(7).value = formatBillingType(p.billing_type)
        r.getCell(8).value = p.health_insurances?.name || '-'
        r.getCell(9).value = p.insurance_plan_name || '-'
        r.getCell(10).value = p.insurance_card_number || '-'
        r.getCell(11).value = p.is_active === false ? 'Inativo' : 'Ativo'
        r.getCell(12).value = formatDateBR(p.created_at)

        // Estilização das células de dados
        for (let col = 1; col <= 12; col++) {
            const cell = r.getCell(col)
            cell.font = { size: 9, color: { argb: 'FF334155' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
            cell.alignment = {
                vertical: 'middle',
                horizontal: col === 1 || col === 4 ? 'left' : 'center',
            }
            cell.border = {
                bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            }
        }

        r.height = 20
        currentRow++
    })

    // Linha de Rodapé com Contagem
    const footerRow = ws.getRow(currentRow)
    footerRow.getCell(1).value = `TOTAL: ${patients.length} paciente(s)`
    footerRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } }
    footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    footerRow.height = 22

    // Ajuste de largura das colunas
    ws.columns = [
        { width: 34 }, // Nome Completo
        { width: 18 }, // CPF
        { width: 20 }, // Telefone
        { width: 28 }, // E-mail
        { width: 16 }, // Data Nascimento
        { width: 14 }, // Gênero
        { width: 20 }, // Faturamento
        { width: 22 }, // Convênio
        { width: 18 }, // Plano
        { width: 20 }, // Nº Carteirinha
        { width: 12 }, // Status
        { width: 16 }, // Data Cadastro
    ]

    // Geração do arquivo e download no navegador
    const buffer = await wb.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const dateFormatted = new Date().toISOString().split('T')[0]
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filenamePrefix}_${dateFormatted}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * Exporta a listagem de pacientes para formato CSV padrão brasileiro (delimitador ;)
 */
export function exportPatientsToCSV(
    patients: PatientExportItem[],
    filenamePrefix: string = 'relatorio_pacientes'
): void {
    if (!patients || patients.length === 0) {
        throw new Error('Nenhum paciente disponível para exportação.')
    }

    const headers = [
        'Nome Completo',
        'CPF',
        'Telefone / WhatsApp',
        'E-mail',
        'Data de Nascimento',
        'Genero',
        'Tipo de Faturamento',
        'Convenio',
        'Plano',
        'Numero da Carteirinha',
        'Status',
        'Data de Cadastro',
    ]

    const escapeCSV = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
    }

    const rows = [
        headers.map((h) => `"${h}"`).join(';'),
        ...patients.map((p) => [
            escapeCSV(p.full_name),
            escapeCSV(p.cpf || '-'),
            escapeCSV(p.phone || '-'),
            escapeCSV(p.email || '-'),
            escapeCSV(formatDateBR(p.date_of_birth)),
            escapeCSV(formatGender(p.gender)),
            escapeCSV(formatBillingType(p.billing_type)),
            escapeCSV(p.health_insurances?.name || '-'),
            escapeCSV(p.insurance_plan_name || '-'),
            escapeCSV(p.insurance_card_number || '-'),
            escapeCSV(p.is_active === false ? 'Inativo' : 'Ativo'),
            escapeCSV(formatDateBR(p.created_at)),
        ].join(';')),
    ]

    const csvContent = rows.join('\r\n')
    // Adiciona BOM UTF-8 (\uFEFF) para garantir acentuação correta no Excel brasileiro
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const dateFormatted = new Date().toISOString().split('T')[0]
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filenamePrefix}_${dateFormatted}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
