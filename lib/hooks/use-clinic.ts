'use client'

import { useAuth } from '@/lib/hooks/use-auth'

export interface ClinicInfo {
    id: string
    name: string
    slug: string
    logo_url: string | null
    primary_color: string | null
}

export function useClinic() {
    const { clinic, isLoading, reloadUser } = useAuth()

    const clinicInfo: ClinicInfo | null = clinic ? {
        id: clinic.id,
        name: clinic.name || '',
        slug: clinic.slug || '',
        logo_url: clinic.logo_url || null,
        primary_color: clinic.primary_color || null,
    } : null

    return {
        clinic: clinicInfo,
        loading: isLoading,
        refreshClinic: reloadUser,
    }
}
