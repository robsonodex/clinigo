/**
 * Core Types - Single Source of Truth
 * 4-Tier Plan System: Básico, Avançado, Professional, Enterprise
 * 
 * ATUALIZADO: 2026-02-09 - Apenas funcionalidades REALMENTE implementadas
 */

// ============================================================================
// PLAN TYPES (4-Tier Source of Truth)
// ============================================================================

export type PlanType = 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'

// Funcionalidades que REALMENTE existem no sistema
export type PlanFeature =
    // Check-in & Recepção
    | 'check_in_qr'
    | 'check_in_facial'
    | 'pre_registration'
    | 'triagem'
    // Teleconsulta
    | 'teleconsulta_webrtc'
    // Prontuário
    | 'prontuario'
    | 'documentos'
    | 'termos_legais'
    // Financeiro
    | 'financeiro'
    | 'pagamentos'
    | 'convenios'
    | 'dre'
    | 'auditoria'
    | 'repasse_medico'
    // TISS
    | 'tiss'
    // CRM & Comunicação
    | 'crm'
    | 'notificacoes_email'
    | 'whatsapp_evolution'
    // Relatórios
    | 'relatorios'
    // Gestão
    | 'estoque'
    | 'importacao'
    | 'agenda'
    | 'horarios'
    | 'medicos'
    | 'pacientes'
    | 'usuarios'
    // Plataforma
    | 'pagina_publica'
    | 'multi_units'

export interface PlanLimits {
    max_doctors: number
    max_appointments_month: number
    max_patients: number
    max_storage_gb: number
    max_units: number
}

export interface PlanDefinition {
    type: PlanType
    name: string
    price_monthly: number
    price_yearly: number
    limits: PlanLimits
    features: PlanFeature[]
    tier: number
}

// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole =
    | 'SUPER_ADMIN'
    | 'CLINIC_ADMIN'
    | 'DOCTOR'
    | 'RECEPTIONIST'
    | 'NURSE'

export interface StrictUser {
    id: string
    email: string
    full_name: string
    clinic_id: string
    role: UserRole
    is_active: boolean
    created_at: string
    updated_at: string
}

export interface UserWithClinic extends StrictUser {
    clinic: StrictClinic
}

// ============================================================================
// CLINIC TYPES
// ============================================================================

export interface StrictClinic {
    id: string
    name: string
    plan_type: PlanType
    plan_limits: PlanLimits
    is_active: boolean
    created_at: string
    updated_at: string
}

// ============================================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================================

export type SubscriptionStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'CANCELLED'
    | 'SUSPENDED'
    | 'PAST_DUE'

export type BillingCycle = 'MONTHLY' | 'YEARLY'

export interface Subscription {
    id: string
    clinic_id: string
    plan_type: PlanType
    status: SubscriptionStatus
    amount: number
    billing_cycle: BillingCycle
    mp_preference_id: string | null
    mp_subscription_id: string | null
    mp_payment_id: string | null
    current_period_start: string | null
    current_period_end: string | null
    created_at: string
    updated_at: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
    data?: T
    error?: string
    message?: string
}

export interface PlanGuardResponse {
    allowed: boolean
    current_plan: PlanType
    required_plan?: PlanType
    upgrade_to?: PlanType
    message?: string
}

export interface BillingCheckoutResponse {
    subscription_id: string
    preference_id: string
    init_point: string
    sandbox_init_point?: string
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isPlanType(value: string): value is PlanType {
    return ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'].includes(value)
}

export function isUserRole(value: string): value is UserRole {
    return ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'].includes(value)
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
    return ['PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'PAST_DUE'].includes(value)
}

// ============================================================================
// CONSTANTS (4-Tier) - APENAS FUNCIONALIDADES REAIS
// ============================================================================

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
    BASICO: {
        type: 'BASICO',
        name: 'Básico',
        price_monthly: 149,
        price_yearly: 1490,
        tier: 1,
        limits: {
            max_doctors: 2,
            max_appointments_month: -1,
            max_patients: 500,
            max_storage_gb: 5,
            max_units: 1,
        },
        features: [
            'check_in_qr',
            'pre_registration',
            'triagem',
            'teleconsulta_webrtc',
            'prontuario',
            'documentos',
            'termos_legais',
            'financeiro',
            'pagamentos',
            'convenios',
            'notificacoes_email',
            'relatorios',
            'estoque',
            'agenda',
            'horarios',
            'medicos',
            'pacientes',
            'usuarios',
            'pagina_publica',
        ],
    },
    AVANCADO: {
        type: 'AVANCADO',
        name: 'Avançado',
        price_monthly: 299,
        price_yearly: 2990,
        tier: 2,
        limits: {
            max_doctors: 5,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 20,
            max_units: 1,
        },
        features: [
            // Tudo do BASICO +
            'check_in_qr',
            'check_in_facial',
            'pre_registration',
            'triagem',
            'teleconsulta_webrtc',
            'prontuario',
            'documentos',
            'termos_legais',
            'financeiro',
            'pagamentos',
            'convenios',
            'dre',
            'auditoria',
            'repasse_medico',
            'crm',
            'notificacoes_email',
            'whatsapp_evolution',
            'relatorios',
            'estoque',
            'importacao',
            'agenda',
            'horarios',
            'medicos',
            'pacientes',
            'usuarios',
            'pagina_publica',
        ],
    },
    PROFESSIONAL: {
        type: 'PROFESSIONAL',
        name: 'Professional',
        price_monthly: 549,
        price_yearly: 5490,
        tier: 3,
        limits: {
            max_doctors: 30,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 100,
            max_units: 3,
        },
        features: [
            // Tudo do AVANCADO +
            'check_in_qr',
            'check_in_facial',
            'pre_registration',
            'triagem',
            'teleconsulta_webrtc',
            'prontuario',
            'documentos',
            'termos_legais',
            'financeiro',
            'pagamentos',
            'convenios',
            'dre',
            'auditoria',
            'repasse_medico',
            'tiss',
            'crm',
            'notificacoes_email',
            'whatsapp_evolution',
            'relatorios',
            'estoque',
            'importacao',
            'agenda',
            'horarios',
            'medicos',
            'pacientes',
            'usuarios',
            'pagina_publica',
            'multi_units',
        ],
    },
    ENTERPRISE: {
        type: 'ENTERPRISE',
        name: 'Enterprise',
        price_monthly: 799,
        price_yearly: 7990,
        tier: 4,
        limits: {
            max_doctors: -1,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 500,
            max_units: -1,
        },
        features: [
            // Tudo do PROFESSIONAL + ilimitado
            'check_in_qr',
            'check_in_facial',
            'pre_registration',
            'triagem',
            'teleconsulta_webrtc',
            'prontuario',
            'documentos',
            'termos_legais',
            'financeiro',
            'pagamentos',
            'convenios',
            'dre',
            'auditoria',
            'repasse_medico',
            'tiss',
            'crm',
            'notificacoes_email',
            'whatsapp_evolution',
            'relatorios',
            'estoque',
            'importacao',
            'agenda',
            'horarios',
            'medicos',
            'pacientes',
            'usuarios',
            'pagina_publica',
            'multi_units',
        ],
    },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function hasFeature(planType: PlanType, feature: PlanFeature): boolean {
    return PLAN_DEFINITIONS[planType]?.features.includes(feature) ?? false
}

export function canUpgradeTo(current: PlanType, target: PlanType): boolean {
    return PLAN_DEFINITIONS[target].tier > PLAN_DEFINITIONS[current].tier
}

export function getPlanPrice(planType: PlanType, cycle: BillingCycle): number {
    const plan = PLAN_DEFINITIONS[planType]
    return cycle === 'MONTHLY' ? plan.price_monthly : plan.price_yearly
}

export function getPlanTier(planType: PlanType): number {
    return PLAN_DEFINITIONS[planType]?.tier ?? 1
}

/**
 * Legacy plan migration helper
 * Converts old plan names to new nomenclature
 */
export function migrateLegacyPlan(legacyPlan: string): PlanType {
    const mapping: Record<string, PlanType> = {
        // New names
        'BASICO': 'BASICO',
        'AVANCADO': 'AVANCADO',
        'PROFESSIONAL': 'PROFESSIONAL',
        'ENTERPRISE': 'ENTERPRISE',
        // Legacy names
        'STARTER': 'BASICO',
        'BASIC': 'AVANCADO',
        'NETWORK': 'ENTERPRISE',
        'PRO': 'PROFESSIONAL',
    }
    return mapping[legacyPlan] || 'BASICO'
}
