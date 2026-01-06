import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List all active sessions
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: sessions, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('last_active_at', { ascending: false })

        if (error) {
            console.error('Sessions fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar sessões' }, { status: 500 })
        }

        // Get current session from cookie to mark it
        const currentSessionToken = request.cookies.get('session_token')?.value

        const sessionsWithCurrent = (sessions || []).map((session: any) => ({
            ...session,
            is_current: currentSessionToken ?
                session.session_token_hash === hashToken(currentSessionToken) :
                false,
        }))

        return NextResponse.json({ sessions: sessionsWithCurrent })
    } catch (error) {
        console.error('Sessions error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE: Revoke all other sessions
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const currentSessionToken = request.cookies.get('session_token')?.value
        const currentSessionHash = currentSessionToken ? hashToken(currentSessionToken) : null

        // Deactivate all sessions except current
        let query = supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('is_active', true)

        if (currentSessionHash) {
            query = query.neq('session_token_hash', currentSessionHash)
        }

        const { error } = await query

        if (error) {
            console.error('Session revoke error:', error)
            return NextResponse.json({ error: 'Erro ao revogar sessões' }, { status: 500 })
        }

        // Log the event
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        await supabase.from('session_audit').insert({
            user_id: user.id,
            clinic_id: (userData as any)?.clinic_id,
            event_type: 'ALL_SESSIONS_REVOKED',
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
        })

        return NextResponse.json({ success: true, message: 'Outras sessões encerradas' })
    } catch (error) {
        console.error('Sessions error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// Simple hash function for session tokens
function hashToken(token: string): string {
    // In production, use a proper hash function
    // This is a simplified version
    let hash = 0
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return hash.toString(16)
}
