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
    permissions: Record<string, { enabled: boolean; isCustom: boolean }>
    canAccess: (feature: string) => boolean
    isCustomEnabled: (feature: string) => boolean
    isCustomDisabled: (feature: string) => boolean
}

export function usePlan(): UsePlanResult {
    const [planType, setPlanType] = useState<PlanType | null>(null)
    const [permissions, setPermissions] = useState<Record<string, { enabled: boolean; isCustom: boolean }>>({})
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        async function fetchPlanAndPermissions() {
            try {
                const supabase = createClient()

                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    if (isMounted) setIsLoading(false)
                    return
                }

                // Verificar modo impersonation no client-side
                const cookies = typeof document !== 'undefined'
                    ? document.cookie.split(';').reduce((acc, cookie) => {
                        const [key, value] = cookie.trim().split('=')
                        if (key) acc[key] = decodeURIComponent(value || '')
                        return acc
                    }, {} as Record<string, string>)
                    : {}

                const isImpersonating = cookies['impersonation_active'] === 'true'
                const impersonationClinicId = cookies['impersonation_clinic_id']

                let targetClinicId = null

                if (isImpersonating && impersonationClinicId) {
                    targetClinicId = impersonationClinicId
                } else {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('clinic_id')
                        .eq('id', user.id)
                        .single()

                    if ((userData as any)?.clinic_id) {
                        targetClinicId = (userData as any).clinic_id
                    }
                }

                if (!targetClinicId) {
                    if (isMounted) setIsLoading(false)
                    return
                }

                const { data: clinic } = await supabase
                    .from('clinics')
                    .select('plan_type')
                    .eq('id', targetClinicId)
                    .single()

                if (clinic && isMounted) {
                    const rawPlan = (clinic as any).plan_type
                    const normalizedPlan = migrateLegacyPlan(rawPlan || 'BASICO')
                    setPlanType(normalizedPlan)
                }

                // Carregar permissões customizadas da clínica
                try {
                    const resPerm = await fetch('/api/permissions/current')
                    if (resPerm.ok) {
                        const permData = await resPerm.json()
                        if (permData?.permissions && isMounted) {
                            setPermissions(permData.permissions)
                        }
                    }
                } catch (errPerm) {
                    console.warn('[usePlan] Não foi possível carregar permissões customizadas:', errPerm)
                }
            } catch (error) {
                console.error('[usePlan] Error fetching plan:', error)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        fetchPlanAndPermissions()

        return () => {
            isMounted = false
        }
    }, [])

    const isCustomEnabled = (feature: string): boolean => {
        const perm = permissions[feature]
        return perm ? (perm.enabled && perm.isCustom) : false
    }

    const isCustomDisabled = (feature: string): boolean => {
        const perm = permissions[feature]
        return perm ? (!perm.enabled && perm.isCustom) : false
    }

    const canAccess = (feature: string): boolean => {
        // 1. Prioridade máxima: Override customizado explícito da clínica
        if (permissions[feature] !== undefined) {
            return permissions[feature].enabled
        }

        if (!planType) return false

        // Features REAIS por nível de plano
        const avancadoFeatures = [
            'crm', 'fluxomed', 'dre', 'whatsapp', 'whatsapp_evolution', 'importacao',
            'check_in_facial', 'auditoria', 'repasse_medico', 'chat', 'chat_interno',
            'encaminhamentos', 'supervisao', 'bi_terapia', 'meu_financeiro'
        ]
        const professionalFeatures = ['tiss', 'faturamento_tiss', 'multi_units', 'prescricoes', 'creditos_pacientes']

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
        permissions,
        canAccess,
        isCustomEnabled,
        isCustomDisabled,
    }
}
