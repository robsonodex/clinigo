/**
 * Regras comerciais oficiais, interpolação de templates e exportação Excel do HQ de Prospecção.
 * Fonte única alinhada à página pública /planos (3 planos ativos).
 */

import type { SalesProspect } from './prospect-types'
import { FUNNEL_STATUS_META } from './prospect-types'

export interface OfficialPlanSpec {
    id: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL'
    name: string
    priceMonthly: number
    priceFormatted: string
    includedLicenses: number
    licensesLabel: string
    unitsLabel: string
    extraLicensePrice: number
    audience: string
    highlights: string[]
}

export const OFFICIAL_COMMERCIAL_PLANS: readonly OfficialPlanSpec[] = [
    {
        id: 'BASICO',
        name: 'CliniGO Básico',
        priceMonthly: 149,
        priceFormatted: 'R$ 149,00/mês',
        includedLicenses: 1,
        licensesLabel: '1 licença incluída',
        unitsLabel: '1 unidade operacional',
        extraLicensePrice: 49.9,
        audience: 'Profissionais independentes e consultórios individuais',
        highlights: [
            'Agenda recorrente anti-overbooking e atendimentos ilimitados',
            'Prontuário eletrônico por especialidade e planos terapêuticos',
            'Teleconsulta WebRTC, Check-in QR Code e pré-cadastro online',
            'Guia de Uso integrado e CliniGo Academy (capacitação autônoma)',
        ],
    },
    {
        id: 'AVANCADO',
        name: 'CliniGO Avançado',
        priceMonthly: 249,
        priceFormatted: 'R$ 249,00/mês',
        includedLicenses: 5,
        licensesLabel: 'Até 5 licenças incluídas',
        unitsLabel: '1 unidade operacional',
        extraLicensePrice: 49.9,
        audience: 'Clínicas multiprofissionais em crescimento (até 5 profissionais)',
        highlights: [
            'Tudo do Básico + BI de Terapia e conformidade de evoluções',
            'Folha de repasse automatizada com sigilo RBAC e DRE gerencial',
            'WhatsApp integrado por setores, CRM e importação Excel/CSV',
            'Relatórios clínicos consolidados e portal CliniGo Família',
        ],
    },
    {
        id: 'PROFESSIONAL',
        name: 'CliniGO Professional',
        priceMonthly: 449,
        priceFormatted: 'R$ 449,00/mês',
        includedLicenses: 30,
        licensesLabel: 'Até 30 licenças incluídas',
        unitsLabel: '1 unidade operacional',
        extraLicensePrice: 49.9,
        audience: 'Clínicas multidisciplinares e centros de terapias com convênios TISS',
        highlights: [
            'Tudo do Avançado + Faturamento TISS completo e lotes XML ANS',
            'Gestão de Glosas em 3 níveis com dossiê de recurso em 1 clique',
            'Check-in Biométrico Facial multi-superfície, Totem e Painel de TV',
            'API, webhooks, auditoria financeira e SLA 99,5%',
        ],
    },
] as const

export const EXTRA_LICENSE_PRICE_BRL = 49.9
export const TRIAL_FREE_DAYS = 7

export interface PlanRecommendation {
    plan: OfficialPlanSpec
    extraLicenses: number
    monthlyTotal: number
    monthlyTotalFormatted: string
    rationale: string
}

export function formatCurrencyBrl(value: number): string {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    })
}

export function recommendOfficialPlan(
    estimatedProfessionals: number,
    needsTissOrBiometrics = true
): PlanRecommendation {
    const count = Math.max(1, Math.round(estimatedProfessionals || 1))

    if (needsTissOrBiometrics || count > 5) {
        const plan = OFFICIAL_COMMERCIAL_PLANS[2] // PROFESSIONAL
        const extraLicenses = Math.max(0, count - plan.includedLicenses)
        const monthlyTotal = plan.priceMonthly + extraLicenses * EXTRA_LICENSE_PRICE_BRL
        return {
            plan,
            extraLicenses,
            monthlyTotal,
            monthlyTotalFormatted: formatCurrencyBrl(monthlyTotal),
            rationale:
                extraLicenses > 0
                    ? `Inclui até 30 licenças + ${extraLicenses} licença(s) adicional(is) (R$ 49,90/mês cada), Faturamento TISS-ANS completo e Check-in Biométrico Facial.`
                    : `Cobre toda a equipe atual (${count} prof.) com folga até 30 licenças sem custo adicional, incluindo TISS-ANS completo, Gestão de Glosas e Check-in Biométrico Facial.`,
        }
    }

    if (count > 1) {
        const plan = OFFICIAL_COMMERCIAL_PLANS[1] // AVANCADO
        return {
            plan,
            extraLicenses: 0,
            monthlyTotal: plan.priceMonthly,
            monthlyTotalFormatted: formatCurrencyBrl(plan.priceMonthly),
            rationale: `Cobre até 5 profissionais com prontuário multidisciplinar, BI de Terapia, DRE e motor de repasses (upgrade para Professional disponível a qualquer momento para TISS e biometria facial).`,
        }
    }

    const plan = OFFICIAL_COMMERCIAL_PLANS[0] // BASICO
    return {
        plan,
        extraLicenses: 0,
        monthlyTotal: plan.priceMonthly,
        monthlyTotalFormatted: formatCurrencyBrl(plan.priceMonthly),
        rationale: `Ideal para operação individual (1 licença) com agenda recorrente, prontuário eletrônico e check-in QR Code.`,
    }
}

export function formatSpecialtiesList(specialties: string[] | null | undefined): string {
    const clean = (specialties || []).map((s) => s.trim()).filter(Boolean)
    if (clean.length === 0) return 'Fonoaudiologia e Terapia Ocupacional'
    if (clean.length === 1) return clean[0]
    if (clean.length === 2) return `${clean[0]} e ${clean[1]}`
    return `${clean.slice(0, -1).join(', ')} e ${clean[clean.length - 1]}`
}

export interface TemplateContext {
    clinicName?: string
    programFocus?: string
    specialties?: string[]
    contactName?: string
    estimatedProfessionals?: number
}

export function interpolateSalesTemplate(rawTemplate: string, ctx: TemplateContext): string {
    const clinicName = (ctx.clinicName || '').trim() || 'sua clínica'
    const programFocus = (ctx.programFocus || '').trim() || 'atendimento multidisciplinar'
    const specialties = formatSpecialtiesList(ctx.specialties)
    const contactName = (ctx.contactName || '').trim() || 'equipe'
    const professionals = Math.max(1, Number(ctx.estimatedProfessionals) || 5)
    const recommendation = recommendOfficialPlan(professionals, true)

    const replacements: Record<string, string> = {
        clinica: clinicName,
        programa: programFocus,
        especialidades: specialties,
        responsavel: contactName,
        profissionais: String(professionals),
        plano_recomendado: `${recommendation.plan.name} (${recommendation.monthlyTotalFormatted}/mês)`,
    }

    return rawTemplate.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
        const normalizedKey = key.toLowerCase()
        return normalizedKey in replacements ? replacements[normalizedKey] : match
    })
}

export const COMMERCIAL_SIGNATURE = {
    name: 'Robson Oliveira',
    role: 'Comercial CliniGO',
    phone: '(21) 96553-2247',
    email: 'contato@clinigo.app',
    website: 'clinigo.app',
    tagline: 'Gestão Clínica Multidisciplinar, Terapias Seriadas e Faturamento TISS-ANS',
} as const

export async function exportProspectsToExcel(prospects: SalesProspect[]): Promise<void> {
    const ExcelJS = (await import('exceljs')).default
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CliniGO HQ Prospecção'
    workbook.created = new Date()

    const sheet = workbook.addWorksheet('Prospecção B2B')
    sheet.columns = [
        { header: 'Clínica', key: 'clinic_name', width: 28 },
        { header: 'Programa / Foco', key: 'program_focus', width: 22 },
        { header: 'Especialidades', key: 'specialties', width: 32 },
        { header: 'Responsável', key: 'contact_name', width: 22 },
        { header: 'E-mail', key: 'email', width: 30 },
        { header: 'WhatsApp', key: 'whatsapp', width: 18 },
        { header: 'Cidade/UF', key: 'city_state', width: 18 },
        { header: 'Status Funil', key: 'funnel_status', width: 22 },
        { header: 'Profissionais (Est.)', key: 'estimated_professionals', width: 18 },
        { header: 'Próximo Follow-up', key: 'next_followup_at', width: 18 },
        { header: 'PDFs Enviados', key: 'pdf_sent_types', width: 26 },
        { header: 'Anotações', key: 'notes', width: 45 },
    ]

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF155E4B' },
    }

    for (const item of prospects) {
        sheet.addRow({
            clinic_name: item.clinic_name,
            program_focus: item.program_focus,
            specialties: (item.specialties || []).join(', '),
            contact_name: item.contact_name,
            email: item.email,
            whatsapp: item.whatsapp,
            city_state: item.city_state,
            funnel_status: FUNNEL_STATUS_META[item.funnel_status]?.label || item.funnel_status,
            estimated_professionals: item.estimated_professionals,
            next_followup_at: item.next_followup_at || '',
            pdf_sent_types: (item.pdf_sent_types || []).join(', '),
            notes: item.notes,
        })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `clinigo-crm-prospeccao-${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
}

