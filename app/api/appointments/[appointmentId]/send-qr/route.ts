import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateWhatsAppShareUrl } from '@/lib/utils/qr-code'

interface SendQRRequest {
    method: 'email' | 'whatsapp' | 'both'
}

/**
 * POST /api/appointments/[appointmentId]/send-qr
 * Sends QR code to patient via email and/or WhatsApp
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

        const { method }: SendQRRequest = await req.json()
        const appointmentId = params.appointmentId

        // Fetch QR code with appointment data
        const { data: qrCode, error: qrError } = await supabase
            .from('appointment_qr_codes')
            .select(`
                *,
                appointment:appointments(
                    *,
                    patient:patients(id, full_name, email, phone),
                    doctor:doctors(id, full_name),
                    clinic:clinics(id, name, slug, email, phone)
                )
            `)
            .eq('appointment_id', appointmentId)
            .gt('expires_at', new Date().toISOString())
            .eq('checked_in', false)
            .single()

        if (qrError || !qrCode) {
            return NextResponse.json(
                { error: 'QR Code não encontrado. Gere um novo QR Code primeiro.' },
                { status: 404 }
            )
        }

        const appointment = qrCode.appointment
        const patient = appointment.patient
        const doctor = appointment.doctor
        const clinic = appointment.clinic

        let emailSent = false
        let whatsappSent = false
        let whatsappUrl: string | null = null
        const errors: string[] = []

        // SEND VIA EMAIL
        if (method === 'email' || method === 'both') {
            try {
                // Check if SMTP is configured
                const { data: settings } = await supabase
                    .from('clinic_settings')
                    .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_configured')
                    .eq('clinic_id', clinic.id)
                    .single()

                if (!settings?.smtp_host && !settings?.smtp_configured) {
                    errors.push('SMTP não configurado. Configure em Configurações > Integrações.')
                } else if (!patient.email) {
                    errors.push('Paciente não possui e-mail cadastrado.')
                } else {
                    // Dynamic import to avoid issues if email module not available
                    try {
                        const { sendEmail } = await import('@/lib/email/sender')

                        const scheduledDate = new Date(appointment.scheduled_at)
                        const formattedDate = scheduledDate.toLocaleDateString('pt-BR')
                        const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })

                        await sendEmail({
                            to: patient.email,
                            subject: `Confirmação de Consulta - ${clinic.name}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #10b981;">Olá, ${patient.full_name}!</h2>
                                    <p>Sua consulta foi agendada com sucesso.</p>
                                    
                                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <h3 style="margin-top: 0;">Detalhes da Consulta:</h3>
                                        <p><strong>Médico:</strong> Dr(a). ${doctor.full_name}</p>
                                        <p><strong>Data:</strong> ${formattedDate}</p>
                                        <p><strong>Horário:</strong> ${formattedTime}</p>
                                        <p><strong>Local:</strong> ${clinic.name}</p>
                                    </div>
                                    
                                    <h3>Complete seu Pré-Cadastro:</h3>
                                    <p>Para agilizar seu atendimento, complete seu cadastro antes da consulta:</p>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <img src="${qrCode.qr_data.qrCodeImage}" alt="QR Code" style="max-width: 200px;">
                                        <p>
                                            <a href="${qrCode.qr_data.preRegistrationUrl}" 
                                               style="background: #10b981; color: white; padding: 12px 24px; 
                                                      text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 10px;">
                                                Completar Cadastro
                                            </a>
                                        </p>
                                    </div>
                                    
                                    <p style="color: #666; font-size: 14px;">
                                        Ao chegar na clínica, apresente este QR Code na recepção para check-in rápido.
                                    </p>
                                    
                                    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                                    <p style="color: #999; font-size: 12px;">
                                        ${clinic.name}<br>
                                        ${clinic.phone || ''}
                                    </p>
                                </div>
                            `,
                            smtpConfig: settings
                        })

                        emailSent = true

                        // Update QR record
                        await supabase
                            .from('appointment_qr_codes')
                            .update({
                                sent_via_email: true,
                                email_sent_at: new Date().toISOString()
                            })
                            .eq('id', qrCode.id)

                    } catch (emailError: any) {
                        console.error('Error sending email:', emailError)
                        errors.push(`Erro ao enviar e-mail: ${emailError.message}`)
                    }
                }
            } catch (error: any) {
                console.error('Error sending email:', error)
                errors.push(`Erro ao enviar e-mail: ${error.message}`)
            }
        }

        // SEND VIA WHATSAPP (generate share URL)
        if (method === 'whatsapp' || method === 'both') {
            try {
                if (!patient.phone) {
                    errors.push('Paciente não possui telefone cadastrado.')
                } else {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'

                    whatsappUrl = generateWhatsAppShareUrl({
                        clinicName: clinic.name,
                        doctorName: doctor.full_name,
                        appointmentDate: appointment.scheduled_at,
                        appointmentTime: new Date(appointment.scheduled_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        appointmentId: appointment.id,
                        baseUrl
                    })

                    // Add patient phone to URL
                    const patientPhone = patient.phone.replace(/\D/g, '')
                    whatsappUrl = `https://wa.me/55${patientPhone}?text=${whatsappUrl.split('?text=')[1]}`

                    whatsappSent = true

                    // Update QR record
                    await supabase
                        .from('appointment_qr_codes')
                        .update({
                            sent_via_whatsapp: true,
                            whatsapp_sent_at: new Date().toISOString()
                        })
                        .eq('id', qrCode.id)
                }
            } catch (error: any) {
                console.error('Error preparing WhatsApp:', error)
                errors.push(`Erro ao preparar WhatsApp: ${error.message}`)
            }
        }

        return NextResponse.json({
            success: emailSent || whatsappSent,
            emailSent,
            whatsappSent,
            whatsappUrl,
            errors: errors.length > 0 ? errors : null,
            message: emailSent && whatsappSent
                ? 'E-mail enviado e WhatsApp preparado!'
                : emailSent
                    ? 'E-mail enviado com sucesso!'
                    : whatsappSent
                        ? 'WhatsApp preparado. Clique para enviar.'
                        : 'Nenhum método de envio disponível.'
        })

    } catch (error) {
        console.error('Error sending QR code:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
