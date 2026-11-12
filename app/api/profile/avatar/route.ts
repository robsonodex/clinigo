import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'user-uploads'

export const POST = withAxiom(async (request: AxiomRequest) => {
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

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' }, { status: 400 })
        }

        // Gerar nome único para o arquivo
        const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const fileExt = ['jpeg', 'jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg'
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const filePath = `avatars/${fileName}`

        // Usar service role no storage e update após autenticar user.id para evitar bloqueio RLS em storage.objects
        const adminClient = createServiceRoleClient()
        const fileBuffer = await file.arrayBuffer()
        const uploadOptions = {
            contentType: file.type === 'image/jpg' ? 'image/jpeg' : file.type,
            upsert: true,
        }

        let { error: uploadError } = await adminClient.storage
            .from(BUCKET_NAME)
            .upload(filePath, fileBuffer, uploadOptions)

        // Fallback resiliente: se o bucket não existir em algum ambiente, cria e tenta novamente
        if (uploadError && (uploadError.message?.includes('Bucket not found') || (uploadError as any).statusCode === '404')) {
            await adminClient.storage.createBucket(BUCKET_NAME, {
                public: true,
                fileSizeLimit: maxSize,
                allowedMimeTypes: allowedTypes,
            })
            const retry = await adminClient.storage
                .from(BUCKET_NAME)
                .upload(filePath, fileBuffer, uploadOptions)
            uploadError = retry.error
        }

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
        }

        // Obter URL pública
        const { data: { publicUrl } } = adminClient.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath)

        // Atualizar avatar_url no banco exclusivamente para o usuário autenticado
        const { error: updateError } = await adminClient
            .from('users')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao atualizar avatar' }, { status: 500 })
        }

        return NextResponse.json({ avatar_url: publicUrl })
    } catch (error) {
        request.log.error('profile/avatar', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error uploading avatar:', error)
        return NextResponse.json({ error: 'Erro ao processar upload' }, { status: 500 })
    }
})
