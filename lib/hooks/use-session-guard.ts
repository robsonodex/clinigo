'use client'

/**
 * useSessionGuard
 * Monitora em tempo real (push < 300ms via Supabase Realtime + fallback 15s) se a sessão única
 * do usuário permanece ativa e se a clínica vinculada não foi suspensa/bloqueada.
 *
 * ARQUITETURA ZERO CPU VERCEL + DESLOGAMENTO INSTANTÂNEO:
 * 1. Push instantâneo via Supabase Realtime (postgres_changes em active_sessions filtrado por user_id).
 * 2. Fallback direto no Supabase (0ms de Fluid Active CPU na Vercel) a cada 15s e em focus/visibilitychange.
 * 3. Sincronização instantânea entre abas do mesmo navegador via localStorage/Broadcast.
 * 4. signOut({ scope: 'local' }) no navegador antigo para NUNCA revogar o refresh token do novo navegador!
 */
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SESSION_COOKIE_NAME, isUserAllowedConcurrentSessions } from '@/lib/services/single-session'

export const POLLING_INTERVAL = 15_000 // 15s fallback (0ms CPU Vercel — consulta direta ao Supabase)
export const MIN_COOLDOWN = 4_000 // 4s compartilhados entre abas do mesmo navegador
const CLINIC_CHECK_TTL_MS = 300_000 // 5 minutos para status is_active da clínica
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
        } catch {
            /* ignore storage unavailable */
        }
    }
    return ts
}

function setLastCheckTimestamp(ts: number) {
    _moduleLastCheckTs = ts
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_LAST_CHECK_KEY, String(ts))
        } catch {
            /* ignore storage unavailable */
        }
    }
}

export function useSessionGuard() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const isCheckingRef = useRef(false)
    const displacedTriggeredRef = useRef(false)

    const triggerSessionDisplaced = useCallback(
        async (
            supabase: any,
            user: { id: string; email?: string | null },
            hint?: { deviceInfo?: string | null; createdAt?: string | null }
        ) => {
            if (displacedTriggeredRef.current) return
            displacedTriggeredRef.current = true

            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }

            let activeDeviceLabel = hint?.deviceInfo
                ? formatDeviceDescription(hint.deviceInfo)
                : 'Outro computador ou navegador'
            let activeSinceIso: string | null = hint?.createdAt || new Date().toISOString()

            if (!hint?.deviceInfo) {
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
                } catch {
                    /* fallback device label */
                }
            }

            const payload: SessionReplacedPayload = {
                email: user.email || '',
                new_device: activeDeviceLabel,
                replaced_at: activeSinceIso,
                message: 'Sua sessão neste navegador foi encerrada porque um novo login foi iniciado com esta conta em outro dispositivo.',
            }

            try {
                const serialized = JSON.stringify(payload)
                window.sessionStorage.setItem(SESSION_REPLACED_STORAGE_KEY, serialized)
                // Propaga para outras abas abertas neste mesmo navegador instantaneamente
                window.localStorage.setItem(SESSION_REPLACED_STORAGE_KEY, serialized)
                document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0`
            } catch {
                /* ignore storage unavailable */
            }

            window.dispatchEvent(new CustomEvent(SESSION_REPLACED_EVENT, { detail: payload }))
            // CRÍTICO: scope: 'local' encerra apenas ESTE navegador, sem revogar o token do novo login!
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        },
        []
    )

    const checkSession = useCallback(
        async (force = false) => {
            if (displacedTriggeredRef.current) return
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
                const {
                    data: { session },
                } = await supabase.auth.getSession()
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
                              .select('is_active, scheduled_block_at, block_type, manual_unlock_only')
                              .eq('id', clinicId)
                              .maybeSingle()
                              .then(async (res: any) =>
                                  res?.error
                                      ? supabase.from('clinics').select('is_active').eq('id', clinicId).maybeSingle()
                                      : res
                              )
                        : Promise.resolve({ data: null, error: null }),
                ])

                if (shouldCheckClinic && !clinicRes?.error) {
                    try {
                        window.localStorage.setItem(STORAGE_CLINIC_CHECK_KEY, String(now))
                    } catch {
                        /* ignore storage unavailable */
                    }
                }

                const clinicData = clinicRes?.data
                const scheduledMs = clinicData?.scheduled_block_at
                    ? new Date(clinicData.scheduled_block_at).getTime()
                    : Number.NaN
                const isScheduledExpired = Boolean(!Number.isNaN(scheduledMs) && scheduledMs <= Date.now())
                const isTerminated =
                    clinicData?.block_type === 'TERMINATED_LGPD' ||
                    clinicData?.block_type === 'MANUAL_LOCK' ||
                    clinicData?.manual_unlock_only === true

                if (clinicData && (clinicData.is_active === false || isScheduledExpired)) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current)
                        intervalRef.current = null
                    }
                    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
                    window.location.replace(isTerminated ? '/conta-bloqueada?type=terminated' : '/conta-bloqueada')
                    return
                }

                // Agendamento silencioso no cliente: derruba no segundo exato do horário programado (sem aviso prévio)
                if (clinicData && !Number.isNaN(scheduledMs) && scheduledMs > Date.now()) {
                    const msUntilBlock = scheduledMs - Date.now()
                    if (msUntilBlock <= 12 * 60 * 60 * 1000) {
                        window.setTimeout(async () => {
                            await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
                            window.location.replace(isTerminated ? '/conta-bloqueada?type=terminated' : '/conta-bloqueada')
                        }, msUntilBlock + 500)
                    }
                }

                // Só derruba a sessão se a consulta ao banco respondeu sem erro e confirmou inatividade
                if (!isConcurrentAllowed && !sessionRes?.error && !sessionRes?.data) {
                    await triggerSessionDisplaced(supabase, user)
                }
            } catch {
                // Erro transitório de rede — não derrubar sessão
            } finally {
                isCheckingRef.current = false
            }
        },
        [triggerSessionDisplaced]
    )

    // 1. Canal Realtime instantâneo (< 300ms, 0ms CPU Vercel) escutando active_sessions do próprio usuário
    useEffect(() => {
        let isDisposed = false
        let activeChannel: any = null
        const supabase = createClient() as any

        const initRealtime = async () => {
            const sessionToken = readSessionTokenFromCookie()
            if (!sessionToken || displacedTriggeredRef.current) return

            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession()
                const user = session?.user
                if (!user?.id || isDisposed) return
                if (isUserAllowedConcurrentSessions(user.id, user.email)) return

                const channelName = `session-guard:${user.id}:${sessionToken.slice(0, 8)}`
                activeChannel = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'active_sessions',
                            filter: `user_id=eq.${user.id}`,
                        },
                        (payload: any) => {
                            const row = payload?.new
                            if (!row || displacedTriggeredRef.current) return
                            const currentToken = readSessionTokenFromCookie()
                            if (currentToken && row.is_active === true && row.session_token && row.session_token !== currentToken) {
                                void triggerSessionDisplaced(supabase, user, {
                                    deviceInfo: row.device_info,
                                    createdAt: row.created_at,
                                })
                            }
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'active_sessions',
                            filter: `user_id=eq.${user.id}`,
                        },
                        (payload: any) => {
                            const row = payload?.new
                            if (!row || displacedTriggeredRef.current) return
                            const currentToken = readSessionTokenFromCookie()
                            if (currentToken && row.session_token === currentToken && row.is_active === false) {
                                void triggerSessionDisplaced(supabase, user)
                            }
                        }
                    )
                    .subscribe()
            } catch {
                // Fallback de polling 15s continua ativo mesmo se WebSocket estiver bloqueado pela rede
            }
        }

        void initRealtime()

        return () => {
            isDisposed = true
            if (activeChannel) {
                try {
                    void supabase.removeChannel(activeChannel)
                } catch {
                    /* ignore */
                }
                activeChannel = null
            }
        }
    }, [triggerSessionDisplaced])

    // 2. Fallback rápido (15s) + verificação inicial rápida (1.5s)
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            void checkSession(false)
        }, POLLING_INTERVAL)

        const initialTimeout = setTimeout(() => {
            void checkSession(false)
        }, 1_500)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
            clearTimeout(initialTimeout)
        }
    }, [checkSession])

    // 3. Revalidação instantânea ao voltar para a aba/janela + sincronização entre abas do mesmo navegador
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkSession(false)
            }
        }

        const handleWindowFocus = () => {
            void checkSession(false)
        }

        const handleStorage = (e: StorageEvent) => {
            if (e.key === SESSION_REPLACED_STORAGE_KEY && e.newValue && !displacedTriggeredRef.current) {
                try {
                    const parsed = JSON.parse(e.newValue) as SessionReplacedPayload
                    displacedTriggeredRef.current = true
                    window.dispatchEvent(new CustomEvent(SESSION_REPLACED_EVENT, { detail: parsed }))
                } catch {
                    /* ignore */
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleWindowFocus)
        window.addEventListener('storage', handleStorage)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleWindowFocus)
            window.removeEventListener('storage', handleStorage)
        }
    }, [checkSession])
}
