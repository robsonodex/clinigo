import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * POST /api/auth/login
 * Login with email and password
 * Clears old session cookies before new login to prevent stale token errors
 * Single Session: Invalida sessões anteriores ao fazer novo login
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { handleApiError } from '@/lib/utils/errors'
import { z } from 'zod'
import { registerSingleSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/services/single-session'
import { loggingFetch } from '@/lib/supabase-fetch'

// Super Admin email whitelist (same as middleware.ts)
const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

function buildDatabaseUnavailableResponse() {
    return NextResponse.json(
        {
            success: false,
            error: {
                message: 'Instabilidade temporária na comunicação com o banco de dados. Aguarde alguns instantes e tente novamente.',
                code: 'DATABASE_UNAVAILABLE',
            },
        },
        { status: 503 }
    )
}

function isSupabaseInfraError(err: any): boolean {
    if (!err) return false
    const errMsg = err instanceof Error ? err.message : String(err?.message || '')
    const errStatus = err?.status
    return Boolean(
        err?.name === 'AuthUnknownError' ||
        err?.name === 'AuthRetryableFetchError' ||
        err?.code === 'supabase_gateway_timeout' ||
        errStatus === 0 ||
        (typeof errStatus === 'number' && errStatus >= 500) ||
        errMsg.includes('<!DOCTYPE') ||
        errMsg.includes('Unexpected token') ||
        errMsg.includes('fetch failed') ||
        errMsg.includes('HeadersTimeoutError') ||
        errMsg.includes('Gateway do banco indisponível')
    )
}

export const dynamic = 'force-dynamic'

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        let body: unknown
        try {
            body = await request.json()
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Corpo da requisição inválido (JSON esperado)',
                        code: 'INVALID_JSON',
                    },
                },
                { status: 400 }
            )
        }
        const { email, password } = loginSchema.parse(body)

        const cookieStore = await cookies()

        // STEP 1: Clear any stale Supabase cookies before login
        const allCookies = cookieStore.getAll()
        for (const cookie of allCookies) {
            if (cookie.name.startsWith('sb-')) {
                cookieStore.delete(cookie.name)
            }
        }

        // Create Supabase client with proper cookie handling + normalização de HTML 522/524
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { fetch: loggingFetch },
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    },
                },
            }
        )

        // STEP 2: Authenticate user with fresh session
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            if (isSupabaseInfraError(error)) {
                console.error('[LOGIN] Supabase gateway/database unavailable:', {
                    name: error.name,
                    status: error.status,
                    code: error.code,
                    message: error.message,
                })
                return buildDatabaseUnavailableResponse()
            }

            if (error.code !== 'invalid_credentials' && error.status !== 400) {
                console.error('[LOGIN] Auth error:', error)
            }
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email ou senha incorretos',
                        code: 'INVALID_CREDENTIALS',
                        debug: {
                            supabaseError: error.message,
                            supabaseCode: error.code
                        }
                    },
                },
                { status: 401 }
            )
        }

        if (!data.user || !data.session) {
            console.error('[LOGIN] No user or session returned')
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Erro ao criar sessão',
                        code: 'NO_SESSION',
                    },
                },
                { status: 500 }
            )
        }

        console.log('[LOGIN] Success for:', data.user.email)

        // STEP 3.5: Check if clinic is active (unless Super Admin)
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes((data.user.email || '').toLowerCase())

        if (!isSuperAdmin) {
            const { data: profile } = await supabase
                .from('users')
                .select('clinic_id, role')
                .eq('id', data.user.id)
                .single()

            if (profile?.clinic_id) {
                const { data: clinic } = await supabase
                    .from('clinics')
                    .select('is_active, name')
                    .eq('id', profile.clinic_id)
                    .single()

                if (clinic && clinic.is_active === false) {
                    console.warn(`[LOGIN] Blocked login for inactive clinic: ${clinic.name} (${profile.clinic_id})`)
                    await supabase.auth.signOut().catch(() => {})
                    return NextResponse.json(
                        {
                            success: false,
                            error: {
                                message: 'O acesso a esta clínica está bloqueado pela administração do CliniGo.',
                                code: 'CLINIC_INACTIVE',
                            },
                        },
                        { status: 403 }
                    )
                }
            }
        }

        // STEP 4: Register single session (invalidate all previous sessions)
        const deviceInfo = request.headers.get('user-agent') || undefined
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

        try {
            const sessionRegistration = await registerSingleSession(
                supabase,
                data.user.id,
                deviceInfo,
                ipAddress,
                data.user.email
            )

            // Set session cookie
            cookieStore.set(SESSION_COOKIE_NAME, sessionRegistration.sessionToken, SESSION_COOKIE_OPTIONS)
            console.log('[LOGIN] Single session registered for:', data.user.email)

            if (sessionRegistration?.previousSessionInvalidated) {
                const mod = await import('@/lib/services/single-session')
                if (typeof mod.broadcastSessionReplaced === 'function') {
                    await mod.broadcastSessionReplaced(supabase as any, data.user.id).catch(() => {})
                }
            }
        } catch (sessionError) {
        request.log.error('auth/login', { error: sessionError instanceof Error ? sessionError.message : String(sessionError) })
            // Log but don't block login if session registration fails
            console.error('[LOGIN] Session registration error (non-blocking):', sessionError)
        }

        // Return success - cookies are automatically set by Supabase SSR
        // Retorna também session para hidratação imediata do cliente browser Supabase
        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || null,
                    full_name: data.user.user_metadata?.full_name || null,
                },
                session: data.session ? {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_in: data.session.expires_in,
                    expires_at: data.session.expires_at,
                    token_type: data.session.token_type,
                } : null,
            },
        })
    } catch (error) {
        if (isSupabaseInfraError(error)) {
            console.error('[LOGIN] Infra timeout/gateway error caught:', error)
            return buildDatabaseUnavailableResponse()
        }
        request.log.error('auth/login', { error: error instanceof Error ? error.message : String(error) })
        console.error('[LOGIN] Unexpected error:', error)
        return handleApiError(error)
    }
})
