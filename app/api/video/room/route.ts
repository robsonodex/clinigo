import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get video room by appointment ID
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const appointmentId = searchParams.get('appointment_id')
        const roomId = searchParams.get('room_id')

        if (!appointmentId && !roomId) {
            return NextResponse.json({ error: 'appointment_id ou room_id necessário' }, { status: 400 })
        }

        let query = supabase
            .from('video_rooms')
            .select(`
        *,
        doctor:doctors(id, specialty, users(full_name)),
        patient:patients(id, full_name, email, phone),
        appointment:appointments(id, appointment_date, appointment_time, status)
      `)

        if (appointmentId) {
            query = query.eq('appointment_id', appointmentId)
        } else if (roomId) {
            query = query.eq('id', roomId)
        }

        const { data: room, error } = await query.single()

        if (error || !room) {
            return NextResponse.json({ error: 'Sala não encontrada' }, { status: 404 })
        }

        return NextResponse.json({ room })
    } catch (error) {
        console.error('Video room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create or get video room for appointment
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { appointment_id, provider = 'GOOGLE_MEET' } = body

        if (!appointment_id) {
            return NextResponse.json({ error: 'appointment_id é obrigatório' }, { status: 400 })
        }

        // Check if room already exists
        const { data: existingRoom } = await supabase
            .from('video_rooms')
            .select('*')
            .eq('appointment_id', appointment_id)
            .single()

        if (existingRoom) {
            return NextResponse.json({ room: existingRoom, created: false })
        }

        // Get appointment details
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('*, doctor:doctors(id, users(email)), patient:patients(id, full_name)')
            .eq('id', appointment_id)
            .single()

        if (aptError || !appointment) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        // Generate room URL based on provider
        let roomUrl = ''
        let roomId = ''

        switch (provider) {
            case 'GOOGLE_MEET':
                // In production, use Google Calendar API to create meet link
                roomId = `clinigo-${appointment_id.substring(0, 8)}`
                roomUrl = `https://meet.google.com/${roomId}`
                break

            case 'JITSI':
                roomId = `clinigo-${appointment_id.substring(0, 8)}`
                roomUrl = `https://meet.jit.si/${roomId}`
                break

            case 'DAILY':
                // In production, use Daily.co API
                roomId = `clinigo-${appointment_id.substring(0, 8)}`
                roomUrl = `https://clinigo.daily.co/${roomId}`
                break

            default:
                roomId = `clinigo-${appointment_id.substring(0, 8)}`
                roomUrl = `https://meet.jit.si/${roomId}`
        }

        // Generate access code
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString()

        // Calculate scheduled times
        const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
        const endDateTime = new Date(appointmentDateTime.getTime() + 30 * 60 * 1000)

        // Create room
        const { data: room, error: roomError } = await supabase
            .from('video_rooms')
            .insert({
                clinic_id: (appointment as any).clinic_id,
                appointment_id,
                provider,
                room_id: roomId,
                room_url: roomUrl,
                access_code: accessCode,
                doctor_id: (appointment as any).doctor_id,
                patient_id: (appointment as any).patient_id,
                scheduled_start: appointmentDateTime.toISOString(),
                scheduled_end: endDateTime.toISOString()
            })
            .select()
            .single()

        if (roomError) {
            console.error('Create room error:', roomError)
            return NextResponse.json({ error: 'Erro ao criar sala' }, { status: 500 })
        }

        // Update appointment with video link
        await supabase
            .from('appointments')
            .update({
                video_link: roomUrl,
                video_room_id: room.id
            })
            .eq('id', appointment_id)

        return NextResponse.json({ room, created: true })
    } catch (error) {
        console.error('Create room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update room status (start/end consultation)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { room_id, action } = body

        if (!room_id || !action) {
            return NextResponse.json({ error: 'room_id e action são obrigatórios' }, { status: 400 })
        }

        let updates: any = {}

        switch (action) {
            case 'start':
                updates = {
                    is_active: true,
                    actual_start: new Date().toISOString()
                }
                break

            case 'end':
                updates = {
                    is_active: false,
                    actual_end: new Date().toISOString()
                }
                break

            case 'enable_recording':
                updates = { recording_enabled: true }
                break

            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const { data: room, error } = await supabase
            .from('video_rooms')
            .update(updates)
            .eq('id', room_id)
            .select()
            .single()

        if (error) {
            console.error('Update room error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar sala' }, { status: 500 })
        }

        return NextResponse.json({ room })
    } catch (error) {
        console.error('Update room error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
