/**
 * usePlan Hook
 * Provides current user's plan information with type safety
 * 
 * ATUALIZADO: 2026-11-05 - Cache em memória compartilhado e deduplicação de requisições
 */

import { useEffect, useState } from 'react'
import type { PlanType } from '@/lib/constants/plans'
import { migrateLegacyPlan } from '@/types/core'
import { useAuth } from '@/lib/hooks/use-auth'

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

type PermissionsMap = Record<string, { enabled: boolean; isCustom: boolean }>

const PERMISSIONS_STALE_TIME = 10 * 60 * 1000 // 10 minutos em memória

let _permissionsMemoryCache: {
    clinicId: string
    permissions: PermissionsMap
    timestamp: number
} | null = null

let _inFlightPermissionsPromise: Promise<PermissionsMap> | null = null
let _inFlightClinicId: string | null = null

export function clearPermissionsCache() {
    _permissionsMemoryCache = null
    _inFlightPermissionsPromise = null
    _inFlightClinicId = null
}

if (typeof window !== 'undefined') {
    window.addEventListener('clinic-modules-updated', clearPermissionsCache)
    window.addEventListener('clinic-switched', clearPermissionsCache)
    window.addEventListener('clinic-profile-updated', clearPermissionsCache)
}

async function loadPermissionsShared(clinicId: string): Promise<PermissionsMap> {
    const now = Date.now()
    if (
        _permissionsMemoryCache &&
        _permissionsMemoryCache.clinicId === clinicId &&
        now - _permissionsMemoryCache.timestamp < PERMISSIONS_STALE_TIME
    ) {
        return _permissionsMemoryCache.permissions
    }

    if (_inFlightPermissionsPromise && _inFlightClinicId === clinicId) {
        return _inFlightPermissionsPromise
    }

    _inFlightClinicId = clinicId
    _inFlightPermissionsPromise = (async () => {
        try {
            const resPerm = await fetch('/api/permissions/current')
            if (resPerm.ok) {
                const permData = await resPerm.json()
                const perms: PermissionsMap = permData?.permissions || {}
                _permissionsMemoryCache = {
                    clinicId,
                    permissions: perms,
                    timestamp: Date.now(),
                }
                return perms
            }
        } catch (errPerm) {
            console.warn('[usePlan] Não foi possível carregar permissões customizadas:', errPerm)
        } finally {
            _inFlightPermissionsPromise = null
            _inFlightClinicId = null
        }
        return _permissionsMemoryCache?.clinicId === clinicId ? _permissionsMemoryCache.permissions : {}
    })()

    return _inFlightPermissionsPromise
}

export function usePlan(): UsePlanResult {
    const { clinic, isLoading: authLoading } = useAuth()
    const clinicId = clinic?.id || null

    const [permissions, setPermissions] = useState<PermissionsMap>(() => {
        if (clinicId && _permissionsMemoryCache?.clinicId === clinicId) {
            return _permissionsMemoryCache.permissions
        }
        return {}
    })
    const [isPermsLoading, setIsPermsLoading] = useState(false)

    const rawPlan = clinic?.plan_type || 'BASICO'
    const planType = migrateLegacyPlan(rawPlan)

    useEffect(() => {
        let isMounted = true

        if (!clinicId) {
            setPermissions({})
            setIsPermsLoading(false)
            return
        }

        // Se já está válido no cache em memória, usa imediatamente sem loading
        if (
            _permissionsMemoryCache &&
            _permissionsMemoryCache.clinicId === clinicId &&
            Date.now() - _permissionsMemoryCache.timestamp < PERMISSIONS_STALE_TIME
        ) {
            setPermissions(_permissionsMemoryCache.permissions)
            setIsPermsLoading(false)
            return
        }

        setIsPermsLoading(true)
        loadPermissionsShared(clinicId).then((perms) => {
            if (isMounted) {
                setPermissions(perms)
                setIsPermsLoading(false)
            }
        })

        return () => {
            isMounted = false
        }
    }, [clinicId])

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
