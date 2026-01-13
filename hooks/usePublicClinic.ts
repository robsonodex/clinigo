'use client'

import { useQuery } from '@tanstack/react-query'
import { ClinicTheme, mergeWithDefaultTheme, DEFAULT_THEME, WhiteLabelTier, TIER_FEATURES } from '@/types/clinic-theme'

// =============================================================================
// Types
// =============================================================================

interface Doctor {
    id: string
    full_name: string
    specialty: string
    crm: string
    photo_url: string | null
    consultation_price: number
    is_featured: boolean
    accepts_insurance: boolean
}

interface Specialty {
    name: string
    slug: string
    doctorCount: number
}

interface Review {
    id: string
    reviewer_name: string
    rating: number
    comment: string
    date: string
    is_verified: boolean
}

interface ClinicPublicData {
    id: string
    name: string
    slug: string
    email: string | null
    phone: string | null
    address: string | null
    logo_url: string | null
    plan_type: string
    theme: Partial<ClinicTheme> | null
    tagline: string | null
    about: string | null
    video_url: string | null
    gallery: string[]
    google_maps_url: string | null
    whatsapp_number: string | null
    instagram: string | null
    facebook: string | null
    linkedin: string | null
    youtube: string | null
    opening_hours: Record<string, string> | null
}

interface PublicClinicResponse {
    clinic: ClinicPublicData
    doctors: Doctor[]
    specialties: Specialty[]
    reviews: Review[]
    stats: {
        average_rating: number
        total_reviews: number
        total_doctors: number
    }
}

interface UsePublicClinicReturn {
    /** Clinic data */
    clinic: ClinicPublicData | null
    /** Merged theme with defaults */
    theme: ClinicTheme
    /** Doctors list */
    doctors: Doctor[]
    /** Specialties list */
    specialties: Specialty[]
    /** Reviews list */
    reviews: Review[]
    /** Stats */
    stats: {
        average_rating: number
        total_reviews: number
        total_doctors: number
    }
    /** White-label tier */
    tier: WhiteLabelTier
    /** Should show CliniGo branding */
    showBranding: boolean
    /** Is loading */
    isLoading: boolean
    /** Error */
    error: Error | null
    /** Is 404 not found */
    notFound: boolean
}

// =============================================================================
// Fetch Function
// =============================================================================

async function fetchPublicClinic(slug: string): Promise<PublicClinicResponse> {
    const res = await fetch(`/api/public/clinic/${slug}`)

    if (res.status === 404) {
        throw new Error('NOT_FOUND')
    }

    if (!res.ok) {
        throw new Error('Failed to fetch clinic')
    }

    return res.json()
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for fetching public clinic data
 * Used on public-facing pages
 */
export function usePublicClinic(slug: string): UsePublicClinicReturn {
    const { data, isLoading, error } = useQuery({
        queryKey: ['public-clinic', slug],
        queryFn: () => fetchPublicClinic(slug),
        enabled: !!slug,
        staleTime: 2 * 60 * 1000, // 2 minutes
        retry: (failureCount, error) => {
            // Don't retry on 404
            if ((error as Error).message === 'NOT_FOUND') return false
            return failureCount < 2
        }
    })

    // Determine if 404
    const notFound = error?.message === 'NOT_FOUND'

    // Merge theme with defaults
    const theme = data?.clinic?.theme
        ? mergeWithDefaultTheme(data.clinic.theme)
        : DEFAULT_THEME

    // Determine tier
    const planType = data?.clinic?.plan_type || 'BASIC'
    const tierMap: Record<string, WhiteLabelTier> = {
        STARTER: 'default',
        BASIC: 'default',
        PROFESSIONAL: 'premium',
        ENTERPRISE: 'enterprise',
        NETWORK: 'enterprise',
    }
    const tier = tierMap[planType] || 'default'

    // Determine if branding should show
    const tierFeatures = TIER_FEATURES[tier]
    const showBranding = !tierFeatures.canRemoveBranding || theme.display.show_clinigo_branding

    return {
        clinic: data?.clinic || null,
        theme,
        doctors: data?.doctors || [],
        specialties: data?.specialties || [],
        reviews: data?.reviews || [],
        stats: data?.stats || { average_rating: 0, total_reviews: 0, total_doctors: 0 },
        tier,
        showBranding,
        isLoading,
        error: error as Error | null,
        notFound,
    }
}
