/**
 * Gerador Instantâneo de PDFs Comerciais de Alto Impacto Visual (Client-side via jsPDF + jspdf-autotable)
 *
 * 3 Peças Comerciais de Padrão Editorial Healthtech (100% vetoriais, logo oficial redondo e zero cortes de margem):
 *  1. Modelo de Relatório de Continuidade Multidisciplinar (Curva PEI/ABA vetorial + Barras de Ganho + Score Anti-Glosa + Carimbo Assinatura)
 *  2. Apresentação Executiva CliniGO (1 página — Números de Impacto + Fluxo Integrado vetorial + Comparativo Antes × Depois)
 *  3. Proposta Comercial Estratégica (Plano Recomendado + Simulador Visual de ROI + Timeline 7 Dias + Tabela Oficial dos 3 Planos)
 */

import {
    COMMERCIAL_SIGNATURE,
    EXTRA_LICENSE_PRICE_BRL,
    OFFICIAL_COMMERCIAL_PLANS,
    TRIAL_FREE_DAYS,
    formatCurrencyBrl,
    formatSpecialtiesList,
    recommendOfficialPlan,
} from './prospect-templates'

export interface PdfPersonalizationInput {
    clinicName: string
    programFocus: string
    specialties: string[]
    contactName?: string
    estimatedProfessionals?: number
    setupFeeBrl?: number
    setupFeeNote?: string
    proposalValidityDays?: number
    customProposalNote?: string
    needsTiss?: boolean
}

const BRAND_FOREST: [number, number, number] = [17, 77, 62]
const BRAND_TEAL: [number, number, number] = [28, 124, 102]
const BRAND_NAVY: [number, number, number] = [20, 42, 74]
const BRAND_SLATE_DARK: [number, number, number] = [15, 28, 25]
const INK_PRIMARY: [number, number, number] = [18, 34, 30]
const INK_MUTED: [number, number, number] = [78, 94, 90]
const SURFACE_TINT: [number, number, number] = [244, 247, 246]
const SURFACE_MINT: [number, number, number] = [232, 244, 239]
const SURFACE_SOFT_RED: [number, number, number] = [253, 243, 242]
const RED_ACCENT: [number, number, number] = [185, 56, 56]
const BORDER_SUBTLE: [number, number, number] = [214, 223, 219]
const AMBER_BG: [number, number, number] = [254, 247, 230]
const AMBER_BORDER: [number, number, number] = [232, 198, 128]
const AMBER_TEXT: [number, number, number] = [140, 82, 14]
const ACCENT_CORAL: [number, number, number] = [224, 108, 79]
const ACCENT_GOLD: [number, number, number] = [196, 138, 36]

function slugifyFilePart(value: string): string {
    return (
        (value || 'clinica')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 48) || 'clinica'
    )
}

function formatDatePtBr(date: Date): string {
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

/**
 * Ajusta o tamanho da fonte (até minSize) para caber em 1 linha dentro de maxWidth;
 * caso ainda exceda no menor tamanho, trunca com reticências sem jamais ultrapassar a margem.
 */
function drawFittedSingleLine(
    doc: any,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    defaultSize: number,
    minSize = 6.2,
    options?: Record<string, unknown>
): void {
    let fontSize = defaultSize
    doc.setFontSize(fontSize)
    while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
        fontSize = Number((fontSize - 0.35).toFixed(2))
        doc.setFontSize(fontSize)
    }

    let safeText = text
    if (doc.getTextWidth(safeText) > maxWidth) {
        while (safeText.length > 4 && doc.getTextWidth(`${safeText}...`) > maxWidth) {
            safeText = safeText.slice(0, -1)
        }
        safeText = `${safeText.trimEnd()}...`
    }

    doc.text(safeText, x, y, options)
}

function measureWrappedLines(
    doc: any,
    text: string,
    maxWidth: number,
    fontSize: number,
    lineHeight: number,
    maxLines?: number
): { lines: string[]; height: number } {
    doc.setFontSize(fontSize)
    let lines: string[] = doc.splitTextToSize(text, maxWidth)
    if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines)
        let last = lines[maxLines - 1]
        while (last.length > 4 && doc.getTextWidth(`${last}...`) > maxWidth) {
            last = last.slice(0, -1)
        }
        lines[maxLines - 1] = `${last.trimEnd()}...`
    }
    return { lines, height: lines.length * lineHeight }
}

async function loadRoundLogoDataUrl(): Promise<string | null> {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null
    const candidates = ['/logo-clinigo-round.jpg', '/icons/clinigo-pwa-512-v2.png']
    for (const src of candidates) {
        try {
            const img = await new Promise<HTMLImageElement | null>((resolve) => {
                const el = new Image()
                el.crossOrigin = 'anonymous'
                el.onload = () => resolve(el)
                el.onerror = () => resolve(null)
                el.src = src
            })
            if (!img) continue
            const size = 256
            const canvas = document.createElement('canvas')
            canvas.width = size
            canvas.height = size
            const ctx = canvas.getContext('2d')
            if (!ctx) continue

            ctx.clearRect(0, 0, size, size)
            ctx.save()
            ctx.beginPath()
            ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2)
            ctx.closePath()
            ctx.clip()
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, size, size)
            ctx.drawImage(img, 0, 0, size, size)
            ctx.restore()

            return canvas.toDataURL('image/png')
        } catch {
            continue
        }
    }
    return null
}

function drawRoundLogoBadge(doc: any, logoDataUrl: string | null, cx: number, cy: number, radius: number) {
    if (!logoDataUrl) return
    doc.setFillColor(255, 255, 255)
    doc.circle(cx, cy, radius + 0.9, 'F')
    doc.addImage(logoDataUrl, 'PNG', cx - radius, cy - radius, radius * 2, radius * 2)
}

/**
 * Desenha uma matriz QR estilizada vetorial (apenas demonstrativa/visual para selo de autenticidade)
 */
function drawDemoQrStamp(doc: any, x: number, y: number, size: number) {
    const cells = 7
    const cell = size / cells
    const pattern = [
        [1, 1, 1, 0, 1, 1, 1],
        [1, 0, 1, 1, 1, 0, 1],
        [1, 1, 1, 0, 1, 1, 1],
        [0, 1, 0, 1, 0, 1, 0],
        [1, 1, 1, 1, 0, 1, 1],
        [1, 0, 1, 0, 1, 0, 1],
        [1, 1, 1, 0, 1, 1, 0],
    ]
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(x - 1, y - 1, size + 2, size + 2, 1, 1, 'FD')
    doc.setFillColor(...BRAND_SLATE_DARK)
    for (let r = 0; r < cells; r++) {
        for (let c = 0; c < cells; c++) {
            if (pattern[r][c]) {
                doc.rect(x + c * cell, y + r * cell, cell - 0.15, cell - 0.15, 'F')
            }
        }
    }
}

/**
 * Desenha gráfico vetorial real de Curva de Evolução PEI/ABA (Linha de Base → Mês 1 → Mês 2 → Mês 3)
 */
function drawPeiEvolutionChart(
    doc: any,
    x: number,
    y: number,
    w: number,
    h: number,
    series: Array<{ label: string; color: [number, number, number]; points: number[] }>
) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 2, 2, 'FD')

    // Título interno do gráfico
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(doc, 'CURVA DE EVOLUÇÃO PEI / ABA (90 DIAS)', x + 4, y + 6, w - 8, 7.8, 6.5)

    const plotX = x + 11
    const plotY = y + 11
    const plotW = w - 17
    const plotH = h - 25

    // Grade horizontal (0%, 25%, 50%, 75%, 100%)
    const ticks = [0, 25, 50, 75, 100]
    ticks.forEach((pct) => {
        const ty = plotY + plotH - (pct / 100) * plotH
        doc.setDrawColor(232, 237, 235)
        doc.setLineWidth(0.2)
        doc.line(plotX, ty, plotX + plotW, ty)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...INK_MUTED)
        doc.text(`${pct}%`, plotX - 1.5, ty + 1.2, { align: 'right' })
    })

    // Linha tracejada da Meta de Domínio (80%)
    const goalY = plotY + plotH - 0.8 * plotH
    doc.setDrawColor(...ACCENT_GOLD)
    doc.setLineWidth(0.35)
    for (let sx = plotX; sx < plotX + plotW - 2; sx += 3.5) {
        doc.line(sx, goalY, Math.min(sx + 2, plotX + plotW), goalY)
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.8)
    doc.setTextColor(...ACCENT_GOLD)
    doc.text('Meta 80%', plotX + plotW, goalY - 1, { align: 'right' })

    // Eixo X
    const xLabels = ['Base', 'Mês 1', 'Mês 2', 'Mês 3']
    const stepX = plotW / (xLabels.length - 1)
    xLabels.forEach((lbl, idx) => {
        const px = plotX + idx * stepX
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.2)
        doc.setTextColor(...INK_MUTED)
        doc.text(lbl, px, plotY + plotH + 4, { align: 'center' })
    })

    // Curvas e marcadores
    series.forEach((s) => {
        doc.setDrawColor(...s.color)
        doc.setLineWidth(0.85)
        for (let i = 0; i < s.points.length - 1; i++) {
            const x1 = plotX + i * stepX
            const y1 = plotY + plotH - (s.points[i] / 100) * plotH
            const x2 = plotX + (i + 1) * stepX
            const y2 = plotY + plotH - (s.points[i + 1] / 100) * plotH
            doc.line(x1, y1, x2, y2)
        }
        s.points.forEach((val, i) => {
            const px = plotX + i * stepX
            const py = plotY + plotH - (val / 100) * plotH
            doc.setFillColor(255, 255, 255)
            doc.setDrawColor(...s.color)
            doc.setLineWidth(0.6)
            doc.circle(px, py, 1.35, 'FD')
            if (i === s.points.length - 1) {
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(6.2)
                doc.setTextColor(...s.color)
                doc.text(`${val}%`, px - 1, py - 2.3, { align: 'right' })
            }
        })
    })

    // Legenda compacta no rodapé do gráfico
    const legY = y + h - 3.5
    const legSlotW = (w - 8) / series.length
    series.forEach((s, idx) => {
        const lx = x + 4 + idx * legSlotW
        doc.setFillColor(...s.color)
        doc.circle(lx + 1.5, legY - 0.8, 1.2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK_PRIMARY)
        drawFittedSingleLine(doc, s.label, lx + 3.8, legY, legSlotW - 5, 6.2, 5.4)
    })
}

/**
 * Desenha painel de Barras Comparativas de Ganho por Domínio (Linha de Base × Atual)
 */
function drawDomainGainBars(
    doc: any,
    x: number,
    y: number,
    w: number,
    h: number,
    items: Array<{ label: string; before: number; after: number }>
) {
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(doc, 'EVOLUÇÃO POR DOMÍNIO (BASE → 90 DIAS)', x + 4, y + 6, w - 8, 7.8, 6.5)

    const startY = y + 12.5
    const rowStep = (h - 16) / items.length
    const barW = w - 8

    items.forEach((item, idx) => {
        const ry = startY + idx * rowStep
        const gain = item.after - item.before

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK_PRIMARY)
        drawFittedSingleLine(doc, item.label, x + 4, ry, barW - 22, 7.1, 6)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.1)
        doc.setTextColor(...BRAND_TEAL)
        doc.text(`${item.before}% → ${item.after}% (+${gain}pp)`, x + w - 4, ry, { align: 'right' })

        // Trilho cinza
        const barY = ry + 2
        doc.setFillColor(232, 238, 235)
        doc.roundedRect(x + 4, barY, barW, 3.6, 1.2, 1.2, 'F')

        // Barra atual (verde)
        doc.setFillColor(...BRAND_TEAL)
        doc.roundedRect(x + 4, barY, Math.max(4, (item.after / 100) * barW), 3.6, 1.2, 1.2, 'F')

        // Marcador linha de base (navy)
        const baseW = Math.max(3, (item.before / 100) * barW)
        doc.setFillColor(...BRAND_NAVY)
        doc.roundedRect(x + 4, barY, baseW, 3.6, 1.2, 1.2, 'F')
    })
}

interface SpecialtyBlock {
    name: string
    shortName: string
    council: string
    therapist: string
    tussCode: string
    summary: string
    conduct: string
}

function buildSpecialtyBlocks(specialties: string[]): SpecialtyBlock[] {
    const selected = specialties.length > 0 ? specialties : ['Fonoaudiologia', 'Terapia Ocupacional']

    const catalog: Record<string, SpecialtyBlock> = {
        fonoaudiologia: {
            name: 'Fonoaudiologia',
            shortName: 'Fonoaudiologia',
            council: 'CRFa 1-00000 (Exemplo Fictício)',
            therapist: 'Dra. Marina Albuquerque',
            tussCode: '50000616',
            summary:
                'Evolução mensurável em intenção comunicativa, atenção compartilhada e expansão do repertório de mandos funcionais (+34 pp em 90 dias), com redução expressiva de episódios de frustração comunicativa em sala e em casa.',
            conduct:
                'Manutenção de 2 sessões semanais (50 min) com treino de linguagem pragmática, comandos em duas etapas e devolutiva quinzenal aos pais via CliniGo Família.',
        },
        'terapia ocupacional': {
            name: 'Terapia Ocupacional (Integração Sensorial)',
            shortName: 'Terapia Ocupacional',
            council: 'CREFITO-2 00000-TO (Exemplo Fictício)',
            therapist: 'Dra. Camila Nogueira',
            tussCode: '50000144',
            summary:
                'Ganho consistente em regulação sensorial proprioceptiva e tátil, permanência em mesa terapêutica ampliada de 6 para 19 minutos e maior autonomia em AVDs (seletividade alimentar e vestuário).',
            conduct:
                'Continuidade de 2 sessões semanais (50 min) em Integração Sensorial de Ayres e coordenação motora fina aplicada à rotina escolar.',
        },
        'psicologia (aba)': {
            name: 'Psicologia — Intervenção Comportamental (ABA)',
            shortName: 'Psicologia (ABA)',
            council: 'CRP 05/00000 (Exemplo Fictício)',
            therapist: 'Dra. Beatriz Lacerda',
            tussCode: '50000470',
            summary:
                'Redução de 64% na frequência de comportamentos interferentes em ambiente estruturado e aquisição de 11 novos repertórios de imitação e pareamento sob ensino naturalístico (NET) e tentativas discretas (DTT).',
            conduct:
                'Continuidade do plano comportamental com supervisão clínica periódica e monitoramento contínuo das curvas de domínio (critério >= 80%).',
        },
        psicomotricidade: {
            name: 'Psicomotricidade Relacional',
            shortName: 'Psicomotricidade',
            council: 'ABP 0000 (Exemplo Fictício)',
            therapist: 'Prof. Rafael Monteiro',
            tussCode: '50000560',
            summary:
                'Melhora no equilíbrio dinâmico, planejamento motor global (praxia) e percepção espaço-temporal, ampliando a participação em brincadeiras simbólicas e trocas em dupla.',
            conduct:
                'Manutenção de 1 sessão semanal integrada à Terapia Ocupacional para consolidação do esquema corporal.',
        },
        'fisioterapia pediátrica': {
            name: 'Fisioterapia Pediátrica',
            shortName: 'Fisioterapia Pediátrica',
            council: 'CREFITO-2 00000-F (Exemplo Fictício)',
            therapist: 'Dr. Henrique Vasconcelos',
            tussCode: '50000160',
            summary:
                'Progresso em estabilidade de tronco, marcha funcional e controle postural nas transições de solo para ortostatismo, sem fadiga precoce.',
            conduct:
                'Continuidade de 2 sessões semanais focadas em fortalecimento funcional e coordenação bilateral.',
        },
        psicopedagogia: {
            name: 'Psicopedagogia Clínica',
            shortName: 'Psicopedagogia',
            council: 'ABPp 0000 (Exemplo Fictício)',
            therapist: 'Profa. Juliana Rezende',
            tussCode: '50000470',
            summary:
                'Avanço em pré-requisitos de alfabetização, consciência fonológica, atenção sustentada e adaptação pedagógica alinhada à escola regular.',
            conduct:
                'Continuidade de 1 sessão semanal com devolutiva mensal à equipe pedagógica escolar.',
        },
        musicoterapia: {
            name: 'Musicoterapia',
            shortName: 'Musicoterapia',
            council: 'UBAM 0000 (Exemplo Fictício)',
            therapist: 'Prof. Lucas Tavares',
            tussCode: '50000470',
            summary:
                'Ampliação do tempo de troca de turnos, resposta a estímulos rítmicos e engajamento socioafetivo por meio de experiências sonoro-musicais estruturadas.',
            conduct:
                'Manutenção de 1 sessão semanal integrada aos objetivos comunicativos da Fonoaudiologia.',
        },
        'nutrição comportamental': {
            name: 'Nutrição Comportamental (Seletividade Alimentar)',
            shortName: 'Nutrição Comportamental',
            council: 'CRN-4 00000 (Exemplo Fictício)',
            therapist: 'Dra. Larissa Coutinho',
            tussCode: '50000560',
            summary:
                'Expansão gradual de aceitação sensorial para 6 novos alimentos em diferentes texturas, com redução de recusa imediata à mesa e orientação à família.',
            conduct:
                'Acompanhamento quinzenal integrado à Terapia Ocupacional para consolidação do repertório alimentar.',
        },
    }

    return selected.map((spec, index) => {
        const key = spec.trim().toLowerCase()
        if (catalog[key]) return catalog[key]
        const clean = spec.trim()
        return {
            name: clean,
            shortName: clean,
            council: `Registro Profissional 0000${index + 1} (Exemplo Fictício)`,
            therapist: `Especialista Responsável ${index + 1}`,
            tussCode: '50000470',
            summary:
                'Evolução clínica documentada nas sessões do trimestre, com adesão satisfatória ao protocolo individualizado e consolidação progressiva dos marcos estabelecidos no PEI.',
            conduct:
                'Manutenção da carga terapêutica semanal com reavaliação padronizada em 90 dias e alinhamento multidisciplinar contínuo.',
        }
    })
}

function drawFooter(doc: any, pageNum: number, totalPages: number, leftLabel: string) {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK_MUTED)
    drawFittedSingleLine(doc, leftLabel, 14, pageHeight - 8.2, pageWidth - 52, 7.2, 6)
    doc.setFontSize(7.2)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 14, pageHeight - 8.2, { align: 'right' })
}

function drawContinuitySubHeader(doc: any, clinicName: string, programFocus: string, logoDataUrl: string | null) {
    const pageWidth = doc.internal.pageSize.getWidth()
    doc.setFillColor(...BRAND_SLATE_DARK)
    doc.rect(0, 0, pageWidth, 16, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(0, 15.2, pageWidth, 1.2, 'F')

    if (logoDataUrl) {
        drawRoundLogoBadge(doc, logoDataUrl, 19, 8, 5.1)
    }
    const leftX = logoDataUrl ? 27 : 14
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(doc, `${clinicName.toUpperCase()} — ${programFocus}`, leftX, 10.2, pageWidth - leftX - 66, 9.2, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(186, 232, 217)
    doc.text('Prontuário Consolidado · Assinatura Eletrônica', pageWidth - 14, 10.2, { align: 'right' })
}

/**
 * PDF 1 — Modelo de Relatório de Continuidade Multidisciplinar (Padrão Auditoria de Operadora + Gráficos Vetoriais)
 */
export async function generateContinuityReportPdf(input: PdfPersonalizationInput): Promise<string> {
    const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadRoundLogoDataUrl(),
    ])

    const clinicName = (input.clinicName || '').trim() || 'Clínica Modelo Multidisciplinar'
    const programFocus = (input.programFocus || '').trim() || 'Programa de Terapias Seriadas (TEA)'
    const specialties = input.specialties?.length ? input.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const specialtyBlocks = buildSpecialtyBlocks(specialties)
    const specialtiesFormatted = formatSpecialtiesList(specialties)
    const todayStr = formatDatePtBr(new Date())

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const contentWidth = pageWidth - 28

    // --- Cabeçalho Executivo Escuro + Faixa Teal + Selo Score Anti-Glosa ---
    doc.setFillColor(...BRAND_SLATE_DARK)
    doc.rect(0, 0, pageWidth, 34, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(0, 33, pageWidth, 1.5, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 23.5, 17, 10)

    const titleX = logoDataUrl ? 38 : 14
    const scoreBoxW = 34
    const headerMaxW = pageWidth - titleX - scoreBoxW - 18

    doc.setTextColor(152, 228, 204)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(
        doc,
        `DOSSIÊ DE RENOVAÇÃO DE CONVÊNIO · ${programFocus.toUpperCase()}`,
        titleX,
        10.2,
        headerMaxW,
        7.2,
        6
    )

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(doc, clinicName.toUpperCase(), titleX, 18.2, headerMaxW, 15.5, 9.5)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(214, 230, 225)
    drawFittedSingleLine(
        doc,
        `Relatório Consolidado de Frequência, Curvas PEI/ABA e Evoluções Assinadas · ${todayStr}`,
        titleX,
        24.6,
        headerMaxW,
        8.2,
        6.5
    )

    doc.setTextColor(168, 198, 190)
    drawFittedSingleLine(
        doc,
        `Protocolo: RC-${new Date().getFullYear()}-04819  |  Padrão TISS-ANS / RN 539`,
        titleX,
        29.6,
        headerMaxW,
        7,
        6
    )

    // Badge visual "SCORE ANTI-GLOSA 98/100" no canto superior direito
    const scoreX = pageWidth - 14 - scoreBoxW
    doc.setFillColor(...BRAND_FOREST)
    doc.setDrawColor(115, 206, 178)
    doc.setLineWidth(0.4)
    doc.roundedRect(scoreX, 6.5, scoreBoxW, 21, 2.2, 2.2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.8)
    doc.setTextColor(186, 238, 220)
    doc.text('SCORE ANTI-GLOSA', scoreX + scoreBoxW / 2, 11.5, { align: 'center' })
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text('98/100', scoreX + scoreBoxW / 2, 19.5, { align: 'center' })
    doc.setFontSize(5.8)
    doc.setTextColor(152, 232, 205)
    doc.text('PRONTO P/ AUDITORIA', scoreX + scoreBoxW / 2, 24.5, { align: 'center' })

    // --- Faixa LGPD Discreta ---
    doc.setFillColor(...AMBER_BG)
    doc.setDrawColor(...AMBER_BORDER)
    doc.roundedRect(14, 38, contentWidth, 7.5, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...AMBER_TEXT)
    drawFittedSingleLine(
        doc,
        'MODELO DEMONSTRATIVO PERSONALIZADO (CONFORMIDADE LGPD): Paciente, operadora, guias e conselhos abaixo são 100% fictícios.',
        17,
        42.8,
        contentWidth - 6,
        7.1,
        6
    )

    // --- Bloco 1: Ficha do Beneficiário (compacta + altura dinâmica p/ especialidades) ---
    doc.setFont('helvetica', 'normal')
    const specM = measureWrappedLines(doc, `Especialidades Integradas: ${specialtiesFormatted}`, contentWidth - 8, 7.9, 3.8, 3)
    const idY = 48.5
    const idH = 19.5 + specM.height

    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, idY, contentWidth, idH, 2, 2, 'FD')

    doc.setFillColor(...BRAND_TEAL)
    doc.rect(14, idY, 2.2, idH, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('1. IDENTIFICAÇÃO DO BENEFICIÁRIO & SOLICITAÇÃO DE RENOVAÇÃO', 19, idY + 5.2)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK_PRIMARY)
    drawFittedSingleLine(doc, 'Paciente (Fictício): Lucas Henrique M. (6a 4m)  ·  CID-10: F84.0 (TEA)', 19, idY + 10.6, 102, 7.9, 6.6)
    drawFittedSingleLine(doc, 'Operadora: Saúde Exemplo S/A  ·  Guia SADT: 2026-0098412-01', 124, idY + 10.6, 68, 7.9, 6.4)
    drawFittedSingleLine(doc, 'Período Avaliado: Últimos 90 dias  ·  Renovação Solicitada: 180 dias', 19, idY + 15.2, contentWidth - 10, 7.9, 6.6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...BRAND_NAVY)
    doc.text(specM.lines, 19, idY + 20)

    // --- Strip de 4 KPIs Visuais com Barra Superior Colorida ---
    const kpiY = idY + idH + 3.5
    const kpiW = (contentWidth - 9) / 4
    const kpis = [
        { label: 'ASSIDUIDADE REAL', value: '95,8%', sub: '46 de 48 sessões realizadas', bar: BRAND_TEAL },
        { label: 'PROVA DE PRESENÇA', value: '100% Biometria', sub: 'Facial + QR + Carimbo Hora', bar: BRAND_NAVY },
        { label: 'METAS PEI / ABA', value: '11 / 12 metas', sub: '+29 pp ganho médio no ciclo', bar: ACCENT_GOLD },
        {
            label: 'EQUIPE INTEGRADA',
            value: `${specialtyBlocks.length} ${specialtyBlocks.length === 1 ? 'área' : 'áreas'}`,
            sub: 'Assinatura Lei 14.063/2020',
            bar: ACCENT_CORAL,
        },
    ]

    kpis.forEach((kpi, idx) => {
        const kx = 14 + idx * (kpiW + 3)
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(kx, kpiY, kpiW, 19.5, 2, 2, 'FD')
        doc.setFillColor(...kpi.bar)
        doc.rect(kx, kpiY, kpiW, 1.6, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK_MUTED)
        drawFittedSingleLine(doc, kpi.label, kx + 2.8, kpiY + 5.8, kpiW - 5.6, 6.1, 5.4)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_SLATE_DARK)
        drawFittedSingleLine(doc, kpi.value, kx + 2.8, kpiY + 12.2, kpiW - 5.6, 10.2, 7.5)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK_MUTED)
        drawFittedSingleLine(doc, kpi.sub, kx + 2.8, kpiY + 16.8, kpiW - 5.6, 6.5, 5.6)
    })

    // --- PAINEL VISUAL DUPLO: Curva PEI/ABA (Esq) + Barras de Ganho por Domínio (Dir) ---
    const chartsY = kpiY + 23
    const chartH = 54
    const leftChartW = (contentWidth - 4) * 0.54
    const rightChartW = contentWidth - 4 - leftChartW

    drawPeiEvolutionChart(doc, 14, chartsY, leftChartW, chartH, [
        { label: specialtyBlocks[0]?.shortName || 'Fonoaudiologia', color: BRAND_TEAL, points: [32, 44, 57, 68] },
        {
            label: (specialtyBlocks[1] || specialtyBlocks[0])?.shortName || 'Terapia Ocupacional',
            color: BRAND_NAVY,
            points: [40, 52, 64, 74],
        },
        { label: 'Autonomia AVDs', color: ACCENT_CORAL, points: [45, 54, 62, 71] },
    ])

    drawDomainGainBars(doc, 14 + leftChartW + 4, chartsY, rightChartW, chartH, [
        { label: 'Comunicação Funcional', before: 32, after: 68 },
        { label: 'Integração Sensorial', before: 40, after: 74 },
        { label: 'Autonomia em AVDs', before: 45, after: 71 },
        { label: 'Atenção Compartilhada', before: 38, after: 63 },
    ])

    // --- Seção 2: Quadro Auditável de Frequência Validada ---
    const sec2Y = chartsY + chartH + 6.5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        '2. EXTRATO AUDITÁVEL DE FREQUÊNCIA E PROVA DE PRESENÇA (ANTI-GLOSA TISS)',
        14,
        sec2Y,
        contentWidth,
        8.8,
        7.2
    )

    const sampleDates = ['04/11', '06/11', '11/11', '13/11', '18/11', '20/11', '25/11', '27/11']
    const attendanceRows = sampleDates.map((day, idx) => {
        const block = specialtyBlocks[idx % specialtyBlocks.length]
        return [
            `${day}/2026`,
            idx % 2 === 0 ? '09:00-09:50' : '10:00-10:50',
            block.shortName,
            block.tussCode,
            block.therapist,
            idx % 3 === 0 ? 'QR Code + Resp.' : 'Biometria (99,2%)',
            'Validada',
        ]
    })

    autoTable(doc, {
        startY: sec2Y + 2.6,
        margin: { left: 14, right: 14 },
        head: [['Data', 'Horário', 'Especialidade', 'TUSS', 'Profissional', 'Prova Presença', 'Status']],
        body: attendanceRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.2,
            cellPadding: 1.9,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: BRAND_SLATE_DARK,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.2,
        },
        alternateRowStyles: {
            fillColor: [247, 250, 249],
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 21 },
            2: { cellWidth: 34 },
            3: { cellWidth: 18 },
            4: { cellWidth: 37 },
            5: { cellWidth: 32 },
            6: { cellWidth: 22, fontStyle: 'bold', textColor: BRAND_TEAL, halign: 'center' },
        },
    })

    // ================= PÁGINA 2+: EVOLUÇÕES ASSINADAS + SELO CRIPTOGRÁFICO + PARECER =================
    doc.addPage()
    drawContinuitySubHeader(doc, clinicName, programFocus, logoDataUrl)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        '3. SÍNTESE CLÍNICA E EVOLUÇÕES ASSINADAS POR ESPECIALIDADE',
        14,
        24,
        contentWidth,
        9.2,
        7.5
    )

    let cursorY = 28.5
    const maxPageContentY = 276

    specialtyBlocks.forEach((block, idx) => {
        doc.setFont('helvetica', 'normal')
        const summaryM = measureWrappedLines(doc, `Evolução clínica: ${block.summary}`, contentWidth - 10, 7.9, 3.8, 4)
        const conductM = measureWrappedLines(doc, `Conduta recomendada: ${block.conduct}`, contentWidth - 10, 7.7, 3.7, 3)
        const boxHeight = 13.5 + summaryM.height + 1.8 + conductM.height + 10

        if (cursorY + boxHeight > maxPageContentY) {
            doc.addPage()
            drawContinuitySubHeader(doc, clinicName, programFocus, logoDataUrl)
            cursorY = 24
        }

        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(14, cursorY, contentWidth, boxHeight, 2, 2, 'FD')

        // Barra lateral colorida alternada
        const accent = idx % 3 === 0 ? BRAND_TEAL : idx % 3 === 1 ? BRAND_NAVY : ACCENT_CORAL
        doc.setFillColor(...accent)
        doc.rect(14, cursorY, 2.5, boxHeight, 'F')

        doc.setFillColor(...SURFACE_TINT)
        doc.rect(16.5, cursorY, contentWidth - 2.5, 11, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_SLATE_DARK)
        drawFittedSingleLine(
            doc,
            `${idx + 1}. ${block.name}  ·  TUSS ${block.tussCode}`,
            19.5,
            cursorY + 5,
            contentWidth - 11,
            8.5,
            7
        )

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK_MUTED)
        drawFittedSingleLine(
            doc,
            `${block.therapist} · ${block.council}`,
            19.5,
            cursorY + 9.4,
            contentWidth - 11,
            7.2,
            6.2
        )

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.9)
        doc.setTextColor(...INK_PRIMARY)
        doc.text(summaryM.lines, 19.5, cursorY + 15.2)

        const conductY = cursorY + 15.2 + summaryM.height + 1.5
        doc.setFontSize(7.7)
        doc.setTextColor(...INK_MUTED)
        doc.text(conductM.lines, 19.5, conductY)

        // Carimbo de assinatura eletrônica
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.line(19.5, cursorY + boxHeight - 6.8, pageWidth - 18, cursorY + boxHeight - 6.8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_TEAL)
        drawFittedSingleLine(
            doc,
            `ASSINADO ELETRONICAMENTE (LEI 14.063/2020) · ${todayStr} · HASH SHA-256: 9f4e...c18${idx + 2}a`,
            19.5,
            cursorY + boxHeight - 2.7,
            contentWidth - 11,
            6.8,
            5.8
        )

        cursorY += boxHeight + 4
    })

    // --- Bloco 4: Parecer Integrado + Selo QR de Autenticidade + CTA CliniGO ---
    const parecerText =
        `Com assiduidade comprovada de 95,8% (biometria facial + carimbo de data/hora), evolução média de +29 pontos percentuais ` +
        `nas metas do PEI (${specialtiesFormatted}) e evoluções assinadas por cada conselho, a equipe multidisciplinar da ${clinicName} ` +
        `recomenda a renovação integral do ciclo terapêutico por 180 dias (RN 539/2022 ANS). A interrupção acarreta risco documentado de regressão funcional.`
    doc.setFont('helvetica', 'normal')
    const parecerM = measureWrappedLines(doc, parecerText, contentWidth - 32, 7.9, 3.8, 5)
    const parecerH = Math.max(29, 13 + parecerM.height + 4)

    const ctaBody =
        `Na prática, a coordenação da ${clinicName} gera um PDF exatamente neste padrão com 1 clique: sem cobrar arquivos ` +
        `de cada terapeuta, sem montar planilha de frequência na mão e já pronto para anexar no lote XML TISS.`
    const ctaBodyM = measureWrappedLines(doc, ctaBody, contentWidth - 10, 7.9, 3.8, 3)
    const ctaH = 15.5 + ctaBodyM.height + 6

    if (cursorY + parecerH + 5 + ctaH > maxPageContentY) {
        doc.addPage()
        drawContinuitySubHeader(doc, clinicName, programFocus, logoDataUrl)
        cursorY = 24
    }

    doc.setFillColor(...SURFACE_MINT)
    doc.setDrawColor(...BRAND_TEAL)
    doc.setLineWidth(0.45)
    doc.roundedRect(14, cursorY, contentWidth, parecerH, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_FOREST)
    drawFittedSingleLine(
        doc,
        '4. PARECER MULTIDISCIPLINAR E VALIDAÇÃO DE INTEGRIDADE (RN 539/2022 ANS)',
        18,
        cursorY + 6.4,
        contentWidth - 32,
        8.4,
        7
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.9)
    doc.setTextColor(...INK_PRIMARY)
    doc.text(parecerM.lines, 18, cursorY + 12)

    // Mini QR demonstrativo de integridade no canto direito da caixa
    drawDemoQrStamp(doc, pageWidth - 14 - 22, cursorY + 4.5, 17)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.4)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('VERIFICAÇÃO', pageWidth - 14 - 13.5, cursorY + 25, { align: 'center' })

    const ctaY = cursorY + parecerH + 4.5
    doc.setFillColor(...BRAND_NAVY)
    doc.roundedRect(14, ctaY, contentWidth, ctaH, 2, 2, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(14, ctaY, 3, ctaH, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(
        doc,
        `Relatório gerado em 1 clique no CliniGO — personalizado para a ${clinicName}`,
        20,
        ctaY + 7.2,
        contentWidth - 12,
        9.1,
        7.4
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.9)
    doc.setTextColor(218, 229, 242)
    doc.text(ctaBodyM.lines, 20, ctaY + 12.6)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(152, 232, 205)
    drawFittedSingleLine(
        doc,
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.website}`,
        20,
        ctaY + ctaH - 3.8,
        contentWidth - 12,
        8,
        6.5
    )

    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        drawFooter(
            doc,
            p,
            totalPages,
            `Exemplo gerado na plataforma CliniGO (clinigo.app) — Personalizado para ${clinicName} · Dados 100% fictícios (LGPD)`
        )
    }

    const fileName = `modelo-relatorio-continuidade-${slugifyFilePart(clinicName)}.pdf`
    doc.save(fileName)
    return fileName
}

/**
 * PDF 2 — Apresentação Executiva CliniGO (1 Página de Alto Impacto — Números, Fluxo Vetorial e Antes × Depois)
 */
export async function generateExecutivePresentationPdf(input: PdfPersonalizationInput): Promise<string> {
    const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadRoundLogoDataUrl(),
    ])

    const clinicName = (input.clinicName || '').trim() || 'Sua Clínica'
    const programFocus = (input.programFocus || '').trim() || 'Terapias Multidisciplinares'
    const specialties = input.specialties?.length ? input.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const specialtiesFormatted = formatSpecialtiesList(specialties)
    const todayStr = formatDatePtBr(new Date())

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const contentWidth = pageWidth - 28

    // --- Hero Executivo Escuro + Faixa Teal + Logo Oficial Redondo ---
    doc.setFillColor(...BRAND_SLATE_DARK)
    doc.rect(0, 0, pageWidth, 38, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(0, 36.8, pageWidth, 1.5, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 24.5, 19, 10.8)

    const headerX = logoDataUrl ? 40 : 14
    const headerMaxW = pageWidth - headerX - 14

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(148, 228, 202)
    drawFittedSingleLine(
        doc,
        `APRESENTAÇÃO EXECUTIVA · PREPARADA PARA ${clinicName.toUpperCase()} (${programFocus.toUpperCase()})`,
        headerX,
        10.5,
        headerMaxW,
        7.3,
        6
    )

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(
        doc,
        'Menos retrabalho na coordenação. Zero glosa por falta de prova.',
        headerX,
        19.5,
        headerMaxW,
        13.5,
        9.5
    )

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(214, 230, 225)
    const subM = measureWrappedLines(
        doc,
        `Sistema único para clínicas de ${specialtiesFormatted}: agenda recorrente, presença biométrica, prontuário PEI/ABA, relatório de renovação em 1 clique, XML TISS-ANS e folha de repasse.`,
        headerMaxW,
        8,
        3.7,
        2
    )
    doc.setFontSize(8)
    doc.text(subM.lines, headerX, 25.8)

    // --- 3 Números de Impacto (Hero KPI Strip) ---
    const impactY = 43
    const impactW = (contentWidth - 8) / 3
    const impacts = [
        {
            metric: '-6h / semana',
            title: 'Economizadas pela coordenação',
            desc: 'Fim da montagem manual de relatórios de convênio e cobrança de evoluções.',
            accent: BRAND_TEAL,
        },
        {
            metric: '1 clique',
            title: 'Relatório + Dossiê Anti-Glosa',
            desc: 'Frequência biométrica, curvas PEI/ABA e evoluções assinadas no mesmo PDF.',
            accent: BRAND_NAVY,
        },
        {
            metric: '100% TISS-ANS',
            title: 'XML Validado + Repasse Automático',
            desc: 'Da sala de atendimento ao lote XML ISO-8859-1 e folha dos terapeutas.',
            accent: ACCENT_CORAL,
        },
    ]

    impacts.forEach((item, idx) => {
        const ix = 14 + idx * (impactW + 4)
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(ix, impactY, impactW, 27, 2, 2, 'FD')
        doc.setFillColor(...item.accent)
        doc.rect(ix, impactY, impactW, 2, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...item.accent)
        drawFittedSingleLine(doc, item.metric, ix + 3.5, impactY + 9.5, impactW - 7, 13.5, 10)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_SLATE_DARK)
        drawFittedSingleLine(doc, item.title, ix + 3.5, impactY + 15, impactW - 7, 7.6, 6.4)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.9)
        doc.setTextColor(...INK_MUTED)
        doc.text(doc.splitTextToSize(item.desc, impactW - 7), ix + 3.5, impactY + 19.3)
    })

    // --- Diagrama Vetorial do Fluxo Único Integrado (5 Etapas Conectadas com Setas) ---
    const flowY = 75
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        `COMO O CLINIGO CONECTA TODA A OPERAÇÃO DA ${clinicName.toUpperCase()} DE PONTA A PONTA`,
        14,
        flowY,
        contentWidth,
        8.6,
        7
    )

    const steps = [
        { num: '01', title: 'Agenda & Co-terapia', sub: 'Séries semanais e reposições' },
        { num: '02', title: 'Check-in Facial', sub: 'Prova biométrica de presença' },
        { num: '03', title: 'Evolução & PEI', sub: 'Sigilo CRP/CRFa/CREFITO' },
        { num: '04', title: 'Relatório 1-Clique', sub: 'Renovação p/ convênio' },
        { num: '05', title: 'TISS & Repasse', sub: 'Lote XML + folha automática' },
    ]
    const gapArrow = 3.2
    const stepW = (contentWidth - gapArrow * 4) / 5
    const stepBoxY = flowY + 3

    steps.forEach((st, idx) => {
        const sx = 14 + idx * (stepW + gapArrow)
        doc.setFillColor(...SURFACE_MINT)
        doc.setDrawColor(...BRAND_TEAL)
        doc.setLineWidth(0.35)
        doc.roundedRect(sx, stepBoxY, stepW, 20, 2, 2, 'FD')

        // Círculo numerado
        doc.setFillColor(...BRAND_FOREST)
        doc.circle(sx + 5.2, stepBoxY + 5.2, 3.1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.2)
        doc.setTextColor(255, 255, 255)
        doc.text(st.num, sx + 5.2, stepBoxY + 6.4, { align: 'center' })

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_SLATE_DARK)
        drawFittedSingleLine(doc, st.title, sx + 2.2, stepBoxY + 12.2, stepW - 4.4, 7.2, 6)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK_MUTED)
        drawFittedSingleLine(doc, st.sub, sx + 2.2, stepBoxY + 16.5, stepW - 4.4, 6.2, 5.4)

        // Seta vetorial conectando à próxima etapa
        if (idx < steps.length - 1) {
            const ax = sx + stepW + 0.5
            const ay = stepBoxY + 10
            doc.setDrawColor(...BRAND_FOREST)
            doc.setLineWidth(0.5)
            doc.line(ax, ay, ax + gapArrow - 1.2, ay)
            doc.setFillColor(...BRAND_FOREST)
            doc.triangle(ax + gapArrow - 1.5, ay - 1.2, ax + gapArrow - 1.5, ay + 1.2, ax + gapArrow - 0.1, ay, 'F')
        }
    })

    // --- Comparativo Visceral: ROTINA ATUAL (Sistemas Genéricos/Planilhas) × COM O CLINIGO ---
    const compTitleY = 104
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        'O QUE MUDA NA PRÁTICA NA PRIMEIRA SEMANA DE USO',
        14,
        compTitleY,
        contentWidth,
        8.8,
        7.2
    )

    autoTable(doc, {
        startY: compTitleY + 2.8,
        margin: { left: 14, right: 14 },
        head: [['Gargalo Diário', 'Rotina Fragmentada (Planilhas / Sistema Comum)', 'Com o CliniGO na Clínica']],
        body: [
            [
                'Renovação de Convênio',
                'Coordenação pede textos por WhatsApp, junta PDFs soltos e confere frequência na mão.',
                'PDF único em 1 clique: frequência biométrica + curvas PEI/ABA + evoluções assinadas.',
            ],
            [
                'Glosas & Faturamento TISS',
                'Erros de guia/carteirinha só aparecem 45 dias depois; sem provas rápidas para recurso.',
                'Escudo Anti-Glosa antes do XML ANS (ISO-8859-1) + Dossiê de recurso em 1 clique.',
            ],
            [
                'Repasse aos Terapeutas',
                'Planilha mensal manual sujeita a erro e discussões sobre sessões não evoluídas.',
                'Sessão evoluída e assinada já entra automaticamente na folha de repasse com sigilo RBAC.',
            ],
            [
                'Relação com as Famílias',
                'Pais cobram retorno no WhatsApp pessoal dos terapeutas; pouca visibilidade da evolução.',
                'CliniGo Família (sem instalar app): boletim acolhedor + atividades em casa integradas.',
            ],
            [
                'Adoção pela Equipe',
                'Precisa parar a agenda inteira para semanas de treinamento que novos funcionários perdem.',
                'Guia de Uso passo a passo dentro de cada tela + CliniGo Academy por perfil de acesso.',
            ],
        ],
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.4,
            cellPadding: 2.3,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: BRAND_SLATE_DARK,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.6,
        },
        columnStyles: {
            0: { cellWidth: 34, fontStyle: 'bold', fillColor: SURFACE_TINT, textColor: BRAND_NAVY },
            1: { cellWidth: 72, fillColor: SURFACE_SOFT_RED, textColor: [110, 42, 42] },
            2: { cellWidth: 76, fillColor: SURFACE_MINT, fontStyle: 'bold', textColor: BRAND_FOREST },
        },
    })

    // --- Planos Transparentes (3 Cards Compactos e Elegantes) ---
    const plansY = ((doc as any).lastAutoTable?.finalY || 184) + 7
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        'PLANOS TRANSPARENTES · 1 UNIDADE OPERACIONAL · 7 DIAS DE TESTE GRATUITO',
        14,
        plansY,
        contentWidth,
        8.6,
        7.2
    )

    const planW = (contentWidth - 8) / 3
    const planH = 31
    OFFICIAL_COMMERCIAL_PLANS.forEach((plan, idx) => {
        const px = 14 + idx * (planW + 4)
        const py = plansY + 3
        const isPro = plan.id === 'PROFESSIONAL'

        doc.setFillColor(isPro ? 232 : 255, isPro ? 244 : 255, isPro ? 239 : 255)
        doc.setDrawColor(...(isPro ? BRAND_TEAL : BORDER_SUBTLE))
        doc.setLineWidth(isPro ? 0.55 : 0.25)
        doc.roundedRect(px, py, planW, planH, 2, 2, 'FD')

        if (isPro) {
            doc.setFillColor(...BRAND_TEAL)
            doc.roundedRect(px + planW - 22, py + 2.2, 19.5, 4.4, 1, 1, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(5.4)
            doc.setTextColor(255, 255, 255)
            doc.text('TISS + BIOMETRIA', px + planW - 12.2, py + 5.2, { align: 'center' })
        }

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_NAVY)
        drawFittedSingleLine(doc, plan.name, px + 3.2, py + 6.5, isPro ? planW - 26 : planW - 6.4, 8.6, 7)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_FOREST)
        drawFittedSingleLine(doc, plan.priceFormatted, px + 3.2, py + 13.5, planW - 6.4, 12, 9)

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...INK_PRIMARY)
        drawFittedSingleLine(doc, plan.licensesLabel, px + 3.2, py + 18.8, planW - 6.4, 7.3, 6.3)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.8)
        doc.setTextColor(...INK_MUTED)
        const desc =
            plan.id === 'BASICO'
                ? 'Agenda, Prontuário, QR Code e Teleconsulta'
                : plan.id === 'AVANCADO'
                  ? 'Tudo do Básico + BI Terapia, DRE e Repasses'
                  : 'Tudo do Avançado + XML TISS, Glosas e Biometria'
        doc.text(doc.splitTextToSize(desc, planW - 6.4), px + 3.2, py + 23.4)
    })

    // --- Rodapé CTA Executivo Escuro ---
    const ctaY = Math.min(plansY + 3 + planH + 5, 254)
    doc.setFillColor(...BRAND_SLATE_DARK)
    doc.roundedRect(14, ctaY, contentWidth, 24, 2, 2, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(14, ctaY, 3, 24, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(
        doc,
        `Quer ver o fluxo real da ${clinicName} ao vivo em 15 minutos?`,
        20,
        ctaY + 7.8,
        contentWidth - 12,
        9.8,
        7.5
    )

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(214, 230, 225)
    drawFittedSingleLine(
        doc,
        'Agende uma demonstração direta com a coordenação ou libere seu teste gratuito de 7 dias sem compromisso:',
        20,
        ctaY + 13.6,
        contentWidth - 12,
        7.9,
        6.5
    )

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(152, 232, 205)
    drawFittedSingleLine(
        doc,
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}`,
        20,
        ctaY + 19.6,
        contentWidth - 12,
        8.2,
        6.5
    )

    drawFooter(
        doc,
        1,
        1,
        `CliniGO — Apresentação Executiva para ${clinicName} · ${todayStr} · Licença extra R$ 49,90/mês · Conformidade LGPD`
    )

    const fileName = `apresentacao-executiva-clinigo-${slugifyFilePart(clinicName)}.pdf`
    doc.save(fileName)
    return fileName
}

/**
 * PDF 3 — Proposta Comercial Estratégica (Plano Recomendado + Simulador Visual de ROI + Timeline 7 Dias + Tabela Oficial)
 */
export async function generateCommercialProposalPdf(input: PdfPersonalizationInput): Promise<string> {
    const [{ default: jsPDF }, { default: autoTable }, logoDataUrl] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadRoundLogoDataUrl(),
    ])

    const clinicName = (input.clinicName || '').trim() || 'Clínica Parceira'
    const programFocus = (input.programFocus || '').trim() || 'Atendimento Multidisciplinar'
    const contactName = (input.contactName || '').trim() || 'Diretoria / Coordenação'
    const estimatedProfessionals = Math.max(1, Number(input.estimatedProfessionals) || 8)
    const needsTiss = input.needsTiss !== false
    const validityDays = Math.max(1, Number(input.proposalValidityDays) || 15)
    const setupFeeBrl = Math.max(0, Number(input.setupFeeBrl) || 0)
    const setupFeeNote = (input.setupFeeNote || '').trim()
    const customNote = (input.customProposalNote || '').trim()

    const recommendation = recommendOfficialPlan(estimatedProfessionals, needsTiss)
    const today = new Date()
    const validUntil = new Date(today)
    validUntil.setDate(validUntil.getDate() + validityDays)

    // Estimativa conservadora de ROI para clínica multidisciplinar (baseada no nº de profissionais)
    const estimatedSessionsMonth = estimatedProfessionals * 65
    const estimatedGlosaSavedBrl = Math.max(950, Math.round(estimatedSessionsMonth * 0.03 * 95))
    const roiMultiple = (estimatedGlosaSavedBrl / recommendation.monthlyTotal).toFixed(1)

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const contentWidth = pageWidth - 28

    // --- Cabeçalho Proposta ---
    doc.setFillColor(...BRAND_NAVY)
    doc.rect(0, 0, pageWidth, 33, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.rect(0, 32, pageWidth, 1.4, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 23.5, 16.5, 9.8)

    const titleX = logoDataUrl ? 38 : 14
    const headerMaxW = pageWidth - titleX - 14

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(152, 232, 205)
    drawFittedSingleLine(
        doc,
        `PROPOSTA COMERCIAL PERSONALIZADA · VALIDADE ${validityDays} DIAS`,
        titleX,
        10,
        headerMaxW,
        7.3,
        6
    )

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(doc, `${clinicName.toUpperCase()} (${programFocus})`, titleX, 18, headerMaxW, 14, 9)

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(204, 220, 238)
    drawFittedSingleLine(
        doc,
        `A/C: ${contactName}  |  Emissão: ${formatDatePtBr(today)}  |  Válida até: ${formatDatePtBr(validUntil)}`,
        titleX,
        25.2,
        headerMaxW,
        8,
        6.5
    )

    // --- BLOCO DUPLO: Recomendação sob Medida (Esq 58%) + Simulador Visual de ROI (Dir 42%) ---
    const topBlockY = 38
    const leftW = (contentWidth - 4) * 0.58
    const rightW = contentWidth - 4 - leftW

    doc.setFont('helvetica', 'normal')
    const rationaleM = measureWrappedLines(doc, recommendation.rationale, leftW - 8, 7.6, 3.6, 3)
    const setupLabel =
        setupFeeBrl > 0
            ? `Taxa única de implantação: ${formatCurrencyBrl(setupFeeBrl)}${setupFeeNote ? ` (${setupFeeNote})` : ''}`
            : `Implantação: ${setupFeeNote || 'Isenta nesta condição'} · ${TRIAL_FREE_DAYS} dias grátis`
    doc.setFont('helvetica', 'bold')
    const setupM = measureWrappedLines(doc, setupLabel, leftW - 8, 7.2, 3.4, 2)
    const topBlockH = Math.max(38, 19 + rationaleM.height + 2 + setupM.height + 3)

    // Card Esquerdo: Plano Recomendado
    doc.setFillColor(...SURFACE_MINT)
    doc.setDrawColor(...BRAND_TEAL)
    doc.setLineWidth(0.5)
    doc.roundedRect(14, topBlockY, leftW, topBlockH, 2.2, 2.2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_FOREST)
    drawFittedSingleLine(
        doc,
        `PLANO RECOMENDADO (${estimatedProfessionals} PROFISSIONAIS)`,
        18,
        topBlockY + 5.8,
        leftW - 8,
        7.5,
        6.2
    )

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        `${recommendation.plan.name} — ${recommendation.monthlyTotalFormatted}/mês`,
        18,
        topBlockY + 13,
        leftW - 8,
        12.2,
        8.8
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.6)
    doc.setTextColor(...INK_PRIMARY)
    doc.text(rationaleM.lines, 18, topBlockY + 18.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.2)
    doc.setTextColor(...BRAND_FOREST)
    doc.text(setupM.lines, 18, topBlockY + 18.5 + rationaleM.height + 2)

    // Card Direito: Simulador Visual de ROI (Por que o sistema se paga)
    const roiX = 14 + leftW + 4
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.setLineWidth(0.35)
    doc.roundedRect(roiX, topBlockY, rightW, topBlockH, 2.2, 2.2, 'FD')
    doc.setFillColor(...BRAND_NAVY)
    doc.rect(roiX, topBlockY, rightW, 1.8, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(doc, 'RETORNO ESTIMADO (ROI ANTI-GLOSA)', roiX + 3.5, topBlockY + 6.5, rightW - 7, 7.2, 6)

    // Barra 1: Investimento mensal
    const barMaxW = rightW - 7
    const investRatio = Math.max(0.18, Math.min(0.45, recommendation.monthlyTotal / estimatedGlosaSavedBrl))
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...INK_MUTED)
    drawFittedSingleLine(
        doc,
        `Investimento CliniGO: ${recommendation.monthlyTotalFormatted}/mês`,
        roiX + 3.5,
        topBlockY + 12.2,
        barMaxW,
        6.8,
        5.8
    )
    doc.setFillColor(232, 237, 235)
    doc.roundedRect(roiX + 3.5, topBlockY + 13.6, barMaxW, 3.8, 1, 1, 'F')
    doc.setFillColor(...BRAND_NAVY)
    doc.roundedRect(roiX + 3.5, topBlockY + 13.6, barMaxW * investRatio, 3.8, 1, 1, 'F')

    // Barra 2: Glosas evitadas + horas salvas
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_TEAL)
    drawFittedSingleLine(
        doc,
        `Receita protegida (est.): ~${formatCurrencyBrl(estimatedGlosaSavedBrl)}/mês`,
        roiX + 3.5,
        topBlockY + 22.8,
        barMaxW,
        6.8,
        5.8
    )
    doc.setFillColor(232, 237, 235)
    doc.roundedRect(roiX + 3.5, topBlockY + 24.2, barMaxW, 3.8, 1, 1, 'F')
    doc.setFillColor(...BRAND_TEAL)
    doc.roundedRect(roiX + 3.5, topBlockY + 24.2, barMaxW * 0.92, 3.8, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_FOREST)
    drawFittedSingleLine(
        doc,
        `Retorno estimado: ${roiMultiple}x o valor da mensalidade`,
        roiX + 3.5,
        topBlockY + topBlockH - 3.5,
        barMaxW,
        7.1,
        6
    )

    // --- Tabela Oficial dos 3 Planos ---
    const tableTitleY = topBlockY + topBlockH + 6.5
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(doc, 'TABELA OFICIAL DE PLANOS E CAPACIDADES (VIGENTE)', 14, tableTitleY, contentWidth, 8.8, 7.2)

    autoTable(doc, {
        startY: tableTitleY + 2.5,
        margin: { left: 14, right: 14 },
        head: [['Recurso / Capacidade', 'Básico\nR$ 149/mês', 'Avançado\nR$ 249/mês', 'Professional\nR$ 449/mês']],
        body: [
            ['Licenças de profissionais incluídas', '1 licença', 'Até 5 licenças', 'Até 30 licenças'],
            ['Unidade operacional por assinatura', '1 unidade', '1 unidade', '1 unidade'],
            ['Licença adicional avulsa', 'R$ 49,90/mês', 'R$ 49,90/mês', 'R$ 49,90/mês'],
            ['Agenda recorrente e atendimentos', 'Ilimitados', 'Ilimitados', 'Ilimitados'],
            ['Prontuário por especialidade e PEI/ABA', 'Incluído', 'Incluído', 'Incluído'],
            ['Teleconsulta WebRTC e Check-in QR Code', 'Incluído', 'Incluído', 'Incluído'],
            ['Guia de Uso integrado e CliniGo Academy', 'Incluído', 'Incluído', 'Incluído'],
            ['BI de Terapia e conformidade de evoluções', '—', 'Incluído', 'Incluído'],
            ['Folha de repasse com sigilo RBAC e DRE', '—', 'Incluído', 'Incluído'],
            ['WhatsApp por setores, CRM e Importação Excel', '—', 'Incluído', 'Incluído'],
            ['Faturamento TISS completo e lotes XML ANS', '—', '—', 'Incluído'],
            ['Gestão de Glosas 3 níveis + Dossiê 1-Clique', '—', '—', 'Incluído'],
            ['Check-in Biométrico Facial, Totem e TV', '—', '—', 'Incluído'],
            ['API, webhooks e SLA 99,5%', '—', '—', 'Incluído'],
        ],
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.2,
            cellPadding: 1.7,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: BRAND_SLATE_DARK,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7.6,
        },
        columnStyles: {
            0: { cellWidth: 84, halign: 'left', fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fillColor: SURFACE_MINT, fontStyle: 'bold', textColor: BRAND_FOREST },
        },
        alternateRowStyles: {
            fillColor: [250, 251, 250],
        },
    })

    // --- Timeline Vetorial de Implantação Autônoma em 7 Dias (Sem Parar a Clínica) ---
    const timelineTitleY = ((doc as any).lastAutoTable?.finalY || 175) + 6
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BRAND_NAVY)
    drawFittedSingleLine(
        doc,
        'IMPLANTAÇÃO RÁPIDA E AUTÔNOMA EM 7 DIAS (SEM PARAR A AGENDA DA CLÍNICA)',
        14,
        timelineTitleY,
        contentWidth,
        8.2,
        6.8
    )

    const tlY = timelineTitleY + 4
    const tlSteps = [
        { day: 'DIA 1', title: 'Setup & Importação', desc: 'Pacientes e equipe via Excel' },
        { day: 'DIAS 2–3', title: 'Agenda & Recepção', desc: 'Séries semanais e Check-in' },
        { day: 'DIAS 4–5', title: 'Equipe Clínica', desc: 'Guia Integrado + Academy' },
        { day: 'DIAS 6–7', title: '1º Relatório & TISS', desc: 'Validação real sem compromisso' },
    ]
    const tlW = (contentWidth - 6) / 4
    // Linha horizontal conectora
    doc.setDrawColor(...BRAND_TEAL)
    doc.setLineWidth(0.5)
    doc.line(14 + tlW / 2, tlY + 3.2, pageWidth - 14 - tlW / 2, tlY + 3.2)

    tlSteps.forEach((step, idx) => {
        const sx = 14 + idx * (tlW + 2)
        const cx = sx + tlW / 2
        doc.setFillColor(...BRAND_FOREST)
        doc.roundedRect(cx - 11, tlY, 22, 6.2, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.2)
        doc.setTextColor(255, 255, 255)
        doc.text(step.day, cx, tlY + 4.2, { align: 'center' })

        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_SLATE_DARK)
        drawFittedSingleLine(doc, step.title, cx, tlY + 11.2, tlW - 2, 7.2, 6, { align: 'center' })

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...INK_MUTED)
        drawFittedSingleLine(doc, step.desc, cx, tlY + 15.2, tlW - 2, 6.4, 5.5, { align: 'center' })
    })

    // --- Condições Comerciais Compactas ---
    const condYStart = tlY + 19.5
    const condLines = [
        `• Avaliação gratuita de ${TRIAL_FREE_DAYS} dias sem compromisso · 1 unidade operacional por assinatura · Licença extra: ${formatCurrencyBrl(EXTRA_LICENSE_PRICE_BRL)}/mês.`,
        '• Capacitação 100% autônoma pelo Guia de Uso Integrado e CliniGo Academy · Conformidade LGPD, RLS e assinatura eletrônica (Lei 14.063/2020).',
    ]
    if (customNote) {
        condLines.push(`• Condição especial: ${customNote}`)
    }
    doc.setFont('helvetica', 'normal')
    const wrappedConds = condLines.map((l) => measureWrappedLines(doc, l, contentWidth - 8, 7.2, 3.4, 2))
    const condH = 4 + wrappedConds.reduce((acc, w) => acc + w.height + 0.8, 0) + 2

    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, condYStart, contentWidth, condH, 2, 2, 'FD')

    let cy = condYStart + 5
    wrappedConds.forEach((w, idx) => {
        doc.setFont('helvetica', idx === 2 ? 'bold' : 'normal')
        doc.setFontSize(7.2)
        doc.setTextColor(...(idx === 2 ? BRAND_FOREST : INK_PRIMARY))
        doc.text(w.lines, 18, cy)
        cy += w.height + 0.8
    })

    // --- CTA Final ---
    const signY = Math.min(condYStart + condH + 4, 255)
    doc.setFillColor(...BRAND_FOREST)
    doc.roundedRect(14, signY, contentWidth, 23, 2, 2, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    drawFittedSingleLine(
        doc,
        `PRÓXIMO PASSO: ATIVAR OS 7 DIAS GRÁTIS DA ${clinicName.toUpperCase()}`,
        19,
        signY + 7.2,
        contentWidth - 10,
        9.2,
        7.2
    )

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(218, 240, 232)
    drawFittedSingleLine(
        doc,
        'Responda este e-mail ou envie uma mensagem no WhatsApp para liberarmos o ambiente hoje mesmo:',
        19,
        signY + 13,
        contentWidth - 10,
        7.8,
        6.5
    )

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    drawFittedSingleLine(
        doc,
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}`,
        19,
        signY + 19,
        contentWidth - 10,
        8.2,
        6.5
    )

    drawFooter(
        doc,
        1,
        1,
        `Proposta Comercial CliniGO — ${clinicName} · Válida até ${formatDatePtBr(validUntil)} · clinigo.app`
    )

    const fileName = `proposta-comercial-clinigo-${slugifyFilePart(clinicName)}.pdf`
    doc.save(fileName)
    return fileName
}
