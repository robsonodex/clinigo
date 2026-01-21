/**
 * Core Types - Single Source of Truth
 * 4-Tier Plan System: Básico, Avançado, Professional, Enterprise
 */

// ============================================================================
// PLAN TYPES (4-Tier Source of Truth)
// ============================================================================

export type PlanType = 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

export type PlanFeature =
    | 'ai_simple'
    | 'ai_reasoning'
    | 'ai_predictive'
    | 'ai_custom_training'
    | 'video_google_meet'
    | 'video_daily'
    | 'video_whitelabel'
    | 'whatsapp_manual'
    | 'whatsapp_automation'
    | 'whatsapp_chatbot'
    | 'prontuario_basic'
    | 'prontuario_advanced'
    | 'prontuario_multi_unit'
    | 'financeiro_basic'
    | 'financeiro_advanced'
    | 'relatorios_basic'
    | 'relatorios_advanced'
    | 'relatorios_bi'
    | 'crm'
    | 'tiss'
    | 'marketplace'
    | 'estoque'
    | 'multi_units'
    | 'datasus'
    | 'labs_rj'
    | 'api_dedicated'
    | 'whitelabel'
    | 'custom_integrations'
    | 'unlimited_units'

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
    return ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(value)
}

export function isUserRole(value: string): value is UserRole {
    return ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'].includes(value)
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
    return ['PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'PAST_DUE'].includes(value)
}

// ============================================================================
// CONSTANTS (4-Tier)
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
            max_appointments_month: 100,
            max_patients: 500,
            max_storage_gb: 5,
            max_units: 1,
        },
        features: [
            'ai_simple',
            'prontuario_basic',
            'whatsapp_manual',
            'financeiro_basic',
            'relatorios_basic',
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
            max_appointments_month: 500,
            max_patients: -1,
            max_storage_gb: 20,
            max_units: 1,
        },
        features: [
            'ai_simple',
            'video_google_meet',
            'whatsapp_automation',
            'prontuario_basic',
            'financeiro_advanced',
            'relatorios_advanced',
            'crm',
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
            'ai_simple',
            'ai_reasoning',
            'video_daily',
            'whatsapp_automation',
            'prontuario_advanced',
            'financeiro_advanced',
            'relatorios_advanced',
            'crm',
            'tiss',
            'marketplace',
            'estoque',
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
            'ai_simple',
            'ai_reasoning',
            'ai_predictive',
            'video_daily',
            'whatsapp_automation',
            'whatsapp_chatbot',
            'prontuario_multi_unit',
            'financeiro_advanced',
            'relatorios_bi',
            'crm',
            'tiss',
            'marketplace',
            'estoque',
            'multi_units',
            'datasus',
            'labs_rj',
            'api_dedicated',
            'whitelabel',
        ],
    },
    NETWORK: {
        type: 'NETWORK',
        name: 'Network (Legacy)',
        price_monthly: 999,
        price_yearly: 9990,
        tier: 5,
        limits: {
            max_doctors: -1,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 1000,
            max_units: -1,
        },
        features: [
            'ai_simple',
            'ai_reasoning',
            'ai_predictive',
            'ai_custom_training',
            'video_whitelabel',
            'whatsapp_chatbot',
            'prontuario_multi_unit',
            'financeiro_advanced',
            'relatorios_bi',
            'crm',
            'tiss',
            'marketplace',
            'estoque',
            'multi_units',
            'datasus',
            'labs_rj',
            'api_dedicated',
            'whitelabel',
            'custom_integrations',
            'unlimited_units',
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
