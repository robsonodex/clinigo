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

import { useAuth } from '@/lib/hooks/use-auth'

export function usePlan(): UsePlanResult {
    const { clinic, isLoading: authLoading } = useAuth()
    const [permissions, setPermissions] = useState<Record<string, { enabled: boolean; isCustom: boolean }>>({})
    const [isPermsLoading, setIsPermsLoading] = useState(false)

    const rawPlan = clinic?.plan_type || 'BASICO'
    const planType = migrateLegacyPlan(rawPlan)

    useEffect(() => {
        let isMounted = true

        async function fetchPermissions() {
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
            } finally {
                if (isMounted) setIsPermsLoading(false)
            }
        }

        if (clinic?.id) {
            fetchPermissions()
        }

        return () => {
            isMounted = false
        }
    }, [clinic?.id])

    const isLoading = authLoading || isPermsLoading

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
