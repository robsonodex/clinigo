import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateQRToken, generateCheckinUrl } from '@/lib/utils/qr-code'
import QRCode from 'qrcode'

/**
 * POST /api/appointments/[appointmentId]/generate-qr
 * Generates a QR code for appointment check-in
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { appointmentId: string } }
) {
    try {
        const supabase = await createClient()

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        const appointmentId = params.appointmentId

        // Fetch appointment with related data
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
                id,
                patient_id,
                doctor_id,
                clinic_id,
                scheduled_at,
                patient:patients(id, full_name, email, phone),
                doctor:doctors(id, full_name),
                clinic:clinics(id, name, slug, email, phone)
            `)
            .eq('id', appointmentId)
            .single()

        if (appointmentError || !appointment) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            )
        }

        // Type assertions for joined data
        const appointmentData = appointment as any

        // Check for existing valid QR code
        const { data: existingQr } = await supabase
            .from('appointment_qr_codes')
            .select('*')
            .eq('appointment_id', appointmentId)
            .gt('expires_at', new Date().toISOString())
            .eq('checked_in', false)
            .single()

        let qrRecord = existingQr as any

        // If no valid QR exists, create a new one
        if (!qrRecord) {
            const qrToken = generateQRToken(appointmentId)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
            const preRegistrationUrl = `${baseUrl}/pre-cadastro/${qrToken}`
            const checkinUrl = generateCheckinUrl(baseUrl, appointmentId)

            // Generate QR code image
            const qrCodeDataUrl = await QRCode.toDataURL(preRegistrationUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            })

            // Build QR data payload
            const qrData = {
                appointmentId,
                patientId: appointmentData.patient_id,
                doctorId: appointmentData.doctor_id,
                clinicId: appointmentData.clinic_id,
                scheduledAt: appointmentData.scheduled_at,
                preRegistrationUrl,
                checkinUrl,
                qrCodeImage: qrCodeDataUrl
            }

            // Save to database
            const { data: newQr, error: insertError } = await supabase
                .from('appointment_qr_codes')
                .insert({
                    appointment_id: appointmentId,
                    clinic_id: appointmentData.clinic_id,
                    qr_token: qrToken,
                    qr_data: qrData,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                } as any)
                .select()
                .single()

            if (insertError) {
                console.error('Error creating QR code:', insertError)
                return NextResponse.json(
                    { error: 'Erro ao gerar QR code' },
                    { status: 500 }
                )
            }

            qrRecord = newQr as any
        }

        // Check if SMTP is configured
        const { data: clinicSettings } = await supabase
            .from('clinic_settings')
            .select('smtp_host, smtp_configured')
            .eq('clinic_id', appointmentData.clinic_id)
            .single()

        const settings = clinicSettings as any
        const smtpConfigured = settings?.smtp_configured || !!settings?.smtp_host

        if (!qrRecord) {
            return NextResponse.json(
                { error: 'Erro ao gerar QR code' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            qrCode: {
                id: qrRecord.id,
                token: qrRecord.qr_token,
                expiresAt: qrRecord.expires_at,
                sentViaEmail: qrRecord.sent_via_email,
                sentViaWhatsApp: qrRecord.sent_via_whatsapp,
                preRegistrationCompleted: qrRecord.pre_registration_completed
            },
            preRegistrationUrl: qrRecord.qr_data?.preRegistrationUrl,
            qrCodeImage: qrRecord.qr_data?.qrCodeImage,
            appointment: {
                id: appointmentData.id,
                scheduledAt: appointmentData.scheduled_at,
                patientName: appointmentData.patient?.full_name,
                doctorName: appointmentData.doctor?.full_name,
                clinicName: appointmentData.clinic?.name
            },
            smtpConfigured,
            message: smtpConfigured
                ? 'QR Code gerado. E-mail pode ser enviado automaticamente.'
                : 'QR Code gerado. Configure o SMTP para envio automático de e-mails.'
        })

    } catch (error) {
        console.error('Error generating QR code:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

