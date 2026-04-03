import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // Verify user is participant
        const { data: participant } = await adminDb
            .from('chat_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)
            .single()

        // Allow super admins
        const { data: profile } = await adminDb
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!participant && profile?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = (page - 1) * limit

        // Fetch messages
        const { data: messages, error, count } = await adminDb
            .from('chat_messages')
            .select('*', { count: 'exact' })
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1)

        if (error) {
            console.error('[Chat] Error fetching messages:', error)
            return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
        }

        // Get sender info for all messages
        const senderIds = [...new Set((messages || []).map(m => m.sender_id))]
        const { data: senders } = await adminDb
            .from('users')
            .select('id, full_name, avatar_url, role')
            .in('id', senderIds)

        const enrichedMessages = (messages || []).map(msg => ({
            ...msg,
            sender: senders?.find(s => s.id === msg.sender_id) || null,
        }))

        return NextResponse.json({
            data: enrichedMessages,
            pagination: {
                page,
                limit,
                total: count || 0,
                hasMore: (count || 0) > offset + limit,
            },
        })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // Verify user is participant
        const { data: participant } = await adminDb
            .from('chat_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)
            .single()

        if (!participant) {
            return NextResponse.json({ error: 'Não é participante desta conversa' }, { status: 403 })
        }

        const body = await request.json()
        const { content, message_type = 'text', attachment_url, attachment_name, attachment_size } = body

        if (!content && !attachment_url) {
            return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
        }

        // Insert message
        const { data: message, error: msgError } = await adminDb
            .from('chat_messages')
            .insert({
                conversation_id: conversationId,
                sender_id: user.id,
                content,
                message_type,
                attachment_url,
                attachment_name,
                attachment_size,
            })
            .select()
            .single()

        if (msgError) {
            console.error('[Chat] Error sending message:', msgError)
            return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 })
        }

        // Get sender info
        const { data: sender } = await adminDb
            .from('users')
            .select('id, full_name, avatar_url, role')
            .eq('id', user.id)
            .single()

        // Update conversation last_message_at and preview
        const preview = message_type === 'text'
            ? (content || '').substring(0, 100)
            : message_type === 'image' ? '📷 Foto'
            : message_type === 'audio' ? '🎙️ Áudio'
            : '📎 Documento'

        await adminDb
            .from('chat_conversations')
            .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: preview,
                updated_at: new Date().toISOString(),
            })
            .eq('id', conversationId)

        // Update sender's last_read_at
        await adminDb
            .from('chat_participants')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)

        return NextResponse.json({ data: { ...message, sender } }, { status: 201 })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
