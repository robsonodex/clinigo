import { withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video/validate-token
 * Validates patient/doctor token for video room access
 * Returns appointment info if token is valid
 * 
 * NOTE: Uses Service Role Client to bypass RLS because patients access
 * via token URL without being logged in. The token itself is the authentication.
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const { roomId, token, role } = await request.json()

        if (!roomId || !token) {
            return NextResponse.json(
                { error: 'roomId e token são obrigatórios' },
                { status: 400 }
            )
        }

        // Use Service Role to bypass RLS - patients access via token URL without auth session
        // The patient_token/doctor_token IS the authentication mechanism
        const supabase = createServiceRoleClient()

        // Suporte resiliente a salas instantâneas avulsas emitidas pela recepção
        if (typeof roomId === 'string' && roomId.startsWith('quick_')) {
            const isPatient = role === 'patient' && typeof token === 'string' && token.startsWith('patient_')
            const isDoctor = role === 'doctor' && typeof token === 'string' && token.startsWith('doctor_')

            if (isPatient || isDoctor) {
                return NextResponse.json({
                    valid: true,
                    role: isPatient ? 'patient' : 'doctor',
                    roomId,
                    appointmentId: roomId,
                    appointment: {
                        id: roomId,
                        date: new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        status: 'CONFIRMED',
                        type: 'online',
                        patient: { full_name: 'Atendimento Online Imediato', email: '' },
                        doctor: { full_name: 'Terapeuta WorldSensory', specialty: 'Teleatendimento' },
                        clinic: { name: 'WorldSensory Terapias Multidisciplinares', slug: 'worldsensory' }
                    }
                })
            }
        }

        // Find video room by room_id or appointment_id and validate token
        const selectFields = `
            id,
            room_id,
            appointment_id,
            patient_token,
            doctor_token,
            appointment:appointments (
                id,
                appointment_date,
                appointment_time,
                status,
                appointment_type,
                patient:patients (
                    id,
                    full_name,
                    email
                ),
                doctor:doctors!appointments_doctor_id_fkey (
                    id,
                    specialty,
                    user:users!doctors_user_id_fkey (
                        full_name
                    )
                ),
                clinic:clinics!appointments_clinic_id_fkey (
                    id,
                    name,
                    slug
                )
            )
        `

        let { data: videoRoom, error: roomError } = await (supabase
            .from('video_rooms') as any)
            .select(selectFields)
            .eq('room_id', roomId)
            .maybeSingle()

        if (!videoRoom) {
            const { data: byApt } = await (supabase
                .from('video_rooms') as any)
                .select(selectFields)
                .eq('appointment_id', roomId)
                .maybeSingle()
            if (byApt) {
                videoRoom = byApt
                roomError = null
            }
        }

        if (roomError || !videoRoom) {
            console.error('[VALIDATE-TOKEN] Room not found:', roomError)
            return NextResponse.json(
                { error: 'Sala de vídeo não encontrada' },
                { status: 404 }
            )
        }

        // Validate token based on role
        const isPatient = role === 'patient' && token === videoRoom.patient_token
        const isDoctor = role === 'doctor' && token === videoRoom.doctor_token

        if (!isPatient && !isDoctor) {
            console.error('[VALIDATE-TOKEN] Invalid token for role:', role)
            return NextResponse.json(
                { error: 'Token inválido' },
                { status: 401 }
            )
        }

        // Check if appointment is for telemedicine
        const appointment = videoRoom.appointment
        if (!appointment) {
            return NextResponse.json(
                { error: 'Consulta não encontrada' },
                { status: 404 }
            )
        }

        // Return success with appointment info
        // Normalize doctor structure: extract full_name from nested user
        const doctor = appointment.doctor
        const normalizedDoctor = doctor ? {
            id: doctor.id,
            full_name: doctor.user?.full_name || 'Médico',
            specialty: doctor.specialty
        } : null

        return NextResponse.json({
            valid: true,
            role: isPatient ? 'patient' : 'doctor',
            roomId: videoRoom.room_id,
            appointmentId: videoRoom.appointment_id,
            appointment: {
                id: appointment.id,
                date: appointment.appointment_date,
                time: appointment.appointment_time,
                status: appointment.status,
                type: appointment.appointment_type,
                patient: appointment.patient,
                doctor: normalizedDoctor,
                clinic: appointment.clinic
            }
        })

    } catch (error) {
        request.log.error('video/validate-token', { error: error instanceof Error ? error.message : String(error) })
        console.error('[VALIDATE-TOKEN] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
})
