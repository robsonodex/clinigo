/**
 * GET /api/auth/session/validate
 * Valida se o session token do cookie é a sessão ativa do usuário
 * Usado pelo polling do SessionGuard (a cada 10s)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/services/single-session'
import { cookies } from 'next/headers'

export async function GET(_request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            // Sem usuário logado — não precisa validar sessão
            return NextResponse.json({ valid: false, reason: 'no_user' })
        }

        const cookieStore = await cookies()
        const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

        if (!sessionToken) {
            // Sem cookie de sessão — pode ser login antigo antes do sistema de sessão única
            // Nesse caso, registra uma sessão automaticamente
            return NextResponse.json({ valid: true, reason: 'no_token_legacy' })
        }

        const isValid = await validateSession(supabase, user.id, sessionToken)

        if (!isValid) {
            console.log('[SESSION VALIDATE] Invalid session for user:', user.email, '- forcing logout')
            return NextResponse.json({ 
                valid: false, 
                reason: 'session_replaced',
                message: 'Sua sessão foi encerrada porque um novo login foi realizado em outro dispositivo.'
            })
        }

        return NextResponse.json({ valid: true })
    } catch (error) {
        console.error('[SESSION VALIDATE] Error:', error)
        // Em caso de erro, não forçar logout — pode ser problema de rede
        return NextResponse.json({ valid: true, reason: 'error_fallback' })
    }
}
