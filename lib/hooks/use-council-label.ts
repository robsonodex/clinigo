/**
 * useCouncilLabel Hook
 * Returns configurable council/registration label for the current clinic.
 * Each clinic can customize the label (CRM, CRP, CREFITO, CRO, etc.)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Predefined council label options
export const COUNCIL_LABEL_OPTIONS = [
    { value: 'CRM', label: 'CRM (Conselho Regional de Medicina)' },
    { value: 'CRP', label: 'CRP (Conselho Regional de Psicologia)' },
    { value: 'CREFITO', label: 'CREFITO (Fisioterapia e Terapia Ocupacional)' },
    { value: 'CRO', label: 'CRO (Conselho Regional de Odontologia)' },
    { value: 'CRN', label: 'CRN (Conselho Regional de Nutrição)' },
    { value: 'CREFONO', label: 'CREFONO (Fonoaudiologia)' },
    { value: 'Conselho de Classe', label: 'Conselho de Classe (Genérico)' },
]

const DEFAULT_LABEL = 'CRM'

export function useCouncilLabel(): { councilLabel: string; isLoading: boolean } {
    const [councilLabel, setCouncilLabel] = useState<string>(DEFAULT_LABEL)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchLabel() {
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
                    .select('council_label')
                    .eq('id', (userData as any).clinic_id)
                    .single()

                if (clinic && (clinic as any).council_label) {
                    setCouncilLabel((clinic as any).council_label)
                }
            } catch (error) {
                console.error('[useCouncilLabel] Error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchLabel()
    }, [])

    return { councilLabel, isLoading }
}
