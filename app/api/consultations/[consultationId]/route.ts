/**
 * GET /api/consultations/[consultationId] - Get consultation details
 * PATCH /api/consultations/[consultationId] - Update consultation
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

interface RouteParams {
    params: Promise<{ consultationId: string }>
}

const updateConsultationSchema = z.object({
    notes: z.string().max(10000).optional(),
    prescriptions: z.string().max(5000).optional(),
    diagnosis: z.string().max(2000).optional(),
    follow_up: z.string().max(1000).optional(),
    files: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.string(),
        size: z.number().optional(),
    })).optional(),
    ended_at: z.string().datetime().optional(),
    duration_minutes: z.number().int().positive().optional(),
})

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { consultationId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()

        const { data: consultation, error } = await supabase
            .from('consultations')
            .select(`
        *,
        doctor:doctors(
          id, crm, crm_state, specialty,
          user:users(full_name, email, avatar_url)
        ),
        patient:patients(id, full_name, email, phone, cpf, date_of_birth),
        appointment:appointments(appointment_date, appointment_time, video_link),
        clinic:clinics(id, name)
      `)
            .eq('id', consultationId)
            .single()

        if (error || !consultation) {
            throw new NotFoundError('Consulta')
        }

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== consultation.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }

            // Doctors can only see their own consultations
            if (userRole === 'DOCTOR') {
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (doctor?.id !== consultation.doctor_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        return successResponse(consultation)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { consultationId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateConsultationSchema.parse(body)

        const supabase = await createClient()

        // Get consultation
        const { data: consultation, error: fetchError } = await supabase
            .from('consultations')
            .select('doctor_id, clinic_id')
            .eq('id', consultationId)
            .single()

        if (fetchError || !consultation) {
            throw new NotFoundError('Consulta')
        }

        // Check authorization
        if (userRole === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (doctor?.id !== consultation.doctor_id) {
                throw new ForbiddenError('Você só pode editar suas próprias consultas')
            }
        } else if (userRole === 'CLINIC_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== consultation.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        } else if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Acesso negado')
        }

        // Update consultation
        const { data: updatedConsultation, error: updateError } = await supabase
            .from('consultations')
            .update(validatedData)
            .eq('id', consultationId)
            .select(`
        *,
        doctor:doctors(user:users(full_name)),
        patient:patients(full_name)
      `)
            .single()

        if (updateError) throw updateError

        return successResponse(updatedConsultation)
    } catch (error) {
        return handleApiError(error)
    }
}
