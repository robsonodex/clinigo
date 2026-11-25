/**
 * GET /api/auth/session/validate
 * Valida se o session token do cookie é a sessão ativa do usuário
 * e se a clínica vinculada permanece ativa (is_active = true).
 *
 * OTIMIZADO PARA BAIXO CPU (Fluid Active CPU):
 * - Sem wrapper Axiom neste endpoint de heartbeat (reduz serialização/flush por chamada)
 * - Cache em memória de status da clínica ampliado para 5 minutos (300s)
 * - Cache-Control privado para evitar chamadas repetidas de abas legadas
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'
import { validateSession, isUserAllowedConcurrentSessions, SESSION_COOKIE_NAME } from '@/lib/services/single-session'
import { cookies } from 'next/headers'
import {
    fetchClinicLockdownById,
    getClinicBlockedRedirectPath,
    isClinicEffectivelyBlocked,
} from '@/lib/auth/clinic-lockdown'

function formatDeviceDescription(ua?: string | null): string {
    if (!ua) return 'Outro computador ou celular'
    const s = String(ua)
    let browser = 'Navegador Web'
    if (s.includes('Edg/')) browser = 'Microsoft Edge'
    else if (s.includes('OPR/') || s.includes('Opera')) browser = 'Opera'
    else if (s.includes('Chrome/') && !s.includes('Edg/')) browser = 'Google Chrome'
    else if (s.includes('Firefox/')) browser = 'Mozilla Firefox'
    else if (s.includes('Safari/') && !s.includes('Chrome/')) browser = 'Safari'

    let os = ' Computador'
    if (s.includes('iPhone')) os = 'iPhone'
    else if (s.includes('iPad')) os = 'iPad'
    else if (s.includes('Android')) os = 'Celular Android'
    else if (s.includes('Windows')) os = 'Windows'
    else if (s.includes('Mac OS X') || s.includes('Macintosh')) os = 'Mac'
    else if (s.includes('Linux')) os = 'Linux'

    return `${browser} (${os})`
}

const CLINIC_STATUS_TTL_MS = 300_000 // 5 minutos
const VALID_CACHE_HEADERS = { 'Cache-Control': 'private, max-age=120' }
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store' }

const clinicStatusCache = new Map<
    string,
    {
        clinicId: string | null
        role: string | null
        clinicIsActive: boolean
        scheduledBlockAt: string | null
        blockType: string | null
        manualUnlockOnly: boolean
        expiresAt: number
    }
>()

export async function GET(_request?: Request) {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            return NextResponse.json(
                { valid: true, reason: 'no_token_legacy' },
                { headers: VALID_CACHE_HEADERS }
            )
        }

        const supabase = await createClient()
        const { user } = await getVerifiedUser(supabase, cookieStore)
        if (!user) {
            return NextResponse.json(
                { valid: false, reason: 'no_user' },
                { headers: NO_STORE_HEADERS }
            )
        }

        const adminSupabase = createServiceRoleClient() as any
        const now = Date.now()
        const cachedStatus = clinicStatusCache.get(user.id)
        const isConcurrentAllowed = isUserAllowedConcurrentSessions(user.id, user.email)

        let isValidSession = true

        if (cachedStatus && cachedStatus.expiresAt > now) {
            const cachedClinicState = {
                is_active: cachedStatus.clinicIsActive,
                scheduled_block_at: cachedStatus.scheduledBlockAt,
                block_type: cachedStatus.blockType,
                manual_unlock_only: cachedStatus.manualUnlockOnly,
            }
            if (
                cachedStatus.clinicId &&
                cachedStatus.role !== 'SUPER_ADMIN' &&
                isClinicEffectivelyBlocked(cachedClinicState, now)
            ) {
                return NextResponse.json({
                    valid: false,
                    reason: 'clinic_blocked',
                    redirect_url: getClinicBlockedRedirectPath(cachedClinicState),
                    message: 'O acesso da sua clínica ao CliniGo foi encerrado.'
                }, { headers: NO_STORE_HEADERS })
            }

            if (isConcurrentAllowed) {
                return NextResponse.json(
                    { valid: true, concurrent_allowed: true },
                    { headers: VALID_CACHE_HEADERS }
                )
            }

            isValidSession = await validateSession(adminSupabase, user.id, sessionToken, user.email)
        } else {
            const [profileRes, sessionCheckResult] = await Promise.all([
                adminSupabase
                    .from('users')
                    .select('clinic_id, role')
                    .eq('id', user.id)
                    .maybeSingle(),
                isConcurrentAllowed
                    ? Promise.resolve(true)
                    : validateSession(adminSupabase, user.id, sessionToken, user.email),
            ])

            isValidSession = sessionCheckResult
            const profile = profileRes?.data
            let clinicState: any = null

            if (profile?.clinic_id && profile.role !== 'SUPER_ADMIN') {
                clinicState = await fetchClinicLockdownById(adminSupabase, profile.clinic_id)
            }

            const clinicBlocked = Boolean(clinicState && isClinicEffectivelyBlocked(clinicState, now))

            if (clinicStatusCache.size >= 500) {
                clinicStatusCache.clear()
            }
            clinicStatusCache.set(user.id, {
                clinicId: profile?.clinic_id || null,
                role: profile?.role || null,
                clinicIsActive: clinicState ? clinicState.is_active !== false : true,
                scheduledBlockAt: clinicState?.scheduled_block_at ?? null,
                blockType: clinicState?.block_type ?? null,
                manualUnlockOnly: Boolean(clinicState?.manual_unlock_only),
                expiresAt: now + CLINIC_STATUS_TTL_MS,
            })

            if (clinicBlocked) {
                return NextResponse.json({
                    valid: false,
                    reason: 'clinic_blocked',
                    redirect_url: getClinicBlockedRedirectPath(clinicState),
                    message: 'O acesso da sua clínica ao CliniGo foi encerrado.'
                }, { headers: NO_STORE_HEADERS })
            }

            if (isConcurrentAllowed) {
                return NextResponse.json(
                    { valid: true, concurrent_allowed: true },
                    { headers: VALID_CACHE_HEADERS }
                )
            }
        }

        if (!isValidSession) {
            let activeDeviceLabel = 'Outro computador ou celular'
            let activeSinceIso: string | null = null
            try {
                const { data: currentActive } = await adminSupabase
                    .from('active_sessions')
                    .select('device_info, created_at')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                if (currentActive) {
                    activeDeviceLabel = formatDeviceDescription(currentActive.device_info)
                    activeSinceIso = currentActive.created_at || null
                }
            } catch { /* fallback device label */ }

            return NextResponse.json({
                valid: false,
                reason: 'session_replaced',
                email: user.email || '',
                new_device: activeDeviceLabel,
                replaced_at: activeSinceIso,
                message: 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.'
            }, { headers: NO_STORE_HEADERS })
        }

        return NextResponse.json({ valid: true }, { headers: VALID_CACHE_HEADERS })
    } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const isRefreshTokenMissing =
            error?.code === 'refresh_token_not_found' ||
            errorMsg.includes('refresh_token_not_found') ||
            errorMsg.includes('Refresh Token Not Found')

        if (isRefreshTokenMissing) {
            return NextResponse.json({ valid: false, reason: 'session_expired' }, { headers: NO_STORE_HEADERS })
        }
        console.error('[SESSION VALIDATE] Error:', errorMsg)
        return NextResponse.json({ valid: true, reason: 'error_fallback' }, { headers: NO_STORE_HEADERS })
    }
}
