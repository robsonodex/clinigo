/**
 * POST /api/video/generate-link
 * Generate Google Meet link for an appointment
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { generateMeetLink } from '@/lib/services/google-meet'
import { z } from 'zod'

const generateLinkSchema = z.object({
    appointment_id: z.string().uuid('ID do agendamento inválido'),
})

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        // Only DOCTOR, CLINIC_ADMIN, or SUPER_ADMIN can generate links
        if (!['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Acesso negado')
        }

        const body = await request.json()
        const { appointment_id } = generateLinkSchema.parse(body)

        const supabase = await createClient()

        // Get appointment with related data
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          id, user_id,
          user:users(full_name)
        ),
        patient:patients(full_name),
        payment:payments(status),
        clinic:clinics(name)
      `)
            .eq('id', appointment_id)
            .single()

        if (appointmentError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Check authorization
        const doctor = appointment.doctor as { id: string; user_id: string; user: { full_name: string } }

        if (userRole === 'DOCTOR') {
            if (doctor.user_id !== userId) {
                throw new ForbiddenError('Você só pode gerar links para seus próprios agendamentos')
            }
        } else if (userRole === 'CLINIC_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== appointment.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        // Check payment status
        const payment = appointment.payment as { status: string } | null
        if (payment?.status !== 'PAID') {
            throw new BadRequestError('Pagamento não confirmado')
        }

        // Check if link already exists
        if (appointment.video_link) {
            return successResponse({
                video_link: appointment.video_link,
                meeting_id: appointment.video_room_id,
                message: 'Link já existente',
            })
        }

        // Generate Meet link
        const patient = appointment.patient as { full_name: string }
        const clinic = appointment.clinic as { name: string }

        const meetResult = await generateMeetLink({
            appointment_id,
            doctor_name: doctor.user.full_name,
            patient_name: patient.full_name,
            clinic_name: clinic.name,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            duration_minutes: 30, // Default duration
        })

        // Update appointment with video link
        await supabase
            .from('appointments')
            .update({
                video_link: meetResult.video_link,
                video_room_id: meetResult.meeting_id,
            })
            .eq('id', appointment_id)

        return successResponse({
            video_link: meetResult.video_link,
            meeting_id: meetResult.meeting_id,
            calendar_event_id: meetResult.calendar_event_id,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
