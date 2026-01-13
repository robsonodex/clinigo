'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ClinicTheme, DEFAULT_THEME, mergeWithDefaultTheme, WhiteLabelTier, getTierFeatures, TierFeatures } from '@/types/clinic-theme'

// =============================================================================
// Types
// =============================================================================

interface ThemeQueryResult {
    theme: Partial<ClinicTheme>
    slug: string
    plan_type: string
}

interface UseClinicThemeReturn {
    /** Merged theme with defaults */
    theme: ClinicTheme
    /** Raw theme from API (partial) */
    rawTheme: Partial<ClinicTheme> | null
    /** Clinic's slug */
    slug: string
    /** Clinic's plan type */
    planType: string
    /** White-label tier */
    tier: WhiteLabelTier
    /** Features available for this tier */
    tierFeatures: TierFeatures
    /** Is loading */
    isLoading: boolean
    /** Error */
    error: Error | null
    /** Update theme */
    updateTheme: (updates: Partial<ClinicTheme>) => void
    /** Save theme to server */
    saveTheme: () => Promise<void>
    /** Is saving */
    isSaving: boolean
    /** Has unsaved changes */
    hasChanges: boolean
    /** Reset to server state */
    resetChanges: () => void
}

// =============================================================================
// Fetch Functions
// =============================================================================

async function fetchTheme(): Promise<ThemeQueryResult> {
    const res = await fetch('/api/settings/theme')
    if (!res.ok) {
        throw new Error('Failed to fetch theme')
    }
    const data = await res.json()
    return data.data || data
}

async function saveThemeToServer(theme: Partial<ClinicTheme>): Promise<void> {
    const res = await fetch('/api/settings/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
    })
    if (!res.ok) {
        throw new Error('Failed to save theme')
    }
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for managing clinic theme in the dashboard
 * Provides full CRUD operations with optimistic updates
 */
export function useClinicTheme(): UseClinicThemeReturn {
    const queryClient = useQueryClient()

    // Query for fetching theme
    const { data, isLoading, error } = useQuery({
        queryKey: ['clinic-theme'],
        queryFn: fetchTheme,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })

    // Local state for tracking changes
    const localThemeKey = 'clinic-theme-local'

    // Mutation for saving
    const mutation = useMutation({
        mutationFn: saveThemeToServer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })
            // Clear local storage on successful save
            if (typeof window !== 'undefined') {
                localStorage.removeItem(localThemeKey)
            }
        }
    })

    // Merge with defaults
    const mergedTheme = data?.theme
        ? mergeWithDefaultTheme(data.theme)
        : DEFAULT_THEME

    // Determine tier
    const planType = data?.plan_type || 'BASIC'
    const tierMap: Record<string, WhiteLabelTier> = {
        STARTER: 'default',
        BASIC: 'default',
        PROFESSIONAL: 'premium',
        ENTERPRISE: 'enterprise',
        NETWORK: 'enterprise',
    }
    const tier = tierMap[planType] || 'default'
    const tierFeatures = getTierFeatures(planType)

    // Check for local changes
    const hasChanges = typeof window !== 'undefined' &&
        localStorage.getItem(localThemeKey) !== null

    // Update theme locally
    const updateTheme = (updates: Partial<ClinicTheme>) => {
        const currentLocal = typeof window !== 'undefined'
            ? localStorage.getItem(localThemeKey)
            : null

        const current = currentLocal
            ? JSON.parse(currentLocal)
            : data?.theme || {}

        const merged = {
            ...current,
            ...updates,
            colors: { ...current.colors, ...updates.colors },
            typography: { ...current.typography, ...updates.typography },
            hero: { ...current.hero, ...updates.hero },
            display: { ...current.display, ...updates.display },
            seo: { ...current.seo, ...updates.seo },
        }

        if (typeof window !== 'undefined') {
            localStorage.setItem(localThemeKey, JSON.stringify(merged))
        }

        // Trigger re-render by updating query data
        queryClient.setQueryData(['clinic-theme'], (old: ThemeQueryResult | undefined) => ({
            ...old,
            theme: merged,
        }))
    }

    // Save to server
    const saveTheme = async () => {
        const localData = typeof window !== 'undefined'
            ? localStorage.getItem(localThemeKey)
            : null

        if (localData) {
            await mutation.mutateAsync(JSON.parse(localData))
        }
    }

    // Reset changes
    const resetChanges = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(localThemeKey)
        }
        queryClient.invalidateQueries({ queryKey: ['clinic-theme'] })
    }

    return {
        theme: mergedTheme,
        rawTheme: data?.theme || null,
        slug: data?.slug || '',
        planType,
        tier,
        tierFeatures,
        isLoading,
        error: error as Error | null,
        updateTheme,
        saveTheme,
        isSaving: mutation.isPending,
        hasChanges,
        resetChanges,
    }
}
