'use client'

/**
 * useCouncilLabel Hook
 * Returns configurable council/registration label for the current clinic.
 * Consumes the centralized AuthProvider context (zero duplicate network calls).
 */

import { useAuth } from '@/lib/hooks/use-auth'

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
    const { clinic, isLoading } = useAuth()
    const councilLabel = clinic?.council_label || DEFAULT_LABEL

    return { councilLabel, isLoading }
}
