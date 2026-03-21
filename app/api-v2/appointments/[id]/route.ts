import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateAppointmentSchema } from '@/lib/validations/appointment'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * GET /api-v2/appointments/[id]?include=qr_code
 * Fetch a single appointment with optional QR code
 */
export const dynamic = 'force-dynamic'

console.log('[DEBUG-V2] Loading appointments/[id]/route.ts module')

export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        console.log('[DEBUG-V2] Handling GET /api-v2/appointments/[id]')
        const { id: appointmentId } = await params
        console.log('[DEBUG-V2] Params resolved, ID:', appointmentId)
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
        console.log('[DEBUG-V2] Fetching appointment with ID:', appointmentId)
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
                    user:users(full_name)
                ),
                clinic:clinics!appointments_clinic_id_fkey(id, name, slug)
            `)
            .eq('id', appointmentId)
            .single()

        console.log('[DEBUG-V2] Full Query result:', {
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

        console.log('[DEBUG-V2] Appointment found successfully:', (appointment as any).id)

        console.log('[DEBUG-V2] Appointment found, fetching QR code...')
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
                let parsedQrData = qr.qr_data;
                if (typeof parsedQrData === 'string') {
                    try { parsedQrData = JSON.parse(parsedQrData); } catch (e) { }
                }

                qrCode = {
                    id: qr.id,
                    token: qr.qr_token,
                    image: parsedQrData?.qrCodeImage || parsedQrData?.qr_code_image,
                    url: parsedQrData?.checkinUrl || parsedQrData?.checkin_url || parsedQrData?.preRegistrationUrl,
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
