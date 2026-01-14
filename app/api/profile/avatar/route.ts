import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
        }

        // Validações
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }, { status: 400 })
        }

        // Gerar nome único para o arquivo
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        // Upload para Supabase Storage
        const fileBuffer = await file.arrayBuffer()
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('user-uploads')
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                upsert: true,
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
        }

        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage
            .from('user-uploads')
            .getPublicUrl(filePath)

        // Atualizar avatar_url no banco
        const { error: updateError } = await supabase
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao atualizar avatar' }, { status: 500 })
        }

        return NextResponse.json({ avatar_url: publicUrl })
    } catch (error) {
        console.error('Error uploading avatar:', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
}
