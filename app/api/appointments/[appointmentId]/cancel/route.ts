/**
 * POST /api/appointments/[appointmentId]/cancel
 * Cancel an appointment with optional refund
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { cancelAppointmentSchema } from '@/lib/validations/appointment'
import { createRefund } from '@/lib/services/mercadopago'
import { sendCancellationNoticeEmail, isEmailConfigured } from '@/lib/services/email'
// WhatsApp API removida - usar compartilhamento manual via WhatsAppShareButton
import { formatDateBR } from '@/lib/utils/date'

// Force Node.js runtime for nodemailer and mercadopago support
export const runtime = 'nodejs'

interface RouteParams {
    params: Promise<{ appointmentId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const { cancellation_reason } = cancelAppointmentSchema.parse(body)

        const supabase = await createClient() as any
        const adminClient = createServiceRoleClient() as any

        // Get appointment with related data
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          id, clinic_id,
          user:users(id, full_name)
        ),
        patient:patients(id, full_name, email, phone),
        payment:payments(id, status, mercadopago_payment_id, amount),
        clinic:clinics(id, name, mercadopago_access_token)
      `)
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Check if already cancelled or completed
        if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
            throw new BadRequestError(`Agendamento já está ${appointment.status.toLowerCase()}`)
        }

        // Check authorization
        if (userRole && userRole !== 'SUPER_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== appointment.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }

            // Doctors can only cancel their own appointments
            if (userRole === 'DOCTOR') {
                const doctor = appointment.doctor as { user: { id: string } }
                if (doctor?.user?.id !== userId) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        // Check cancellation policy using database function
        const { data: cancellationCheck, error: checkError } = await supabase
            .rpc('can_cancel_appointment', {
                p_appointment_id: appointmentId,
            })

        if (checkError) throw checkError

        const canCancel = cancellationCheck?.[0]

        if (!canCancel?.can_cancel) {
            throw new BadRequestError(canCancel?.reason || 'Não é possível cancelar este agendamento')
        }

        let refundStatus: 'refunded' | 'not_eligible' | 'pending' = 'not_eligible'
        const payment = appointment.payment as {
            id: string
            status: string
            mercadopago_payment_id: string | null
            amount: number
        } | null

        // Process refund if eligible and payment was made
        if (
            canCancel.eligible_for_refund &&
            payment?.status === 'PAID' &&
            payment?.mercadopago_payment_id
        ) {
            const clinic = appointment.clinic as { mercadopago_access_token: string | null }

            try {
                await createRefund(
                    payment.mercadopago_payment_id,
                    undefined, // Full refund
                    clinic?.mercadopago_access_token || undefined
                )

                // Update payment status
                await adminClient
                    .from('payments')
                    .update({
                        status: 'REFUNDED',
                        refund_reason: cancellation_reason,
                        refund_amount: payment.amount,
                    })
                    .eq('id', payment.id)

                refundStatus = 'refunded'
            } catch (refundError) {
                console.error('Refund failed:', refundError)
                refundStatus = 'pending' // Mark for manual processing
            }
        }

        // Update appointment status
        const cancellationNote = !canCancel.eligible_for_refund
            ? `${cancellation_reason} [Cancelamento com menos de 24h - sem reembolso]`
            : cancellation_reason

        const { error: updateError } = await adminClient
            .from('appointments')
            .update({
                status: 'CANCELLED',
                cancellation_reason: cancellationNote,
                cancelled_by: userId || null,
            })
            .eq('id', appointmentId)

        if (updateError) throw updateError

        // Send notifications
        const patient = appointment.patient as { full_name: string; email: string; phone: string }
        const doctor = appointment.doctor as { user: { full_name: string } }
        const clinic = appointment.clinic as { name: string }
        const appointmentDate = new Date(appointment.appointment_date)

        // Create notification records
        await adminClient.from('notifications').insert([
            {
                clinic_id: appointment.clinic_id,
                appointment_id: appointmentId,
                patient_id: (appointment.patient as { id: string }).id,
                type: 'EMAIL',
                template: 'APPOINTMENT_CANCELLED',
                recipient_email: patient.email,
                subject: 'Consulta Cancelada',
                status: 'PENDING',
            },
            {
                clinic_id: appointment.clinic_id,
                appointment_id: appointmentId,
                patient_id: (appointment.patient as { id: string }).id,
                type: 'WHATSAPP',
                template: 'APPOINTMENT_CANCELLED',
                recipient_phone: patient.phone,
                status: 'MANUAL_PENDING', // WhatsApp agora requer compartilhamento manual
            },
        ])

        // Send email notification
        if (isEmailConfigured()) {
            try {
                await sendCancellationNoticeEmail({
                    patient_email: patient.email,
                    patient_name: patient.full_name,
                    doctor_name: doctor?.user?.full_name || 'Médico',
                    clinic_name: clinic?.name || 'Clínica',
                    appointment_date: formatDateBR(appointmentDate),
                    appointment_time: (appointment as any).appointment_time?.substring(0, 5) || '',
                    reason: cancellation_reason,
                    refund_status: refundStatus,
                })
            } catch (emailError) {
                console.error('Failed to send cancellation email:', emailError)
            }
        }

        // WhatsApp notification - API removida, compartilhamento manual requerido
        console.log(`[WhatsApp] Compartilhamento manual requerido para cancelamento de appointment ${appointmentId}`)

        return successResponse({
            appointment_id: appointmentId,
            status: 'CANCELLED',
            refund_status: refundStatus,
            message: refundStatus === 'refunded'
                ? 'Agendamento cancelado. O reembolso será processado em até 10 dias úteis.'
                : refundStatus === 'not_eligible'
                    ? 'Agendamento cancelado. Cancelamentos com menos de 24h não têm direito a reembolso.'
                    : 'Agendamento cancelado. O reembolso está sendo processado.',
        })
    } catch (error) {
        return handleApiError(error)
    }
}
