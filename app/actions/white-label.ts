'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

interface UploadResult {
    success: boolean
    url?: string
    error?: string
}

const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'])

export async function uploadClinicLogo(formData: FormData): Promise<UploadResult> {
    const file = formData.get('file') as File
    const clinicId = formData.get('clinicId') as string

    if (!file || !clinicId) {
        return { success: false, error: 'Arquivo ou ID da clínica faltando.' }
    }

    // Validation
    if (file.size > 2 * 1024 * 1024) { // 2MB
        return { success: false, error: 'O tamanho da imagem não pode exceder 2MB.' }
    }

    if (!file.type.startsWith('image/')) {
        return { success: false, error: 'Apenas arquivos de imagem são permitidos.' }
    }

    const supabase = await createClient()

    // Verify auth and clinic ownership / admin role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Não autorizado.' }
    }

    const serviceClient = createServiceRoleClient()
    const { data: userProfile } = await (serviceClient
        .from('users') as any)
        .select('role, clinic_id')
        .eq('id', user.id)
        .single()

    const userRole = userProfile?.role as string | undefined
    const userClinicId = userProfile?.clinic_id as string | undefined
    const isSuperAdmin = userRole === 'SUPER_ADMIN'
    const isOwnClinicAdmin = userRole === 'CLINIC_ADMIN' && userClinicId === clinicId

    if (!isSuperAdmin && !isOwnClinicAdmin) {
        return { success: false, error: 'Apenas administradores da clínica podem alterar o logotipo.' }
    }

    // Filename: clinic_id/uuid.ext (sanitized extension)
    const rawExt = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const fileExt = ALLOWED_IMAGE_EXTENSIONS.has(rawExt) ? rawExt : 'png'
    const fileName = `${clinicId}/${randomUUID()}.${fileExt}`

    const { error: uploadError } = await serviceClient
        .storage
        .from('clinic-assets')
        .upload(fileName, file, {
            upsert: true,
            contentType: file.type,
        })

    if (uploadError) {
        console.error('Upload Error:', uploadError)
        return { success: false, error: 'Falha no upload da imagem.' }
    }

    // Get Public URL
    const { data: { publicUrl } } = serviceClient
        .storage
        .from('clinic-assets')
        .getPublicUrl(fileName)

    // Update Clinic Record
    const { error: updateError } = await (serviceClient
        .from('clinics') as any)
        .update({ logo_url: publicUrl })
        .eq('id', clinicId)

    if (updateError) {
        console.error('Database Update Error:', updateError)
        return { success: false, error: 'Falha ao atualizar o registro da clínica.' }
    }

    revalidatePath('/dashboard/configuracoes')
    revalidatePath(`/clinica/${clinicId}`)

    return { success: true, url: publicUrl }
}

export async function updateClinicColor(clinicId: string, color: string) {
    const supabase = await createClient()

    const { error } = await (supabase
        .from('clinics') as any)
        .update({ primary_color: color })
        .eq('id', clinicId)

    if (error) {
        throw new Error('Failed to update color')
    }

    revalidatePath('/dashboard/configuracoes')
}
