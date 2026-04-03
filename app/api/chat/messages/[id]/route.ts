import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: messageId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const { content } = body

        if (!content || !content.trim()) {
            return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // Verify ownership
        const { data: existing } = await adminDb
            .from('chat_messages')
            .select('sender_id')
            .eq('id', messageId)
            .single()

        if (!existing || existing.sender_id !== user.id) {
            return NextResponse.json({ error: 'Mensagem não encontrada ou sem permissão' }, { status: 404 })
        }

        // Update message
        const { data: message, error } = await adminDb
            .from('chat_messages')
            .update({
                content: content.trim(),
                is_edited: true,
                edited_at: new Date().toISOString(),
            })
            .eq('id', messageId)
            .eq('sender_id', user.id)
            .select()
            .single()

        if (error) {
            console.error('[Chat] Error editing message:', error)
            return NextResponse.json({ error: 'Erro ao editar mensagem' }, { status: 500 })
        }

        // Get sender info
        const { data: sender } = await adminDb
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', user.id)
            .single()

        return NextResponse.json({ data: { ...message, sender } })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: messageId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // Verify ownership
        const { data: existing } = await adminDb
            .from('chat_messages')
            .select('sender_id')
            .eq('id', messageId)
            .single()

        if (!existing || existing.sender_id !== user.id) {
            return NextResponse.json({ error: 'Mensagem não encontrada ou sem permissão' }, { status: 404 })
        }

        // Soft delete
        const { error } = await adminDb
            .from('chat_messages')
            .update({
                is_deleted: true,
                content: null,
                attachment_url: null,
            })
            .eq('id', messageId)
            .eq('sender_id', user.id)

        if (error) {
            console.error('[Chat] Error deleting message:', error)
            return NextResponse.json({ error: 'Erro ao deletar mensagem' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
