import { getRedisClient, CacheKeys, CacheTTL } from './redis-client'
import { createClient } from '@supabase/supabase-js'

export interface PlanLimits {
    plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
    maxDoctors: number
    maxAppointments: number
    usedAppointments: number
    hasAiAccess: boolean
    hasAiAddon: boolean
}

const PLAN_LIMITS = {
    BASIC: { maxDoctors: 5, maxAppointments: 200, hasAiAccess: false },
    PRO: { maxDoctors: 15, maxAppointments: 500, hasAiAccess: false },
    ENTERPRISE: { maxDoctors: Infinity, maxAppointments: Infinity, hasAiAccess: true },
}

/**
 * Get cached plan limits for a clinic
 * Target: < 50ms response time
 */
export async function getCachedPlanLimits(clinicId: string): Promise<PlanLimits> {
    const redis = getRedisClient()
    const key = CacheKeys.limits(clinicId)

    // Try cache first (should be < 10ms)
    const startTime = Date.now()
    const cached = await redis.get<PlanLimits>(key)

    if (cached) {
        const elapsed = Date.now() - startTime
        console.log(`✅ Cache HIT for ${clinicId} in ${elapsed}ms`)
        return cached
    }

    // Cache miss: query database
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type, ai_addon_enabled')
        .eq('id', clinicId)
        .single()

    // Count appointments this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('created_at', startOfMonth.toISOString())

    const planType = (clinic?.plan_type || 'BASIC') as keyof typeof PLAN_LIMITS
    const planConfig = PLAN_LIMITS[planType]

    const limits: PlanLimits = {
        plan: planType,
        maxDoctors: planConfig.maxDoctors,
        maxAppointments: planConfig.maxAppointments,
        usedAppointments: count || 0,
        hasAiAccess: planConfig.hasAiAccess,
        hasAiAddon: clinic?.ai_addon_enabled || false,
    }

    // Set cache with TTL
    await redis.set(key, limits, { ex: CacheTTL.limits })

    const elapsed = Date.now() - startTime
    console.log(`⏳ Cache MISS for ${clinicId} in ${elapsed}ms (now cached)`)

    return limits
}

/**
 * Check if clinic can create new appointment
 * Returns true if allowed, throws if limit exceeded
 */
export async function checkAppointmentLimit(clinicId: string): Promise<boolean> {
    const limits = await getCachedPlanLimits(clinicId)

    if (limits.usedAppointments >= limits.maxAppointments) {
        throw new Error(
            `LIMIT_EXCEEDED: Plano ${limits.plan} permite ${limits.maxAppointments} agendamentos/mês. ` +
            `Você já usou ${limits.usedAppointments}. Faça upgrade para continuar.`
        )
    }

    return true
}

/**
 * Check if clinic has AiA access
 */
export async function checkAiAccess(clinicId: string): Promise<boolean> {
    const limits = await getCachedPlanLimits(clinicId)
    return limits.hasAiAccess || limits.hasAiAddon
}

/**
 * Invalidate plan cache (call after plan change or new appointment)
 */
export async function invalidatePlanCache(clinicId: string): Promise<void> {
    const redis = getRedisClient()
    await redis.del(CacheKeys.limits(clinicId))
    console.log(`🗑️ Cache invalidated for ${clinicId}`)
}

// Legacy exports for backwards compatibility
export async function getCachedPlan(clinicId: string) {
    try {
        const limits = await getCachedPlanLimits(clinicId)
        return limits
    } catch {
        return null
    }
}

export async function setCachedPlan(clinicId: string, planData: PlanLimits, ttl = 300) {
    const redis = getRedisClient()
    await redis.set(CacheKeys.limits(clinicId), planData, { ex: ttl })
}
