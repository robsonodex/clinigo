/**
 * POST /api/payments/create-preference
 * Create a Mercado Pago payment preference for an appointment
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, BadRequestError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { createPaymentPreference } from '@/lib/services/mercadopago'
import { z } from 'zod'

const createPreferenceSchema = z.object({
    appointment_id: z.string().uuid('ID do agendamento inválido'),
})

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const { appointment_id } = createPreferenceSchema.parse(body)

        const supabase = await createClient()

        // Get appointment with related data
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          consultation_price,
          user:users(full_name)
        ),
        patient:patients(full_name, email),
        payment:payments(id, status, mercadopago_preference_id),
        clinic:clinics(id, name, mercadopago_access_token)
      `)
            .eq('id', appointment_id)
            .single()

        if (appointmentError || !appointment) {
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
        }

        // Check if payment already exists and is not pending
        const payment = appointment.payment as {
            id: string
            status: string
            mercadopago_preference_id: string | null
        } | null

        if (payment?.status !== 'PENDING') {
            throw new BadRequestError('Este agendamento já foi pago ou cancelado')
        }

        // If preference already exists, return it
        if (payment?.mercadopago_preference_id) {
            return successResponse({
                preference_id: payment.mercadopago_preference_id,
                message: 'Preferência de pagamento já existente',
            })
        }

        // Create new preference
        const doctor = appointment.doctor as { consultation_price: number; user: { full_name: string } }
        const patient = appointment.patient as { full_name: string; email: string }
        const clinic = appointment.clinic as { name: string; mercadopago_access_token: string | null }

        const preference = await createPaymentPreference({
            appointment_id,
            amount: doctor.consultation_price,
            patient_email: patient.email,
            patient_name: patient.full_name,
            description: `Teleconsulta com ${doctor.user.full_name}`,
            clinic_name: clinic.name,
            clinic_access_token: clinic.mercadopago_access_token || undefined,
        })

        // Update payment record
        await supabase
            .from('payments')
            .update({
                mercadopago_preference_id: preference.preference_id,
            })
            .eq('id', payment?.id)

        return successResponse({
            preference_id: preference.preference_id,
            init_point: preference.init_point,
            sandbox_init_point: preference.sandbox_init_point,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
