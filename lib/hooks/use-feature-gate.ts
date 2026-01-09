'use client'

import { usePlan } from './use-plan'
import { useCallback, useMemo } from 'react'

type FeatureName =
    | 'ai_diagnosis'
    | 'patient_portal'
    | 'health_score'
    | 'tiss_billing'
    | 'multi_clinic'
    | 'whatsapp_integration'
    | 'api_access'
    | 'priority_support'

interface FeatureConfig {
    plans: string[]
    addon?: string
    name: string
    description: string
}

const FEATURE_GATES: Record<FeatureName, FeatureConfig> = {
    ai_diagnosis: {
        plans: ['ENTERPRISE'],
        addon: 'AI_DIAGNOSIS',
        name: 'IA Preditiva de Diagnóstico',
        description: 'Sugestões de diagnóstico baseadas em IA para suporte à decisão clínica.',
    },
    patient_portal: {
        plans: ['PRO', 'ENTERPRISE'],
        name: 'Portal do Paciente',
        description: 'Área exclusiva para pacientes acessarem histórico e agendarem consultas.',
    },
    health_score: {
        plans: ['PRO', 'ENTERPRISE'],
        name: 'Score de Saúde',
        description: 'Pontuação que indica o risco de saúde do paciente baseado em dados.',
    },
    tiss_billing: {
        plans: ['PRO', 'ENTERPRISE'],
        name: 'Faturamento TISS',
        description: 'Geração automática de guias TISS para convênios.',
    },
    multi_clinic: {
        plans: ['ENTERPRISE'],
        name: 'Multi-clínicas',
        description: 'Gerenciamento de múltiplas unidades em uma única conta.',
    },
    whatsapp_integration: {
        plans: ['PRO', 'ENTERPRISE'],
        name: 'Integração WhatsApp',
        description: 'Lembretes automáticos e comunicação via WhatsApp.',
    },
    api_access: {
        plans: ['ENTERPRISE'],
        name: 'Acesso à API',
        description: 'API para integração com sistemas externos.',
    },
    priority_support: {
        plans: ['ENTERPRISE'],
        name: 'Suporte Prioritário',
        description: 'Atendimento 24/7 com tempo de resposta garantido.',
    },
}

interface UseFeatureGateResult {
    hasAccess: boolean
    isLoading: boolean
    feature: FeatureConfig
    currentPlan: string
    requiredPlans: string[]
    showUpgradeModal: () => void
    checkAndExecute: (callback: () => void) => boolean
}

/**
 * Hook to check feature access based on plan
 */
export function useFeatureGate(featureName: FeatureName): UseFeatureGateResult {
    const { planType, isLoading } = usePlan()

    const feature = FEATURE_GATES[featureName]

    const hasAccess = useMemo(() => {
        if (isLoading) return false
        return feature.plans.includes(planType)
    }, [planType, isLoading, feature.plans])

    const showUpgradeModal = useCallback(() => {
        // Dispatch custom event to open upgrade modal
        const event = new CustomEvent('openUpgradeModal', {
            detail: {
                feature: featureName,
                featureConfig: feature,
                currentPlan: planType,
            }
        })
        window.dispatchEvent(event)
    }, [featureName, feature, planType])

    const checkAndExecute = useCallback((callback: () => void): boolean => {
        if (hasAccess) {
            callback()
            return true
        } else {
            showUpgradeModal()
            return false
        }
    }, [hasAccess, showUpgradeModal])

    return {
        hasAccess,
        isLoading,
        feature,
        currentPlan: planType,
        requiredPlans: feature.plans,
        showUpgradeModal,
        checkAndExecute,
    }
}

/**
 * Check if a specific feature is available for a plan
 */
export function isFeatureAvailable(featureName: FeatureName, planType: string): boolean {
    const feature = FEATURE_GATES[featureName]
    return feature.plans.includes(planType)
}

/**
 * Get all features and their availability for a plan
 */
export function getAvailableFeatures(planType: string): Record<FeatureName, boolean> {
    const result = {} as Record<FeatureName, boolean>

    for (const [name, config] of Object.entries(FEATURE_GATES)) {
        result[name as FeatureName] = config.plans.includes(planType)
    }

    return result
}

