/**
 * useProfessionalLabel Hook
 * Returns configurable professional nomenclature for the current clinic.
 * Each clinic can customize the label (Médico, Terapeuta, Fisioterapeuta, etc.)
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Predefined labels with their plural forms
const LABEL_MAP: Record<string, { singular: string; plural: string }> = {
    'Médico(a)': { singular: 'Médico', plural: 'Médicos' },
    'Terapeuta': { singular: 'Terapeuta', plural: 'Terapeutas' },
    'Profissional de Saúde': { singular: 'Profissional', plural: 'Profissionais' },
    'Fisioterapeuta': { singular: 'Fisioterapeuta', plural: 'Fisioterapeutas' },
    'Psicólogo(a)': { singular: 'Psicólogo', plural: 'Psicólogos' },
}

// Default predefined options for the selector
export const PROFESSIONAL_LABEL_OPTIONS = [
    { value: 'Médico(a)', label: 'Médico(a)' },
    { value: 'Terapeuta', label: 'Terapeuta' },
    { value: 'Profissional de Saúde', label: 'Profissional de Saúde' },
    { value: 'Fisioterapeuta', label: 'Fisioterapeuta' },
    { value: 'Psicólogo(a)', label: 'Psicólogo(a)' },
]

interface ProfessionalLabels {
    /** Raw label from DB, e.g. "Terapeuta" */
    raw: string
    /** Singular form: "Terapeuta" */
    singular: string
    /** Plural form: "Terapeutas" */
    plural: string
    /** "Novo Terapeuta" */
    novo: string
    /** "Nova Terapeuta" - feminine */
    nova: string
    /** "Cadastrar Terapeuta" */
    cadastrar: string
    /** "Cadastrar Novo Terapeuta" */
    cadastrarNovo: string
    /** "Selecione um terapeuta" */
    selecione: string
    /** "Repasse Profissional" — always uses 'Profissional' */
    repasse: string
    /** Loading state */
    isLoading: boolean
}

const DEFAULT_LABEL = 'Médico(a)'

function resolveLabels(rawLabel: string): Omit<ProfessionalLabels, 'isLoading'> {
    const known = LABEL_MAP[rawLabel]

    let singular: string
    let plural: string

    if (known) {
        singular = known.singular
        plural = known.plural
    } else {
        // Custom label: try to pluralize simply
        singular = rawLabel
        plural = rawLabel.endsWith('a')
            ? rawLabel.slice(0, -1) + 'as'
            : rawLabel + 's'
    }

    return {
        raw: rawLabel,
        singular,
        plural,
        novo: `Novo ${singular}`,
        nova: `Nova ${singular}`,
        cadastrar: `Cadastrar ${singular}`,
        cadastrarNovo: `Cadastrar Novo ${singular}`,
        selecione: `Selecione um ${singular.toLowerCase()}`,
        repasse: `Repasse ${singular}`,
    }
}

export function useProfessionalLabel(): ProfessionalLabels {
    const [rawLabel, setRawLabel] = useState<string>(DEFAULT_LABEL)
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
                    .select('professional_label')
                    .eq('id', (userData as any).clinic_id)
                    .single()

                if (clinic && (clinic as any).professional_label) {
                    setRawLabel((clinic as any).professional_label)
                }
            } catch (error) {
                console.error('[useProfessionalLabel] Error:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchLabel()
    }, [])

    const labels = resolveLabels(rawLabel)

    return {
        ...labels,
        isLoading,
    }
}

/**
 * Server-side helper to get labels without hooks
 * Use in API routes or server components
 */
export function getProfessionalLabels(rawLabel?: string | null): Omit<ProfessionalLabels, 'isLoading'> {
    return resolveLabels(rawLabel || DEFAULT_LABEL)
}
