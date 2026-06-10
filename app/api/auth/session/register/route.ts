/**
 * POST /api/auth/session/register
 * Registra nova sessão única após login bem-sucedido (client-side logins)
 * Invalida todas as sessões anteriores do usuário
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerSingleSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/services/single-session'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const deviceInfo = request.headers.get('user-agent') || undefined
        const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

        const { sessionToken } = await registerSingleSession(
            supabase,
            user.id,
            deviceInfo,
            ipAddress
        )

        // Set session cookie
        const cookieStore = await cookies()
        cookieStore.set(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS)

        console.log('[SESSION REGISTER] Single session registered for:', user.email)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[SESSION REGISTER] Error:', error)
        return NextResponse.json({ error: 'Erro ao registrar sessão' }, { status: 500 })
    }
}
