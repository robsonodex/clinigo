'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRole } from '@/lib/hooks/use-auth'

export interface ClinicInfo {
    id: string
    name: string
    slug: string
    logo_url: string | null
    primary_color: string | null
}

export function useClinic() {
    const { clinicId } = useRole()
    const [clinic, setClinic] = useState<ClinicInfo | null>(null)
    const [loading, setLoading] = useState(true)

    const loadClinic = useCallback(async () => {
        if (!clinicId) {
            setClinic(null)
            setLoading(false)
            return
        }

        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('clinics')
                .select('id, name, slug, logo_url, primary_color')
                .eq('id', clinicId)
                .maybeSingle()

            if (data && !error) {
                setClinic(data as ClinicInfo)
            }
        } catch (err) {
            console.error('[useClinic] Erro ao carregar clinica:', err)
        } finally {
            setLoading(false)
        }
    }, [clinicId])

    useEffect(() => {
        loadClinic()

        const handleUpdate = () => {
            loadClinic()
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('clinic-profile-updated', handleUpdate)
            return () => {
                window.removeEventListener('clinic-profile-updated', handleUpdate)
            }
        }
    }, [loadClinic])

    return {
        clinic,
        loading,
        refreshClinic: loadClinic,
    }
}
