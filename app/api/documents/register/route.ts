import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { requireRole, forbiddenResponse, unauthorizedResponse } from '@/lib/middlewares/auth'
import { log } from '@/lib/logger'
import { withRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/documents/register
 * Registers a document in the database AFTER it has been uploaded
 * directly to Supabase Storage via presigned URL.
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

        const rateLimitResponse = await withRateLimit('api', user.id)
        if (rateLimitResponse) return rateLimitResponse

        const body = await request.json()
        const { patient_id, file_name, file_url, file_size, file_type, category, description } = body

        if (!patient_id || !file_name || !file_url) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: patient_id, file_name e file_url' },
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

        const { data: document, error } = await supabase
            .from('patient_documents')
            .insert({
                patient_id,
                file_name,
                file_url,
                file_size: file_size || 0,
                file_type: file_type || 'application/octet-stream',
                category: category || 'OTHER',
                description: description || '',
                tags: [],
                uploaded_by: user.id,
            } as any)
            .select()
            .single()

        if (error) {
            log.error('Error registering document', { error, userId: user.id })
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        log.audit(user.id, 'register_document', {
            patient_id,
            file_name,
            category: category || 'OTHER',
        })

        return NextResponse.json({ success: true, document })
    } catch (error) {
        console.error('[DOCUMENTS] Error registering document:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
