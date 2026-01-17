/**
 * Plan Definitions - CliniGo B2B
 * 4-Tier Structure: CliniGO Consultório, Clínica, Centro Clínico, Rede Enterprise
 * Maps to database: STARTER, BASIC, PROFESSIONAL, ENTERPRISE
 */

export type PlanType = 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

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
    STARTER: {
        id: 'STARTER',
        name: 'CliniGo Básico',
        tagline: 'Para consultórios com até 2 médicos',
        price: 149,
        priceLabel: 'R$ 149',
        billing: 'por mês',
        features: [
            { name: 'Até 2 médicos', included: true },
            { name: 'Check-in QR Code', included: true, tooltip: 'Paciente apresenta QR na recepção' },
            { name: 'Prontuário eletrônico', included: true },
            { name: 'Teleconsulta integrada', included: true },
            { name: 'WhatsApp manual', included: true, tooltip: 'Sistema gera link, você envia' },
            { name: 'SMTP próprio', included: true, tooltip: 'Configure seu servidor de email' },
            { name: 'Financeiro básico', included: true },
            { name: 'Relatórios básicos', included: true },
            { name: 'Agenda anti-overbooking', included: true },
            { name: 'Suporte padrão', included: true },
        ],
        limits: {
            max_doctors: 2,
            max_appointments_month: 100,
            max_patients: 500,
            max_storage_gb: 5,
            max_units: 1,
        },
        color: 'blue',
        badgeColor: 'bg-blue-100 text-blue-800',
    },
    BASIC: {
        id: 'BASIC',
        name: 'CliniGo Avançado',
        tagline: 'Para clínicas com até 5 médicos',
        price: 299,
        priceLabel: 'R$ 299',
        billing: 'por mês',
        recommended: true,
        features: [
            { name: 'Até 5 médicos', included: true },
            { name: 'Tudo do Consultório +', included: true },
            { name: 'Check-in avançado + Upload', included: true, tooltip: 'Upload de docs pré-consulta' },
            { name: 'Prontuário completo', included: true },
            { name: 'Teleconsulta WebRTC', included: true },
            { name: 'WhatsApp automação', included: true, tooltip: 'Envios automáticos 24h antes' },
            { name: 'SMTP próprio', included: true },
            { name: 'CRM completo', included: true },
            { name: 'Financeiro completo', included: true },
            { name: 'Relatórios avançados', included: true },
            { name: 'Suporte prioritário', included: true },
        ],
        limits: {
            max_doctors: 5,
            max_appointments_month: 500,
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
        tagline: 'Para centros com até 30 médicos',
        price: 549,
        priceLabel: 'R$ 549',
        billing: 'por mês',
        features: [
            { name: 'Até 30 médicos', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Tudo do Clínica +', included: true },
            { name: 'Até 3 unidades', included: true },
            { name: 'Prontuário multi-unidade', included: true },
            { name: 'Faturamento TISS', included: true },
            { name: 'SMTP próprio', included: true },
            { name: 'API dedicada', included: true },
            { name: 'BI e relatórios gerenciais', included: true },
            { name: 'SLA 99.5%', included: true },
            { name: 'Onboarding personalizado', included: true },
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
        tagline: 'Para redes com médicos ilimitados',
        price: 799,
        priceLabel: 'A partir de R$ 799',
        priceExtra: 'Médicos sob contrato',
        billing: 'por mês',
        features: [
            { name: 'Médicos ilimitados', included: true, tooltip: 'Quantidade conforme contrato' },
            { name: 'Tudo do Centro Clínico +', included: true },
            { name: 'Unidades ilimitadas', included: true },
            { name: 'SMTP próprio', included: true },
            { name: 'Migração dedicada', included: true, tooltip: 'Equipe exclusiva' },
            { name: 'Atendimento direto', included: true },
            { name: 'Ajustes sob demanda', included: true },
            { name: 'Consultoria de implantação', included: true },
            { name: 'Treinamento presencial', included: true },
            { name: 'SLA garantido 99.5%', included: true },
            { name: 'Gerente de conta dedicado', included: true },
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
    PLANS.STARTER,
    PLANS.BASIC,
    PLANS.PROFESSIONAL,
    PLANS.ENTERPRISE,
]

export const PLAN_ORDER: PlanType[] = ['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']

export const PLAN_LEVEL: Record<PlanType, number> = {
    STARTER: 1,
    BASIC: 2,
    PROFESSIONAL: 3,
    ENTERPRISE: 4,
    NETWORK: 5,
}

export function getPlanConfig(planType: PlanType): PlanConfig {
    return PLANS[planType] || PLANS.STARTER
}

export function getRecommendedPlan(): PlanConfig {
    return PLANS.BASIC
}

export function isPlanAtLeast(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    return PLAN_LEVEL[currentPlan] >= PLAN_LEVEL[requiredPlan]
}

export function canUpgradeTo(currentPlan: PlanType, targetPlan: PlanType): boolean {
    return PLAN_LEVEL[targetPlan] > PLAN_LEVEL[currentPlan]
}

export function migrateLegacyPlan(legacyPlan: string): PlanType {
    const mapping: Record<string, PlanType> = {
        'STARTER': 'STARTER',
        'BASIC': 'BASIC',
        'PROFESSIONAL': 'PROFESSIONAL',
        'ENTERPRISE': 'ENTERPRISE',
        'NETWORK': 'ENTERPRISE', // Migrate NETWORK to ENTERPRISE
        'PRO': 'PROFESSIONAL',
    }
    return mapping[legacyPlan] || 'STARTER'
}

export const TRIAL_DAYS = 7
