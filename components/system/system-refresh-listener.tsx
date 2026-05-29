'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SystemRefreshListenerProps {
    clinicId?: string
}

export function SystemRefreshListener({ clinicId }: SystemRefreshListenerProps) {
    useEffect(() => {
        if (!clinicId) return

        const supabase = createClient()
        
        // Escuta em tempo real alterações na linha desta clínica específica na tabela clinics
        const channel = supabase
            .channel(`clinic-cache-update-${clinicId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${clinicId}`
                },
                (payload: any) => {
                    console.log('🔄 Atualização e limpeza de cache acionada pelo Master Hub!', payload)
                    // Força a atualização da tela na clínica instantaneamente
                    window.location.reload()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [clinicId])

    return null
}
