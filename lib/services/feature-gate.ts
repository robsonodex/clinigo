/**
 * Feature Gate Service
 * Controla acesso a features baseado no plano da clínica
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface FeatureAccess {
    enabled: boolean
    limit_value: number | null
    minimum_plan?: string
    metadata?: any
}

export interface LimitCheck {
    withinLimit: boolean
    limit: number | null
    usage: number
    remaining: number | null
}

export class FeatureGateService {
    private supabase = createServiceRoleClient()

    /**
     * Verifica se uma clínica tem acesso a uma feature
     */
    async checkFeatureAccess(
        clinicId: string,
        featureKey: string
    ): Promise<FeatureAccess> {
        // 1. Buscar plano da clínica
        const { data: clinic, error: clinicError } = await this.supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        if (clinicError || !clinic) {
            throw new Error(`Clinic not found: ${clinicId}`)
        }

        // 2. Buscar feature definition
        const { data: feature } = await this.supabase
            .from('plan_features')
            .select('*')
            .eq('plan_type', clinic.plan_type)
            .eq('feature_key', featureKey)
            .maybeSingle()

        // 3. Se feature não existe para o plano, determinar plano mínimo
        if (!feature) {
            const minimumPlan = await this.getMinimumPlanForFeature(featureKey)

            return {
                enabled: false,
                limit_value: null,
                minimum_plan: minimumPlan,
            }
        }

        return {
            enabled: feature.enabled,
            limit_value: feature.limit_value,
            metadata: feature.metadata,
        }
    }

    /**
     * Verifica limites de uso (ex: número de médicos)
     */
    async checkLimit(
        clinicId: string,
        featureKey: string,
        currentUsage: number
    ): Promise<LimitCheck> {
        const access = await this.checkFeatureAccess(clinicId, featureKey)

        if (!access.enabled) {
            return {
                withinLimit: false,
                limit: 0,
                usage: currentUsage,
                remaining: 0
            }
        }

        // NULL = ilimitado
        if (access.limit_value === null) {
            return {
                withinLimit: true,
                limit: null,
                usage: currentUsage,
                remaining: null
            }
        }

        return {
            withinLimit: currentUsage < access.limit_value,
            limit: access.limit_value,
            usage: currentUsage,
            remaining: Math.max(0, access.limit_value - currentUsage)
        }
    }

    /**
     * Determina o plano mínimo que possui uma feature
     */
    private async getMinimumPlanForFeature(featureKey: string): Promise<string> {
        const planOrder = ['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']

        const { data: features } = await this.supabase
            .from('plan_features')
            .select('plan_type')
            .eq('feature_key', featureKey)
            .eq('enabled', true)

        if (!features || features.length === 0) {
            return 'ENTERPRISE' // Feature não disponível
        }

        // Retorna o plano mais baixo que possui a feature
        for (const plan of planOrder) {
            if (features.some((f: any) => f.plan_type === plan)) {
                return plan
            }
        }

        return 'ENTERPRISE'
    }

    /**
     * Verifica múltiplas features de uma vez
     */
    async checkMultipleFeatures(
        clinicId: string,
        featureKeys: string[]
    ): Promise<Record<string, FeatureAccess>> {
        const results: Record<string, FeatureAccess> = {}

        await Promise.all(
            featureKeys.map(async (key) => {
                results[key] = await this.checkFeatureAccess(clinicId, key)
            })
        )

        return results
    }

    /**
     * Invalida cache de features de uma clínica
     * TODO: Implementar Redis cache
     */
    async invalidateClinicFeatures(clinicId: string): Promise<void> {
        // Quando implementar cache:
        // await redis.del(`features:${clinicId}:*`)

        console.log(`[FEATURE_GATE] Invalidating features cache for clinic: ${clinicId}`)
    }

    /**
     * Registra uso de uma feature (analytics)
     */
    async trackFeatureUsage(
        clinicId: string,
        featureKey: string,
        metadata?: any
    ): Promise<void> {
        const { data: existing } = await this.supabase
            .from('feature_usage_tracking')
            .select('id, usage_count')
            .eq('clinic_id', clinicId)
            .eq('feature_key', featureKey)
            .maybeSingle()

        if (existing) {
            // Incrementar contador
            await this.supabase
                .from('feature_usage_tracking')
                .update({
                    usage_count: existing.usage_count + 1,
                    last_used_at: new Date().toISOString(),
                    metadata: metadata || null,
                })
                .eq('id', existing.id)
        } else {
            // Criar novo registro
            await this.supabase
                .from('feature_usage_tracking')
                .insert({
                    clinic_id: clinicId,
                    feature_key: featureKey,
                    usage_count: 1,
                    last_used_at: new Date().toISOString(),
                    metadata: metadata || null,
                })
        }
    }

    /**
     * Obtém todas as features do plano de uma clínica
     */
    async getClinicFeatures(clinicId: string): Promise<Record<string, FeatureAccess>> {
        const { data: clinic } = await this.supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        if (!clinic) {
            throw new Error('Clinic not found')
        }

        const { data: features } = await this.supabase
            .from('plan_features')
            .select('*')
            .eq('plan_type', clinic.plan_type)

        const featuresMap: Record<string, FeatureAccess> = {}

        features?.forEach((f: any) => {
            featuresMap[f.feature_key] = {
                enabled: f.enabled,
                limit_value: f.limit_value,
                metadata: f.metadata,
            }
        })

        return featuresMap
    }
}
