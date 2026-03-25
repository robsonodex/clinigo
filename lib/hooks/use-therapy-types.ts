'use client'

import { useState, useEffect } from 'react'

const DEFAULT_THERAPY_TYPES = [
    'Psicologia ABA',
    'Psicologia TCC',
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicomotricidade',
    'Psicopedagogia',
    'Musicoterapia',
    'Nutrição',
    'AT Escolar',
    'AT Domiciliar',
    'Estagiária',
    'Outros',
]

export function useTherapyTypes() {
    const [therapyTypes, setTherapyTypes] = useState<string[]>(DEFAULT_THERAPY_TYPES)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchTherapyTypes = async () => {
            try {
                const res = await fetch('/api/settings/therapy-types')
                const json = await res.json()
                if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                    setTherapyTypes(json.data)
                }
            } catch {
                // fallback para defaults já setados
            } finally {
                setIsLoading(false)
            }
        }
        fetchTherapyTypes()
    }, [])

    return { therapyTypes, isLoading }
}
