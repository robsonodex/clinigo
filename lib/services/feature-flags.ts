/**
 * Feature Flags Service
 * 
 * Permite verificar se uma clínica tem acesso a uma feature específica
 * Combina verificação de plano + feature flags manuais do SUPER_ADMIN
 */

import { createClient } from '@/lib/supabase/client'

export type FeatureName =
    | 'whatsapp'
    | 'prontuarios'
    | 'tiss'
    | 'financeiro'
    | 'estoque'
    | 'crm'
    | 'marketplace'
    | 'telemedicine'
    | 'reports'
    | 'integrations'

interface FeatureAccess {
    hasAccess: boolean
    reason?: string
    planType?: string
}

/**
 * Verifica se uma clínica tem acesso a uma feature específica
 * 
 * Lógica:
 * 1. SUPER_ADMIN sempre tem acesso total
 * 2. Se feature flag está explicitamente TRUE, tem acesso
 * 3. Se feature flag está FALSE, não tem acesso (mesmo que o plano permita)
 * 4. Se feature flag for NULL, usa regras de plano padrão
 */
export async function checkFeatureAccess(
    clinicId: string,
    featureName: FeatureName,
    userRole?: string
): Promise<FeatureAccess> {
    // SUPER_ADMIN sempre tem acesso total
    if (userRole === 'SUPER_ADMIN') {
        return { hasAccess: true, reason: 'Super Admin tem acesso total' }
    }

    const supabase = createClient()

    // Buscar configuração da clínica
    const { data: clinic, error } = await supabase
        .from('clinics')
        .select(`plan_type, feature_${featureName}`)
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        return { hasAccess: false, reason: 'Clínica não encontrada' }
    }

    const featureFlag = clinic[`feature_${featureName}`]
    const planType = clinic.plan_type

    // Se feature flag está explicitamente definida, usa ela
    if (featureFlag !== null && featureFlag !== undefined) {
        if (featureFlag === true) {
            return { hasAccess: true, reason: 'Feature ativada manualmente', planType }
        } else {
            return { hasAccess: false, reason: 'Feature desativada pelo admin', planType }
        }
    }

    // Se feature flag é NULL, usa regras de plano padrão
    const planAccess = getDefaultPlanAccess(planType, featureName)
    return {
        hasAccess: planAccess,
        reason: planAccess ? `Incluído no plano ${planType}` : `Não incluído no plano ${planType}`,
        planType
    }
}

/**
 * Regras padrão de acesso por plano
 * (quando feature flag não está definida)
 */
function getDefaultPlanAccess(planType: string, featureName: FeatureName): boolean {
    const planFeatures: Record<string, FeatureName[]> = {
        BASIC: ['telemedicine'],
        STARTER: ['telemedicine', 'whatsapp', 'reports'],
        PRO: ['telemedicine', 'whatsapp', 'prontuarios', 'financeiro', 'crm', 'reports', 'integrations'],
        ENTERPRISE: [
            'telemedicine',
            'whatsapp',
            'prontuarios',
            'financeiro',
            'crm',
            'tiss',
            'estoque',
            'marketplace',
            'reports',
            'integrations',
        ],
    }

    const featuresForPlan = planFeatures[planType] || []
    return featuresForPlan.includes(featureName)
}

/**
 * Hook React para verificar acesso a feature
 */
export function useFeatureAccess(featureName: FeatureName, clinicId?: string, userRole?: string) {
    const [hasAccess, setHasAccess] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!clinicId) {
            setHasAccess(false)
            setLoading(false)
            return
        }

        checkFeatureAccess(clinicId, featureName, userRole)
            .then((result) => {
                setHasAccess(result.hasAccess)
                setLoading(false)
            })
            .catch(() => {
                setHasAccess(false)
                setLoading(false)
            })
    }, [clinicId, featureName, userRole])

    return { hasAccess, loading }
}

/**
 * Atualizar feature flag (somente SUPER_ADMIN)
 */
export async function updateFeatureFlag(
    clinicId: string,
    featureName: FeatureName,
    enabled: boolean,
    userRole: string
): Promise<{ success: boolean; error?: string }> {
    // Apenas SUPER_ADMIN pode alterar features
    if (userRole !== 'SUPER_ADMIN') {
        return { success: false, error: 'Apenas Super Admin pode alterar features' }
    }

    const supabase = createClient()

    const { error } = await supabase
        .from('clinics')
        .update({ [`feature_${featureName}`]: enabled })
        .eq('id', clinicId)

    if (error) {
        return { success: false, error: error.message }
    }

    return { success: true }
}

