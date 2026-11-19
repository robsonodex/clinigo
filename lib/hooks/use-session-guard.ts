'use client'

/**
 * useSessionGuard
 * Verifica periodicamente se a sessão única do usuário permanece ativa
 * e se a clínica vinculada não foi suspensa/bloqueada.
 *
 * OTIMIZAÇÃO FLUID ACTIVE CPU (VERCEL):
 * - Valida diretamente no Supabase pelo cliente autenticado do navegador (0ms de CPU na Vercel).
 * - Compartilha o timestamp de cooldown entre TODAS as abas via localStorage (evita N abas = N consultas).
 * - Não executa em abas em segundo plano (document.hidden).
 */
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SESSION_COOKIE_NAME, isUserAllowedConcurrentSessions } from '@/lib/services/single-session'

export const POLLING_INTERVAL = 600_000 // 10 minutos
export const MIN_COOLDOWN = 300_000 // 5 minutos compartilhados entre todas as abas
const CLINIC_CHECK_TTL_MS = 600_000 // 10 minutos para status is_active da clínica
const STORAGE_LAST_CHECK_KEY = 'clinigo_last_session_validate_ts'
const STORAGE_CLINIC_CHECK_KEY = 'clinigo_last_clinic_active_check_ts'
export const SESSION_REPLACED_STORAGE_KEY = 'clinigo_session_replaced_notice'
export const SESSION_REPLACED_EVENT = 'clinigo:session-replaced'

export interface SessionReplacedPayload {
    email?: string
    new_device?: string
    replaced_at?: string | null
    message?: string
}

let _moduleLastCheckTs = 0

function formatDeviceDescription(ua?: string | null): string {
    if (!ua) return 'Outro computador ou celular'
    const s = String(ua)
    let browser = 'Navegador Web'
    if (s.includes('Edg/')) browser = 'Microsoft Edge'
    else if (s.includes('OPR/') || s.includes('Opera')) browser = 'Opera'
    else if (s.includes('Chrome/') && !s.includes('Edg/')) browser = 'Google Chrome'
    else if (s.includes('Firefox/')) browser = 'Mozilla Firefox'
    else if (s.includes('Safari/') && !s.includes('Chrome/')) browser = 'Safari'

    let os = 'Computador'
    if (s.includes('iPhone')) os = 'iPhone'
    else if (s.includes('iPad')) os = 'iPad'
    else if (s.includes('Android')) os = 'Celular Android'
    else if (s.includes('Windows')) os = 'Windows'
    else if (s.includes('Mac OS X') || s.includes('Macintosh')) os = 'Mac'
    else if (s.includes('Linux')) os = 'Linux'

    return `${browser} (${os})`
}

function readSessionTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null
    const cookies = document.cookie.split(';')
    const prefix = `${SESSION_COOKIE_NAME}=`
    for (const raw of cookies) {
        const trimmed = raw.trim()
        if (trimmed.startsWith(prefix)) {
            const val = decodeURIComponent(trimmed.slice(prefix.length)).trim()
            return val || null
        }
    }
    return null
}

function getLastCheckTimestamp(): number {
    let ts = _moduleLastCheckTs
    if (typeof window !== 'undefined') {
        try {
            const raw = window.localStorage.getItem(STORAGE_LAST_CHECK_KEY)
            if (raw) {
                const parsed = Number(raw)
                if (!Number.isNaN(parsed) && parsed > ts) {
                    ts = parsed
                    _moduleLastCheckTs = parsed
                }
            }
        } catch { /* ignore storage unavailable */ }
    }
    return ts
}

function setLastCheckTimestamp(ts: number) {
    _moduleLastCheckTs = ts
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_LAST_CHECK_KEY, String(ts))
        } catch { /* ignore storage unavailable */ }
    }
}

export function useSessionGuard() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isCheckingRef = useRef(false)

    const checkSession = useCallback(async (force = false) => {
        if (!force && typeof document !== 'undefined' && document.hidden) return

        const sessionToken = readSessionTokenFromCookie()
        if (!sessionToken) return

        const now = Date.now()
        if (!force && now - getLastCheckTimestamp() < MIN_COOLDOWN) return

        if (isCheckingRef.current) return
        isCheckingRef.current = true
        setLastCheckTimestamp(now)

        try {
            const supabase = createClient() as any
            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (!user?.id) return

            const userRole = user.user_metadata?.role as string | undefined
            const clinicId = user.user_metadata?.clinic_id as string | undefined
            const isConcurrentAllowed = isUserAllowedConcurrentSessions(user.id, user.email)

            let shouldCheckClinic = false
            if (clinicId && userRole !== 'SUPER_ADMIN') {
                try {
                    const lastClinicTs = Number(window.localStorage.getItem(STORAGE_CLINIC_CHECK_KEY) || '0')
                    if (force || Number.isNaN(lastClinicTs) || now - lastClinicTs >= CLINIC_CHECK_TTL_MS) {
                        shouldCheckClinic = true
                    }
                } catch {
                    shouldCheckClinic = true
                }
            }

            const [sessionRes, clinicRes] = await Promise.all([
                isConcurrentAllowed
                    ? Promise.resolve({ data: { id: 'concurrent' }, error: null })
                    : supabase
                        .from('active_sessions')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('session_token', sessionToken)
                        .eq('is_active', true)
                        .maybeSingle(),
                shouldCheckClinic && clinicId
                    ? supabase
                        .from('clinics')
                        .select('is_active')
                        .eq('id', clinicId)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null }),
            ])

            if (shouldCheckClinic && !clinicRes?.error) {
                try {
                    window.localStorage.setItem(STORAGE_CLINIC_CHECK_KEY, String(now))
                } catch { /* ignore storage unavailable */ }
            }

            if (clinicRes?.data && clinicRes.data.is_active === false) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
                await supabase.auth.signOut().catch(() => { })
                window.location.replace('/conta-bloqueada')
                return
            }

            // Só derruba a sessão se a consulta ao banco respondeu sem erro e confirmou inatividade
            if (!isConcurrentAllowed && !sessionRes?.error && !sessionRes?.data) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }

                let activeDeviceLabel = 'Outro computador ou navegador'
                let activeSinceIso: string | null = new Date().toISOString()

                try {
                    const { data: latestActive } = await supabase
                        .from('active_sessions')
                        .select('device_info, created_at')
                        .eq('user_id', user.id)
                        .eq('is_active', true)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()

                    if (latestActive) {
                        activeDeviceLabel = formatDeviceDescription(latestActive.device_info)
                        activeSinceIso = latestActive.created_at || activeSinceIso
                    }
                } catch { /* fallback device label */ }

                const payload: SessionReplacedPayload = {
                    email: user.email || '',
                    new_device: activeDeviceLabel,
                    replaced_at: activeSinceIso,
                    message: 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.',
                }

                try {
                    window.sessionStorage.setItem(SESSION_REPLACED_STORAGE_KEY, JSON.stringify(payload))
                    document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`
                } catch { /* ignore storage unavailable */ }

                window.dispatchEvent(new CustomEvent(SESSION_REPLACED_EVENT, { detail: payload }))
                await supabase.auth.signOut().catch(() => { })
            }
        } catch {
            // Erro transitório de rede — não derrubar sessão
        } finally {
            isCheckingRef.current = false
        }
    }, [])

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            void checkSession(false)
        }, POLLING_INTERVAL)

        // Verificação inicial leve após 15s (respeita cooldown compartilhado entre abas via localStorage)
        const initialTimeout = setTimeout(() => {
            void checkSession(false)
        }, 15_000)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            clearTimeout(initialTimeout)
        }
    }, [checkSession])

    // Revalida ao voltar para a aba apenas se o cooldown compartilhado de 5 minutos expirou
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkSession(false)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [checkSession])
}
