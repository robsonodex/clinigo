'use client'

/**
 * useSessionGuard
 * Hook que faz polling a cada 10s para verificar se a sessão ainda é válida.
 * Se outro login foi feito em outro dispositivo, força logout com mensagem.
 */
import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const POLLING_INTERVAL = 10_000 // 10 segundos

export function useSessionGuard() {
    const router = useRouter()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isCheckingRef = useRef(false)

    const checkSession = useCallback(async () => {
        // Evita verificações paralelas
        if (isCheckingRef.current) return
        isCheckingRef.current = true

        try {
            const response = await fetch('/api/auth/session/validate', {
                method: 'GET',
                credentials: 'include',
                // Cache bust para evitar respostas cacheadas
                headers: { 'Cache-Control': 'no-cache' },
            })

            if (!response.ok) return // Erro de rede — não forçar logout

            const data = await response.json()

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
        // Iniciar polling
        intervalRef.current = setInterval(checkSession, POLLING_INTERVAL)

        // Verificação inicial após 2 segundos (dá tempo da página carregar)
        const initialTimeout = setTimeout(checkSession, 2000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            clearTimeout(initialTimeout)
        }
    }, [checkSession])

    // Verificar também quando a aba volta ao foco (visibilitychange)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkSession()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [checkSession])
}
