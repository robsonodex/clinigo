/**
 * GET /api/appointments - List appointments (authenticated)
 * POST /api/appointments - Create appointment (PUBLIC - booking)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ConflictError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createAppointmentSchema, listAppointmentsQuerySchema } from '@/lib/validations/appointment'
import { cleanCPF } from '@/lib/utils/cpf'
import { isDateInPast, isToday, isSlotAvailableToday } from '@/lib/utils/date'
import { generateQRToken, generateWhatsAppShareUrl, generateCheckinUrl } from '@/lib/utils/qr-code'
// Gateway-Agnostic: Mercado Pago removido - clínica gerencia pagamentos externamente

/**
 * GET - List appointments (authenticated users only)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            return handleApiError(new BadRequestError('Não autorizado'))
        }

        const { searchParams } = new URL(request.url)
        const query = listAppointmentsQuerySchema.parse(Object.fromEntries(searchParams))
        let { page, pageSize, offset } = parsePaginationParams(searchParams)

        // Allow larger page size for agenda/calendar views if explicitly requested
        // This is necessary to show all appointments in a week/month view without pagination UI
        const requestedPageSize = parseInt(searchParams.get('pageSize') || '0', 10)
        if (requestedPageSize > 100) {
            pageSize = requestedPageSize
            offset = (page - 1) * pageSize
        }

        const supabase = await createClient() as any

        // Get user's clinic and doctor_id if applicable
        const { data: currentUser } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', userId)
            .single()

        let doctorId: string | null = null
        if (currentUser?.role === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()
            doctorId = doctor?.id || null
        }

        let queryBuilder = supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors!appointments_doctor_id_fkey(
          id, crm, specialty, consultation_price,
          user:users(full_name, email, avatar_url)
        ),
        patient:patients!appointments_patient_id_fkey(id, full_name, email, phone, cpf),
        payment:payments(id, status, amount, payment_method)
      `, { count: 'exact' })

        // Apply role-based filtering
        const headerClinicId = request.headers.get('x-clinic-id')
        const effectiveClinicId = headerClinicId || currentUser?.clinic_id

        if (effectiveClinicId) {
            queryBuilder = queryBuilder.eq('clinic_id', effectiveClinicId)
        }

        // Apply query filters
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status)
        }
        if (query.doctor_id && userRole !== 'DOCTOR') {
            queryBuilder = queryBuilder.eq('doctor_id', query.doctor_id)
        }
        if (query.patient_id) {
            queryBuilder = queryBuilder.eq('patient_id', query.patient_id)
        }
        if (query.date_from) {
            queryBuilder = queryBuilder.gte('appointment_date', query.date_from)
        }
        if (query.date_to) {
            queryBuilder = queryBuilder.lte('appointment_date', query.date_to)
        }

        // Apply pagination and ordering
        queryBuilder = queryBuilder
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true })
            .range(offset, offset + pageSize - 1)

        const { data: appointments, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(appointments || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Create appointment (PUBLIC - booking flow)
 * This is the main public endpoint for patient booking
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = createAppointmentSchema.parse(body)

        // Use service role for public operations (bypasses RLS)
        const supabase = createServiceRoleClient() as any

        // 1. Verify clinic exists and is active
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, mercadopago_access_token, is_active, addons')
            .eq('slug', validatedData.clinic_slug)
            .single()

        if (clinicError || !clinic) {
            throw new NotFoundError('Clínica')
        }

        // Type-safe extraction for clinic
        const clinicData = clinic as { id?: string; name?: string; is_active?: boolean; mercadopago_access_token?: string; addons?: Record<string, unknown> } | null

        if (!clinicData?.is_active) {
            throw new BadRequestError('Esta clínica não está aceitando agendamentos')
        }

        // Note: Appointment limits have been removed - all plans have unlimited consultations

        // 2. Verify doctor exists and accepts appointments
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select(`
        id, clinic_id, consultation_price, is_accepting_appointments,
        user:users(full_name)
      `)
            .eq('id', validatedData.doctor_id)
            .single()

        if (doctorError || !doctor) {
            throw new NotFoundError('Médico')
        }

        if (doctor.clinic_id !== clinic.id) {
            throw new BadRequestError('Médico não pertence a esta clínica')
        }

        if (!doctor.is_accepting_appointments) {
            throw new BadRequestError('Este médico não está aceitando agendamentos')
        }

        // 3. Validate date and time
        const appointmentDate = new Date(validatedData.appointment_date)

        if (isDateInPast(appointmentDate)) {
            throw new BadRequestError('Data do agendamento não pode ser no passado')
        }

        if (isToday(appointmentDate) && !isSlotAvailableToday(validatedData.appointment_time)) {
            throw new BadRequestError('Este horário não está mais disponível para hoje')
        }

        // 4. Check slot availability using database function
        const { data: isAvailable, error: availabilityError } = await supabase
            .rpc('check_slot_availability', {
                p_doctor_id: validatedData.doctor_id,
                p_date: validatedData.appointment_date,
                p_time: validatedData.appointment_time,
            })

        if (availabilityError) throw availabilityError

        if (!isAvailable) {
            // Get available slots to include in error response
            const { data: availableSlots } = await supabase
                .rpc('get_available_slots', {
                    p_doctor_id: validatedData.doctor_id,
                    p_date: validatedData.appointment_date,
                })

            throw new ConflictError(
                'Este horário já está ocupado. Escolha outro horário.',
                {
                    available_slots: availableSlots?.map((slot: { slot_time: string }) => slot.slot_time) || [],
                }
            )
        }

        // 5. UPSERT patient (create or update by clinic_id + cpf)
        const cleanedCpf = cleanCPF(validatedData.patient.cpf)

        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('clinic_id', clinic.id)
            .eq('cpf', cleanedCpf)
            .is('deleted_at', null)
            .single()

        let patientId: string

        if (existingPatient) {
            // Update existing patient
            const { data: updatedPatient, error: updateError } = await supabase
                .from('patients')
                .update({
                    full_name: validatedData.patient.full_name,
                    email: validatedData.patient.email,
                    phone: validatedData.patient.phone,
                    date_of_birth: validatedData.patient.date_of_birth || null,
                })
                .eq('id', existingPatient.id)
                .select()
                .single()

            if (updateError) throw updateError
            patientId = updatedPatient.id
        } else {
            // Create new patient
            const { data: newPatient, error: createError } = await supabase
                .from('patients')
                .insert({
                    clinic_id: clinic.id,
                    cpf: cleanedCpf,
                    full_name: validatedData.patient.full_name,
                    email: validatedData.patient.email,
                    phone: validatedData.patient.phone.replace(/\D/g, ''),
                    date_of_birth: validatedData.patient.date_of_birth || null,
                })
                .select()
                .single()

            if (createError) throw createError
            patientId = newPatient.id
        }



        const isPrepaid = !!clinic.addons?.prepaid_booking && validatedData.payment_type !== 'CONVENIO'
        const initialStatus = isPrepaid ? 'PENDING_PAYMENT' : 'CONFIRMED'

        // 6. Create appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                clinic_id: clinic.id,
                doctor_id: validatedData.doctor_id,
                patient_id: patientId,
                appointment_date: validatedData.appointment_date,
                appointment_time: validatedData.appointment_time,
                status: initialStatus,
                payment_type: validatedData.payment_type || 'PARTICULAR',
                appointment_type: validatedData.type || 'IN_PERSON', // TELEMEDICINA, online or IN_PERSON
                health_insurance_plan_id: validatedData.health_insurance_plan_id || null,
                insurance_card_number: validatedData.insurance_card_number || null,
                insurance_card_validity: validatedData.insurance_card_validity || null,
            })
            .select()
            .single()

        if (appointmentError) {
            // Handle unique constraint violation (double booking)
            if (appointmentError.code === '23505') {
                const { data: availableSlots } = await supabase
                    .rpc('get_available_slots', {
                        p_doctor_id: validatedData.doctor_id,
                        p_date: validatedData.appointment_date,
                    }) as { data: Array<{ slot_time: string }> | null }

                throw new ConflictError(
                    'Este horário acabou de ser reservado. Escolha outro horário.',
                    {
                        available_slots: (availableSlots || []).map(slot => slot.slot_time),
                    }
                )
            }
            throw appointmentError
        }

        // 6.1 Auto-create video_room for TELEMEDICINA appointments
        let videoRoom = null
        // Check for both 'TELEMEDICINA' and 'online' as both are valid teleconsulta types
        const appointmentType = validatedData.type || 'IN_PERSON'
        if (appointmentType === 'TELEMEDICINA' || appointmentType === 'online') {
            const roomId = `room_${appointment.id.substring(0, 8)}_${Date.now()}`
            const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}`
            const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}`

            const { data: createdRoom, error: roomError } = await supabase
                .from('video_rooms')
                .insert({
                    appointment_id: appointment.id,
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
            }
        }


        // 7. Handle Payment Registration (Gateway-Agnostic)
        // Agora apenas registramos que pagamento é necessário, sem gateway integrado
        if (isPrepaid) {
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    clinic_id: clinic.id,
                    appointment_id: appointment.id,
                    patient_id: patientId,
                    amount: doctor.consultation_price,
                    status: 'PENDING',
                } as Record<string, unknown>)

            if (paymentError) throw paymentError

            // Buscar dados da clínica para instruções de pagamento
            const { data: clinicPaymentInfo } = await supabase
                .from('clinics')
                .select('pix_key, bank_account_info, payment_instructions, phone, email')
                .eq('id', clinic.id)
                .single()

            const doctorName = (doctor.user as { full_name: string })?.full_name || 'Médico'

            // Generate QR Code token
            const qrToken = generateQRToken(appointment.id)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
            const checkinUrl = generateCheckinUrl(baseUrl, appointment.id)
            const whatsappShareUrl = generateWhatsAppShareUrl({
                clinicName: clinic.name,
                doctorName,
                appointmentDate: validatedData.appointment_date,
                appointmentTime: validatedData.appointment_time,
                appointmentId: appointment.id,
                baseUrl,
            })

            // 🔥 FIX: Save QR code token to database
            const { error: qrError } = await supabase
                .from('appointment_qr_codes')
                .insert({
                    appointment_id: appointment.id,
                    clinic_id: clinic.id,
                    qr_token: qrToken,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                })

            if (qrError) {
                console.error('[QR_CODE] Error saving QR token:', qrError)
                // Don't fail appointment creation, just log
            }

            // ============================================================
            // SEND NOTIFICATIONS (PREPAID FLOW): Email to Patient + Notification to Clinic
            // ============================================================
            const { data: patientData } = await supabase
                .from('patients')
                .select('full_name, email, phone')
                .eq('id', patientId)
                .single()

            const { data: clinicNotifData } = await supabase
                .from('clinics')
                .select('name, email')
                .eq('id', clinic.id)
                .single()

            const prepaidAppointmentType = validatedData.type || 'IN_PERSON'
            const isPrepaidTelemedicine = prepaidAppointmentType === 'TELEMEDICINA' || prepaidAppointmentType === 'online'

            // Send email to patient
            if (patientData?.email) {
                try {
                    const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                    const QRCode = (await import('qrcode')).default

                    // Generate QR code image for the email
                    let qrCodeImageHtml = ''
                    if (!isPrepaidTelemedicine) {
                        try {
                            const qrImageDataUrl = await QRCode.toDataURL(checkinUrl, {
                                width: 200,
                                margin: 2,
                                color: { dark: '#000000', light: '#FFFFFF' },
                                errorCorrectionLevel: 'M'
                            })
                            qrCodeImageHtml = `
                                <div style="text-align: center; margin: 20px 0;">
                                    <img src="${qrImageDataUrl}" alt="QR Code Check-in" style="width: 200px; height: 200px;"/>
                                    <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Escaneie o QR Code no dia da consulta para fazer check-in</p>
                                </div>
                            `
                        } catch (qrImageError) {
                            console.warn('[EMAIL] QR code image generation failed:', qrImageError)
                        }
                    }

                    // Video link section for telemedicine
                    let videoLinkHtml = ''
                    if (isPrepaidTelemedicine && videoRoom) {
                        const videoUrl = `${baseUrl}/video/${appointment.id}?token=${(videoRoom as any).patient_token}`
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
                    if (!isPrepaidTelemedicine) {
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
                        clinicId: clinic.id,
                        to: patientData.email,
                        subject: `⏳ Agendamento Pendente - Complete o Pagamento - ${validatedData.appointment_date} às ${validatedData.appointment_time}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #f59e0b;">⏳ Agendamento Pendente de Pagamento</h2>
                                <p>Olá <strong>${patientData.full_name}</strong>,</p>
                                <p>Sua consulta foi pré-agendada. Complete o pagamento para confirmar:</p>
                                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorName}</p>
                                    <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${validatedData.appointment_date}</p>
                                    <p style="margin: 4px 0;"><strong>🕐 Horário:</strong> ${validatedData.appointment_time}</p>
                                    <p style="margin: 4px 0;"><strong>🏥 Clínica:</strong> ${clinicNotifData?.name || clinic.name}</p>
                                    <p style="margin: 4px 0;"><strong>📋 Tipo:</strong> ${isPrepaidTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                    <p style="margin: 4px 0;"><strong>💰 Valor:</strong> R$ ${(doctor.consultation_price / 100).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
                                    <h3 style="color: #92400e; margin: 0 0 8px 0;">💳 Instruções de Pagamento</h3>
                                    ${clinicPaymentInfo?.pix_key ? `<p><strong>Chave PIX:</strong> ${clinicPaymentInfo.pix_key}</p>` : ''}
                                    ${clinicPaymentInfo?.bank_account_info ? `<p><strong>Dados Bancários:</strong> ${clinicPaymentInfo.bank_account_info}</p>` : ''}
                                    <p>${clinicPaymentInfo?.payment_instructions || 'Entre em contato com a clínica para realizar o pagamento.'}</p>
                                </div>
                                ${videoLinkHtml}
                                ${checkinHtml}
                                <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                    Este e-mail foi enviado automaticamente. Após o pagamento, sua consulta será confirmada.
                                </p>
                            </div>
                        `,
                    })
                    console.log('[NOTIFICATION] Prepaid patient email sent to:', patientData.email)
                } catch (emailError) {
                    console.error('[NOTIFICATION] Prepaid patient email send failed:', emailError)
                    // Non-blocking - don't fail the appointment creation
                }
            }

            // Send notification to clinic
            if (clinicNotifData?.email) {
                try {
                    const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                    await sendEmailMultiTenant({
                        clinicId: clinic.id,
                        to: clinicNotifData.email,
                        subject: `⏳ Novo Agendamento (Pendente Pagamento) - ${patientData?.full_name || 'Paciente'}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #f59e0b;">⏳ Novo Agendamento - Aguardando Pagamento</h2>
                                <p>Um novo agendamento foi realizado e está aguardando confirmação de pagamento:</p>
                                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p style="margin: 4px 0;"><strong>👤 Paciente:</strong> ${patientData?.full_name || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>📧 Email:</strong> ${patientData?.email || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>📱 Telefone:</strong> ${patientData?.phone || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorName}</p>
                                    <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${validatedData.appointment_date}</p>
                                    <p style="margin: 4px 0;"><strong>🕐 Horário:</strong> ${validatedData.appointment_time}</p>
                                    <p style="margin: 4px 0;"><strong>📋 Tipo:</strong> ${isPrepaidTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                    <p style="margin: 4px 0;"><strong>💳 Pagamento:</strong> Particular (Pendente)</p>
                                    <p style="margin: 4px 0;"><strong>💰 Valor:</strong> R$ ${(doctor.consultation_price / 100).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <p style="color: #6b7280; font-size: 14px;">
                                    Aguarde a confirmação do pagamento para liberar o agendamento.
                                </p>
                            </div>
                        `,
                    })
                    console.log('[NOTIFICATION] Prepaid clinic notification sent to:', clinicNotifData.email)
                } catch (emailError) {
                    console.error('[NOTIFICATION] Prepaid clinic email send failed:', emailError)
                    // Non-blocking - don't fail the appointment creation
                }
            }

            // Gateway-Agnostic: Retornar instruções de pagamento em vez de URL do gateway
            return successResponse(
                {
                    appointment_id: appointment.id,
                    status: 'PENDING_PAYMENT',
                    message: 'Agendamento criado! Complete o pagamento para confirmar.',
                    qr_code: {
                        token: qrToken,
                        checkin_url: checkinUrl,
                        whatsapp_share_url: whatsappShareUrl,
                    },
                    payment_instructions: {
                        amount: doctor.consultation_price,
                        doctor_name: doctorName,
                        clinic_name: clinic.name,
                        clinic_phone: clinicPaymentInfo?.phone || null,
                        clinic_email: clinicPaymentInfo?.email || clinic.email,
                        pix_key: clinicPaymentInfo?.pix_key || null,
                        bank_account: clinicPaymentInfo?.bank_account_info || null,
                        instructions: clinicPaymentInfo?.payment_instructions ||
                            'Entre em contato com a clínica para realizar o pagamento.',
                    }
                },
                { status: 201 }
            )
        }



        // 10. Generate QR Code and return response for non-prepaid (confirmed directly)
        const qrToken = generateQRToken(appointment.id)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const checkinUrl = generateCheckinUrl(baseUrl, appointment.id)
        const doctorName = (doctor.user as { full_name: string })?.full_name || 'Médico'
        const whatsappShareUrl = generateWhatsAppShareUrl({
            clinicName: clinic.name,
            doctorName,
            appointmentDate: validatedData.appointment_date,
            appointmentTime: validatedData.appointment_time,
            appointmentId: appointment.id,
            baseUrl,
        })

        // 🔥 FIX: Save QR code token to database
        const { error: qrError } = await supabase
            .from('appointment_qr_codes')
            .insert({
                appointment_id: appointment.id,
                clinic_id: clinic.id,
                qr_token: qrToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            })

        if (qrError) {
            console.error('[QR_CODE] Error saving QR token:', qrError)
            // Don't fail appointment creation, just log
        }

        // ============================================================
        // SEND NOTIFICATIONS: Email to Patient + Notification to Clinic
        // ============================================================

        // Fetch patient and clinic data for notifications
        const { data: patientData } = await supabase
            .from('patients')
            .select('full_name, email, phone')
            .eq('id', patientId)
            .single()

        const { data: clinicNotifData } = await supabase
            .from('clinics')
            .select('name, email')
            .eq('id', clinic.id)
            .single()

        const notifAppointmentType = validatedData.type || 'IN_PERSON'
        const isTelemedicine = notifAppointmentType === 'TELEMEDICINA' || notifAppointmentType === 'online'

        // Send email to patient
        if (patientData?.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                const QRCode = (await import('qrcode')).default

                // Generate QR code image for the email
                let qrCodeImageHtml = ''
                if (!isTelemedicine) {
                    try {
                        const qrImageDataUrl = await QRCode.toDataURL(checkinUrl, {
                            width: 200,
                            margin: 2,
                            color: { dark: '#000000', light: '#FFFFFF' },
                            errorCorrectionLevel: 'M'
                        })
                        qrCodeImageHtml = `
                            <div style="text-align: center; margin: 20px 0;">
                                <img src="${qrImageDataUrl}" alt="QR Code Check-in" style="width: 200px; height: 200px;"/>
                                <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Escaneie o QR Code no dia da consulta para fazer check-in</p>
                            </div>
                        `
                    } catch (qrImageError) {
                        console.warn('[EMAIL] QR code image generation failed:', qrImageError)
                    }
                }

                // Video link section for telemedicine
                let videoLinkHtml = ''
                if (isTelemedicine && videoRoom) {
                    const videoUrl = `${baseUrl}/video/${appointment.id}?token=${(videoRoom as any).patient_token}`
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
                if (!isTelemedicine) {
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
                    clinicId: clinic.id,
                    to: patientData.email,
                    subject: `✅ Consulta Confirmada - ${validatedData.appointment_date} às ${validatedData.appointment_time}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #10b981;">✅ Agendamento Confirmado!</h2>
                            <p>Olá <strong>${patientData.full_name}</strong>,</p>
                            <p>Sua consulta foi agendada com sucesso:</p>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorName}</p>
                                <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${validatedData.appointment_date}</p>
                                <p style="margin: 4px 0;"><strong>🕐 Horário:</strong> ${validatedData.appointment_time}</p>
                                <p style="margin: 4px 0;"><strong>🏥 Clínica:</strong> ${clinicNotifData?.name || clinic.name}</p>
                                <p style="margin: 4px 0;"><strong>📋 Tipo:</strong> ${isTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                            </div>
                            ${videoLinkHtml}
                            ${checkinHtml}
                            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                Este e-mail foi enviado automaticamente. Caso precise cancelar ou reagendar, entre em contato com a clínica.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Patient email sent to:', patientData.email)
            } catch (emailError) {
                console.error('[NOTIFICATION] Patient email send failed:', emailError)
                // Non-blocking - don't fail the appointment creation
            }
        }

        // Send notification to clinic
        if (clinicNotifData?.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                await sendEmailMultiTenant({
                    clinicId: clinic.id,
                    to: clinicNotifData.email,
                    subject: `🗓️ Novo Agendamento Online - ${patientData?.full_name || 'Paciente'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #3b82f6;">🗓️ Novo Agendamento Recebido!</h2>
                            <p>Um novo agendamento foi realizado através da página pública de agendamento:</p>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>👤 Paciente:</strong> ${patientData?.full_name || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>📧 Email:</strong> ${patientData?.email || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>📱 Telefone:</strong> ${patientData?.phone || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorName}</p>
                                <p style="margin: 4px 0;"><strong>📅 Data:</strong> ${validatedData.appointment_date}</p>
                                <p style="margin: 4px 0;"><strong>🕐 Horário:</strong> ${validatedData.appointment_time}</p>
                                <p style="margin: 4px 0;"><strong>📋 Tipo:</strong> ${isTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                <p style="margin: 4px 0;"><strong>💳 Pagamento:</strong> ${validatedData.payment_type === 'CONVENIO' ? 'Convênio' : 'Particular'}</p>
                            </div>
                            <p style="color: #6b7280; font-size: 14px;">
                                O agendamento já está visível na agenda do sistema.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Clinic notification sent to:', clinicNotifData.email)
            } catch (emailError) {
                console.error('[NOTIFICATION] Clinic email send failed:', emailError)
                // Non-blocking - don't fail the appointment creation
            }
        }

        return successResponse(
            {
                appointment_id: appointment.id,
                message: 'Consulta agendada com sucesso',
                qr_code: {
                    token: qrToken,
                    checkin_url: checkinUrl,
                    whatsapp_share_url: whatsappShareUrl,
                },
            },
            { status: 201 }
        )

    } catch (error) {
        return handleApiError(error)
    }
}

