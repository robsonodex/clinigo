import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE: Revoke a specific session
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: sessionId } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Verify session belongs to user
        const { data: session, error: fetchError } = await supabase
            .from('user_sessions')
            .select('id, user_id')
            .eq('id', sessionId)
            .single()

        if (fetchError || !session) {
            return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
        }

        if ((session as any).user_id !== user.id) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
        }

        // Deactivate session
        const { error } = await supabase
            .from('user_sessions')
            .update({ is_active: false })
            .eq('id', sessionId)

        if (error) {
            console.error('Session revoke error:', error)
            return NextResponse.json({ error: 'Erro ao revogar sessão' }, { status: 500 })
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
            event_type: 'SESSION_REVOKED',
            event_details: { revoked_session_id: sessionId },
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent'),
        })

        return NextResponse.json({ success: true, message: 'Sessão encerrada' })
    } catch (error) {
        console.error('Session revoke error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
