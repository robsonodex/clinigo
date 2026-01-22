/**
 * Plan Guard Middleware
 * Centralized plan validation for API routes
 */

import { createClient } from '@/lib/supabase/server'
import { hasFeature, type FeatureKey } from '@/lib/constants/plan-features'
import { type PlanType } from '@/lib/constants/plans'
import { NextResponse } from 'next/server'

export interface PlanValidationResult {
    allowed: boolean
    planType: PlanType
    clinicId: string
}

export interface PlanGuardError {
    error: string
    current_plan: PlanType
    required_feature: string
    upgrade_to: 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'
}

/**
 * Validate if a clinic can use a specific feature based on their plan
 */
export async function validatePlanFeature(
    clinicId: string,
    feature: FeatureKey
): Promise<PlanValidationResult> {
    const supabase = await createClient()

    // Get clinic plan
    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        throw new Error('Clinic not found')
    }

    // Type-safe extraction with fallback
    const clinicData = clinic as { plan_type?: string } | null
    const planType: PlanType = (clinicData?.plan_type as PlanType) || 'BASICO'

    return {
        allowed: hasFeature(planType, feature),
        planType,
        clinicId,
    }
}

/**
 * Create a 403 Forbidden response for feature not available in plan
 */
export function createPlanError(
    currentPlan: PlanType,
    feature: string,
    requiredPlan: 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' = 'AVANCADO'
): NextResponse<PlanGuardError> {
    return NextResponse.json(
        {
            error: `Recurso "${feature}" disponível apenas nos planos ${requiredPlan === 'AVANCADO' ? 'Avançado, Professional e Enterprise' : requiredPlan === 'PROFESSIONAL' ? 'Professional e Enterprise' : 'Enterprise'
                }`,
            current_plan: currentPlan,
            required_feature: feature,
            upgrade_to: requiredPlan,
        },
        { status: 403 }
    )
}

/**
 * Guard decorator for API routes (use in route handlers)
 * 
 * Example:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *     const { clinic_id } = await request.json()
 *     
 *     const validation = await guardFeature(clinic_id, 'ai_reasoning')
 *     if (!validation.allowed) {
 *         return createPlanError(validation.planType, 'IA com Reasoning')
 *     }
 *     
 *     // Continue with feature logic...
 * }
 * ```
 */
export async function guardFeature(
    clinicId: string,
    feature: FeatureKey
): Promise<PlanValidationResult> {
    return await validatePlanFeature(clinicId, feature)
}

/**
 * Get clinic plan type (helper)
 */
export async function getClinicPlan(clinicId: string): Promise<PlanType> {
    const supabase = await createClient()

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        throw new Error('Clinic not found')
    }

    // Type-safe extraction
    const clinicData = clinic as { plan_type?: string } | null
    return (clinicData?.plan_type as PlanType) || 'BASICO'
}

/**
 * Check if clinic belongs to specific plan tiers
 */
export async function isMinimumPlan(
    clinicId: string,
    minimumTier: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'
): Promise<boolean> {
    const planType = await getClinicPlan(clinicId)

    const tierOrder: Record<PlanType, number> = {
        BASICO: 1,
        AVANCADO: 2,
        PROFESSIONAL: 3,
        ENTERPRISE: 4,
        NETWORK: 5,
    }

    return tierOrder[planType] >= tierOrder[minimumTier]
}

