import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

interface RouteParams {
    params: Promise<{ appointmentId: string }>
}

/**
 * GET /api/appointments/[appointmentId]?include=qr_code
 * Fetch a single appointment with optional QR code
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const { appointmentId } = await params
        const url = new URL(request.url)
        const includeQRCode = url.searchParams.get('include') === 'qr_code'

        const supabase = await createClient()

        // Get user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Check if appointment exists (debug mode)
        // Try with service role to confirm existence independent of RLS
        const adminDb = createServiceRoleClient()
        const { data: adminCheck, error: adminError } = await adminDb
            .from('appointments')
            .select('id, clinic_id')
            .eq('id', appointmentId)
            .single()

        console.log(`[DEBUG] Appointment ${appointmentId} admin check:`, {
            found: adminCheck ? 'Found' : 'Not Found',
            adminCheckData: adminCheck,
            adminError: adminError?.message || null,
            adminErrorCode: adminError?.code || null
        })

        // Get user role and clinic for authorization
        const { data: currentUser } = await adminDb
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        console.log('[DEBUG] Current user:', {
            userId: user.id,
            role: currentUser?.role,
            clinicId: currentUser?.clinic_id
        })

        // Check if user has access to this appointment
        const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
        const sameClinic = currentUser?.clinic_id === adminCheck?.clinic_id

        if (!adminCheck) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado', code: 'NOT_FOUND', id: appointmentId },
                { status: 404 }
            )
        }

        if (!isSuperAdmin && !sameClinic) {
            console.log('[DEBUG] Access denied - not SUPER_ADMIN and different clinic')
            return NextResponse.json(
                { error: 'Você não tem permissão para visualizar este agendamento', code: 'FORBIDDEN' },
                { status: 403 }
            )
        }

        // Fetch appointment with full details using service role (bypasses RLS)
        console.log('[DEBUG] Fetching appointment with ID:', appointmentId)
        console.log('[DEBUG] Using adminDb (service role):', !!adminDb)

        const { data: appointment, error } = await adminDb
            .from('appointments')
            .select(`
                *,
                patient:patients!appointments_patient_id_fkey(id, full_name, phone, email, cpf),
                doctor:doctors!appointments_doctor_id_fkey(
                    id,
                    user:users(full_name)
                ),
                clinic:clinics!appointments_clinic_id_fkey(id, name, slug),
                video_room:video_rooms!video_rooms_appointment_id_fkey(room_id, patient_token, doctor_token)
            `)
            .eq('id', appointmentId)
            .single()

        console.log('[DEBUG] Query result - error:', error)
        console.log('[DEBUG] Query result - has data:', !!appointment)

        if (error) {
            console.error('[ERROR] Supabase error details:', JSON.stringify(error))
            return NextResponse.json(
                {
                    error: 'Erro ao buscar agendamento',
                    details: error.message,
                    code: error.code,
                    hint: error.hint
                },
                { status: 500 }
            )
        }

        if (!appointment) {
            console.error('[ERROR] Appointment not found in database:', appointmentId)
            return NextResponse.json(
                { error: 'Agendamento não encontrado', code: 'NOT_FOUND', id: appointmentId },
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

        return NextResponse.json({
            appointment,
            qr_code: qrCode
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
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateAppointmentSchema.parse(body)

        // Use Service Role to bypass RLS, checking permissions manually below
        const supabase = createServiceRoleClient() as any

        // Get appointment
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('clinic_id, doctor_id, status')
            .eq('id', appointmentId)
            .single()

        if (fetchError || !appointment) {
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

            // Doctors can only update their own appointments
            if (userRole === 'DOCTOR') {
                const { data: doctor } = await supabase
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .single()

                if (doctor?.id !== appointment.doctor_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        }

        // Update appointment
        const { data: updatedAppointment, error: updateError } = await supabase
            .from('appointments')
            .update(validatedData)
            .eq('id', appointmentId)
            .select(`
        *,
        doctor:doctors!appointments_doctor_id_fkey(user:users(full_name)),
        patient:patients!appointments_patient_id_fkey(full_name, email)
      `)
            .single()

        if (updateError) throw updateError

        return successResponse(updatedAppointment)
    } catch (error) {
        return handleApiError(error)
    }
}
