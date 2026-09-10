import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

// Force Node.js runtime for Supabase server client and email support
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api/appointments/[id]?include=qr_code
 * Fetch a single appointment with optional QR code
 */

console.log('[DEBUG] Loading appointments/[id]/route.ts module')

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        console.log('[DEBUG] Handling GET /api/appointments/[id]')
        const { id: appointmentId } = await params
        console.log('[DEBUG] Params resolved, ID:', appointmentId)
        const url = new URL(request.url)
        const includeQRCode = url.searchParams.get('include') === 'qr_code'

        const supabase = await createClient()

        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Authorization is handled by RLS when using standard client
        // But we can check role for extra safety if needed
        const isSuperAdmin = false // We can get this from token if needed, or rely on RLS

        // Fetch appointment with full details using service role (bypasses RLS)
        console.log('[DEBUG] Fetching appointment with ID:', appointmentId)
        // console.log('[DEBUG] Using adminDb (service role):', !!adminDb) // Removed

        // Use standard supabase client (with user session) to respect RLS
        // This avoids issues if Service Role Key is misconfigured in Prod
        const { data: appointment, error } = await supabase
            .from('appointments')
            .select(`
                *,
                patient:patients!appointments_patient_id_fkey(id, full_name, phone, email, cpf),
                doctor:doctors!appointments_doctor_id_fkey(
                    id,
                    user:users(full_name),
                    specialty,
                    crm
                ),
                co_doctor:doctors!appointments_co_doctor_id_fkey(
                    id,
                    user:users(full_name),
                    specialty,
                    crm
                ),
                professional_supervised:doctors!appointments_professional_supervised_id_fkey(
                    id,
                    user:users(full_name),
                    specialty,
                    crm
                ),
                student:students!appointments_student_id_fkey(
                    id,
                    full_name,
                    contact_phone,
                    contact_email,
                    program
                ),
                clinic:clinics!appointments_clinic_id_fkey(id, name, slug)
            `)
            .eq('id', appointmentId)
            .single()

        console.log('[DEBUG] Full Query result:', {
            hasData: !!appointment,
            hasError: !!error,
            errorMessage: error?.message,
            errorCode: error?.code
        })

        if (error) {
            console.error('[ERROR] Supabase error details:', JSON.stringify(error))
            return NextResponse.json(
                {
                    error: 'Erro ao buscar agendamento (Query Falhou)',
                    details: error.message,
                    code: error.code,
                    hint: error.hint
                },
                { status: 500 }
            )
        }

        if (!appointment) {
            console.error('[ERROR] Appointment not found in database (Check 2):', appointmentId)
            return NextResponse.json(
                { error: 'Agendamento não encontrado (Check 2)', code: 'NOT_FOUND', id: appointmentId },
                { status: 404 }
            )
        }

        console.log('[DEBUG] Appointment found successfully:', appointment.id)

        console.log('[DEBUG] Appointment found, fetching QR code...')
        let qrCode = null
        if (includeQRCode) {
            // Fetch QR code if requested
            const { data: qrData } = await supabase
                .from('appointment_qr_codes')
                .select('*')
                .eq('appointment_id', appointmentId)
                .single()

            if (qrData) {
                const qr = qrData as any
                qrCode = {
                    id: qr.id,
                    token: qr.qr_token,
                    image: qr.qr_data?.qrCodeImage || qr.qr_data?.qr_code_image,
                    url: qr.qr_data?.checkinUrl || qr.qr_data?.checkin_url,
                    expires_at: qr.expires_at
                }
            }
        }

        // Fetch video_room for teleconsulta (same pattern as QR code)
        let videoRoom = null
        const appointmentType = (appointment as any).type || (appointment as any).appointment_type

        if (appointmentType === 'TELEMEDICINA' || appointmentType === 'online') {
            const { data: roomData } = await supabase
                .from('video_rooms')
                .select('room_id, patient_token, doctor_token')
                .eq('appointment_id', appointmentId)
                .maybeSingle()

            if (roomData) {
                videoRoom = roomData
            }
        }

        return successResponse({
            ...(appointment as any),
            qr_code: qrCode,
            video_room: videoRoom
        })

    } catch (error) {
        console.error('Error fetching appointment:', error)
        return NextResponse.json(
            { error: 'Erro ao buscar agendamento' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: appointmentId } = await params

        const body = await request.json()
        const validatedData = updateAppointmentSchema.parse(body)

        // First get the authenticated user from session
        const supabaseClient = await createClient()
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user role and clinic from database
        const { data: currentUser } = await supabaseClient
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
        }

        // Use Service Role to bypass RLS for the update
        const adminDb = createServiceRoleClient() as any

        // Get appointment with full details for email (including appointment_type and video_room for teleconsultas)
        const { data: appointment, error: fetchError } = await adminDb
            .from('appointments')
            .select(`
                clinic_id, doctor_id, co_doctor_id, status, appointment_date, appointment_time, appointment_type,
                patient:patients!appointments_patient_id_fkey(id, full_name, email, phone),
                doctor:doctors!appointments_doctor_id_fkey(user:users(full_name)),
                co_doctor:doctors!appointments_co_doctor_id_fkey(user:users(full_name)),
                clinic:clinics!appointments_clinic_id_fkey(id, name),
                video_room:video_rooms(room_id, patient_token)
            `)
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Check authorization
        if (currentUser.role !== 'SUPER_ADMIN') {
            if (currentUser.clinic_id !== appointment.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }

            // Doctors can only update their own appointments (as doctor or co-doctor)
            if (currentUser.role === 'DOCTOR') {
                const { data: doctor } = await adminDb
                    .from('doctors')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .single()

                if (doctor?.id !== appointment.doctor_id && doctor?.id !== appointment.co_doctor_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        // Check if date or time is changing (for email notification)
        const isRescheduling =
            (validatedData.appointment_date && validatedData.appointment_date !== appointment.appointment_date) ||
            (validatedData.appointment_time && validatedData.appointment_time !== appointment.appointment_time)

        // Check if changing to teleconsulta (need to generate video_link and video_room)
        const isChangingToTeleconsulta = validatedData.appointment_type &&
            (validatedData.appointment_type === 'online' || validatedData.appointment_type === 'TELEMEDICINA') &&
            appointment.appointment_type !== 'online' && appointment.appointment_type !== 'TELEMEDICINA'

        // Auto-generate video_link when switching to teleconsulta
        if (isChangingToTeleconsulta && !validatedData.video_link) {
            const { generateVideoRoomUrl } = await import('@/lib/utils/video')
            validatedData.video_link = generateVideoRoomUrl(appointmentId)
        }

        // Update appointment
        const { data: updatedAppointment, error: updateError } = await adminDb
            .from('appointments')
            .update(validatedData)
            .eq('id', appointmentId)
            .select(`
                *,
                doctor:doctors!appointments_doctor_id_fkey(user:users(full_name)),
                co_doctor:doctors!appointments_co_doctor_id_fkey(user:users(full_name)),
                patient:patients!appointments_patient_id_fkey(full_name, email)
            `)
            .single()

        if (updateError) throw updateError

        // Auto-create video_room when switching to teleconsulta
        if (isChangingToTeleconsulta) {
            try {
                const roomId = `room_${appointmentId.substring(0, 8)}_${Date.now()}`
                const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
                const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

                await adminDb
                    .from('video_rooms')
                    .insert({
                        appointment_id: appointmentId,
                        room_id: roomId,
                        patient_token: patientToken,
                        doctor_token: doctorToken,
                    })

                console.log('[VIDEO_ROOM] Created video room for type change to teleconsulta:', roomId)
            } catch (roomError) {
                console.error('[VIDEO_ROOM] Error creating room on type change:', roomError)
            }
        }

        // Send reschedule email notification if date/time changed
        if (isRescheduling && appointment.patient?.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                const newDate = validatedData.appointment_date || appointment.appointment_date
                const newTime = validatedData.appointment_time || appointment.appointment_time
                const doctorName = appointment.doctor?.user?.full_name || 'Médico'
                const clinicName = appointment.clinic?.name || 'Clínica'
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'

                // Detect appointment type for conditional email content
                const appointmentType = appointment.appointment_type || 'IN_PERSON'
                const isTeleconsulta = appointmentType === 'TELEMEDICINA' || appointmentType === 'online'

                // Generate appropriate link based on type
                let actionHtml = ''
                if (isTeleconsulta && appointment.video_room) {
                    const patientVideoLink = `${baseUrl}/video/${appointment.video_room.room_id}?role=patient&token=${appointment.video_room.patient_token}`
                    actionHtml = `
                        <h3 style="color: #3b82f6;">📹 Acesse sua Teleconsulta</h3>
                        <p>Sua consulta será realizada online. No novo horário, clique no botão abaixo:</p>
                        <p style="text-align: center;">
                            <a href="${patientVideoLink}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                🎥 Entrar na Teleconsulta
                            </a>
                        </p>
                    `
                } else {
                    const checkinUrl = `${baseUrl}/checkin/${appointmentId}`
                    actionHtml = `
                        <h3 style="color: #3b82f6;">📱 Faça seu Pré-Check-in Online</h3>
                        <p>Agilize seu atendimento fazendo o pré-check-in antes da consulta:</p>
                        <p style="text-align: center;">
                            <a href="${checkinUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Fazer Pré-Check-in
                            </a>
                        </p>
                    `
                }

                await sendEmailMultiTenant({
                    clinicId: appointment.clinic_id,
                    to: appointment.patient.email,
                    subject: isTeleconsulta
                        ? `📹 Teleconsulta Reagendada - ${newDate} às ${newTime}`
                        : `📅 Consulta Reagendada - ${newDate} às ${newTime}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #3b82f6;">📅 Sua Consulta foi Reagendada</h2>
                            <p>Olá <strong>${appointment.patient.full_name}</strong>,</p>
                            <p>Sua consulta foi reagendada para um novo horário:</p>
                            
                            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #f59e0b;">
                                <p style="margin: 4px 0; color: #92400e;"><strong>Horário anterior:</strong> ${appointment.appointment_date} às ${appointment.appointment_time.substring(0, 5)}</p>
                            </div>
                            
                            <div style="background: #d1fae5; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #10b981;">
                                <p style="margin: 4px 0; color: #065f46;"><strong>👨‍⚕️ Médico:</strong> Dr(a). ${doctorName}</p>
                                <p style="margin: 4px 0; color: #065f46;"><strong>📅 Nova Data:</strong> ${newDate}</p>
                                <p style="margin: 4px 0; color: #065f46;"><strong>🕐 Novo Horário:</strong> ${newTime}</p>
                                <p style="margin: 4px 0; color: #065f46;"><strong>📍 Modalidade:</strong> ${isTeleconsulta ? '📹 Teleconsulta (Online)' : '🏥 Presencial - ' + clinicName}</p>
                            </div>
                            
                            ${actionHtml}
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                Este e-mail foi enviado automaticamente. Caso precise cancelar ou reagendar novamente, entre em contato com a clínica.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Reschedule email sent to:', appointment.patient.email)
            } catch (emailError) {
                console.error('[NOTIFICATION] Reschedule email failed:', emailError)
                // Non-blocking - don't fail the update
            }
        }

        return successResponse(updatedAppointment)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: appointmentId } = await params
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: currentUser } = await supabase
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient() as any

        // Buscar agendamento e verificar clinic_id
        const { data: appointment, error: fetchError } = await adminDb
            .from('appointments')
            .select('id, clinic_id, doctor_id, status, patient_id')
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Validação de segurança e isolamento multi-tenant
        if (currentUser.role !== 'SUPER_ADMIN') {
            const headerClinicId = request.headers.get('x-clinic-id')
            const effectiveClinicId = headerClinicId || currentUser.clinic_id

            if (appointment.clinic_id !== effectiveClinicId && appointment.clinic_id !== currentUser.clinic_id) {
                throw new ForbiddenError('Acesso negado: agendamento pertence a outra clínica')
            }

            if (currentUser.role === 'DOCTOR') {
                const { data: doctor } = await adminDb
                    .from('doctors')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .single()

                if (doctor?.id !== appointment.doctor_id) {
                    throw new ForbiddenError('Acesso negado: profissional não autorizado')
                }
            }
        }

        // Desvincular e limpar registros dependentes antes da exclusao
        await adminDb.from('appointment_qr_codes').delete().eq('appointment_id', appointmentId)
        await adminDb.from('video_rooms').delete().eq('appointment_id', appointmentId)
        await adminDb.from('reschedule_tokens').delete().eq('new_appointment_id', appointmentId)
        await adminDb.from('nps_surveys').delete().eq('appointment_id', appointmentId)

        // Desvincular foreign keys com restricao para nao quebrar integridade referencial
        await adminDb.from('financial_entries').update({ appointment_id: null }).eq('appointment_id', appointmentId)
        await adminDb.from('waiting_list').update({ scheduled_appointment_id: null }).eq('scheduled_appointment_id', appointmentId)
        await adminDb.from('consultations').update({ appointment_id: null }).eq('appointment_id', appointmentId)
        await adminDb.from('payments').update({ appointment_id: null }).eq('appointment_id', appointmentId)
        await adminDb.from('tiss_guides').update({ appointment_id: null }).eq('appointment_id', appointmentId)
        await adminDb.from('referrals').update({ converted_appointment_id: null }).eq('converted_appointment_id', appointmentId)

        // Excluir agendamento do banco
        const { error: deleteError } = await adminDb
            .from('appointments')
            .delete()
            .eq('id', appointmentId)

        if (deleteError) {
            console.error('[APPOINTMENT_DELETE] Error:', deleteError)
            return NextResponse.json({ error: 'Erro ao excluir agendamento: ' + deleteError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Agendamento removido da grade com sucesso'
        }, {
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        return handleApiError(error)
    }
}

