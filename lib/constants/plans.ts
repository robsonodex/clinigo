/**
 * Plan Definitions - CliniGo B2B
 * 4-Tier Structure: CliniGO Básico, Avançado, Professional, Enterprise
 * Maps to database: BASICO, AVANCADO, PROFESSIONAL, ENTERPRISE
 */

export type PlanType = 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

export interface PlanFeature {
    name: string
    included: boolean
    tooltip?: string
}

export interface PlanLimits {
    max_doctors: number
    max_appointments_month: number
    max_patients: number
    max_storage_gb: number
    max_units: number
}

export interface PlanConfig {
    id: PlanType
    name: string
    tagline: string
    price: number
    priceLabel: string
    priceExtra?: string
    billing: string
    recommended?: boolean
    features: PlanFeature[]
    limits: PlanLimits
    color: string
    badgeColor: string
}

export const PLANS: Record<PlanType, PlanConfig> = {
    BASICO: {
        id: 'BASICO',
        name: 'CliniGo Básico',
        tagline: 'Para profissional solo iniciante',
        price: 99,
        priceLabel: 'R$ 99',
        billing: 'por mês',
        features: [
            { name: '1 profissional', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Agenda anti-overbooking', included: true },
            { name: 'Prontuário eletrônico', included: true },
            { name: 'Check-in manual', included: true },
            { name: 'Financeiro básico', included: true, tooltip: 'Contas a receber/pagar, caixa diário' },
            { name: 'Relatórios básicos', included: true },
            { name: 'E-mail transacional', included: true },
            { name: 'Suporte padrão', included: true },
        ],
        limits: {
            max_doctors: 1,
            max_appointments_month: -1,
            max_patients: 200,
            max_storage_gb: 2,
            max_units: 1,
        },
        color: 'blue',
        badgeColor: 'bg-blue-100 text-blue-800',
    },
    AVANCADO: {
        id: 'AVANCADO',
        name: 'CliniGo Avançado',
        tagline: 'Para clínicas com até 5 profissionais',
        price: 249,
        priceLabel: 'R$ 249',
        billing: 'por mês',
        recommended: true,
        features: [
            { name: 'Até 5 profissionais', included: true },
            { name: 'Tudo do Básico +', included: true },
            { name: 'Teleconsulta WebRTC', included: true, tooltip: 'Vídeo HD, chat, compartilhar tela, gravação' },
            { name: 'Check-in QR Code', included: true },
            { name: 'DRE + Repasse Médico', included: true },
            { name: 'Fluxo de Caixa', included: true },
            { name: 'Templates customizados', included: true },
            { name: 'Relatórios avançados', included: true },
            { name: 'Importação de dados', included: true },
            { name: 'Lembretes automáticos', included: true, tooltip: 'Lembretes por e-mail' },
            { name: 'Suporte prioritário', included: true },
        ],
        limits: {
            max_doctors: 5,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 20,
            max_units: 1,
        },
        color: 'emerald',
        badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    PROFESSIONAL: {
        id: 'PROFESSIONAL',
        name: 'CliniGo Professional',
        tagline: 'Para centros com até 30 profissionais',
        price: 449,
        priceLabel: 'R$ 449',
        billing: 'por mês',
        features: [
            { name: 'Até 30 profissionais', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Tudo do Avançado +', included: true },

            { name: 'TISS completo', included: true, tooltip: 'Guias, XML ANS, validação XSD, assinatura eletrônica' },
            { name: 'Check-in Facial', included: true },
            { name: 'Totem de Auto Atendimento', included: true },
            { name: 'Auditoria financeira', included: true },
            { name: 'Dashboards customizados', included: true },
            { name: 'API/Webhooks', included: true },
            { name: 'SLA 99.5%', included: true },
            { name: 'Suporte 24/7', included: true },
        ],
        limits: {
            max_doctors: 30,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 100,
            max_units: 3,
        },
        color: 'purple',
        badgeColor: 'bg-purple-100 text-purple-800',
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'CliniGo Enterprise',
        tagline: 'Para redes com profissionais ilimitados',
        price: 699,
        priceLabel: 'A partir de R$ 699',
        priceExtra: 'Profissionais sob contrato',
        billing: 'por mês',
        features: [
            { name: 'Profissionais ilimitados', included: true, tooltip: 'Quantidade conforme contrato' },
            { name: 'Tudo do Professional +', included: true },

            { name: 'Portal Super Admin', included: true },
            { name: 'Gestão centralizada de clínicas', included: true },
            { name: 'Analytics global', included: true },
            { name: 'Migração dedicada', included: true, tooltip: 'Equipe exclusiva' },
            { name: 'Atendimento direto', included: true },
            { name: 'Consultoria de implantação', included: true },
            { name: 'SLA garantido 99.5%', included: true },
        ],
        limits: {
            max_doctors: -1,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 500,
            max_units: -1,
        },
        color: 'amber',
        badgeColor: 'bg-amber-100 text-amber-800',
    },
    // Hidden - legacy compatibility only, NOT shown in UI
    NETWORK: {
        id: 'NETWORK',
        name: 'Legacy Network',
        tagline: 'Plano descontinuado',
        price: 999,
        priceLabel: 'R$ 999',
        billing: 'por mês',
        features: [
            { name: 'Migrado para Enterprise', included: true },
        ],
        limits: {
            max_doctors: -1,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 1000,
            max_units: -1,
        },
        color: 'gray',
        badgeColor: 'bg-gray-100 text-gray-800',
    },
}

// Plans shown in UI - only 4 active plans
export const DISPLAY_PLANS: PlanConfig[] = [
    PLANS.BASICO,
    PLANS.AVANCADO,
    PLANS.PROFESSIONAL,
    PLANS.ENTERPRISE,
]

export const PLAN_ORDER: PlanType[] = ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE']

export const PLAN_LEVEL: Record<PlanType, number> = {
    BASICO: 1,
    AVANCADO: 2,
    PROFESSIONAL: 3,
    ENTERPRISE: 4,
    NETWORK: 5,
}

export function getPlanConfig(planType: PlanType): PlanConfig {
    return PLANS[planType] || PLANS.BASICO
}

export function getRecommendedPlan(): PlanConfig {
    return PLANS.AVANCADO
}

export function isPlanAtLeast(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    return PLAN_LEVEL[currentPlan] >= PLAN_LEVEL[requiredPlan]
}

export function canUpgradeTo(currentPlan: PlanType, targetPlan: PlanType): boolean {
    return PLAN_LEVEL[targetPlan] > PLAN_LEVEL[currentPlan]
}

/**
 * Migration function to convert legacy plan names to new nomenclature
 * STARTER → BASICO, BASIC → BASICO (both legacy names map to BASICO)
 */
export function migrateLegacyPlan(legacyPlan: string): PlanType {
    const mapping: Record<string, PlanType> = {
        // New names
        'BASICO': 'BASICO',
        'AVANCADO': 'AVANCADO',
        'PROFESSIONAL': 'PROFESSIONAL',
        'ENTERPRISE': 'ENTERPRISE',
        // Legacy migration - both old names map to BASICO
        'STARTER': 'BASICO',
        'BASIC': 'BASICO',
        'NETWORK': 'ENTERPRISE',
        'PRO': 'PROFESSIONAL',
    }
    return mapping[legacyPlan] || 'BASICO'
}

export const TRIAL_DAYS = 7
