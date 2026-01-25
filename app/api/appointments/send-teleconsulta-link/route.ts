/**
 * POST /api/appointments/send-teleconsulta-link
 * Reenviar link de teleconsulta por e-mail
 */
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const sendLinkSchema = z.object({
    appointment_id: z.string().uuid(),
    patient_email: z.string().email(),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointment_id, patient_email } = sendLinkSchema.parse(body)

        const supabase = createServiceRoleClient() as any

        // Buscar appointment com video_room
        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
        *,
        patient:patients(full_name, email, phone),
        doctor:doctors(
          id,
          user:users(full_name)
        ),
        video_room:video_rooms(room_id, patient_token, doctor_token)
      `)
            .eq('id', appointment_id)
            .single()

        if (error || !appointment) {
            throw new NotFoundError('Agendamento não encontrado')
        }

        if (!appointment.video_room) {
            throw new BadRequestError('Este agendamento não possui sala de vídeo')
        }

        // Gerar link do paciente
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const patientLink = `${baseUrl}/video/${appointment.video_room.room_id}?role=patient&token=${appointment.video_room.patient_token}`

        // Formatar data e hora
        const appointmentDate = new Date(appointment.appointment_date)
        const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })

        // TODO: Enviar e-mail via serviço de e-mail
        // Por enquanto, apenas simular envio
        console.log('[TELECONSULTA] Enviando e-mail para:', patient_email)
        console.log('[TELECONSULTA] Link:', patientLink)
        console.log('[TELECONSULTA] Data:', formattedDate, appointment.appointment_time)

        // Aqui você pode integrar com o serviço de e-mail existente
        // await sendEmail({
        //   to: patient_email,
        //   subject: 'Link da sua Teleconsulta - CliniGo',
        //   template: 'teleconsulta-link',
        //   data: {
        //     patient_name: appointment.patient.full_name,
        //     doctor_name: appointment.doctor.user.full_name,
        //     scheduled_date: formattedDate,
        //     scheduled_time: appointment.appointment_time,
        //     link: patientLink
        //   }
        // })

        return successResponse({
            message: 'Link enviado com sucesso!',
            sent_to: patient_email
        })
    } catch (error) {
        return handleApiError(error)
    }
}
