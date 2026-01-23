/**
 * Permissions Service - CliniGo Custom Permissions System
 * Handles custom feature permissions and pricing per clinic
 */

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import {
    type FeatureKey,
    FEATURE_METADATA,
    PROTECTED_FEATURES,
    isFeatureInDefaultPlan,
} from '@/lib/constants/features'
import type { PlanType } from '@/lib/constants/plans'

// Standard plan prices
const PLAN_PRICES: Record<string, number> = {
    BASICO: 149,
    AVANCADO: 299,
    PROFESSIONAL: 549,
    ENTERPRISE: 799,
}

export interface CustomPermission {
    id: string
    clinic_id: string
    feature_key: FeatureKey
    is_enabled: boolean
    enabled_by: string | null
    enabled_at: string | null
    disabled_at: string | null
    reason: string | null
    created_at: string
    updated_at: string
}

export interface ClinicPricing {
    plan_type: PlanType
    custom_price: number | null
    custom_price_start_date: string | null
    custom_price_end_date: string | null
    custom_price_reason: string | null
    effective_price: number
    is_custom_active: boolean
}

/**
 * Check if a clinic can access a specific feature
 * Priority: Custom permission > Plan default
 */
export async function canAccessFeature(
    clinicId: string,
    featureKey: FeatureKey
): Promise<boolean> {
    // Dashboard NEVER can be disabled
    if (PROTECTED_FEATURES.includes(featureKey)) {
        return true
    }

    const supabase = await createClient()

    // 1. Check for custom permission override
    const { data: customPermission } = await supabase
        .from('clinic_custom_permissions')
        .select('is_enabled')
        .eq('clinic_id', clinicId)
        .eq('feature_key', featureKey)
        .maybeSingle()

    if (customPermission !== null) {
        return customPermission.is_enabled
    }

    // 2. No custom permission - use plan default
    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    if (!clinic) return false

    return isFeatureInDefaultPlan(featureKey, clinic.plan_type)
}

/**
 * Check feature access with user context (for API routes)
 */
export async function checkFeatureAccessForUser(
    userId: string,
    featureKey: FeatureKey
): Promise<{ canAccess: boolean; clinicId: string | null }> {
    const supabase = await createClient()

    // Get user's clinic
    const { data: user } = await supabase
        .from('users')
        .select('clinic_id, role')
        .eq('id', userId)
        .single()

    if (!user || !user.clinic_id) {
        return { canAccess: false, clinicId: null }
    }

    // SUPER_ADMIN always has access
    if (user.role === 'SUPER_ADMIN') {
        return { canAccess: true, clinicId: user.clinic_id }
    }

    const canAccess = await canAccessFeature(user.clinic_id, featureKey)
    return { canAccess, clinicId: user.clinic_id }
}

/**
 * Enable a feature for a clinic (SUPER_ADMIN only)
 */
export async function enableFeature(
    clinicId: string,
    featureKey: FeatureKey,
    enabledBy: string,
    reason?: string
): Promise<void> {
    if (PROTECTED_FEATURES.includes(featureKey)) {
        throw new Error('Cannot modify protected feature')
    }

    const supabase = createServiceRoleClient()

    await supabase
        .from('clinic_custom_permissions')
        .upsert(
            {
                clinic_id: clinicId,
                feature_key: featureKey,
                is_enabled: true,
                enabled_by: enabledBy,
                enabled_at: new Date().toISOString(),
                disabled_at: null,
                reason: reason || null,
            },
            { onConflict: 'clinic_id,feature_key' }
        )
}

/**
 * Disable a feature for a clinic (SUPER_ADMIN only)
 */
export async function disableFeature(
    clinicId: string,
    featureKey: FeatureKey,
    disabledBy: string,
    reason?: string
): Promise<void> {
    if (PROTECTED_FEATURES.includes(featureKey)) {
        throw new Error('Cannot modify protected feature')
    }

    const supabase = createServiceRoleClient()

    await supabase
        .from('clinic_custom_permissions')
        .upsert(
            {
                clinic_id: clinicId,
                feature_key: featureKey,
                is_enabled: false,
                enabled_by: disabledBy,
                enabled_at: null,
                disabled_at: new Date().toISOString(),
                reason: reason || null,
            },
            { onConflict: 'clinic_id,feature_key' }
        )
}

/**
 * Get all permissions for a clinic (custom + defaults)
 */
export async function getClinicPermissions(
    clinicId: string
): Promise<Record<FeatureKey, { enabled: boolean; isCustom: boolean }>> {
    const supabase = await createClient()

    // Get clinic plan
    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    if (!clinic) {
        throw new Error('Clinic not found')
    }

    // Get custom permissions
    const { data: customPermissions } = await supabase
        .from('clinic_custom_permissions')
        .select('feature_key, is_enabled')
        .eq('clinic_id', clinicId)

    const customMap = new Map(
        customPermissions?.map((p) => [p.feature_key, p.is_enabled]) || []
    )

    // Build result
    const result = {} as Record<FeatureKey, { enabled: boolean; isCustom: boolean }>

    for (const [featureKey, metadata] of Object.entries(FEATURE_METADATA)) {
        const key = featureKey as FeatureKey
        const isCustom = customMap.has(key)
        const enabled = isCustom
            ? customMap.get(key)!
            : isFeatureInDefaultPlan(key, clinic.plan_type)

        result[key] = { enabled, isCustom }
    }

    return result
}

/**
 * Reset all custom permissions for a clinic (restore defaults)
 */
export async function resetClinicPermissions(clinicId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
        .from('clinic_custom_permissions')
        .delete()
        .eq('clinic_id', clinicId)
}

/**
 * Set custom price for a clinic
 */
export async function setCustomPrice(
    clinicId: string,
    price: number,
    startDate: Date,
    endDate: Date | null,
    reason: string
): Promise<void> {
    if (price < 0) {
        throw new Error('Price cannot be negative')
    }

    if (endDate && endDate < startDate) {
        throw new Error('End date must be after start date')
    }

    const supabase = createServiceRoleClient()

    await supabase
        .from('clinics')
        .update({
            custom_price: price,
            custom_price_start_date: startDate.toISOString().split('T')[0],
            custom_price_end_date: endDate?.toISOString().split('T')[0] || null,
            custom_price_reason: reason,
        })
        .eq('id', clinicId)
}

/**
 * Clear custom price for a clinic
 */
export async function clearCustomPrice(clinicId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
        .from('clinics')
        .update({
            custom_price: null,
            custom_price_start_date: null,
            custom_price_end_date: null,
            custom_price_reason: null,
        })
        .eq('id', clinicId)
}

/**
 * Get effective price for a clinic (considering custom pricing)
 */
export async function getEffectivePrice(clinicId: string): Promise<ClinicPricing> {
    const supabase = await createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select(
            'plan_type, custom_price, custom_price_start_date, custom_price_end_date, custom_price_reason'
        )
        .eq('id', clinicId)
        .single()

    if (!clinic) {
        throw new Error('Clinic not found')
    }

    const planType = clinic.plan_type as PlanType
    const standardPrice = PLAN_PRICES[planType] || PLAN_PRICES.BASICO

    // Check if custom price is currently active
    let isCustomActive = false
    let effectivePrice = standardPrice

    if (clinic.custom_price !== null) {
        const now = new Date()
        const startDate = clinic.custom_price_start_date
            ? new Date(clinic.custom_price_start_date)
            : null
        const endDate = clinic.custom_price_end_date
            ? new Date(clinic.custom_price_end_date)
            : null

        const afterStart = !startDate || now >= startDate
        const beforeEnd = !endDate || now <= endDate

        if (afterStart && beforeEnd) {
            isCustomActive = true
            effectivePrice = clinic.custom_price
        }
    }

    return {
        plan_type: planType,
        custom_price: clinic.custom_price,
        custom_price_start_date: clinic.custom_price_start_date,
        custom_price_end_date: clinic.custom_price_end_date,
        custom_price_reason: clinic.custom_price_reason,
        effective_price: effectivePrice,
        is_custom_active: isCustomActive,
    }
}

/**
 * Get permission change history from audit logs
 */
export async function getPermissionHistory(
    clinicId: string,
    limit = 50
): Promise<any[]> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`resource_type.eq.CLINIC_PERMISSION,resource_type.eq.CLINIC`)
        .or(`metadata->>clinic_id.eq.${clinicId},resource_id.eq.${clinicId}`)
        .in('action', ['PERMISSION_CREATED', 'PERMISSION_UPDATED', 'PERMISSION_DELETED', 'CUSTOM_PRICE_CHANGED'])
        .order('created_at', { ascending: false })
        .limit(limit)

    return data || []
}
