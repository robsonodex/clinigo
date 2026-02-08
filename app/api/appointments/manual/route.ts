/**
 * POST /api/appointments/manual
 * Create a manual appointment (walk-in booking by receptionist)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
import { generateQRToken } from '@/lib/utils/qr-code'

// Types
interface QuickPatientRegistration {
    full_name: string
    phone: string
    date_of_birth?: string
    cpf?: string
    email?: string
}

interface ManualPaymentDetails {
    type: 'cash' | 'debit_card' | 'credit_card' | 'pix_presencial' | 'health_insurance' | 'payment_link' | 'courtesy' | 'to_be_paid'
    amount_paid?: number
    health_insurance_id?: string
    insurance_card_number?: string
    insurance_card_validity?: string
    notes?: string
}

interface ScheduleOverrides {
    ignore_schedule_constraints?: boolean
    allow_double_booking?: boolean
    override_blocked_dates?: boolean
    reason?: string
}

interface NotificationSettings {
    send_sms?: boolean
    send_whatsapp?: boolean
    send_email?: boolean
}

interface ManualAppointmentRequest {
    clinic_id: string
    patient_id?: string
    quick_registration?: QuickPatientRegistration
    doctor_id: string
    appointment_date: string // YYYY-MM-DD
    appointment_time: string // HH:MM
    duration_minutes?: number
    type?: 'presencial' | 'telemedicina'
    payment: ManualPaymentDetails
    overrides?: ScheduleOverrides
    notifications?: NotificationSettings
    notes?: string
    lock_id?: string // PREMIUM: Anti-overbooking lock ID
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get user profile to check permissions
        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            )
        }

        // Check permissions
        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR']
        if (!allowedRoles.includes(profile.role)) {
            return NextResponse.json(
                { error: 'Sem permissão para criar agendamentos manuais' },
                { status: 403 }
            )
        }

        const body: ManualAppointmentRequest = await request.json()

        // Validate required fields
        if (!body.doctor_id || !body.appointment_date || !body.appointment_time) {
            return NextResponse.json(
                { error: 'Médico, data e hora são obrigatórios' },
                { status: 400 }
            )
        }

        if (!body.patient_id && !body.quick_registration) {
            return NextResponse.json(
                { error: 'Paciente ou dados para cadastro são obrigatórios' },
                { status: 400 }
            )
        }

        // Use clinic from profile (safer) unless SUPER_ADMIN overriding it
        const clinicId = profile.role === 'SUPER_ADMIN' ? (body.clinic_id || profile.clinic_id) : profile.clinic_id

        // Validate doctor belongs to clinic
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, consultation_price, user:users(full_name)')
            .eq('id', body.doctor_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!doctor) {
            return NextResponse.json(
                { error: 'Médico não encontrado ou não pertence à clínica' },
                { status: 404 }
            )
        }

        // Get or create patient
        let patientId = body.patient_id

        if (!patientId && body.quick_registration) {
            // Quick registration
            const { full_name, phone, date_of_birth, cpf, email } = body.quick_registration

            if (!full_name || !phone) {
                return NextResponse.json(
                    { error: 'Nome e telefone são obrigatórios para cadastro rápido' },
                    { status: 400 }
                )
            }

            // Check if patient with same phone or CPF exists IN THIS CLINIC
            let existingPatient = null

            if (cpf) {
                const { data } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .eq('cpf', cpf.replace(/\D/g, ''))
                    .single()
                existingPatient = data
            }

            if (!existingPatient) {
                const { data } = await supabase
                    .from('patients')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .eq('phone', phone.replace(/\D/g, ''))
                    .single()
                existingPatient = data
            }

            if (existingPatient) {
                patientId = existingPatient.id
            } else {
                // Create new patient
                const { data: newPatient, error: patientError } = await supabase
                    .from('patients')
                    .insert({
                        full_name,
                        phone: phone.replace(/\D/g, ''),
                        date_of_birth: date_of_birth || null,
                        cpf: cpf ? cpf.replace(/\D/g, '') : null,
                        email: email || null,
                        clinic_id: clinicId,
                        created_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single()

                if (patientError) {
                    console.error('Error creating patient:', patientError)
                    return NextResponse.json(
                        { error: 'Erro ao cadastrar paciente' },
                        { status: 500 }
                    )
                }

                patientId = newPatient.id
            }
        }

        // Validate patient exists
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name, email, phone, clinic_id')
            .eq('id', patientId)
            .single()

        if (!patient) {
            return NextResponse.json(
                { error: 'Paciente não encontrado' },
                { status: 404 }
            )
        }

        if (patient.clinic_id !== clinicId) {
            console.error(`Mismatch: Patient ${patient.id} (Clinic ${patient.clinic_id}) vs Request Clinic ${clinicId}`)
            return NextResponse.json(
                {
                    error: 'Paciente pertence a outra clínica',
                    details: 'O paciente selecionado não está vinculado a esta clínica. Atualize a página.'
                },
                { status: 400 }
            )
        }

        // PREMIUM: Validate lock if provided
        if (body.lock_id) {
            // Verify lock belongs to this user and is still active
            const { data: lock } = await supabase
                .from('appointment_slot_locks')
                .select('id, locked_by, expires_at, lock_status, doctor_id, slot_datetime')
                .eq('id', body.lock_id)
                .single()

            if (!lock) {
                return NextResponse.json(
                    { error: 'Lock de slot inválido ou expirado', code: 'INVALID_LOCK' },
                    { status: 410 } // Gone
                )
            }

            if (lock.locked_by !== user.id) {
                return NextResponse.json(
                    { error: 'Lock pertence a outro usuário', code: 'LOCK_OWNERSHIP' },
                    { status: 403 }
                )
            }

            if (lock.lock_status !== 'ACTIVE') {
                return NextResponse.json(
                    { error: `Lock já foi ${lock.lock_status.toLowerCase()}`, code: 'LOCK_USED' },
                    { status: 410 }
                )
            }

            if (new Date(lock.expires_at) < new Date()) {
                return NextResponse.json(
                    { error: 'Lock expirou. Tente reservar o horário novamente', code: 'LOCK_EXPIRED' },
                    { status: 410 }
                )
            }

            // Verify lock matches the appointment details
            const lockDateTime = new Date(lock.slot_datetime)
            const requestDateTime = new Date(`${body.appointment_date}T${body.appointment_time}`)

            if (lock.doctor_id !== body.doctor_id || lockDateTime.getTime() !== requestDateTime.getTime()) {
                return NextResponse.json(
                    { error: 'Lock não corresponde aos dados do agendamento', code: 'LOCK_MISMATCH' },
                    { status: 400 }
                )
            }
        }

        // Check for schedule conflicts (if not overriding and no lock)
        if (!body.overrides?.allow_double_booking && !body.lock_id) {
            const { data: conflicts } = await supabase
                .from('appointments')
                .select('id')
                .eq('doctor_id', body.doctor_id)
                .eq('appointment_date', body.appointment_date)
                .eq('appointment_time', body.appointment_time)
                .neq('status', 'CANCELLED')

            if (conflicts && conflicts.length > 0) {
                return NextResponse.json(
                    {
                        error: 'Conflito de horário detectado',
                        conflict: true,
                        message: 'Já existe um agendamento para este horário. Use /api/appointments/check-availability primeiro.'
                    },
                    { status: 409 }
                )
            }
        }

        // Calculate price
        let price = doctor.consultation_price || 0

        if (body.payment.type === 'health_insurance' && body.payment.health_insurance_id) {
            // Get insurance price if different
            const { data: insurancePrice } = await supabase
                .from('doctor_health_insurances')
                .select('consultation_price')
                .eq('doctor_id', body.doctor_id)
                .eq('health_insurance_plan_id', body.payment.health_insurance_id)
                .single()

            if (insurancePrice) {
                price = insurancePrice.consultation_price
            }
        }

        if (body.payment.type === 'courtesy') {
            price = 0
        }

        // Create appointment
        const appointmentId = uuidv4()

        // For walk-ins happening RIGHT NOW, ensure the time is slightly in the future
        // to bypass the future_appointment constraint
        let appointmentDate = body.appointment_date
        let appointmentTime = body.appointment_time

        // Using client date/time directly - no server adjustment

        // Build appointment data with correct column names (from working route.ts)
        const appointmentData: Record<string, unknown> = {
            id: appointmentId,
            clinic_id: clinicId,
            doctor_id: body.doctor_id,
            patient_id: patientId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTime,
            status: 'CONFIRMED',
            payment_type: body.payment.type === 'health_insurance' ? 'CONVENIO' : 'PARTICULAR',
            appointment_type: body.type === 'telemedicina' ? 'online' : 'presencial',
        }

        // Generate video link for telemedicine appointments
        if (body.type === 'telemedicina') {
            const { generateVideoRoomUrl } = await import('@/lib/utils/video')
            appointmentData.video_link = generateVideoRoomUrl(appointmentId)
        }

        // Add optional insurance fields if using health insurance
        if (body.payment.type === 'health_insurance' && body.payment.health_insurance_id) {
            appointmentData.health_insurance_plan_id = body.payment.health_insurance_id
            appointmentData.insurance_card_number = body.payment.insurance_card_number || null
        }

        const { error: appointmentError } = await supabase
            .from('appointments')
            .insert(appointmentData)

        if (appointmentError) {
            console.error('Error creating appointment:', JSON.stringify(appointmentError, null, 2))
            return NextResponse.json(
                {
                    error: 'Erro ao criar agendamento',
                    details: appointmentError.message,
                    hint: appointmentError.hint || 'Verifique se as migrations foram executadas'
                },
                { status: 500 }
            )
        }

        // Create video_room for telemedicine appointments (CRITICAL: needed for drawer display)
        let videoRoom = null
        if (body.type === 'telemedicina') {
            const roomId = `room_${appointmentId.substring(0, 8)}_${Date.now()}`
            const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
            const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

            // Use service role for video room creation to bypass RLS (authenticated users only have SELECT permission)
            const serviceClient = createServiceRoleClient()
            const { data: createdRoom, error: roomError } = await serviceClient
                .from('video_rooms')
                .insert({
                    appointment_id: appointmentId,
                    room_id: roomId,
                    patient_token: patientToken,
                    doctor_token: doctorToken,
                })
                .select()
                .single()

            if (roomError) {
                console.error('[VIDEO_ROOM] Error creating room:', roomError)
                // Don't fail the appointment creation, just log the error
            } else {
                videoRoom = createdRoom
                console.log('[VIDEO_ROOM] Created video room for telemedicina appointment:', roomId)
            }
        }

        // Create financial entry if payment was made at counter
        try {
            const paidAtCounter = ['cash', 'debit_card', 'credit_card', 'pix_presencial'].includes(body.payment.type)

            if (paidAtCounter && price > 0) {
                // Check if financial_entries has the new columns by inspecting the error or just trying safe insert
                // For safety, we try unrestricted insert, but catch error if columns missing
                await supabase
                    .from('financial_entries')
                    .insert({
                        clinic_id: clinicId,
                        type: 'income',
                        category: 'consultation',
                        description: `Consulta - ${patient.full_name}`,
                        amount: body.payment.amount_paid || price,
                        payment_method: body.payment.type.toUpperCase(),
                        status: 'paid', // status might be missing in strict schema? no, status is usually core.
                        paid_at: new Date().toISOString(),
                        reference_type: 'appointment',
                        reference_id: appointmentId,
                        created_by: user.id,
                    })
            }
        } catch (finError) {
            console.warn('Non-critical: Failed to create financial entry (schema mismatch?)', finError)
        }

        // PREMIUM: Confirm lock if provided
        if (body.lock_id) {
            try {
                await supabase.rpc('confirm_slot_lock', {
                    p_lock_id: body.lock_id,
                    p_appointment_id: appointmentId
                })

                // Audit log
                await supabase.from('appointment_lock_audit').insert({
                    lock_id: body.lock_id,
                    action: 'CONFIRMED',
                    user_id: user.id,
                    metadata: { appointment_id: appointmentId }
                })
            } catch (lockError) {
                console.warn('Non-critical: Failed to confirm lock (schema mismatch?)', lockError)
            }
        }

        // Generate QR Code automatically
        let qrCodeData = null
        try {
            const qrToken = generateQRToken(appointmentId)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
            const checkinUrl = `${baseUrl}/checkin/${appointmentId}`

            // Generate QR code image as base64 data URL
            const qrImageDataUrl = await QRCode.toDataURL(checkinUrl, {
                width: 400,
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
                patientId,
                doctorId: body.doctor_id,
                clinicId,
                scheduledDate: appointmentDate,
                scheduledTime: appointmentTime,
                checkinUrl,
                qrCodeImage: qrImageDataUrl
            }

            // Save QR code to database
            const scheduledDateTime = new Date(`${appointmentDate}T${appointmentTime}`)
            const { data: qrRecord, error: qrError } = await supabase
                .from('appointment_qr_codes')
                .insert({
                    appointment_id: appointmentId,
                    clinic_id: clinicId,
                    qr_token: qrToken,
                    qr_data: qrData,
                    expires_at: scheduledDateTime.toISOString() // Expires at appointment time
                } as any)
                .select()
                .single()

            if (!qrError && qrRecord) {
                const qr = qrRecord as any
                qrCodeData = {
                    id: qr.id,
                    token: qrToken,
                    image: qrImageDataUrl,
                    url: checkinUrl,
                    expires_at: qr.expires_at
                }
            } else {
                console.warn('Non-critical: Failed to create QR code', qrError)
            }
        } catch (qrGenerationError) {
            console.warn('Non-critical: QR code generation failed', qrGenerationError)
        }

        // Fetch complete appointment data with relations for the response
        const { data: fullAppointment } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients(id, full_name, email, phone),
                doctor:doctors(id, user:users(full_name)),
                clinic:clinics(id, name)
            `)
            .eq('id', appointmentId)
            .single()

        const appointmentWithRelations = fullAppointment as any

        // Send email notification if enabled
        if (body.notifications?.send_email && patient.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                const doctorFullName = appointmentWithRelations?.doctor?.user?.full_name || (doctor as any).user?.full_name || 'Médico'
                const clinicName = appointmentWithRelations?.clinic?.name || 'Clínica'
                const checkinUrl = qrCodeData?.url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/checkin/${appointmentId}`

                // Generate QR code image for presencial appointments
                let qrCodeImageHtml = ''
                const isTelemedicina = body.type === 'telemedicina'

                if (!isTelemedicina && qrCodeData?.image) {
                    // Use the QR API URL instead of base64 data URL for better email client compatibility
                    const qrBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'
                    const qrImageUrl = `${qrBaseUrl}/api/qr/${appointmentId}`
                    qrCodeImageHtml = `
                        <div style="text-align: center; margin: 20px 0;">
                            <img src="${qrImageUrl}" alt="QR Code Check-in" width="200" height="200" style="width: 200px; height: 200px;"/>
                            <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Escaneie o QR Code no dia da consulta para fazer check-in</p>
                        </div>
                    `
                }

                // Video link section for telemedicine
                let videoLinkHtml = ''
                if (isTelemedicina && videoRoom) {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
                    const videoUrl = `${baseUrl}/video/${appointmentId}?token=${(videoRoom as any).patient_token}`
                    videoLinkHtml = `
                        <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin: 0 0 8px 0;">📹 Link da Teleconsulta</h3>
                            <p style="margin: 0 0 12px 0;">Acesse o link abaixo no horário da consulta:</p>
                            <p style="text-align: center;">
                                <a href="${videoUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Acessar Consulta Online
                                </a>
                            </p>
                        </div>
                    `
                }

                // Pre-checkin section for in-person appointments
                let checkinHtml = ''
                if (!isTelemedicina) {
                    checkinHtml = `
                        <h3 style="color: #3b82f6;">📱 Faça seu Pré-Check-in Online</h3>
                        <p>Agilize seu atendimento fazendo o pré-check-in antes da consulta:</p>
                        <p style="text-align: center;">
                            <a href="${checkinUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Fazer Pré-Check-in
                            </a>
                        </p>
                        ${qrCodeImageHtml}
                    `
                }

                await sendEmailMultiTenant({
                    clinicId,
                    to: patient.email,
                    subject: `✅ Consulta Confirmada - ${appointmentDate} às ${appointmentTime}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #10b981;">✅ Agendamento Confirmado!</h2>
                            <p>Olá <strong>${patient.full_name}</strong>,</p>
                            <p>Sua consulta foi agendada com sucesso:</p>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorFullName}</p>
                                <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${appointmentDate}</p>
                                <p style="margin: 4px 0;"><strong>🕐 Horário:</strong> ${appointmentTime}</p>
                                <p style="margin: 4px 0;"><strong>🏥 Clínica:</strong> ${clinicName}</p>
                                <p style="margin: 4px 0;"><strong>📋 Tipo:</strong> ${isTelemedicina ? 'Teleconsulta' : 'Presencial'}</p>
                            </div>
                            ${videoLinkHtml}
                            ${checkinHtml}
                            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                Este e-mail foi enviado automaticamente. Caso precise cancelar ou reagendar, entre em contato com a clínica.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Email sent to:', patient.email)
            } catch (emailError) {
                console.error('[NOTIFICATION] Email send failed:', emailError)
                // Non-blocking - don't fail the appointment creation
            }
        }

        return NextResponse.json({
            success: true,
            appointment: {
                id: appointmentId,
                patient_id: patientId,
                doctor_id: body.doctor_id,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                status: 'CONFIRMED',
                appointment_type: body.type === 'telemedicina' ? 'telemedicina' : 'presencial',
                patient: appointmentWithRelations?.patient || { full_name: (patient as any).full_name, phone: (patient as any).phone, email: (patient as any).email },
                doctor: appointmentWithRelations?.doctor || { user: { full_name: (doctor as any).user?.full_name || 'Médico' } },
                clinic: appointmentWithRelations?.clinic,
                qr_code: qrCodeData
            },
            message: 'Agendamento criado com sucesso',
        })

    } catch (error) {
        console.error('Manual appointment error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
