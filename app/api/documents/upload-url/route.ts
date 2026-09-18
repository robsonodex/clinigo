import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'
import { withRateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/documents/upload-url
 * Generates a presigned URL for direct client-side upload to Supabase Storage.
 * This bypasses the 4.5MB Vercel serverless function body limit,
 * allowing uploads of larger files (multi-page PDFs, etc.).
 */
export async function POST(request: Request) {
    try {
        const authResult = await requireRole(['DOCTOR', 'RECEPTIONIST', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

        if (!authResult.authorized) {
            if (authResult.error?.includes('No valid session')) {
                return unauthorizedResponse(authResult.error)
            }
            return forbiddenResponse(authResult.error)
        }

        const { user } = authResult

        // SIGILO: DOCTOR only if coordinator
        if (user.role === 'DOCTOR') {
            const supabaseCheck = await createClient()
            const { data: userCheck } = await supabaseCheck
                .from('users')
                .select('is_coordinator')
                .eq('id', user.id)
                .single()

            if (!userCheck?.is_coordinator) {
                return forbiddenResponse('Apenas coordenadores, recepção e administradores podem subir documentos')
            }
        }

        // Rate limiting
        const rateLimitResponse = await withRateLimit('api', user.id)
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { patient_id, file_name, file_size, file_type, document_type, notes } = body

        if (!patient_id || !file_name) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: patient_id e file_name' },
                { status: 400 }
            )
        }

        // Validate file size (max 50MB)
        if (file_size && file_size > 50 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Arquivo muito grande. Tamanho máximo: 50MB' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Validate patient belongs to the user's clinic
        const { data: userFull } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (userFull?.clinic_id) {
            const { data: patientData } = await supabase
                .from('patients')
                .select('clinic_id')
                .eq('id', patient_id)
                .single()

            if (patientData?.clinic_id !== userFull.clinic_id) {
                return NextResponse.json(
                    { error: 'Acesso negado - paciente não pertence à sua clínica' },
                    { status: 403 }
                )
            }
        }

        // Build storage path
        const effectiveClinicId = userFull?.clinic_id || 'general'
        const sanitizedFilename = file_name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const uniqueId = crypto.randomUUID().substring(0, 8)
        const storagePath = `${effectiveClinicId}/${patient_id}/${uniqueId}-${sanitizedFilename}`

        // Generate presigned upload URL using service role (bypasses RLS)
        const adminDb = createServiceRoleClient() as any

        const { data: signedUrlData, error: signedUrlError } = await adminDb.storage
            .from('patient-documents')
            .createSignedUploadUrl(storagePath, {
                upsert: true,
            })

        if (signedUrlError || !signedUrlData) {
            console.error('[DOCUMENTS] Error generating presigned URL:', signedUrlError)
            return NextResponse.json(
                { error: 'Erro ao gerar URL de upload' },
                { status: 500 }
            )
        }

        log.audit(user.id, 'generate_upload_url', {
            patient_id,
            file_name,
            storage_path: storagePath,
        })

        return NextResponse.json({
            success: true,
            data: {
                upload_url: signedUrlData.signedUrl,
                token: signedUrlData.token,
                storage_path: storagePath,
                expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                // Return metadata for the client to use after upload
                metadata: {
                    patient_id,
                    file_name,
                    file_type: file_type || 'application/octet-stream',
                    file_size: file_size || 0,
                    category: document_type || 'OTHER',
                    description: notes || '',
                    uploaded_by: user.id,
                }
            }
        })
    } catch (error) {
        console.error('[DOCUMENTS] Error generating upload URL:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
