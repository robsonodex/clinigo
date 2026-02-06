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
export async function POST(request: Request) {
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

        // Find video room by room_id and validate token
        const { data: videoRoom, error: roomError } = await (supabase
            .from('video_rooms') as any)
            .select(`
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
                    type,
                    patient:patients (
                        id,
                        full_name,
                        email
                    ),
                    doctor:doctors (
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
            `)
            .eq('room_id', roomId)
            .single()

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
                type: appointment.type,
                patient: appointment.patient,
                doctor: normalizedDoctor,
                clinic: appointment.clinic
            }
        })

    } catch (error) {
        console.error('[VALIDATE-TOKEN] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
