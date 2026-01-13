/**
 * Plan Definitions and Configuration - RJ Market
 * 5-Tier Structure: Starter, Básico, Profissional, Enterprise, Network
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
        name: 'Starter',
        tagline: 'Para médicos autônomos iniciantes',
        price: 47,
        priceLabel: 'R$ 47',
        billing: 'por mês',
        features: [
            { name: '1 médico', included: true },
            { name: 'Até 50 consultas/mês', included: true },
            { name: 'Agendamento online básico', included: true },
            { name: 'Prontuário simplificado', included: true },
            { name: 'IA - Resumo básico', included: true, tooltip: 'Modelo gratuito para resumos' },
            { name: 'Suporte por email', included: true },
            { name: 'Teleconsulta', included: false },
            { name: 'WhatsApp', included: false },
            { name: 'Financeiro', included: false },
            { name: 'Relatórios', included: false },
        ],
        limits: {
            max_doctors: 1,
            max_appointments_month: 50,
            max_patients: 100,
            max_storage_gb: 1,
            max_units: 1,
        },
        color: 'gray',
        badgeColor: 'bg-gray-100 text-gray-800',
    },
    BASIC: {
        id: 'BASIC',
        name: 'Básico',
        tagline: 'Para consultórios pequenos',
        price: 87,
        priceLabel: 'R$ 87',
        billing: 'por mês',
        features: [
            { name: 'Até 3 médicos', included: true },
            { name: 'Até 200 consultas/mês', included: true },
            { name: 'Agendamento online completo', included: true },
            { name: 'Check-in QR Code simples', included: true },
            { name: 'Prontuário básico', included: true },
            { name: 'IA - Resumo simples', included: true, tooltip: 'Modelo básico para resumos' },
            { name: 'Teleconsulta Google Meet', included: true, tooltip: 'Link externo' },
            { name: 'WhatsApp manual', included: true, tooltip: 'Sistema gera link, você envia' },
            { name: 'Financeiro básico', included: true },
            { name: 'Relatórios básicos', included: true },
            { name: 'Suporte 24/7', included: true },
            { name: 'IA com Reasoning', included: false },
            { name: 'Vídeo integrado', included: false },
            { name: 'WhatsApp automação', included: false },
            { name: 'CRM', included: false },
            { name: 'TISS', included: false },
        ],
        limits: {
            max_doctors: 3,
            max_appointments_month: 200,
            max_patients: 500,
            max_storage_gb: 5,
            max_units: 1,
        },
        color: 'blue',
        badgeColor: 'bg-blue-100 text-blue-800',
    },
    PROFESSIONAL: {
        id: 'PROFESSIONAL',
        name: 'Profissional',
        tagline: 'Para clínicas em crescimento',
        price: 247,
        priceLabel: 'R$ 247',
        billing: 'por mês',
        recommended: true,
        features: [
            { name: 'Até 10 médicos', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Tudo do Básico +', included: true },
            { name: 'Check-in avançado + Upload', included: true, tooltip: 'Upload de docs pré-consulta' },
            { name: 'Prontuário completo', included: true },
            { name: 'IA com Reasoning', included: true, tooltip: 'Claude/GPT-4o com raciocínio' },
            { name: 'Teleconsulta WebRTC integrada', included: true, tooltip: 'Vídeo HD nativo' },
            { name: 'WhatsApp automação completa', included: true, tooltip: 'Envios automáticos 24h antes' },
            { name: 'CRM completo', included: true },
            { name: 'Integração TISS', included: true },
            { name: 'Financeiro completo', included: true },
            { name: 'Relatórios avançados', included: true },
            { name: 'Marketplace público', included: true, tooltip: 'Perfil visível + agendamento' },
            { name: 'Suporte 24/7 prioritário', included: true },
            { name: 'Migração gratuita', included: true },
            { name: 'Multi-unidade', included: false },
            { name: 'API dedicada', included: false },
            { name: 'White-label', included: false },
        ],
        limits: {
            max_doctors: 10,
            max_appointments_month: -1, // unlimited
            max_patients: -1,
            max_storage_gb: 50,
            max_units: 1,
        },
        color: 'emerald',
        badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        name: 'Enterprise',
        tagline: 'Para clínicas estabelecidas',
        price: 497,
        priceLabel: 'R$ 497',
        billing: 'por mês',
        features: [
            { name: 'Até 30 médicos', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Tudo do Profissional +', included: true },
            { name: 'Até 3 unidades', included: true },
            { name: 'Prontuário multi-unidade', included: true },
            { name: 'IA Preditiva', included: true, tooltip: 'Análise preditiva de diagnósticos' },
            { name: 'WhatsApp Chatbot', included: true, tooltip: 'IA conversacional' },
            { name: 'Integrações Labs RJ', included: true, tooltip: 'Sérgio Franco, Richet' },
            { name: 'DataSUS/e-SUS', included: true, tooltip: 'Integração com sistema público' },
            { name: 'API dedicada', included: true },
            { name: 'BI multi-filiais', included: true },
            { name: 'Gerente de conta', included: true },
            { name: 'SLA 99.5%', included: true },
            { name: 'Onboarding personalizado', included: true },
            { name: 'White-label total', included: false },
            { name: 'Unidades ilimitadas', included: false },
        ],
        limits: {
            max_doctors: 30,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 200,
            max_units: 3,
        },
        color: 'purple',
        badgeColor: 'bg-purple-100 text-purple-800',
    },
    NETWORK: {
        id: 'NETWORK',
        name: 'Network',
        tagline: 'Para redes multi-unidade',
        price: 997,
        priceLabel: 'R$ 997',
        billing: 'por mês',
        features: [
            { name: 'Médicos ilimitados', included: true },
            { name: 'Consultas ilimitadas', included: true },
            { name: 'Tudo do Enterprise +', included: true },
            { name: 'Unidades ilimitadas', included: true },
            { name: 'White-label total', included: true, tooltip: 'Sua marca em tudo' },
            { name: 'IA Preditiva + Treinamento', included: true, tooltip: 'Modelo personalizado' },
            { name: 'Teleconsulta white-label', included: true },
            { name: 'Customização completa', included: true },
            { name: 'Integrações customizadas', included: true },
            { name: 'SLA garantido 99.9%', included: true },
            { name: 'Suporte VIP 24/7', included: true },
            { name: 'Consultoria estratégica', included: true },
            { name: 'Migração + consultoria', included: true },
        ],
        limits: {
            max_doctors: -1, // unlimited
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 1000,
            max_units: -1,
        },
        color: 'amber',
        badgeColor: 'bg-amber-100 text-amber-800',
    },
}

// Plan hierarchy (lowest to highest)
export const PLAN_ORDER: PlanType[] = ['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK']

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
    return PLANS.PROFESSIONAL
}

export function isPlanAtLeast(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    return PLAN_LEVEL[currentPlan] >= PLAN_LEVEL[requiredPlan]
}

export function canUpgradeTo(currentPlan: PlanType, targetPlan: PlanType): boolean {
    return PLAN_LEVEL[targetPlan] > PLAN_LEVEL[currentPlan]
}

// Legacy compatibility - map old 3-tier to new 5-tier
export function migrateLegacyPlan(legacyPlan: string): PlanType {
    const mapping: Record<string, PlanType> = {
        'BASIC': 'BASIC',
        'PRO': 'PROFESSIONAL',
        'ENTERPRISE': 'NETWORK',
    }
    return mapping[legacyPlan] || 'STARTER'
}
