'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SystemRefreshListenerProps {
    clinicId?: string
}

export function SystemRefreshListener({ clinicId }: SystemRefreshListenerProps) {
    const router = useRouter()

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

        const triggerClinicBlocked = async (payload?: any) => {
            // Super Admin em modo impersonation nunca deve ser deslogado por broadcast de bloqueio da clínica
            if (typeof document !== 'undefined' && document.cookie.includes('impersonation_active=true')) {
                return
            }
            try {
                if ('caches' in window) {
                    const cacheKeys = await window.caches.keys()
                    await Promise.all(cacheKeys.map(k => window.caches.delete(k)))
                }
                await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
            } catch {
                // Ignore cleanup errors
            }
            const targetUrl =
                payload?.redirect_url ||
                (payload?.block_type === 'TERMINATED_LGPD' || payload?.manual_unlock_only
                    ? '/conta-bloqueada?type=terminated'
                    : '/conta-bloqueada')
            window.location.replace(targetUrl)
        }

        // Canal dedicado da clínica via Broadcast instantâneo
        const channel = supabase
            .channel(`clinic-cache-update-${clinicId}`)
            .on('broadcast', { event: 'hard-refresh' }, () => {
                triggerHardRefresh()
            })
            .on('broadcast', { event: 'clinic-blocked' }, ({ payload }) => {
                triggerClinicBlocked(payload)
            })
            .on('broadcast', { event: 'billing-banner-updated' }, () => {
                // Revalida apenas Server Components (layout/banner) sem perder formulários abertos
                router.refresh()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clinicId, router])

    return null
}
