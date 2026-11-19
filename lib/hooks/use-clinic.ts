'use client'

import { useMemo } from 'react'
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

    const clinicId = clinic?.id || null
    const clinicName = clinic?.name || ''
    const clinicSlug = clinic?.slug || ''
    const clinicLogoUrl = clinic?.logo_url || null
    const clinicPrimaryColor = clinic?.primary_color || null

    const clinicInfo: ClinicInfo | null = useMemo(
        () =>
            clinicId
                ? {
                      id: clinicId,
                      name: clinicName,
                      slug: clinicSlug,
                      logo_url: clinicLogoUrl,
                      primary_color: clinicPrimaryColor,
                  }
                : null,
        [clinicId, clinicName, clinicSlug, clinicLogoUrl, clinicPrimaryColor]
    )

    return {
        clinic: clinicInfo,
        loading: isLoading,
        refreshClinic: reloadUser,
    }
}
