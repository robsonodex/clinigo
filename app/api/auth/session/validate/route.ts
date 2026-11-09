import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/auth/session/validate
 * Valida se o session token do cookie é a sessão ativa do usuário
 * e se a clínica vinculada permanece ativa (is_active = true).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'
import { validateSession, isUserAllowedConcurrentSessions, SESSION_COOKIE_NAME } from '@/lib/services/single-session'
import { cookies } from 'next/headers'

export const GET = withAxiom(async (_request: AxiomRequest) => {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            // Sem cookie de sessão — não faz chamada desnecessária ao Supabase Auth
            return NextResponse.json({ valid: true, reason: 'no_token_legacy' })
        }

        const supabase = await createClient()
        const { user } = await getVerifiedUser(supabase, cookieStore)
        if (!user) {
            // Sem usuário logado — não precisa validar sessão
            return NextResponse.json({ valid: false, reason: 'no_user' })
        }

        // Verificar se a clínica do usuário foi suspensa/bloqueada (vale para TODOS os usuários da clínica, sem exceção)
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()

        if (profile?.clinic_id && profile.role !== 'SUPER_ADMIN') {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('is_active')
                .eq('id', profile.clinic_id)
                .maybeSingle()

            if (clinic && clinic.is_active === false) {
                return NextResponse.json({
                    valid: false,
                    reason: 'clinic_blocked',
                    message: 'O acesso da sua clínica ao CliniGo foi suspenso.'
                })
            }
        }

        // Excecao autorizada de sessao simultanea (suporte tecnico)
        if (isUserAllowedConcurrentSessions(user.id, user.email)) {
            return NextResponse.json({ valid: true, concurrent_allowed: true })
        }

        const isValid = await validateSession(supabase, user.id, sessionToken, user.email)

        if (!isValid) {
            console.log('[SESSION VALIDATE] Invalid session for user:', user.email, '- forcing logout')
            return NextResponse.json({ 
                valid: false, 
                reason: 'session_replaced',
                message: 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.'
            })
        }

        return NextResponse.json({ valid: true })
    } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        const isRefreshTokenMissing =
            error?.code === 'refresh_token_not_found' ||
            errorMsg.includes('refresh_token_not_found') ||
            errorMsg.includes('Refresh Token Not Found')

        if (isRefreshTokenMissing) {
            return NextResponse.json({ valid: false, reason: 'session_expired' })
        }
        _request.log.error('auth/session/validate', { error: error instanceof Error ? error.message : String(error) })
        console.error('[SESSION VALIDATE] Error:', error)
        // Em caso de erro, não forçar logout — pode ser problema de rede
        return NextResponse.json({ valid: true, reason: 'error_fallback' })
    }
})
