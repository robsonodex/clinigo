/**
 * usePlan Hook
 * Provides current user's plan information with type safety
 * 
 * ATUALIZADO: 2026-02-09 - Apenas funcionalidades REAIS
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PlanType } from '@/lib/constants/plans'
import { migrateLegacyPlan } from '@/types/core'

interface UsePlanResult {
    planType: PlanType | null
    isLoading: boolean
    isBasic: boolean
    isPro: boolean
    isEnterprise: boolean
    canAccess: (feature: string) => boolean
}

export function usePlan(): UsePlanResult {
    const [planType, setPlanType] = useState<PlanType | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchPlan() {
            try {
                const supabase = createClient()

                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setIsLoading(false)
                    return
                }

                const { data: userData } = await supabase
                    .from('users')
                    .select('clinic_id')
                    .eq('id', user.id)
                    .single()

                if (!(userData as any)?.clinic_id) {
                    setIsLoading(false)
                    return
                }

                const { data: clinic } = await supabase
                    .from('clinics')
                    .select('plan_type')
                    .eq('id', (userData as any).clinic_id)
                    .single()

                if (clinic) {
                    // Normalize plan type (PRO -> PROFESSIONAL, etc)
                    const rawPlan = (clinic as any).plan_type
                    const normalizedPlan = migrateLegacyPlan(rawPlan || 'BASICO')
                    setPlanType(normalizedPlan)
                }
            } catch (error) {
                console.error('[usePlan] Error fetching plan:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchPlan()
    }, [])

    const canAccess = (feature: string): boolean => {
        if (!planType) return false

        // Features REAIS por nível de plano
        // AVANCADO+: crm, dre, whatsapp_evolution, importacao, check_in_facial
        // PROFESSIONAL+: tiss, multi_units

        const avancadoFeatures = ['crm', 'dre', 'whatsapp_evolution', 'importacao', 'check_in_facial', 'auditoria', 'repasse_medico', 'chat_interno']
        const professionalFeatures = ['tiss', 'multi_units']

        if (avancadoFeatures.includes(feature)) {
            return planType === 'AVANCADO' || planType === 'PROFESSIONAL' || planType === 'ENTERPRISE'
        }

        if (professionalFeatures.includes(feature)) {
            return planType === 'PROFESSIONAL' || planType === 'ENTERPRISE'
        }

        // Todas as outras features são liberadas para todos
        return true
    }

    return {
        planType,
        isLoading,
        isBasic: planType === 'BASICO',
        isPro: planType === 'PROFESSIONAL',
        isEnterprise: planType === 'ENTERPRISE',
        canAccess,
    }
}
