/**
 * Plan Limits Service
 * Enforces SaaS plan restrictions for doctors and appointments
 */
import { createClient } from '@/lib/supabase/server'

// Plan limit configurations - Updated January 2026
const PLAN_LIMITS = {
    BASIC: {
        max_doctors: 3,
        max_appointments_month: 150,
        price: 147,
        features: ['basic_booking', 'email_notifications', 'whatsapp_share', 'mercadopago'],
    },
    STARTER: {
        max_doctors: 1,
        max_appointments_month: 50,
        price: 99,
        features: ['basic_booking', 'email_notifications'],
    },
    PRO: {
        max_doctors: 5,
        max_appointments_month: 300,
        price: 297,
        features: [
            'basic_booking',
            'email_notifications',
            'whatsapp_share',
            'mercadopago',
            'medical_records',
            'custom_smtp',
            'white_label',
            'advanced_reports',
            'lgpd_audit',
            'priority_support',
        ],
    },
    ENTERPRISE: {
        max_doctors: -1, // Unlimited
        max_appointments_month: -1, // Unlimited
        price: 897,
        features: [
            'basic_booking',
            'email_notifications',
            'whatsapp_share',
            'mercadopago',
            'medical_records',
            'custom_smtp',
            'white_label',
            'advanced_reports',
            'lgpd_audit',
            'api_access',
            'custom_integrations',
            'dedicated_support',
            'sla_99',
        ],
    },
} as const

type PlanType = keyof typeof PLAN_LIMITS
type FeatureType = (typeof PLAN_LIMITS)[PlanType]['features'][number]

export interface PlanLimitError extends Error {
    code: 'PLAN_LIMIT_REACHED'
    currentCount: number
    limit: number
    upgradeUrl: string
}

/**
 * Get clinic's current plan and limits
 */
export async function getClinicPlan(clinicId: string) {
    const supabase = await createClient()

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('plan_type, plan_limits')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        throw new Error(`Clinic not found: ${clinicId}`)
    }

    const planType = (clinic.plan_type as PlanType) || 'BASIC'
    const limits = PLAN_LIMITS[planType]

    return {
        planType,
        limits,
        customLimits: clinic.plan_limits as Record<string, number> | null,
    }
}

/**
 * Check if clinic can add more doctors
 */
export async function checkDoctorLimit(clinicId: string): Promise<void> {
    const supabase = await createClient()
    const { planType, limits, customLimits } = await getClinicPlan(clinicId)

    // Get effective limit (custom or default)
    const maxDoctors = customLimits?.max_doctors ?? limits.max_doctors

    // Unlimited
    if (maxDoctors === -1) {
        return
    }

    // Count current active doctors
    const { count, error } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

    if (error) {
        throw new Error(`Failed to count doctors: ${error.message}`)
    }

    const currentCount = count || 0

    if (currentCount >= maxDoctors) {
        const err = new Error(
            `Limite de ${maxDoctors} médico${maxDoctors > 1 ? 's' : ''} atingido no plano ${planType}. Faça upgrade para adicionar mais.`
        ) as PlanLimitError
        err.code = 'PLAN_LIMIT_REACHED'
        err.currentCount = currentCount
        err.limit = maxDoctors
        err.upgradeUrl = '/dashboard/planos'
        throw err
    }
}

/**
 * Check if clinic can create more appointments this month
 */
export async function checkAppointmentLimit(clinicId: string): Promise<void> {
    const supabase = await createClient()
    const { planType, limits, customLimits } = await getClinicPlan(clinicId)

    // Get effective limit (custom or default)
    const maxAppointments = customLimits?.max_appointments_month ?? limits.max_appointments_month

    // Unlimited
    if (maxAppointments === -1) {
        return
    }

    // Get start of current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Count appointments created this month
    const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfMonth.toISOString())

    if (error) {
        throw new Error(`Failed to count appointments: ${error.message}`)
    }

    const currentCount = count || 0

    if (currentCount >= maxAppointments) {
        const err = new Error(
            `Limite de ${maxAppointments} agendamentos/mês atingido no plano ${planType}. Faça upgrade para continuar agendando.`
        ) as PlanLimitError
        err.code = 'PLAN_LIMIT_REACHED'
        err.currentCount = currentCount
        err.limit = maxAppointments
        err.upgradeUrl = '/dashboard/planos'
        throw err
    }
}

/**
 * Check if clinic has access to a specific feature
 */
export async function canUseFeature(clinicId: string, feature: string): Promise<boolean> {
    const { limits } = await getClinicPlan(clinicId)
    return (limits.features as readonly string[]).includes(feature)
}

/**
 * Get plan usage statistics for dashboard
 */
export async function getPlanUsage(clinicId: string) {
    const supabase = await createClient()
    const { planType, limits, customLimits } = await getClinicPlan(clinicId)

    // Count doctors
    const { count: doctorCount } = await supabase
        .from('doctors')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)

    // Count appointments this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfMonth.toISOString())

    const maxDoctors = customLimits?.max_doctors ?? limits.max_doctors
    const maxAppointments = customLimits?.max_appointments_month ?? limits.max_appointments_month

    return {
        planType,
        doctors: {
            current: doctorCount || 0,
            limit: maxDoctors,
            unlimited: maxDoctors === -1,
            percentage: maxDoctors === -1 ? 0 : Math.round(((doctorCount || 0) / maxDoctors) * 100),
        },
        appointments: {
            current: appointmentCount || 0,
            limit: maxAppointments,
            unlimited: maxAppointments === -1,
            percentage: maxAppointments === -1 ? 0 : Math.round(((appointmentCount || 0) / maxAppointments) * 100),
        },
        features: limits.features,
    }
}

/**
 * Check plan limit and return appropriate API response
 */
export async function checkPlanLimit(
    clinicId: string,
    limitType: 'doctors' | 'appointments'
): Promise<{ success: true } | { success: false; error: PlanLimitError }> {
    try {
        if (limitType === 'doctors') {
            await checkDoctorLimit(clinicId)
        } else {
            await checkAppointmentLimit(clinicId)
        }
        return { success: true }
    } catch (error) {
        if ((error as PlanLimitError).code === 'PLAN_LIMIT_REACHED') {
            return { success: false, error: error as PlanLimitError }
        }
        throw error
    }
}

