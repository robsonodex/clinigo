import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Use service role to bypass RLS recursion on chat_participants
        const adminDb = createServiceRoleClient()

        const { data: profile } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        // Get conversations where user is participant
        const { data: participations } = await adminDb
            .from('chat_participants')
            .select('conversation_id, last_read_at')
            .eq('user_id', user.id)

        if (!participations || participations.length === 0) {
            return NextResponse.json({ data: [] })
        }

        const conversationIds = participations.map(p => p.conversation_id)
        const lastReadMap = new Map(participations.map(p => [p.conversation_id, p.last_read_at]))

        // Fetch conversations
        const { data: conversations, error } = await adminDb
            .from('chat_conversations')
            .select('*')
            .in('id', conversationIds)
            .order('last_message_at', { ascending: false })

        if (error) {
            console.error('[Chat] Error fetching conversations:', error)
            return NextResponse.json({ error: 'Erro ao buscar conversas' }, { status: 500 })
        }

        // Enrich with unread count and participants
        const enriched = await Promise.all(
            (conversations || []).map(async (conv) => {
                const lastReadAt = lastReadMap.get(conv.id) || conv.created_at

                // Count unread messages
                const { count: unreadCount } = await adminDb
                    .from('chat_messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .eq('is_deleted', false)
                    .gt('created_at', lastReadAt)
                    .neq('sender_id', user.id)

                // Get participants with names
                const { data: participants } = await adminDb
                    .from('chat_participants')
                    .select('user_id, role')
                    .eq('conversation_id', conv.id)

                // Get user info for participants
                const participantIds = (participants || []).map(p => p.user_id)
                const { data: userInfos } = await adminDb
                    .from('users')
                    .select('id, full_name, avatar_url, role')
                    .in('id', participantIds)

                const enrichedParticipants = (participants || []).map(p => ({
                    ...p,
                    users: userInfos?.find(u => u.id === p.user_id) || null,
                }))

                return {
                    id: conv.id,
                    clinic_id: conv.clinic_id,
                    type: conv.type,
                    title: conv.title,
                    created_by: conv.created_by,
                    last_message_at: conv.last_message_at,
                    last_message_preview: conv.last_message_preview,
                    created_at: conv.created_at,
                    unread_count: unreadCount || 0,
                    participants: enrichedParticipants,
                }
            })
        )

        return NextResponse.json({ data: enriched })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        const { data: profile } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const body = await request.json()
        const { type, title, participant_ids, clinic_id } = body

        if (!type) {
            return NextResponse.json({ error: 'Tipo da conversa é obrigatório' }, { status: 400 })
        }

        let conversationClinicId = clinic_id || profile.clinic_id

        if (type === 'support' && profile.role !== 'SUPER_ADMIN') {
            conversationClinicId = profile.clinic_id
        }

        // Create conversation
        const { data: conversation, error: convError } = await adminDb
            .from('chat_conversations')
            .insert({
                clinic_id: conversationClinicId,
                type,
                title: title || null,
                created_by: user.id,
            })
            .select()
            .single()

        if (convError) {
            console.error('[Chat] Error creating conversation:', convError)
            return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 })
        }

        // Add creator as participant
        const participantsToAdd: Array<{ conversation_id: string; user_id: string; role: 'admin' | 'member' }> = [
            { conversation_id: conversation.id, user_id: user.id, role: 'admin' },
        ]

        // Add other participants
        if (participant_ids && Array.isArray(participant_ids)) {
            for (const pid of participant_ids) {
                if (pid !== user.id) {
                    participantsToAdd.push({
                        conversation_id: conversation.id,
                        user_id: pid,
                        role: 'member',
                    })
                }
            }
        }

        // For support: auto-add super admins
        if (type === 'support') {
            const { data: superAdmins } = await adminDb
                .from('users')
                .select('id')
                .eq('role', 'SUPER_ADMIN')

            if (superAdmins) {
                for (const sa of superAdmins) {
                    if (!participantsToAdd.find(p => p.user_id === sa.id)) {
                        participantsToAdd.push({
                            conversation_id: conversation.id,
                            user_id: sa.id,
                            role: 'admin',
                        })
                    }
                }
            }
        }

        const { error: partError } = await adminDb
            .from('chat_participants')
            .insert(participantsToAdd)

        if (partError) {
            console.error('[Chat] Error adding participants:', partError)
        }

        return NextResponse.json({ data: conversation }, { status: 201 })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
