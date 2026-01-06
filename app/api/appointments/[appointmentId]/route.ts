/**
 * GET /api/appointments/[appointmentId] - Get appointment details
 * PATCH /api/appointments/[appointmentId] - Update appointment
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

interface RouteParams {
    params: Promise<{ appointmentId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()

        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          id, crm, crm_state, specialty, consultation_price, bio,
          user:users(full_name, email, avatar_url)
        ),
        patient:patients(id, full_name, email, phone, cpf, date_of_birth),
        payment:payments(id, status, amount, payment_method, paid_at),
        consultation:consultations(id, started_at, ended_at, notes),
        clinic:clinics(id, name, slug, email, phone)
      `)
            .eq('id', appointmentId)
            .single()

        if (error || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== appointment.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }

            // Doctors can only see their own appointments
            if (userRole === 'DOCTOR') {
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (doctor?.id !== appointment.doctor_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        return successResponse(appointment)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateAppointmentSchema.parse(body)

        const supabase = await createClient()

        // Get appointment
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('clinic_id, doctor_id, status')
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== appointment.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }

            // Doctors can only update their own appointments
            if (userRole === 'DOCTOR') {
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (doctor?.id !== appointment.doctor_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        // Update appointment
        const { data: updatedAppointment, error: updateError } = await supabase
            .from('appointments')
            .update(validatedData)
            .eq('id', appointmentId)
            .select(`
        *,
        doctor:doctors(user:users(full_name)),
        patient:patients(full_name, email)
      `)
            .single()

        if (updateError) throw updateError

        return successResponse(updatedAppointment)
    } catch (error) {
        return handleApiError(error)
    }
}
