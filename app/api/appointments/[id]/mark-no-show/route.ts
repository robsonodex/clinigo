/**
 * POST /api/appointments/[appointmentId]/mark-no-show
 * Mark appointment as NO_SHOW (RECEPTIONIST only)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
    params: Promise<{ appointmentId: string }>
}

const markNoShowSchema = z.object({
    reason: z.string().optional(),
})

export async function POST(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { appointmentId } = await params
        const supabase = await createClient()

        // 1. Get authenticated user and verify role
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get user details with role using service role to bypass RLS
        const adminDb = createServiceRoleClient() as any
        const { data: currentUser, error: userError } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (userError || !currentUser) {
            return NextResponse.json(
                { error: 'Usuário não encontrado' },
                { status: 404 }
            )
        }

        // Only RECEPTIONIST and CLINIC_ADMIN can mark no-show
        if (currentUser.role !== 'RECEPTIONIST' && currentUser.role !== 'CLINIC_ADMIN') {
            return NextResponse.json(
                { error: 'Apenas recepcionistas podem marcar faltas' },
                { status: 403 }
            )
        }

        // 2. Validate request body
        const body = await request.json()
        const validation = markNoShowSchema.safeParse(body)

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: validation.error.errors },
                { status: 400 }
            )
        }

        const { reason } = validation.data

        // 3. Fetch appointment with all related data
        const { data: appointment, error: fetchError } = await adminDb
            .from('appointments')
            .select(`
                *,
                patient:patients(*),
                doctor:doctors(*, user:users(full_name)),
                clinic:clinics(name, noshow_tolerance_minutes)
            `)
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            )
        }

        // Verify appointment belongs to user's clinic
        if (appointment.clinic_id !== currentUser.clinic_id) {
            return NextResponse.json(
                { error: 'Agendamento não pertence à sua clínica' },
                { status: 403 }
            )
        }

        // 4. Validate appointment can be marked as no-show
        if (appointment.status === 'NO_SHOW') {
            return NextResponse.json(
                { error: 'Este agendamento já foi marcado como falta' },
                { status: 400 }
            )
        }

        if (!['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) {
            return NextResponse.json(
                { error: 'Apenas agendamentos confirmados podem ser marcados como falta' },
                { status: 400 }
            )
        }

        // 5. Validate appointment is actually overdue
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
        const now = new Date()
        const tolerance = appointment.clinic.noshow_tolerance_minutes || 15
        const toleranceMs = tolerance * 60 * 1000

        const timeDiff = now.getTime() - appointmentDateTime.getTime()

        if (timeDiff < toleranceMs) {
            const minutesRemaining = Math.ceil((toleranceMs - timeDiff) / (60 * 1000))
            return NextResponse.json(
                {
                    error: `Este agendamento ainda não passou do horário esperado. Aguarde mais ${minutesRemaining} minutos (tolerância: ${tolerance}min)`
                },
                { status: 400 }
            )
        }

        const minutesOverdue = Math.floor(timeDiff / (60 * 1000))

        // 6. Update appointment status to NO_SHOW
        const { data: updated, error: updateError } = await adminDb
            .from('appointments')
            .update({
                status: 'NO_SHOW',
                marked_no_show_at: new Date().toISOString(),
                marked_no_show_by: user.id,
                no_show: true,
                no_show_reason: reason || null,
                notes: reason
                    ? `${appointment.notes || ''}\n[FALTA - ${new Date().toLocaleString('pt-BR')}] ${reason}`.trim()
                    : appointment.notes
            })
            .eq('id', appointmentId)
            .select()
            .single()

        if (updateError) {
            console.error('Error marking no-show:', updateError)
            return NextResponse.json(
                { error: 'Erro ao marcar falta' },
                { status: 500 }
            )
        }

        // 7. Generate reschedule token
        const token = generateSecureToken()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

        const { data: rescheduleToken, error: tokenError } = await adminDb
            .from('reschedule_tokens')
            .insert({
                appointment_id: appointmentId,
                patient_id: appointment.patient_id,
                clinic_id: appointment.clinic_id,
                token,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single()

        if (tokenError) {
            console.error('Error creating reschedule token:', tokenError)
            // Don't fail the whole operation, just log
        }

        // 8. Send reschedule email (if patient has email)
        if (appointment.patient.email && rescheduleToken) {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
                const rescheduleUrl = `${baseUrl}/reschedule/${token}`

                await sendRescheduleEmail({
                    to: appointment.patient.email,
                    patientName: appointment.patient.full_name,
                    doctorName: appointment.doctor.user.full_name,
                    appointmentDate: new Date(appointment.appointment_date).toLocaleDateString('pt-BR'),
                    appointmentTime: appointment.appointment_time,
                    clinicName: appointment.clinic.name,
                    rescheduleUrl,
                })
            } catch (emailError) {
                console.error('Error sending reschedule email:', emailError)
                // Don't fail operation, email is not critical
            }
        }

        // 9. Send reschedule WhatsApp via Baileys microservice
        let whatsappSentOk = false
        if (appointment.patient.phone) {
            try {
                const serviceUrl = process.env.WHATSAPP_SERVICE_URL
                const serviceSecret = process.env.WHATSAPP_INTERNAL_SECRET
                if (serviceUrl && serviceSecret) {
                    const msg =
                        `Olá ${appointment.patient.full_name}, ` +
                        `percebemos que você não compareceu à consulta agendada para ${new Date(appointment.appointment_date).toLocaleDateString('pt-BR')} às ${appointment.appointment_time}. ` +
                        `Gostaríamos de reagendar? Acesse: ${process.env.NEXT_PUBLIC_APP_URL}/reschedule/${token}`

                    const cleanPhone = appointment.patient.phone.replace(/\D/g, '')
                    const phone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`

                    const wppRes = await fetch(`${serviceUrl}/message/send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-internal-secret': serviceSecret,
                        },
                        body: JSON.stringify({
                            clinicId: appointment.clinic_id,
                            to: phone,
                            message: msg,
                            triggerContext: 'mark_no_show_reschedule_v1',
                        }),
                    })
                    whatsappSentOk = wppRes.ok
                }
            } catch (wppErr) {
                console.error('Error sending no-show WhatsApp:', wppErr)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Agendamento marcado como falta com sucesso',
            appointment: updated,
            minutes_overdue: minutesOverdue,
            reschedule_link: rescheduleToken ? `${process.env.NEXT_PUBLIC_APP_URL}/reschedule/${token}` : null,
            whatsapp_sent: whatsappSentOk,
            email_sent: !!appointment.patient.email,
        })

    } catch (error) {
        console.error('Error in mark-no-show:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

/**
 * Generate secure random token
 */
function generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
}

/**
 * Send reschedule email using Resend
 */
async function sendRescheduleEmail(params: {
    to: string
    patientName: string
    doctorName: string
    appointmentDate: string
    appointmentTime: string
    clinicName: string
    rescheduleUrl: string
}) {
    try {
        // Check if Resend is configured
        if (!process.env.RESEND_API_KEY) {
            console.warn('[EMAIL] Resend API key not configured, skipping email')
            return
        }

        // ⚠️ TEMPORARY: Commented out due to Turbopack junction point error with @react-email/components
        // TODO: Install dependencies: npm install @react-email/components resend
        console.warn('[EMAIL] Email functionality temporarily disabled - react-email not installed')
        return

        /*
        const { Resend } = await import('resend')
        const { default: RescheduleNoShowEmail } = await import('@/emails/reschedule-noshow')

        const resend = new Resend(process.env.RESEND_API_KEY)

        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'CliniGo <noreply@clinigo.app>',
            to: params.to,
            subject: `Reagende sua consulta - ${params.clinicName}`,
            react: RescheduleNoShowEmail({
                patientName: params.patientName,
                doctorName: params.doctorName,
                appointmentDate: params.appointmentDate,
                appointmentTime: params.appointmentTime,
                clinicName: params.clinicName,
                rescheduleUrl: params.rescheduleUrl,
            }),
        })

        console.log('[EMAIL] Reschedule email sent to:', params.to)
        */
    } catch (error) {
        console.error('[EMAIL] Error sending reschedule email:', error)
        // Don't throw - email is not critical, system should continue
    }
}
