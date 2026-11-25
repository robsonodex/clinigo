/**
 * Gerador Instantâneo de PDFs Comerciais Personalizados (Client-side via jsPDF + jspdf-autotable)
 *
 * 3 Modelos Oficiais:
 *  1. Modelo de Relatório de Continuidade Multidisciplinar (Convênios / Renovação — dados 100% fictícios LGPD)
 *  2. Apresentação Executiva CliniGO (1 página — One-Pager)
 *  3. Proposta Comercial / Tabela Oficial de Planos (Básico R$ 149 | Avançado R$ 249 | Professional R$ 449)
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

const BRAND_FOREST: [number, number, number] = [21, 94, 75]
const BRAND_NAVY: [number, number, number] = [27, 54, 93]
const INK_PRIMARY: [number, number, number] = [15, 31, 27]
const INK_MUTED: [number, number, number] = [75, 91, 86]
const SURFACE_TINT: [number, number, number] = [242, 245, 243]
const SURFACE_HIGHLIGHT: [number, number, number] = [230, 242, 238]
const BORDER_SUBTLE: [number, number, number] = [216, 224, 220]
const AMBER_BG: [number, number, number] = [254, 247, 230]
const AMBER_TEXT: [number, number, number] = [146, 84, 15]

function slugifyFilePart(value: string): string {
    return (value || 'clinica')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'clinica'
}

function formatDatePtBr(date: Date): string {
    return date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
}

async function loadRoundLogoDataUrl(): Promise<string | null> {
    if (typeof window === 'undefined') return null
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
    doc.circle(cx, cy, radius + 0.8, 'F')
    doc.addImage(logoDataUrl, 'PNG', cx - radius, cy - radius, radius * 2, radius * 2)
}

interface SpecialtyBlock {
    name: string
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
            council: 'CRFa 1-00000 (Exemplo Fictício)',
            therapist: 'Dra. Marina Albuquerque (Fictício)',
            tussCode: '50000616',
            summary:
                'Evolução consistente em intenção comunicativa, atenção compartilhada e expansão do repertório de mandos funcionais (CAA e verbalização assistida), com redução de episódios de frustração comunicativa em ambiente clínico e familiar.',
            conduct:
                'Manutenção de 2 sessões semanais (50 min) com treino de linguagem pragmática, compreensão de comandos em duas etapas e orientação quinzenal aos responsáveis.',
        },
        'terapia ocupacional': {
            name: 'Terapia Ocupacional (Integração Sensorial)',
            council: 'CREFITO-2 00000-TO (Exemplo Fictício)',
            therapist: 'Dra. Camila Nogueira (Fictício)',
            tussCode: '50000144',
            summary:
                'Ganho mensurável em regulação sensorial proprioceptiva e tátil, permanência em mesa terapêutica ampliada de 6 para 18 minutos e maior independência nas Atividades de Vida Diária (alimentação seletiva e vestuário).',
            conduct:
                'Continuidade de 2 sessões semanais (50 min) com abordagem de Integração Sensorial de Ayres e coordenação motora fina aplicada à rotina escolar.',
        },
        'psicologia (aba)': {
            name: 'Psicologia — Intervenção Comportamental (ABA)',
            council: 'CRP 05/00000 (Exemplo Fictício)',
            therapist: 'Dra. Beatriz Lacerda (Fictício)',
            tussCode: '50000470',
            summary:
                'Redução de 64% na frequência de comportamentos interferentes em ambiente estruturado e aquisição de 11 novos repertórios de imitação motora e pareamento sob ensino naturalístico (NET) e tentativas discretas (DTT).',
            conduct:
                'Continuidade do plano comportamental individualizado com supervisão clínica periódica e registro contínuo de curvas de aprendizado por alvo.',
        },
        psicomotricidade: {
            name: 'Psicomotricidade Relacional',
            council: 'ABP 0000 (Exemplo Fictício)',
            therapist: 'Prof. Rafael Monteiro (Fictício)',
            tussCode: '50000560',
            summary:
                'Melhora no equilíbrio dinâmico, planejamento motor global (praxia) e percepção espaço-temporal, favorecendo a participação em brincadeiras simbólicas e atividades em dupla.',
            conduct:
                'Manutenção de 1 sessão semanal integrada aos objetivos de Terapia Ocupacional para consolidação do esquema corporal.',
        },
        'fisioterapia pediátrica': {
            name: 'Fisioterapia Pediátrica',
            council: 'CREFITO-2 00000-F (Exemplo Fictício)',
            therapist: 'Dr. Henrique Vasconcelos (Fictício)',
            tussCode: '50000160',
            summary:
                'Progresso em estabilidade de tronco, marcha funcional e controle postural durante transições de solo para ortostatismo, sem fadiga precoce.',
            conduct:
                'Continuidade de 2 sessões semanais focadas em fortalecimento funcional e coordenação bilateral.',
        },
    }

    return selected.slice(0, 3).map((spec, index) => {
        const key = spec.trim().toLowerCase()
        if (catalog[key]) return catalog[key]
        return {
            name: spec.trim(),
            council: `Registro Profissional 0000${index + 1} (Exemplo Fictício)`,
            therapist: `Especialista Responsável ${index + 1} (Fictício)`,
            tussCode: '50000470',
            summary:
                'Evolução clínica documentada nas sessões do trimestre, com adesão satisfatória ao protocolo individualizado e consolidação progressiva dos marcos estabelecidos no PEI.',
            conduct:
                'Manutenção da carga terapêutica semanal com reavaliação padronizada em 90 dias e alinhamento multidisciplinar contínuo.',
        }
    })
}

function drawFooter(
    doc: any,
    pageNum: number,
    totalPages: number,
    leftLabel: string
) {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.setLineWidth(0.3)
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...INK_MUTED)
    doc.text(leftLabel, 14, pageHeight - 9)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - 14, pageHeight - 9, { align: 'right' })
}

/**
 * PDF 1 — Modelo de Relatório de Continuidade Multidisciplinar (Convênios / Renovação)
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
    const todayStr = formatDatePtBr(new Date())

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // --- Faixa superior white-label da clínica prospectada ---
    doc.setFillColor(...BRAND_FOREST)
    doc.rect(0, 0, pageWidth, 30, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 23, 15, 9.2)

    const titleX = logoDataUrl ? 37 : 14
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text(clinicName.toUpperCase(), titleX, 13.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(`Relatório Consolidado de Continuidade Multidisciplinar — ${programFocus}`, titleX, 20)

    doc.setFontSize(7.5)
    doc.setTextColor(215, 236, 229)
    doc.text(`Emissão: ${todayStr}  |  Protocolo: RC-${new Date().getFullYear()}-04819  |  Modelo Demonstrativo CliniGO`, titleX, 25.5)

    // --- Faixa LGPD / Modelo Demonstrativo ---
    doc.setFillColor(...AMBER_BG)
    doc.setDrawColor(235, 210, 155)
    doc.roundedRect(14, 34, pageWidth - 28, 9, 1.5, 1.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...AMBER_TEXT)
    doc.text(
        'EXEMPLO PRÁTICO PARA DEMONSTRAÇÃO COMERCIAL (LGPD): Todos os dados de paciente, guias e profissionais abaixo são 100% fictícios.',
        17,
        39.6
    )

    // --- Bloco 1: Identificação do Beneficiário & Convênio ---
    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, 47, pageWidth - 28, 28, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('1. IDENTIFICAÇÃO DO BENEFICIÁRIO E SOLICITAÇÃO DE RENOVAÇÃO', 18, 53)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...INK_PRIMARY)
    doc.text('Paciente (Fictício): Lucas Henrique M. (6 anos e 4 meses)', 18, 59.5)
    doc.text('Diagnóstico / CID-10: F84.0 — Transtorno do Espectro Autista', 18, 65)
    doc.text(`Especialidades Integradas: ${formatSpecialtiesList(specialties)}`, 18, 70.5)

    doc.text('Operadora / Convênio: Saúde Exemplo S/A (Plano Especial)', 116, 59.5)
    doc.text('Guia TISS Referência: 2026-0098412-01 (SADT / Terapias)', 116, 65)
    doc.text('Período Consolidado: 90 dias  |  Renovação: 180 dias', 116, 70.5)

    // --- 4 KPI Cards ---
    const kpiY = 80
    const kpiW = (pageWidth - 28 - 9) / 4
    const kpis = [
        { label: 'FREQUÊNCIA CONSOLIDADA', value: '46 / 48 sessões', sub: '95,8% de assiduidade' },
        { label: 'COMPROVAÇÃO ANTI-GLOSA', value: '100% Validada', sub: 'Check-in Facial / QR + Log' },
        { label: 'METAS PEI / ABA', value: '11 de 12 metas', sub: '+26 pp evolução média' },
        { label: 'EVOLUÇÕES ASSINADAS', value: `${specialtyBlocks.length} especialidades`, sub: 'Lei 14.063/2020' },
    ]

    kpis.forEach((kpi, idx) => {
        const x = 14 + idx * (kpiW + 3)
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(x, kpiY, kpiW, 21, 2, 2, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(...INK_MUTED)
        doc.text(kpi.label, x + 3, kpiY + 5.5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(...BRAND_FOREST)
        doc.text(kpi.value, x + 3, kpiY + 12.5)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...INK_MUTED)
        doc.text(kpi.sub, x + 3, kpiY + 17.8)
    })

    // --- Seção 2: Quadro de Frequência Validada ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('2. EXTRATO CONSOLIDADO DE FREQUÊNCIA E COMPROVAÇÃO DE PRESENÇA (AMOSTRA DO TRIMESTRE)', 14, 110)

    const sampleDates = ['04/11', '06/11', '11/11', '13/11', '18/11', '20/11', '25/11', '27/11']
    const attendanceRows = sampleDates.map((day, idx) => {
        const block = specialtyBlocks[idx % specialtyBlocks.length]
        return [
            `${day}/2026`,
            idx % 2 === 0 ? '09:00 - 09:50' : '10:00 - 10:50',
            block.name,
            block.tussCode,
            block.therapist.replace(' (Fictício)', ''),
            idx % 3 === 0 ? 'QR Code + Responsável' : 'Biometria Facial (99,1%)',
            'Validada e Assinada',
        ]
    })

    autoTable(doc, {
        startY: 113,
        margin: { left: 14, right: 14 },
        head: [['Data', 'Horário', 'Especialidade', 'TUSS', 'Profissional', 'Validação Presença', 'Situação']],
        body: attendanceRows,
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.5,
            cellPadding: 2.3,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: BRAND_NAVY,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7.5,
        },
        alternateRowStyles: {
            fillColor: [248, 250, 249],
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 22 },
            3: { cellWidth: 18 },
            6: { fontStyle: 'bold', textColor: BRAND_FOREST },
        },
    })

    // --- Seção 3: Evolução das Metas PEI / ABA ---
    const afterTable1Y = ((doc as any).lastAutoTable?.finalY || 180) + 9
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('3. EVOLUÇÃO QUANTITATIVA DO PLANO TERAPÊUTICO INDIVIDUALIZADO (PEI / ABA)', 14, afterTable1Y)

    autoTable(doc, {
        startY: afterTable1Y + 3,
        margin: { left: 14, right: 14 },
        head: [['Domínio Terapêutico', 'Especialidade Líder', 'Linha de Base', 'Atual (90d)', 'Ganho', 'Status Meta']],
        body: [
            ['Comunicação Funcional & Mandos', specialtyBlocks[0]?.name || 'Fonoaudiologia', '32%', '64%', '+32 pp', 'Em aquisição acelerada'],
            ['Integração Sensorial & Permanência', specialtyBlocks[1]?.name || 'Terapia Ocupacional', '40%', '71%', '+31 pp', 'Consolidando'],
            ['Autonomia em AVDs (Rotina)', specialtyBlocks[1]?.name || 'Terapia Ocupacional', '45%', '68%', '+23 pp', 'Evolução contínua'],
            ['Atenção Compartilhada & Comandos', specialtyBlocks[0]?.name || 'Fonoaudiologia', '38%', '59%', '+21 pp', 'Em progresso'],
        ],
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 7.8,
            cellPadding: 2.5,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: BRAND_FOREST,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        columnStyles: {
            2: { halign: 'center' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center', fontStyle: 'bold', textColor: BRAND_FOREST },
        },
    })

    // ================= PÁGINA 2: EVOLUÇÕES ASSINADAS & PARECER =================
    doc.addPage()

    doc.setFillColor(...BRAND_FOREST)
    doc.rect(0, 0, pageWidth, 16, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(`${clinicName.toUpperCase()} — ${programFocus}`, 14, 10.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Síntese Técnica Assinada por Especialidade', pageWidth - 14, 10.5, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('4. SÍNTESE CLÍNICA E EVOLUÇÕES ASSINADAS POR ESPECIALIDADE', 14, 25)

    let cursorY = 30
    specialtyBlocks.forEach((block, idx) => {
        const boxHeight = 46
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(14, cursorY, pageWidth - 28, boxHeight, 2, 2, 'FD')

        doc.setFillColor(...SURFACE_HIGHLIGHT)
        doc.rect(14, cursorY, pageWidth - 28, 9, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.8)
        doc.setTextColor(...BRAND_FOREST)
        doc.text(`${idx + 1}. ${block.name}  (TUSS ${block.tussCode})`, 18, cursorY + 6)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(...INK_MUTED)
        doc.text(`${block.therapist} · ${block.council}`, pageWidth - 18, cursorY + 6, { align: 'right' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8.2)
        doc.setTextColor(...INK_PRIMARY)
        const summaryLines = doc.splitTextToSize(`Evolução no período: ${block.summary}`, pageWidth - 36)
        doc.text(summaryLines, 18, cursorY + 14.5)

        const conductY = cursorY + 14.5 + summaryLines.length * 4.1 + 1.5
        const conductLines = doc.splitTextToSize(`Conduta proposta: ${block.conduct}`, pageWidth - 36)
        doc.setTextColor(...INK_MUTED)
        doc.text(conductLines, 18, conductY)

        // Linha de assinatura eletrônica
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.line(18, cursorY + boxHeight - 7.5, pageWidth - 18, cursorY + boxHeight - 7.5)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...BRAND_FOREST)
        doc.text(
            `Assinado eletronicamente (Lei 14.063/2020) em ${todayStr} · Hash verificável SHA-256: 9f4e...c18${idx + 2}a`,
            18,
            cursorY + boxHeight - 3
        )

        cursorY += boxHeight + 6
    })

    // --- Bloco 5: Parecer de Continuidade para a Operadora ---
    const parecerY = Math.min(cursorY + 2, 195)
    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BRAND_FOREST)
    doc.setLineWidth(0.45)
    doc.roundedRect(14, parecerY, pageWidth - 28, 38, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('5. PARECER MULTIDISCIPLINAR E JUSTIFICATIVA DE CONTINUIDADE (RN 539/2022 ANS)', 18, parecerY + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.3)
    doc.setTextColor(...INK_PRIMARY)
    const parecerText =
        `Diante da resposta terapêutica objetivamente documentada nos últimos 90 dias (${formatSpecialtiesList(specialties)}), ` +
        `com assiduidade de 95,8% comprovada por registro de presença validado e ganho mensurável nas metas do PEI, ` +
        `a equipe multidisciplinar da ${clinicName} recomenda a renovação integral do ciclo terapêutico por mais 180 dias, ` +
        `evitando regressão funcional por descontinuidade de vínculo. Todas as sessões e evoluções originais permanecem auditáveis ` +
        `em prontuário eletrônico com carimbo de data/hora e conformidade LGPD.`
    const parecerLines = doc.splitTextToSize(parecerText, pageWidth - 36)
    doc.text(parecerLines, 18, parecerY + 13.5)

    // --- Box Comercial Discreto CliniGO no fim da página 2 ---
    const ctaY = 244
    doc.setFillColor(...BRAND_NAVY)
    doc.roundedRect(14, ctaY, pageWidth - 28, 26, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(`Este documento foi montado automaticamente em 1 clique no CliniGO`, 19, ctaY + 8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(218, 228, 240)
    doc.text(
        `Na prática, a coordenação da ${clinicName} não precisa juntar planilhas nem cobrar PDFs de cada terapeuta: agenda,`,
        19,
        ctaY + 14
    )
    doc.text(
        `presença biométrica, metas PEI/ABA e evoluções assinadas já saem unificadas para o convênio e para o lote XML TISS.`,
        19,
        ctaY + 18.5
    )
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(152, 232, 205)
    doc.text(
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.website}`,
        19,
        ctaY + 23.5
    )

    const totalPages = doc.getNumberOfPages()
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p)
        drawFooter(
            doc,
            p,
            totalPages,
            `Exemplo gerado pela plataforma CliniGO (clinigo.app) — Personalizado para ${clinicName} · Dados 100% fictícios (LGPD)`
        )
    }

    const fileName = `modelo-relatorio-continuidade-${slugifyFilePart(clinicName)}.pdf`
    doc.save(fileName)
    return fileName
}

/**
 * PDF 2 — Apresentação Executiva do CliniGO (1 Página — One-Pager)
 */
export async function generateExecutivePresentationPdf(input: PdfPersonalizationInput): Promise<string> {
    const [{ default: jsPDF }, logoDataUrl] = await Promise.all([
        import('jspdf'),
        loadRoundLogoDataUrl(),
    ])

    const clinicName = (input.clinicName || '').trim() || 'Sua Clínica'
    const programFocus = (input.programFocus || '').trim() || 'Terapias Multidisciplinares'
    const specialties = input.specialties?.length ? input.specialties : ['Fonoaudiologia', 'Terapia Ocupacional']
    const todayStr = formatDatePtBr(new Date())

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // --- Cabeçalho Executivo ---
    doc.setFillColor(...BRAND_FOREST)
    doc.rect(0, 0, pageWidth, 34, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 24, 17, 10)

    const headerX = logoDataUrl ? 39 : 14
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('CliniGO', headerX, 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text('Plataforma de Gestão para Clínicas Multidisciplinares, Terapias Seriadas e Faturamento TISS', headerX, 20.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.2)
    doc.setTextColor(186, 238, 220)
    doc.text(`APRESENTAÇÃO EXECUTIVA PREPARADA PARA: ${clinicName.toUpperCase()} (${programFocus})`, headerX, 27.5)

    // --- Bloco Dor x Solução ---
    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, 40, pageWidth - 28, 25, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...BRAND_NAVY)
    doc.text(`POR QUE CLÍNICAS DE ${formatSpecialtiesList(specialties).toUpperCase()} ESCOLHEM O CLINIGO`, 18, 47)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.4)
    doc.setTextColor(...INK_PRIMARY)
    const introLines = doc.splitTextToSize(
        `Sistemas genéricos foram desenhados para consultas avulsas — não para terapias seriadas com renovação de convênio, ` +
        `co-terapia e múltiplos conselhos profissionais. O CliniGO unifica a operação clínica, administrativa e de faturamento da ${clinicName} ` +
        `em um fluxo único, eliminando retrabalho da coordenação e blindando o faturamento contra glosas.`,
        pageWidth - 36
    )
    doc.text(introLines, 18, 53)

    // --- Grid 2x3 de Pilares Reais em Produção ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('6 PILARES OPERACIONAIS EM PRODUÇÃO', 14, 73)

    const pillars = [
        {
            title: '1. Agenda Recorrente e Co-terapia',
            body: 'Séries semanais por sala e equipe, controle de faltas/reposições, fila de espera inteligente e bloqueio anti-overbooking.',
        },
        {
            title: '2. Check-in Biométrico Facial e QR Code',
            body: 'Prova auditável de presença com data, hora e foto/validação na recepção ou totem — proteção direta contra glosas de convênio.',
        },
        {
            title: '3. Prontuário, PEI/ABA e Continuidade',
            body: 'Evolução por especialidade com sigilo CRP/CRFa/CREFITO/CFM, Modo Tatame DTT/NET, curvas de metas e Relatório de Continuidade em 1 clique.',
        },
        {
            title: '4. Faturamento TISS-ANS e Gestão de Glosas',
            body: 'Guias SADT/Consulta, lotes XML ANS (ISO-8859-1) validados, fila de glosas em 3 níveis com prazos SLA e dossiê de recurso em 1 clique.',
        },
        {
            title: '5. Folha de Repasse e DRE Automatizados',
            body: 'Apuração automática de honorários por sessão realizada/validada, transparência individual para cada terapeuta (RBAC) e DRE gerencial.',
        },
        {
            title: '6. CliniGo Família e Adoção Autônoma',
            body: 'Portal do responsável sem precisar instalar app + Guia de Uso integrado e CliniGo Academy para treinar toda a equipe sem parar a agenda.',
        },
    ]

    const cardW = (pageWidth - 28 - 6) / 2
    const cardH = 31
    pillars.forEach((pillar, idx) => {
        const col = idx % 2
        const row = Math.floor(idx / 2)
        const x = 14 + col * (cardW + 6)
        const y = 77 + row * (cardH + 4.5)

        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(...BORDER_SUBTLE)
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD')

        doc.setFillColor(...BRAND_FOREST)
        doc.rect(x, y, 2.2, cardH, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.8)
        doc.setTextColor(...BRAND_NAVY)
        doc.text(pillar.title, x + 5.5, y + 7.5)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...INK_MUTED)
        const lines = doc.splitTextToSize(pillar.body, cardW - 9)
        doc.text(lines, x + 5.5, y + 13.5)
    })

    // --- Segurança e LGPD ---
    const secY = 186
    doc.setFillColor(...SURFACE_HIGHLIGHT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, secY, pageWidth - 28, 17, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.3)
    doc.setTextColor(...BRAND_FOREST)
    doc.text('SEGURANÇA CLÍNICA, LGPD E RASTREABILIDADE', 18, secY + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.9)
    doc.setTextColor(...INK_PRIMARY)
    doc.text(
        'Isolamento total de dados por clínica (RLS), sigilo por perfil/conselho, logs imutáveis de auditoria, assinatura eletrônica (Lei 14.063/2020) e Escudo LGPD.',
        18,
        secY + 12.2
    )

    // --- Resumo Transparente dos 3 Planos Oficiais ---
    const plansY = 208
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('PLANOS TRANSPARENTES (1 UNIDADE OPERACIONAL · 7 DIAS GRÁTIS)', 14, plansY)

    const planBoxW = (pageWidth - 28 - 8) / 3
    OFFICIAL_COMMERCIAL_PLANS.forEach((plan, idx) => {
        const x = 14 + idx * (planBoxW + 4)
        const y = plansY + 3.5
        const isFeatured = plan.id === 'PROFESSIONAL'

        doc.setFillColor(isFeatured ? 230 : 255, isFeatured ? 242 : 255, isFeatured ? 238 : 255)
        doc.setDrawColor(...(isFeatured ? BRAND_FOREST : BORDER_SUBTLE))
        doc.setLineWidth(isFeatured ? 0.5 : 0.25)
        doc.roundedRect(x, y, planBoxW, 33, 2, 2, 'FD')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...BRAND_NAVY)
        doc.text(plan.name, x + 3.5, y + 7)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12.5)
        doc.setTextColor(...BRAND_FOREST)
        doc.text(plan.priceFormatted, x + 3.5, y + 14.5)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...INK_PRIMARY)
        doc.text(plan.licensesLabel, x + 3.5, y + 20.5)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...INK_MUTED)
        const shortDesc =
            plan.id === 'BASICO'
                ? 'Agenda, Prontuário, QR Code e Teleconsulta'
                : plan.id === 'AVANCADO'
                  ? 'Tudo do Básico + BI Terapia, DRE e Repasses'
                  : 'Tudo do Avançado + TISS XML, Glosas e Biometria'
        doc.text(doc.splitTextToSize(shortDesc, planBoxW - 7), x + 3.5, y + 25.5)
    })

    // --- Rodapé CTA Executivo ---
    const ctaY = 250
    doc.setFillColor(...BRAND_NAVY)
    doc.roundedRect(14, ctaY, pageWidth - 28, 25, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(`Vamos testar na rotina da ${clinicName} por 7 dias sem compromisso?`, 19, ctaY + 8.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.2)
    doc.setTextColor(218, 228, 240)
    doc.text(
        `Agende uma demonstração objetiva de 15 minutos ou solicite seu ambiente de avaliação agora:`,
        19,
        ctaY + 14.5
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(152, 232, 205)
    doc.text(
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · WhatsApp ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}`,
        19,
        ctaY + 20.8
    )

    drawFooter(
        doc,
        1,
        1,
        `CliniGO — Apresentação Executiva para ${clinicName} · Emitida em ${todayStr} · Licença adicional avulsa R$ 49,90/mês`
    )

    const fileName = `apresentacao-executiva-clinigo-${slugifyFilePart(clinicName)}.pdf`
    doc.save(fileName)
    return fileName
}

/**
 * PDF 3 — Proposta Comercial & Tabela Oficial de Planos
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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()

    // --- Cabeçalho Proposta ---
    doc.setFillColor(...BRAND_NAVY)
    doc.rect(0, 0, pageWidth, 32, 'F')

    drawRoundLogoBadge(doc, logoDataUrl, 23.5, 16, 9.6)

    const titleX = logoDataUrl ? 38 : 14
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15.5)
    doc.text('PROPOSTA COMERCIAL — CLINIGO', titleX, 13.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text(`Preparada exclusivamente para ${clinicName} (${programFocus})`, titleX, 20)

    doc.setFontSize(8)
    doc.setTextColor(196, 212, 232)
    doc.text(
        `A/C: ${contactName}  |  Emissão: ${formatDatePtBr(today)}  |  Validade: ${formatDatePtBr(validUntil)} (${validityDays} dias)`,
        titleX,
        26
    )

    // --- Box de Recomendação Personalizada ---
    doc.setFillColor(...SURFACE_HIGHLIGHT)
    doc.setDrawColor(...BRAND_FOREST)
    doc.setLineWidth(0.5)
    doc.roundedRect(14, 38, pageWidth - 28, 35, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BRAND_FOREST)
    doc.text(`CONFIGURAÇÃO RECOMENDADA PARA ${clinicName.toUpperCase()} (${estimatedProfessionals} PROFISSIONAIS)`, 19, 44.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...BRAND_NAVY)
    doc.text(`${recommendation.plan.name}  —  ${recommendation.monthlyTotalFormatted}/mês`, 19, 53)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.3)
    doc.setTextColor(...INK_PRIMARY)
    const rationaleLines = doc.splitTextToSize(recommendation.rationale, pageWidth - 38)
    doc.text(rationaleLines, 19, 59.2)

    const setupLabel =
        setupFeeBrl > 0
            ? `Taxa única de implantação: ${formatCurrencyBrl(setupFeeBrl)}${setupFeeNote ? ` (${setupFeeNote})` : ''}`
            : `Taxa única de implantação: ${setupFeeNote || 'Isenta na condição comercial desta proposta'} · Avaliação inicial: ${TRIAL_FREE_DAYS} dias gratuitos`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.8)
    doc.setTextColor(...BRAND_FOREST)
    doc.text(setupLabel, 19, 69.5)

    // --- Tabela Oficial dos 3 Planos ---
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('TABELA OFICIAL DE PLANOS E RECURSOS (VIGENTE)', 14, 82)

    autoTable(doc, {
        startY: 85,
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
            fontSize: 7.8,
            cellPadding: 2.2,
            textColor: INK_PRIMARY,
            lineColor: BORDER_SUBTLE,
            lineWidth: 0.2,
        },
        headStyles: {
            fillColor: BRAND_FOREST,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 8,
        },
        columnStyles: {
            0: { cellWidth: 84, halign: 'left', fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center', fillColor: [241, 248, 245], fontStyle: 'bold', textColor: BRAND_FOREST },
        },
        alternateRowStyles: {
            fillColor: [250, 251, 250],
        },
    })

    // --- Condições Comerciais & Retorno Operacional ---
    const afterTableY = ((doc as any).lastAutoTable?.finalY || 195) + 7

    doc.setFillColor(...SURFACE_TINT)
    doc.setDrawColor(...BORDER_SUBTLE)
    doc.roundedRect(14, afterTableY, pageWidth - 28, customNote ? 44 : 36, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...BRAND_NAVY)
    doc.text('CONDIÇÕES COMERCIAIS E IMPLANTAÇÃO AUTÔNOMA', 18, afterTableY + 6.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.9)
    doc.setTextColor(...INK_PRIMARY)
    const conditions = [
        `• Avaliação gratuita de ${TRIAL_FREE_DAYS} dias sem compromisso antes da ativação da assinatura mensal.`,
        `• Cada assinatura contempla 1 unidade operacional; licenças acima da franquia do plano custam ${formatCurrencyBrl(EXTRA_LICENSE_PRICE_BRL)}/mês cada.`,
        '• Capacitação 100% autônoma via Guia de Uso Integrado (passo a passo dentro de cada tela) e CliniGo Academy, sem parar a rotina da equipe.',
        '• Segurança e conformidade LGPD: isolamento por clínica, controle de acesso por função (RBAC) e assinatura eletrônica (Lei 14.063/2020).',
    ]
    let condY = afterTableY + 12.2
    conditions.forEach((line) => {
        doc.text(line, 18, condY)
        condY += 5.1
    })

    if (customNote) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...BRAND_FOREST)
        doc.text(doc.splitTextToSize(`Observação comercial: ${customNote}`, pageWidth - 36), 18, condY + 1.5)
    }

    // --- CTA Final / Assinatura ---
    const signY = 251
    doc.setFillColor(...BRAND_FOREST)
    doc.roundedRect(14, signY, pageWidth - 28, 24, 2, 2, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('PRÓXIMO PASSO: ATIVAÇÃO DO AMBIENTE DE AVALIAÇÃO (7 DIAS GRÁTIS)', 19, signY + 7.8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(220, 240, 233)
    doc.text(
        `Responda este e-mail ou envie uma mensagem no WhatsApp para liberarmos o acesso da ${clinicName} hoje mesmo:`,
        19,
        signY + 13.8
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.4)
    doc.setTextColor(255, 255, 255)
    doc.text(
        `${COMMERCIAL_SIGNATURE.name} · ${COMMERCIAL_SIGNATURE.role} · ${COMMERCIAL_SIGNATURE.phone} · ${COMMERCIAL_SIGNATURE.email} · ${COMMERCIAL_SIGNATURE.website}`,
        19,
        signY + 19.8
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
