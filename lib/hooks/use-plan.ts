/**
 * usePlan Hook
 * Provides current user's plan information with type safety
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
                    const normalizedPlan = migrateLegacyPlan(rawPlan || 'STARTER')
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

        // Premium features only for PRO/ENTERPRISE
        const premiumFeatures = ['crm', 'tiss', 'marketplace', 'ai_reasoning', 'daily_video']

        if (premiumFeatures.includes(feature)) {
            return planType === 'PROFESSIONAL' || planType === 'ENTERPRISE' || planType === 'NETWORK'
        }

        return true
    }

    return {
        planType,
        isLoading,
        isBasic: planType === 'BASIC',
        isPro: planType === 'PROFESSIONAL',
        isEnterprise: planType === 'ENTERPRISE' || planType === 'NETWORK',
        canAccess,
    }
}

