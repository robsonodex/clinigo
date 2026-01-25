/**
 * Middleware: Feature Gate
 * Middleware para proteger rotas API baseado em features
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FeatureGateService } from '@/lib/services/feature-gate'
import { ForbiddenError } from '@/lib/utils/errors'

/**
 * Middleware para verificar acesso a feature
 */
export async function requireFeature(
    request: NextRequest,
    featureKey: string
): Promise<{ clinicId: string; userId: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new ForbiddenError('Não autenticado')
    }

    // Buscar clinic_id do usuário
    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    if (!userData?.clinic_id) {
        throw new ForbiddenError('Usuário sem clínica associada')
    }

    // Verificar acesso à feature
    const service = new FeatureGateService()
    const access = await service.checkFeatureAccess(userData.clinic_id, featureKey)

    if (!access.enabled) {
        throw new ForbiddenError(
            `Esta funcionalidade requer o plano ${access.minimum_plan || 'ENTERPRISE'}. ` +
            `Faça upgrade em Configurações > Assinatura.`,
            {
                feature: featureKey,
                minimum_plan: access.minimum_plan,
                upgrade_url: '/dashboard/configuracoes/assinatura',
            }
        )
    }

    // Registrar uso da feature
    await service.trackFeatureUsage(userData.clinic_id, featureKey)

    return {
        clinicId: userData.clinic_id,
        userId: user.id,
    }
}

/**
 * Middleware para verificar limite de uso
 */
export async function requireLimit(
    request: NextRequest,
    featureKey: string,
    currentUsage: number
): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new ForbiddenError('Não autenticado')
    }

    const { data: userData } = await supabase
        .from('users')
        .select('clinic_id')
        .eq('id', user.id)
        .single()

    if (!userData?.clinic_id) {
        throw new ForbiddenError('Usuário sem clínica associada')
    }

    const service = new FeatureGateService()
    const limitCheck = await service.checkLimit(
        userData.clinic_id,
        featureKey,
        currentUsage
    )

    if (!limitCheck.withinLimit) {
        throw new ForbiddenError(
            `Limite do plano atingido. Você pode ter até ${limitCheck.limit} ${featureKey}. ` +
            `Faça upgrade para aumentar o limite.`,
            {
                feature: featureKey,
                limit: limitCheck.limit,
                current_usage: limitCheck.usage,
                upgrade_url: '/dashboard/configuracoes/assinatura',
            }
        )
    }

    return true
}
