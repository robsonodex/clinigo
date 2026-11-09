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

const POLLING_INTERVAL = 60_000 // 1 minuto para garantir derrubada rápida de sessão simultânea
const MIN_COOLDOWN = 15_000 // 15 segundos de throttle mínimo entre trocas de aba e foco
const STORAGE_LAST_CHECK_KEY = 'clinigo_last_session_validate_ts'

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

    const checkSession = useCallback(async () => {
        // Se a aba estiver em segundo plano (minimizada/outra aba), não gastar requisição
        if (typeof document !== 'undefined' && document.hidden) return

        // Se não houver cookie de sessão do CliniGo, o usuário não está autenticado nesta janela
        if (typeof document !== 'undefined' && !document.cookie.includes(SESSION_COOKIE_NAME)) return

        // Throttle mínimo de 10 minutos mesmo em eventos rápidos de troca de aba / foco / F5
        const now = Date.now()
        if (now - getLastCheckTimestamp() < MIN_COOLDOWN) return

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
                // Sessão foi substituída — forçar logout
                console.log('[SESSION GUARD] Session replaced, forcing logout')

                // Limpar intervalo
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }

                // Fazer signOut do Supabase
                const supabase = createClient()
                await supabase.auth.signOut()

                // Mostrar mensagem e redirecionar
                toast.error(
                    data.message || 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.',
                    { duration: 8000 }
                )

                // Redirecionar para login
                window.location.replace('/clinica?session=expired')
            }
        } catch {
            // Erro de rede — silenciar, tentar novamente no próximo polling
        } finally {
            isCheckingRef.current = false
        }
    }, [router])

    useEffect(() => {
        // Iniciar polling a cada 15 minutos
        intervalRef.current = setInterval(checkSession, POLLING_INTERVAL)

        // Verificação inicial após 5 segundos (respeitando o cooldown de sessionStorage se já validou recentemente)
        const initialTimeout = setTimeout(checkSession, 5000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            clearTimeout(initialTimeout)
        }
    }, [checkSession])

    // Verificar também quando a aba/janela volta ao foco (respeitando MIN_COOLDOWN de 15s)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession()
            }
        }
        const handleWindowFocus = () => {
            checkSession()
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
        }
    }, [checkSession])
}
