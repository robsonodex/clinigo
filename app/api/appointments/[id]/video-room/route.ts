import { withAxiom, AxiomRequest } from 'next-axiom'
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { successResponse } from '@/lib/utils/responses'

export const dynamic = 'force-dynamic'

/**
 * GET /api/appointments/[id]/video-room
 * Retorna os dados da sala de vídeo e os links de acesso do paciente e do profissional
 */
export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id: appointmentId } = await params
        const supabase = createServiceRoleClient() as any

        const { data: videoRoom, error: roomError } = await supabase
            .from('video_rooms')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

        if (roomError) {
            console.error('[VIDEO_ROOM] Erro ao buscar sala:', roomError)
            return NextResponse.json({ error: 'Erro ao consultar sala' }, { status: 500 })
        }

        if (!videoRoom) {
            return NextResponse.json({ data: null, exists: false })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const patientUrl = `${baseUrl}/video/${videoRoom.room_id}?role=patient&token=${videoRoom.patient_token}`
        const doctorUrl = `${baseUrl}/video/${videoRoom.room_id}?role=doctor&token=${videoRoom.doctor_token}`

        return successResponse({
            exists: true,
            video_room: videoRoom,
            patient_url: patientUrl,
            doctor_url: doctorUrl,
            room_id: videoRoom.room_id,
            patient_token: videoRoom.patient_token,
            doctor_token: videoRoom.doctor_token
        })
    } catch (error: any) {
        request.log.error('appointments/[id]/video-room', { error: error instanceof Error ? error.message : String(error) })
        console.error('[VIDEO_ROOM] Erro GET:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

/**
 * POST /api/appointments/[id]/video-room
 * Garante a criação de uma sala de teleconsulta com tokens únicos e seguros
 */
export const POST = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id: appointmentId } = await params
        const supabase = createServiceRoleClient() as any

        // 1. Verificar se o agendamento existe
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('id, clinic_id, appointment_type, status')
            .eq('id', appointmentId)
            .single()

        if (aptError || !appointment) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        // 2. Verificar se já possui sala criada
        const { data: existingRoom } = await supabase
            .from('video_rooms')
            .select('*')
            .eq('appointment_id', appointmentId)
            .maybeSingle()

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'

        if (existingRoom) {
            const patientUrl = `${baseUrl}/video/${existingRoom.room_id}?role=patient&token=${existingRoom.patient_token}`
            const doctorUrl = `${baseUrl}/video/${existingRoom.room_id}?role=doctor&token=${existingRoom.doctor_token}`

            return successResponse({
                created: false,
                video_room: existingRoom,
                patient_url: patientUrl,
                doctor_url: doctorUrl,
                room_id: existingRoom.room_id,
                patient_token: existingRoom.patient_token,
                doctor_token: existingRoom.doctor_token
            })
        }

        // 3. Gerar tokens e identificador único da sala
        const roomId = `room_${appointmentId.substring(0, 8)}_${Date.now()}`
        const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
        const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

        const { data: createdRoom, error: createError } = await supabase
            .from('video_rooms')
            .insert({
                appointment_id: appointmentId,
                room_id: roomId,
                patient_token: patientToken,
                doctor_token: doctorToken,
            })
            .select()
            .single()

        if (createError) {
            console.error('[VIDEO_ROOM] Erro ao criar sala:', createError)
            return NextResponse.json({ error: 'Falha ao criar sala de teleconsulta' }, { status: 500 })
        }

        const patientUrl = `${baseUrl}/video/${roomId}?role=patient&token=${patientToken}`
        const doctorUrl = `${baseUrl}/video/${roomId}?role=doctor&token=${doctorToken}`

        // Atualizar o agendamento para tipo online e salvar video_link
        await supabase
            .from('appointments')
            .update({
                appointment_type: 'online',
                video_link: patientUrl
            })
            .eq('id', appointmentId)

        return successResponse({
            created: true,
            video_room: createdRoom,
            patient_url: patientUrl,
            doctor_url: doctorUrl,
            room_id: roomId,
            patient_token: patientToken,
            doctor_token: doctorToken
        })
    } catch (error: any) {
        request.log.error('appointments/[id]/video-room', { error: error instanceof Error ? error.message : String(error) })
        console.error('[VIDEO_ROOM] Erro POST:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})
