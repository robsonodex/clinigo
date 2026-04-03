import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const conversationId = formData.get('conversation_id') as string

        if (!file) {
            return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
        }

        if (!conversationId) {
            return NextResponse.json({ error: 'conversation_id é obrigatório' }, { status: 400 })
        }

        // Verify user is participant
        const { data: participant } = await supabase
            .from('chat_participants')
            .select('id')
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id)
            .single()

        if (!participant) {
            return NextResponse.json({ error: 'Não é participante desta conversa' }, { status: 403 })
        }

        // Get user clinic_id
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = profile?.clinic_id || 'system'
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath = `${clinicId}/${conversationId}/${timestamp}_${safeName}`

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer()
        const buffer = new Uint8Array(arrayBuffer)

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat-attachments')
            .upload(filePath, buffer, {
                contentType: file.type,
                upsert: false,
            })

        if (uploadError) {
            console.error('[Chat] Upload error:', uploadError)
            return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(uploadData.path)

        // Determine message type
        let messageType = 'document'
        if (file.type.startsWith('image/')) messageType = 'image'
        else if (file.type.startsWith('audio/')) messageType = 'audio'

        return NextResponse.json({
            data: {
                url: publicUrl,
                name: file.name,
                size: file.size,
                type: messageType,
                path: uploadData.path,
            },
        })
    } catch (error) {
        console.error('[Chat] Unexpected error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
