/**
 * Plan Limits Hook
 * Manages plan limits and features validation
 */

import { useState, useCallback } from 'react'
import { PlanType } from '@/lib/constants/plans'
import { hasFeature, requiresUpgrade, type FeatureKey } from '@/lib/constants/plan-features'

interface UsePlanGuardProps {
    currentPlan: PlanType
}

export function usePlanGuard({ currentPlan }: UsePlanGuardProps) {
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
    const [upgradeData, setUpgradeData] = useState<{
        feature: string
        description?: string
        suggestedPlan?: PlanType
    } | null>(null)

    /**
     * Check if current plan can access a feature
     * If not, show upgrade modal
     */
    const checkFeatureAccess = useCallback(
        (feature: FeatureKey, featureName: string, featureDescription?: string): boolean => {
            const { requires, suggestedPlan } = requiresUpgrade(currentPlan, feature)

            if (requires) {
                setUpgradeData({
                    feature: featureName,
                    description: featureDescription,
                    suggestedPlan,
                })
                setUpgradeModalOpen(true)
                return false
            }

            return true
        },
        [currentPlan]
    )

    /**
     * Check if current plan has a specific feature
     */
    const canUseFeature = useCallback(
        (feature: FeatureKey): boolean => {
            return hasFeature(currentPlan, feature)
        },
        [currentPlan]
    )

    const closeUpgradeModal = useCallback(() => {
        setUpgradeModalOpen(false)
        setUpgradeData(null)
    }, [])

    return {
        checkFeatureAccess,
        canUseFeature,
        upgradeModalOpen,
        upgradeData,
        closeUpgradeModal,
    }
}

/**
 * Example Usage:
 * 
 * const { checkFeatureAccess, upgradeModalOpen, upgradeData, closeUpgradeModal } = usePlanGuard({
 *     currentPlan: clinic.plan_type
 * })
 * 
 * function handleUseAIReasoning() {
 *     if (!checkFeatureAccess(
 *         'ai_reasoning',
 *         'IA com Raciocínio Avançado',
 *         'Claude 3.5 e GPT-4o com capacidade de análise profunda e sugestões contextuais'
 *     )) {
 *         return // Modal will show
 *     }
 *     
 *     // Proceed with feature
 *     performAIReasoning()
 * }
 * 
 * return (
 *     <>
 *         <Button onClick={handleUseAIReasoning}>
 *             Análise com IA
 *         </Button>
 *         
 *         {upgradeModalOpen && upgradeData && (
 *             <UpgradeModal
 *                 open={upgradeModalOpen}
 *                 onClose={closeUpgradeModal}
 *                 currentPlan={currentPlan}
 *                 suggestedPlan={upgradeData.suggestedPlan!}
 *                 featureName={upgradeData.feature}
 *                 featureDescription={upgradeData.description}
 *             />
 *         )}
 *     </>
 * )
 */

