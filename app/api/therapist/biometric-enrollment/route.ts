// app/api/therapist/biometric-enrollment/route.ts
// Cadastro do Vetor Biométrico Facial da Própria Terapeuta (Fluxo B - Antifraude)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { encryptFaceDescriptor } from '@/lib/utils/face-encryption'

export const dynamic = 'force-dynamic'

/**
 * POST /api/therapist/biometric-enrollment
 * Body: { descriptor: number[], thumbnailBase64?: string, target_user_id?: string }
 * Cadastra a face da terapeuta autenticada (ou por admin da mesma clínica)
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient()

        // Buscar dados do usuário logado
        const { data: currentUser, error: userError } = await (adminDb as any)
            .from('users')
            .select('id, clinic_id, role, full_name')
            .eq('id', user.id)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Usuário ou clínica não encontrados' }, { status: 403 })
        }

        const body = await request.json()
        const { descriptor, thumbnailBase64, target_user_id } = body

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json({
                success: false,
                error: 'Descritor facial inválido. Deve conter 128 dimensões numéricas.'
            }, { status: 400 })
        }

        // Definir usuário alvo (terapeuta)
        let therapistUserId = user.id
        let therapistName = currentUser.full_name || 'Terapeuta'

        if (target_user_id && target_user_id !== user.id) {
            const isAdmin = currentUser.role === 'CLINIC_ADMIN' || currentUser.role === 'SUPER_ADMIN'
            if (!isAdmin) {
                return NextResponse.json({
                    success: false,
                    error: 'Apenas administradores podem cadastrar biometria para outros profissionais.'
                }, { status: 403 })
            }

            const { data: targetUser } = await (adminDb as any)
                .from('users')
                .select('id, clinic_id, full_name')
                .eq('id', target_user_id)
                .eq('clinic_id', currentUser.clinic_id)
                .single()

            if (!targetUser) {
                return NextResponse.json({ success: false, error: 'Profissional alvo não encontrado nesta clínica' }, { status: 404 })
            }

            therapistUserId = targetUser.id
            therapistName = targetUser.full_name || 'Terapeuta'
        }

        // Criptografar o vetor Float32Array via AES-256-GCM (padrão idêntico aos pacientes)
        const liveDescriptor = new Float32Array(descriptor)
        const encryptedDescriptor = encryptFaceDescriptor(liveDescriptor)

        // Upload opcional de foto de referência para o bucket seguro
        let imageUrl: string | null = null
        if (thumbnailBase64 && typeof thumbnailBase64 === 'string') {
            try {
                const fileName = `therapists/${currentUser.clinic_id}/${therapistUserId}-${Date.now()}.jpg`
                const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '')
                const buffer = Buffer.from(base64Data, 'base64')

                const { error: uploadError } = await (adminDb as any)
                    .storage
                    .from('biometric-photos')
                    .upload(fileName, buffer, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    })

                if (!uploadError) {
                    const { data: urlData } = (adminDb as any)
                        .storage
                        .from('biometric-photos')
                        .getPublicUrl(fileName)
                    imageUrl = urlData.publicUrl
                }
            } catch (storageErr) {
                console.warn('[Therapist Biometric Enrollment] Erro no upload da foto:', storageErr)
            }
        }

        // Desativar ou substituir biometrias antigas desta terapeuta
        await (adminDb as any)
            .from('patient_face_biometrics')
            .delete()
            .eq('therapist_user_id', therapistUserId)
            .eq('person_type', 'therapist')

        // Inserir registro com person_type = 'therapist'
        const { data: insertedRecord, error: insertError } = await (adminDb as any)
            .from('patient_face_biometrics')
            .insert({
                clinic_id: currentUser.clinic_id,
                therapist_user_id: therapistUserId,
                person_type: 'therapist',
                person_name: therapistName,
                face_descriptor_encrypted: encryptedDescriptor,
                reference_image_url: imageUrl,
                detection_score: 0.98,
                angles_captured: ['frontal'],
                consent_given: true,
                consent_date: new Date().toISOString(),
            })
            .select('id, person_name, created_at')
            .single()

        if (insertError) {
            console.error('[Therapist Biometric Enrollment] Erro ao salvar biometria:', insertError)
            return NextResponse.json({ success: false, error: 'Erro ao persistir vetor biométrico' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Biometria facial da terapeuta cadastrada com sucesso.',
            data: insertedRecord,
        })
    } catch (error: any) {
        console.error('[Therapist Biometric Enrollment] Erro interno:', error)
        return NextResponse.json({ success: false, error: 'Erro interno ao cadastrar biometria' }, { status: 500 })
    }
}
