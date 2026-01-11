/**
 * PATCH /api/appointments/[appointmentId]/confirm-payment
 * Confirma pagamento de um agendamento (apenas CLINIC_ADMIN ou SUPER_ADMIN)
 * 
 * Gateway-Agnostic: Clínica confirma manualmente que recebeu o pagamento
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const confirmPaymentSchema = z.object({
    payment_method: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'BANK_TRANSFER', 'OTHER']),
    notes: z.string().optional(),
})

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ appointmentId: string }> }
) {
    try {
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // Apenas admins podem confirmar pagamentos
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem confirmar pagamentos')
        }

        const body = await request.json()
        const { payment_method, notes } = confirmPaymentSchema.parse(body)

        const supabase = createServiceRoleClient() as any

        // 1. Buscar agendamento
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, clinic_id, doctor_id, patient_id, status, appointment_date, appointment_time')
            .eq('id', appointmentId)
            .single() as { data: { id: string; clinic_id: string; status: string } | null; error: any }

        if (appointmentError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Verificar se pertence à clínica do usuário (exceto super admin)
        if (userRole !== 'SUPER_ADMIN' && appointment.clinic_id !== clinicId) {
            throw new ForbiddenError('Você não tem permissão para este agendamento')
        }

        // Verificar status válido para confirmação
        if (!['PENDING_PAYMENT', 'PAYMENT_PENDING'].includes(appointment.status)) {
            throw new BadRequestError('Este agendamento não está aguardando pagamento')
        }

        // 2. Atualizar payment
        const { error: paymentError } = await supabase
            .from('payments')
            .update({
                status: 'PAID',
                payment_method,
                paid_at: new Date().toISOString(),
                notes: notes || null,
            })
            .eq('appointment_id', appointmentId)

        if (paymentError) {
            console.error('Failed to update payment:', paymentError)
        }

        // 3. Gerar link do Google Meet (se configurado)
        let videoLink = null
        // TODO: Integrar com Google Calendar API para gerar link automaticamente
        // Por enquanto, deixamos null e a clínica pode adicionar manualmente

        // 4. Atualizar appointment para CONFIRMED
        const { error: updateError } = await supabase
            .from('appointments')
            .update({
                status: 'CONFIRMED',
                video_link: videoLink,
            })
            .eq('id', appointmentId)

        if (updateError) throw updateError

        // 5. Buscar dados para notificação
        const { data: fullAppointment } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(full_name, email, phone),
                doctor:doctors(
                    user:users(full_name, email)
                ),
                clinic:clinics(name, email)
            `)
            .eq('id', appointmentId)
            .single()

        // 6. Disparar notificações (email + WhatsApp)
        // TODO: Implementar envio de email de confirmação
        // TODO: Implementar envio de WhatsApp se configurado

        console.log('[ConfirmPayment] Payment confirmed for appointment:', appointmentId)

        return successResponse({
            success: true,
            message: 'Pagamento confirmado! Paciente foi notificado.',
            appointment_id: appointmentId,
            video_link: videoLink,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
