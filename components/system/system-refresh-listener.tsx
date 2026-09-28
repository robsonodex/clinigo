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
        
        const triggerHardRefresh = async () => {
            console.log('Atualização e limpeza de cache acionada pelo Master Hub')
            try {
                // Limpa CacheStorage (Service Worker / PWA caches)
                if ('caches' in window) {
                    const cacheKeys = await window.caches.keys()
                    await Promise.all(cacheKeys.map(k => window.caches.delete(k)))
                }
            } catch (err) {
                console.warn('Erro ao limpar CacheStorage:', err)
            }
            // Força recarregamento limpo do navegador
            window.location.reload()
        }

        // Canal dedicado da clínica com suporte duplo: Broadcast instantâneo + Postgres Changes (fallback)
        const channel = supabase
            .channel(`clinic-cache-update-${clinicId}`)
            .on('broadcast', { event: 'hard-refresh' }, () => {
                triggerHardRefresh()
            })
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'clinics',
                    filter: `id=eq.${clinicId}`
                },
                () => {
                    triggerHardRefresh()
                }
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [clinicId])

    return null
}
