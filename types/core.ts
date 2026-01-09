/**
 * Core Types - Single Source of Truth
 * 5-Tier Plan System for RJ Market
 */

// ============================================================================
// PLAN TYPES (5-Tier Source of Truth)
// ============================================================================

export type PlanType = 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

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
    return ['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(value)
}

export function isUserRole(value: string): value is UserRole {
    return ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'].includes(value)
}

export function isSubscriptionStatus(value: string): value is SubscriptionStatus {
    return ['PENDING', 'ACTIVE', 'CANCELLED', 'SUSPENDED', 'PAST_DUE'].includes(value)
}

// ============================================================================
// CONSTANTS (5-Tier RJ Market)
// ============================================================================

export const PLAN_DEFINITIONS: Record<PlanType, PlanDefinition> = {
    STARTER: {
        type: 'STARTER',
        name: 'Starter',
        price_monthly: 47,
        price_yearly: 470,
        tier: 1,
        limits: {
            max_doctors: 1,
            max_appointments_month: 50,
            max_patients: 100,
            max_storage_gb: 1,
            max_units: 1,
        },
        features: [
            'ai_simple',
            'prontuario_basic',
        ],
    },
    BASIC: {
        type: 'BASIC',
        name: 'Básico',
        price_monthly: 87,
        price_yearly: 870,
        tier: 2,
        limits: {
            max_doctors: 3,
            max_appointments_month: 200,
            max_patients: 500,
            max_storage_gb: 5,
            max_units: 1,
        },
        features: [
            'ai_simple',
            'video_google_meet',
            'whatsapp_manual',
            'prontuario_basic',
            'financeiro_basic',
            'relatorios_basic',
        ],
    },
    PROFESSIONAL: {
        type: 'PROFESSIONAL',
        name: 'Profissional',
        price_monthly: 247,
        price_yearly: 2470,
        tier: 3,
        limits: {
            max_doctors: 10,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 50,
            max_units: 1,
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
        price_monthly: 497,
        price_yearly: 4970,
        tier: 4,
        limits: {
            max_doctors: 30,
            max_appointments_month: -1,
            max_patients: -1,
            max_storage_gb: 200,
            max_units: 3,
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
        ],
    },
    NETWORK: {
        type: 'NETWORK',
        name: 'Network',
        price_monthly: 997,
        price_yearly: 9970,
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

// Legacy plan migration helper
export function migrateLegacyPlan(legacyPlan: string): PlanType {
    const mapping: Record<string, PlanType> = {
        'BASIC': 'BASIC',
        'PRO': 'PROFESSIONAL',
        'ENTERPRISE': 'NETWORK',
    }
    return mapping[legacyPlan] || 'STARTER'
}
