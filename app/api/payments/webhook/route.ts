/**
 * POST /api/payments/webhook
 * Mercado Pago webhook endpoint - receives payment notifications
 * CRITICAL: This endpoint must be idempotent and always return 200
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
    getPaymentStatus,
    validateWebhookSignature,
    mapPaymentStatus,
    mapPaymentMethod
} from '@/lib/services/mercadopago'
// Google Meet integration removed in favor of WebRTC
// import { generateMeetLink } from '@/lib/services/google-meet'
import { sendConfirmationEmail, isEmailConfigured } from '@/lib/services/email'
import { sendAppointmentConfirmation, isWhatsAppConfigured } from '@/lib/services/whatsapp'
import { formatDateBR } from '@/lib/utils/date'

// Force Node.js runtime for nodemailer and crypto support
export const runtime = 'nodejs'


export async function POST(request: NextRequest) {
    // CRITICAL: Always return 200 to Mercado Pago
    try {
        const body = await request.json()

        // Log incoming webhook for debugging
        console.log('Mercado Pago Webhook received:', JSON.stringify(body))

        // Validate webhook signature
        const xSignature = request.headers.get('x-signature') || ''
        const xRequestId = request.headers.get('x-request-id') || ''
        const dataId = body.data?.id?.toString() || ''

        if (xSignature && !validateWebhookSignature(xSignature, xRequestId, dataId)) {
            console.warn('Invalid webhook signature')
            // Still return 200 to prevent retries
            return NextResponse.json({ received: true }, { status: 200 })
        }

        // Only process payment notifications
        if (body.type !== 'payment' || !body.data?.id) {
            return NextResponse.json({ received: true, skipped: true }, { status: 200 })
        }

        const paymentId = body.data.id.toString()
        const supabase = createServiceRoleClient()

        // Check if we've already processed this payment (idempotency)
        const { data: existingPayment } = await supabase
            .from('payments')
            .select('id, status, appointment_id')
            .eq('mercadopago_payment_id', paymentId)
            .single()

        // If payment already exists and is not PENDING, skip processing
        if (existingPayment && existingPayment.status !== 'PENDING') {
            console.log(`Payment ${paymentId} already processed with status ${existingPayment.status}`)
            return NextResponse.json({ received: true, already_processed: true }, { status: 200 })
        }

        // Get payment status from Mercado Pago
        let mpPayment
        try {
            mpPayment = await getPaymentStatus(paymentId)
        } catch (mpError) {
            console.error('Failed to get payment status from Mercado Pago:', mpError)
            return NextResponse.json({ received: true, error: 'mp_fetch_failed' }, { status: 200 })
        }

        const newStatus = mapPaymentStatus(mpPayment.status)
        const paymentMethod = mapPaymentMethod(mpPayment.payment_type_id)

        // Find payment by external_reference (appointment_id) if not found by payment_id
        let payment = existingPayment
        if (!payment && mpPayment.external_reference) {
            const { data } = await supabase
                .from('payments')
                .select('id, status, appointment_id, clinic_id')
                .eq('appointment_id', mpPayment.external_reference)
                .single()
            payment = data
        }

        if (!payment) {
            console.warn(`Payment not found for MP payment ${paymentId} or reference ${mpPayment.external_reference}`)
            return NextResponse.json({ received: true, payment_not_found: true }, { status: 200 })
        }

        // Update payment record
        await supabase
            .from('payments')
            .update({
                mercadopago_payment_id: paymentId,
                status: newStatus,
                payment_method: paymentMethod,
                paid_at: newStatus === 'PAID' ? new Date().toISOString() : null,
            })
            .eq('id', payment.id)

        // If payment is confirmed, trigger post-payment actions
        if (newStatus === 'PAID') {
            await handlePaymentConfirmed(supabase, payment.appointment_id)
        }

        return NextResponse.json({ received: true, status: newStatus }, { status: 200 })
    } catch (error) {
        console.error('Webhook processing error:', error)
        // CRITICAL: Always return 200 even on error
        return NextResponse.json({ received: true, error: 'internal_error' }, { status: 200 })
    }
}

/**
 * Handle post-payment actions
 */
async function handlePaymentConfirmed(
    supabase: ReturnType<typeof createServiceRoleClient>,
    appointmentId: string
) {
    try {
        // Get appointment with all related data
        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          id, specialty,
          user:users(full_name)
        ),
        patient:patients(id, full_name, email, phone),
        clinic:clinics(id, name)
      `)
            .eq('id', appointmentId)
            .single()

        if (error || !appointment) {
            console.error('Failed to fetch appointment for post-payment:', error)
            return
        }

        // Skip if already confirmed (idempotency)
        if (appointment.status === 'CONFIRMED') {
            console.log(`Appointment ${appointmentId} already confirmed`)
            return
        }

        // Generate video link logic (WebRTC placeholder)
        let videoLink = appointment.video_link
        if (!videoLink) {
            videoLink = '' // Placeholder - will be dynamic
        }

        // Update appointment status to CONFIRMED
        await supabase
            .from('appointments')
            .update({ status: 'CONFIRMED' })
            .eq('id', appointmentId)

        // Create notification records
        const patient = appointment.patient as { id: string; full_name: string; email: string; phone: string }

        await supabase.from('notifications').insert([
            {
                clinic_id: appointment.clinic_id,
                appointment_id: appointmentId,
                patient_id: patient.id,
                type: 'EMAIL',
                template: 'APPOINTMENT_CONFIRMED',
                recipient_email: patient.email,
                subject: 'Consulta Confirmada',
                status: 'PENDING',
            },
            {
                clinic_id: appointment.clinic_id,
                appointment_id: appointmentId,
                patient_id: patient.id,
                type: 'WHATSAPP',
                template: 'APPOINTMENT_CONFIRMED',
                recipient_phone: patient.phone,
                status: 'PENDING',
            },
        ])

        // Send email notification
        if (isEmailConfigured() && videoLink) {
            const doctor = appointment.doctor as { specialty: string; user: { full_name: string } }
            const clinic = appointment.clinic as { name: string }
            const appointmentDate = new Date(appointment.appointment_date)

            try {
                await sendConfirmationEmail({
                    patient_email: patient.email,
                    patient_name: patient.full_name,
                    doctor_name: doctor?.user?.full_name || 'Médico',
                    specialty: doctor?.specialty || 'Especialidade',
                    clinic_name: clinic?.name || 'CliniGo',
                    appointment_date: formatDateBR(appointmentDate),
                    appointment_time: appointment.appointment_time.substring(0, 5),
                    video_link: videoLink,
                    appointment_id: appointmentId,
                })

                await supabase
                    .from('notifications')
                    .update({ status: 'SENT', sent_at: new Date().toISOString() })
                    .eq('appointment_id', appointmentId)
                    .eq('type', 'EMAIL')
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError)
                await supabase
                    .from('notifications')
                    .update({ status: 'FAILED', error_message: String(emailError) })
                    .eq('appointment_id', appointmentId)
                    .eq('type', 'EMAIL')
            }
        }

        // Send WhatsApp notification
        if (isWhatsAppConfigured() && videoLink) {
            const doctor = appointment.doctor as { user: { full_name: string } }
            const clinic = appointment.clinic as { name: string }
            const appointmentDate = new Date(appointment.appointment_date)

            try {
                await sendAppointmentConfirmation({
                    clinicId: appointment.clinic_id,
                    patient_phone: patient.phone,
                    patient_name: patient.full_name,
                    doctor_name: doctor?.user?.full_name || 'Médico',
                    clinic_name: clinic?.name || 'CliniGo',
                    appointment_date: formatDateBR(appointmentDate),
                    appointment_time: (appointment as any).appointment_time?.substring(0, 5) || '',
                    video_link: videoLink,
                })

                await supabase
                    .from('notifications')
                    .update({ status: 'SENT', sent_at: new Date().toISOString() })
                    .eq('appointment_id', appointmentId)
                    .eq('type', 'WHATSAPP')
            } catch (whatsappError) {
                console.error('Failed to send WhatsApp confirmation:', whatsappError)
                await supabase
                    .from('notifications')
                    .update({ status: 'FAILED', error_message: String(whatsappError) })
                    .eq('appointment_id', appointmentId)
                    .eq('type', 'WHATSAPP')
            }
        }

        console.log(`Payment confirmed and notifications sent for appointment ${appointmentId}`)
    } catch (error) {
        console.error('Failed to handle payment confirmation:', error)
    }
}

