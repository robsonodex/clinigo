'use client'

import { useState, useEffect, useCallback } from 'react'
import { type FeatureKey } from '@/lib/constants/features'

interface UseFeatureAccessResult {
    canAccess: boolean
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * Hook to check if current user's clinic can access a specific feature
 * Queries the API which checks both custom permissions and plan defaults
 */
export function useFeatureAccess(featureKey: FeatureKey): UseFeatureAccessResult {
    const [canAccess, setCanAccess] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAccess = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`/api/permissions/check?feature=${featureKey}`)

            if (!response.ok) {
                throw new Error('Failed to check permission')
            }

            const data = await response.json()
            setCanAccess(data.canAccess)
        } catch (err) {
            console.error('Error checking feature access:', err)
            setError(err instanceof Error ? err.message : 'Unknown error')
            setCanAccess(false)
        } finally {
            setLoading(false)
        }
    }, [featureKey])

    useEffect(() => {
        fetchAccess()
    }, [fetchAccess])

    return {
        canAccess,
        loading,
        error,
        refetch: fetchAccess,
    }
}

/**
 * Hook to check multiple features at once
 */
export function useMultipleFeatureAccess(
    featureKeys: FeatureKey[]
): Record<FeatureKey, UseFeatureAccessResult> {
    const [results, setResults] = useState<Record<string, { canAccess: boolean; loading: boolean; error: string | null }>>(() => {
        const initial: Record<string, { canAccess: boolean; loading: boolean; error: string | null }> = {}
        for (const key of featureKeys) {
            initial[key] = { canAccess: false, loading: true, error: null }
        }
        return initial
    })

    const refetchAll = useCallback(async () => {
        const newResults: Record<string, { canAccess: boolean; loading: boolean; error: string | null }> = {}

        await Promise.all(
            featureKeys.map(async (key) => {
                try {
                    const response = await fetch(`/api/permissions/check?feature=${key}`)
                    const data = await response.json()
                    newResults[key] = { canAccess: data.canAccess, loading: false, error: null }
                } catch (err) {
                    newResults[key] = {
                        canAccess: false,
                        loading: false,
                        error: err instanceof Error ? err.message : 'Unknown error',
                    }
                }
            })
        )

        setResults(newResults)
    }, [featureKeys])

    useEffect(() => {
        refetchAll()
    }, [refetchAll])

    // Build result with refetch functions
    const resultWithRefetch = {} as Record<FeatureKey, UseFeatureAccessResult>
    for (const key of featureKeys) {
        resultWithRefetch[key] = {
            ...results[key],
            refetch: refetchAll,
        }
    }

    return resultWithRefetch
}
