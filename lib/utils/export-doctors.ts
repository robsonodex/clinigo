// lib/utils/export-doctors.ts
// CliniGO - Utilitários de Exportação de Dados do Corpo Clínico / Profissionais (Excel e CSV)

import { type Doctor } from '@/lib/api-client'

/**
 * Exporta a listagem de profissionais/médicos para formato Excel (.xlsx) estilizado
 */
export async function exportDoctorsToExcel(
    doctors: Doctor[],
    profLabel: { singular: string; plural: string } = { singular: 'Profissional', plural: 'Profissionais' },
    filenamePrefix: string = 'corpo_clinico'
): Promise<void> {
    if (!doctors || doctors.length === 0) {
        throw new Error(`Nenhum ${profLabel.singular.toLowerCase()} disponível para exportação.`)
    }

    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'CliniGO'
    wb.lastModifiedBy = 'CliniGO Enterprise'
    wb.created = new Date()
    wb.modified = new Date()

    const ws = wb.addWorksheet(profLabel.plural, {
        views: [{ showGridLines: true }],
    })

    // Cabeçalho Institucional
    ws.mergeCells('A1:G1')
    ws.getCell('A1').value = `RELAÇÃO DO CORPO CLÍNICO (${profLabel.plural.toUpperCase()})`
    ws.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF0F172A' } }
    ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(1).height = 24

    ws.mergeCells('A2:G2')
    ws.getCell('A2').value = 'CliniGO - Sistema de Gestão Clínica Integrada'
    ws.getCell('A2').font = { size: 10, italic: true, color: { argb: 'FF64748B' } }
    ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(2).height = 18

    const todayStr = new Date().toLocaleDateString('pt-BR')
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    ws.mergeCells('A3:G3')
    ws.getCell('A3').value = `Emissão: ${todayStr} às ${timeStr} | Registros: ${doctors.length}`
    ws.getCell('A3').font = { size: 9, bold: true, color: { argb: 'FF475569' } }
    ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getRow(3).height = 18

    // Linha de cabeçalho das colunas
    const startRow = 5
    const headers = [
        'Nome Completo',
        'Conselho / Registro',
        'Especialidade',
        'Valor Consulta / Sessão (R$)',
        'Duração (min)',
        'E-mail de Contato',
        'Status da Agenda',
    ]

    const headerRow = ws.getRow(startRow)
    headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        cell.alignment = {
            vertical: 'middle',
            horizontal: idx === 0 || idx === 2 || idx === 5 ? 'left' : 'center',
        }
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
    doctors.forEach((d, index) => {
        const r = ws.getRow(currentRow)
        const isEven = index % 2 === 0
        const bgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC'

        const crmStr = d.crm ? `${d.crm}${d.crm_state ? '/' + d.crm_state : ''}` : '-'
        const price = Number(d.consultation_price) || 0

        r.getCell(1).value = d.user?.full_name || 'Profissional'
        r.getCell(2).value = crmStr
        r.getCell(3).value = d.specialty || '-'
        r.getCell(4).value = price
        r.getCell(4).numFmt = 'R$ #,##0.00'
        r.getCell(5).value = d.consultation_duration ? `${d.consultation_duration} min` : '-'
        r.getCell(6).value = d.user?.email || '-'
        r.getCell(7).value = d.is_accepting_appointments ? 'Disponível' : 'Indisponível'

        // Estilização das células de dados
        for (let col = 1; col <= 7; col++) {
            const cell = r.getCell(col)
            cell.font = { size: 9, color: { argb: 'FF334155' } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
            cell.alignment = {
                vertical: 'middle',
                horizontal: col === 1 || col === 3 || col === 6 ? 'left' : 'center',
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
    footerRow.getCell(1).value = `TOTAL: ${doctors.length} ${profLabel.plural.toLowerCase()}`
    footerRow.getCell(1).font = { bold: true, size: 10, color: { argb: 'FF0F172A' } }
    footerRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' }
    footerRow.height = 22

    // Ajuste de largura das colunas
    ws.columns = [
        { width: 34 }, // Nome Completo
        { width: 22 }, // Conselho / Registro
        { width: 26 }, // Especialidade
        { width: 26 }, // Valor Consulta
        { width: 18 }, // Duração
        { width: 32 }, // E-mail
        { width: 20 }, // Status Agenda
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
 * Exporta a listagem de profissionais/médicos para formato CSV padrão brasileiro (delimitador ;)
 */
export function exportDoctorsToCSV(
    doctors: Doctor[],
    profLabel: { singular: string; plural: string } = { singular: 'Profissional', plural: 'Profissionais' },
    filenamePrefix: string = 'corpo_clinico'
): void {
    if (!doctors || doctors.length === 0) {
        throw new Error(`Nenhum ${profLabel.singular.toLowerCase()} disponível para exportação.`)
    }

    const headers = [
        'Nome Completo',
        'Conselho / Registro',
        'Especialidade',
        'Valor Consulta / Sessao (R$)',
        'Duracao (min)',
        'E-mail de Contato',
        'Status da Agenda',
    ]

    const escapeCSV = (val: string | number | null | undefined): string => {
        if (val === null || val === undefined) return '""'
        const str = String(val).replace(/"/g, '""')
        return `"${str}"`
    }

    const rows = [
        headers.map((h) => `"${h}"`).join(';'),
        ...doctors.map((d) => {
            const crmStr = d.crm ? `${d.crm}${d.crm_state ? '/' + d.crm_state : ''}` : '-'
            const price = Number(d.consultation_price) || 0
            return [
                escapeCSV(d.user?.full_name || 'Profissional'),
                escapeCSV(crmStr),
                escapeCSV(d.specialty || '-'),
                escapeCSV(price.toFixed(2)),
                escapeCSV(d.consultation_duration || '-'),
                escapeCSV(d.user?.email || '-'),
                escapeCSV(d.is_accepting_appointments ? 'Disponível' : 'Indisponível'),
            ].join(';')
        }),
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
