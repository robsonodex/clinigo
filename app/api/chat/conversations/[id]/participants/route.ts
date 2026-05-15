import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: conversationId } = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const { participant_ids } = body

        if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
            return NextResponse.json({ error: 'Lista de participantes é obrigatória' }, { status: 400 })
        }

        const adminDb = createServiceRoleClient()

        // Verify if user is part of the conversation
        const { data: participation } = await adminDb
            .from('chat_participants')
            .select('role')
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)
            .single()

        if (!participation) {
            return NextResponse.json({ error: 'Não autorizado a modificar esta conversa' }, { status: 403 })
        }

        // Add new participants
        const participantsToAdd = participant_ids
            .filter(pid => pid !== user.id) // Avoid adding self again
            .map(pid => ({
                conversation_id: conversationId,
                user_id: pid,
                role: 'member'
            }))

        if (participantsToAdd.length === 0) {
            return NextResponse.json({ success: true }, { status: 200 })
        }

        // Insert new participants, ignoring duplicates
        const { error: partError } = await adminDb
            .from('chat_participants')
            .upsert(participantsToAdd, { onConflict: 'conversation_id,user_id', ignoreDuplicates: true })

        if (partError) {
            console.error('[Chat] Error adding participants:', partError)
            return NextResponse.json({ error: 'Erro ao adicionar participantes' }, { status: 500 })
        }

        return NextResponse.json({ success: true }, { status: 201 })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
