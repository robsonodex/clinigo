/**
 * Exportação client-side do Contrato Comercial CliniGo em:
 * 1. Word editável (.doc) — abre nativamente no Microsoft Word, Google Docs e LibreOffice.
 * 2. PDF Oficial A4 timbrado (jsPDF vetorial, texto selecionável, paginação automática).
 */

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function sanitizePdfLatin1(text: string): string {
    return text
        .replace(/[—–]/g, '-')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/•/g, '-')
        .replace(/→/g, '->')
        .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
}

export function buildEditableWordHtml(title: string, contractNumber: string, contractBody: string): string {
    const lines = contractBody.replace(/\r\n/g, '\n').split('\n')
    const htmlBlocks: string[] = []

    for (const rawLine of lines) {
        const trimmed = rawLine.trim()
        if (!trimmed) {
            htmlBlocks.push('<p style="margin:0 0 6pt 0;line-height:1.15;">&nbsp;</p>')
            continue
        }
        if (/^CONTRATO DE LICENCIAMENTO/i.test(trimmed)) {
            htmlBlocks.push(
                `<h1 style="font-size:13pt;font-weight:bold;text-align:center;color:#0F1F1B;margin:0 0 4pt 0;letter-spacing:0.4pt;">${escapeHtml(trimmed)}</h1>`
            )
        } else if (/^Contrato N\./i.test(trimmed)) {
            htmlBlocks.push(
                `<p style="font-size:10pt;font-weight:bold;text-align:center;color:#155E4B;margin:0 0 14pt 0;">${escapeHtml(trimmed)}</p>`
            )
        } else if (/^CL[AÁ]USULA\s+\d+/i.test(trimmed) || /^TESTEMUNHAS:/i.test(trimmed)) {
            htmlBlocks.push(
                `<h2 style="font-size:10.5pt;font-weight:bold;color:#0F1F1B;margin:14pt 0 5pt 0;border-bottom:1pt solid #D8DFDC;padding-bottom:2pt;">${escapeHtml(trimmed)}</h2>`
            )
        } else if (/^(CONTRATADA|CONTRATANTE):/i.test(trimmed)) {
            htmlBlocks.push(
                `<p style="font-size:10pt;line-height:1.45;text-align:justify;margin:0 0 8pt 0;background:#F8FAF9;padding:6pt 8pt;border-left:2.5pt solid #155E4B;">${escapeHtml(trimmed)}</p>`
            )
        } else if (trimmed.startsWith('____')) {
            htmlBlocks.push(
                `<p style="font-size:10pt;line-height:1.35;margin:18pt 0 2pt 0;color:#0F1F1B;">${escapeHtml(trimmed)}</p>`
            )
        } else {
            htmlBlocks.push(
                `<p style="font-size:10pt;line-height:1.5;text-align:justify;margin:0 0 6pt 0;color:#1F2937;">${escapeHtml(trimmed)}</p>`
            )
        }
    }

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} - ${escapeHtml(contractNumber)}</title>
<style>
  @page {
    size: A4;
    margin: 2.2cm 2.0cm 2.2cm 2.0cm;
  }
  body {
    font-family: 'Calibri', 'Arial', sans-serif;
    font-size: 10pt;
    color: #1F2937;
    background: #FFFFFF;
  }
</style>
</head>
<body>
  <div style="border-bottom:2pt solid #155E4B;padding-bottom:8pt;margin-bottom:16pt;">
    <p style="margin:0;font-size:14pt;font-weight:bold;color:#0F1F1B;">CliniGo</p>
    <p style="margin:2pt 0 0 0;font-size:8.5pt;color:#4B5B56;">Plataforma Especializada para Clinicas de Terapias Multidisciplinares · clinigo.app · ${escapeHtml(contractNumber)}</p>
  </div>
  ${htmlBlocks.join('\n  ')}
</body>
</html>`
}

export function downloadCommercialContractWord(
    fileNameBase: string,
    title: string,
    contractNumber: string,
    contractBody: string
): void {
    const html = buildEditableWordHtml(title, contractNumber, contractBody)
    // BOM UTF-8 garante abertura perfeita de acentos no Microsoft Word Windows
    const blob = new Blob(['\uFEFF', html], {
        type: 'application/msword;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${fileNameBase}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function loadLogoDataUrl(): Promise<string | null> {
    try {
        const res = await fetch('/logo-clinigo-round.jpg')
        if (!res.ok) return null
        const blob = await res.blob()
        return await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

export async function downloadCommercialContractPdf(
    fileNameBase: string,
    contractNumber: string,
    contractBody: string
): Promise<void> {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 20
    const usableWidth = pageWidth - marginX * 2
    const topMargin = 22
    const bottomLimit = pageHeight - 20

    const logoDataUrl = await loadLogoDataUrl()

    // Cabeçalho institucional na Página 1
    let y = 16
    if (logoDataUrl) {
        try {
            doc.addImage(logoDataUrl, 'JPEG', marginX, 11, 13, 13)
        } catch {
            // Segue sem logo se indisponível
        }
    }

    const headerTextX = logoDataUrl ? marginX + 16 : marginX
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 31, 27)
    doc.text('CliniGo', headerTextX, 17)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(75, 91, 86)
    doc.text(
        sanitizePdfLatin1(`Contrato Comercial SaaS B2B · ${contractNumber} · clinigo.app`),
        headerTextX,
        22
    )

    doc.setDrawColor(21, 94, 75)
    doc.setLineWidth(0.6)
    doc.line(marginX, 27, pageWidth - marginX, 27)
    y = 34

    const ensureSpace = (neededMm: number) => {
        if (y + neededMm > bottomLimit) {
            doc.addPage()
            y = topMargin
        }
    }

    const lines = contractBody.replace(/\r\n/g, '\n').split('\n')

    for (const rawLine of lines) {
        const clean = sanitizePdfLatin1(rawLine).trim()

        if (!clean) {
            y += 3
            continue
        }

        if (/^CONTRATO DE LICENCIAMENTO/i.test(clean)) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.setTextColor(15, 31, 27)
            const wrapped = doc.splitTextToSize(clean, usableWidth)
            ensureSpace(wrapped.length * 5.2 + 3)
            doc.text(wrapped, pageWidth / 2, y, { align: 'center' })
            y += wrapped.length * 5.2 + 2
            continue
        }

        if (/^Contrato N\./i.test(clean)) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9.5)
            doc.setTextColor(21, 94, 75)
            ensureSpace(7)
            doc.text(clean, pageWidth / 2, y, { align: 'center' })
            y += 7
            continue
        }

        if (/^CL[AÁ]USULA\s+\d+/i.test(clean) || /^TESTEMUNHAS:/i.test(clean)) {
            y += 2.5
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.setTextColor(15, 31, 27)
            const wrapped = doc.splitTextToSize(clean, usableWidth)
            ensureSpace(wrapped.length * 5 + 4)
            doc.text(wrapped, marginX, y)
            y += wrapped.length * 4.8
            doc.setDrawColor(220, 226, 223)
            doc.setLineWidth(0.25)
            doc.line(marginX, y + 0.5, pageWidth - marginX, y + 0.5)
            y += 3.5
            continue
        }

        if (/^(CONTRATADA|CONTRATANTE):/i.test(clean)) {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9.5)
            doc.setTextColor(15, 31, 27)
            const wrapped = doc.splitTextToSize(clean, usableWidth)
            ensureSpace(wrapped.length * 4.6 + 3)
            doc.text(wrapped, marginX, y)
            y += wrapped.length * 4.6 + 2.5
            continue
        }

        if (clean.startsWith('____')) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9.5)
            doc.setTextColor(31, 41, 55)
            ensureSpace(14)
            y += 5
            doc.text(clean, marginX, y)
            y += 4.6
            continue
        }

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9.5)
        doc.setTextColor(31, 41, 55)
        const wrapped = doc.splitTextToSize(clean, usableWidth)
        for (const wLine of wrapped) {
            ensureSpace(5)
            doc.text(wLine, marginX, y)
            y += 4.5
        }
        y += 1.4
    }

    // Rodapé oficial com numeração de páginas
    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        doc.setDrawColor(226, 232, 229)
        doc.setLineWidth(0.25)
        doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 111)
        doc.text(
            sanitizePdfLatin1(`CliniGo · ${contractNumber} · Documento Contratual`),
            marginX,
            pageHeight - 9
        )
        doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 9, { align: 'right' })
    }

    doc.save(`${fileNameBase}.pdf`)
}
