/**
 * Plan Permissions Middleware
 * Centralized permission checking for plan-based features
 */

import { type PlanType, PLAN_LEVEL } from '@/lib/constants/plans'
import { type FeatureKey, hasFeature, getMinPlanForFeature } from '@/lib/constants/plan-features'

/**
 * Error thrown when a user tries to access a feature not available in their plan
 */
export class PlanPermissionError extends Error {
    public feature: string
    public requiredPlan: string
    public currentPlan: PlanType

    constructor(feature: string, requiredPlan: string, currentPlan: PlanType) {
        super(`Recurso "${feature}" requer plano ${requiredPlan} ou superior`)
        this.name = 'PlanPermissionError'
        this.feature = feature
        this.requiredPlan = requiredPlan
        this.currentPlan = currentPlan
    }
}

/**
 * Check if the current plan has permission to access a feature
 */
export function checkPlanPermission(
    currentPlan: PlanType,
    feature: FeatureKey
): boolean {
    return hasFeature(currentPlan, feature)
}

/**
 * Require permission for a feature, throwing if not available
 */
export function requirePlanPermission(
    currentPlan: PlanType,
    feature: FeatureKey,
    featureName?: string
): void {
    if (!checkPlanPermission(currentPlan, feature)) {
        const requiredPlan = getMinPlanForFeature(feature)
        const displayName = getDisplayPlanName(requiredPlan)
        throw new PlanPermissionError(
            featureName || feature,
            displayName,
            currentPlan
        )
    }
}

/**
 * Get human-readable plan name
 */
export function getDisplayPlanName(planType: PlanType): string {
    const names: Record<PlanType, string> = {
        STARTER: 'CliniGO Consultório',
        BASIC: 'CliniGO Clínica',
        PROFESSIONAL: 'CliniGO Centro Clínico',
        ENTERPRISE: 'CliniGO Rede Enterprise',
        NETWORK: 'Enterprise'
    }
    return names[planType] || planType
}

/**
 * Get upgrade URL for a feature
 */
export function getUpgradeUrl(feature: FeatureKey): string {
    const requiredPlan = getMinPlanForFeature(feature)
    return `/dashboard/configuracoes/planos?upgrade=${requiredPlan}&feature=${feature}`
}

/**
 * API middleware wrapper for checking plan permissions
 * Use in API routes to guard endpoints
 */
export function withPlanPermission<T extends (...args: any[]) => any>(
    feature: FeatureKey,
    handler: T,
    getPlan: () => Promise<PlanType | null>
): (...args: Parameters<T>) => Promise<ReturnType<T> | Response> {
    return async (...args: Parameters<T>) => {
        const plan = await getPlan()

        if (!plan) {
            return new Response(
                JSON.stringify({ error: 'Plano não encontrado' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
        }

        if (!checkPlanPermission(plan, feature)) {
            const requiredPlan = getMinPlanForFeature(feature)
            return new Response(
                JSON.stringify({
                    error: 'Recurso não disponível no seu plano',
                    feature,
                    requiredPlan,
                    currentPlan: plan,
                    upgradeUrl: getUpgradeUrl(feature)
                }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return handler(...args)
    }
}

/**
 * Check multiple features at once
 */
export function checkMultiplePlanPermissions(
    currentPlan: PlanType,
    features: FeatureKey[]
): Record<FeatureKey, boolean> {
    return features.reduce((acc, feature) => {
        acc[feature] = checkPlanPermission(currentPlan, feature)
        return acc
    }, {} as Record<FeatureKey, boolean>)
}
