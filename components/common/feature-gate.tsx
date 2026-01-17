'use client'

import { usePlan } from '@/lib/hooks/use-plan'
import { type FeatureKey, hasFeature, getMinPlanForFeature } from '@/lib/constants/plan-features'
import { getDisplayPlanName, getUpgradeUrl } from '@/lib/middlewares/plan-permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Lock, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

interface FeatureGateProps {
    /** The feature key to check permission for */
    feature: FeatureKey
    /** Human-readable name of the feature for display */
    featureName?: string
    /** Content to render when feature is available */
    children: ReactNode
    /** Optional custom fallback when feature is not available */
    fallback?: ReactNode
    /** If true, shows nothing when feature is blocked (instead of upgrade message) */
    hideWhenBlocked?: boolean
}

/**
 * FeatureGate Component
 * 
 * Conditionally renders children based on plan permissions.
 * Shows an upgrade prompt when the feature is not available in the current plan.
 * 
 * @example
 * ```tsx
 * <FeatureGate feature="tiss" featureName="Faturamento TISS">
 *   <TISSComponent />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({
    feature,
    featureName,
    children,
    fallback,
    hideWhenBlocked = false
}: FeatureGateProps) {
    const { planType, isLoading } = usePlan()

    // Show loading state or nothing while loading
    if (isLoading) {
        return null
    }

    // Default to STARTER if no plan found
    const currentPlan = planType || 'STARTER'
    const hasPermission = hasFeature(currentPlan, feature)

    // If user has permission, render children
    if (hasPermission) {
        return <>{children}</>
    }

    // If user doesn't have permission and hideWhenBlocked is true, render nothing
    if (hideWhenBlocked) {
        return null
    }

    // If custom fallback provided, use it
    if (fallback) {
        return <>{fallback}</>
    }

    // Default fallback: show upgrade message
    const requiredPlan = getMinPlanForFeature(feature)
    const requiredPlanName = getDisplayPlanName(requiredPlan)
    const upgradeUrl = getUpgradeUrl(feature)
    const displayName = featureName || feature

    return (
        <Alert variant="destructive" className="my-4 border-amber-200 bg-amber-50">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-amber-800">
                    O recurso <strong>{displayName}</strong> não está disponível no seu plano atual.
                    Requer <strong>{requiredPlanName}</strong> ou superior.
                </span>
                <Button asChild size="sm" variant="outline" className="shrink-0 border-amber-300 hover:bg-amber-100">
                    <Link href={upgradeUrl}>
                        <ArrowUpRight className="mr-1 h-3 w-3" />
                        Fazer Upgrade
                    </Link>
                </Button>
            </AlertDescription>
        </Alert>
    )
}

/**
 * Hook for checking feature permissions in components
 */
export function useFeaturePermission(feature: FeatureKey) {
    const { planType, isLoading } = usePlan()
    const currentPlan = planType || 'STARTER'

    return {
        hasPermission: hasFeature(currentPlan, feature),
        isLoading,
        requiredPlan: getMinPlanForFeature(feature),
        upgradeUrl: getUpgradeUrl(feature)
    }
}
