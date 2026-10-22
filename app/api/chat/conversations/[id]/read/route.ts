import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id: conversationId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        const { error } = await adminDb
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)

        if (error) {
            console.error('[Chat] Error marking as read:', error)
            return NextResponse.json({ error: 'Erro ao marcar como lido' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        request.log.error('chat/conversations/[id]/read', { error: error instanceof Error ? error.message : String(error) })
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
})
