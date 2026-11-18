'use client'

/**
 * useSessionGuard
 * Verifica periodicamente se a sessão única do usuário permanece ativa
 * e se a clínica vinculada não foi suspensa/bloqueada.
 */
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

import { SESSION_COOKIE_NAME } from '@/lib/services/single-session'

const POLLING_INTERVAL = 300_000 // 5 minutos (fallback de segurança; derrubada em tempo real ocorre via Supabase Realtime Broadcast)
const MIN_COOLDOWN = 60_000 // 60 segundos de throttle mínimo ao voltar para a aba/janela
const STORAGE_LAST_CHECK_KEY = 'clinigo_last_session_validate_ts'
export const SESSION_REPLACED_STORAGE_KEY = 'clinigo_session_replaced_notice'
export const SESSION_REPLACED_EVENT = 'clinigo:session-replaced'

export interface SessionReplacedPayload {
    email?: string
    new_device?: string
    replaced_at?: string | null
    message?: string
}

let _moduleLastCheckTs = 0

function getLastCheckTimestamp(): number {
    if (_moduleLastCheckTs > 0) return _moduleLastCheckTs
    if (typeof window !== 'undefined') {
        try {
            const raw = window.sessionStorage.getItem(STORAGE_LAST_CHECK_KEY)
            if (raw) {
                const parsed = Number(raw)
                if (!Number.isNaN(parsed)) {
                    _moduleLastCheckTs = parsed
                    return parsed
                }
            }
        } catch { }
    }
    return 0
}

function setLastCheckTimestamp(ts: number) {
    _moduleLastCheckTs = ts
    if (typeof window !== 'undefined') {
        try {
            window.sessionStorage.setItem(STORAGE_LAST_CHECK_KEY, String(ts))
        } catch { }
    }
}

export function useSessionGuard() {
    const router = useRouter()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isCheckingRef = useRef(false)

    const checkSession = useCallback(async (force = false) => {
        // Se a aba estiver em segundo plano (minimizada/outra aba), não gastar requisição (exceto broadcast explícito)
        if (!force && typeof document !== 'undefined' && document.hidden) return

        // Se não houver cookie de sessão do CliniGo, o usuário não está autenticado nesta janela
        if (typeof document !== 'undefined' && !document.cookie.includes(SESSION_COOKIE_NAME)) return

        // Throttle mínimo de 60 segundos (MIN_COOLDOWN) entre validações por foco / troca de aba
        const now = Date.now()
        if (!force && now - getLastCheckTimestamp() < MIN_COOLDOWN) return

        // Evita verificações paralelas
        if (isCheckingRef.current) return
        isCheckingRef.current = true
        setLastCheckTimestamp(now)

        try {
            const response = await fetch('/api/auth/session/validate', {
                method: 'GET',
                credentials: 'include',
                headers: { 'Cache-Control': 'no-cache' },
            })

            if (!response.ok) return // Erro de rede — não forçar logout

            const data = await response.json()

            if (data.valid === false && data.reason === 'clinic_blocked') {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
                const supabase = createClient()
                await supabase.auth.signOut().catch(() => { })
                window.location.replace('/conta-bloqueada')
                return
            }

            if (data.valid === false && data.reason === 'session_replaced') {
                // Sessão foi substituída — encerrar autenticação em segundo plano e exibir modal central fixo
                console.log('[SESSION GUARD] Session replaced, forcing logout and showing modal')

                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }

                const payload: SessionReplacedPayload = {
                    email: data.email || '',
                    new_device: data.new_device || 'Outro computador ou navegador',
                    replaced_at: data.replaced_at || new Date().toISOString(),
                    message: data.message || 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.'
                }

                try {
                    window.sessionStorage.setItem(SESSION_REPLACED_STORAGE_KEY, JSON.stringify(payload))
                    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`
                } catch { }

                window.dispatchEvent(new CustomEvent(SESSION_REPLACED_EVENT, { detail: payload }))

                const supabase = createClient()
                await supabase.auth.signOut().catch(() => { })
            }
        } catch {
            // Erro de rede — silenciar, tentar novamente no próximo polling
        } finally {
            isCheckingRef.current = false
        }
    }, [router])

    useEffect(() => {
        // Fallback periódico de 5 minutos (Realtime Broadcast trata derrubadas instantâneas com 0 CPU na Vercel)
        intervalRef.current = setInterval(() => {
            void checkSession(false)
        }, POLLING_INTERVAL)

        // Verificação inicial após 5 segundos (respeitando o cooldown de sessionStorage se já validou recentemente)
        const initialTimeout = setTimeout(() => {
            void checkSession(false)
        }, 5000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            clearTimeout(initialTimeout)
        }
    }, [checkSession])

    // Listener Realtime Broadcast de sessão substituída (browser <-> Supabase direto, sem passar pela Vercel)
    useEffect(() => {
        let activeChannel: any = null
        let cancelled = false
        const supabase = createClient()

        supabase.auth.getSession().then(({ data }) => {
            if (cancelled) return
            const userId = data?.session?.user?.id
            if (!userId) return

            activeChannel = supabase
                .channel(`user-session-${userId}`)
                .on('broadcast', { event: 'session-replaced' }, () => {
                    void checkSession(true)
                })
                .subscribe()
        }).catch(() => {})

        return () => {
            cancelled = true
            if (activeChannel) {
                supabase.removeChannel(activeChannel)
            }
        }
    }, [checkSession])

    // Verificar também quando a aba/janela volta ao foco (respeitando MIN_COOLDOWN de 60s)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkSession(false)
            }
        }
        const handleWindowFocus = () => {
            void checkSession(false)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [checkSession])
}
