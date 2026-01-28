import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/video/validate-token
 * Validates patient/doctor token for video room access
 * Returns appointment info if token is valid
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

        const supabase = await createClient()

        // Find video room by room_id and validate token
        const { data: videoRoom, error: roomError } = await (supabase
            .from('video_rooms') as any)
            .select(`
                id,
                room_id,
                appointment_id,
                patient_token,
                doctor_token,
                status,
                appointments (
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
                        name,
                        specialty
                    ),
                    clinic:clinics (
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
        const appointment = videoRoom.appointments
        if (!appointment) {
            return NextResponse.json(
                { error: 'Consulta não encontrada' },
                { status: 404 }
            )
        }

        // Return success with appointment info
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
                doctor: appointment.doctor,
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
