import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { appointmentId } = await request.json()

    if (!appointmentId) {
        return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
    }

    // Validate appointment exists and user has access
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
      *,
      doctor:doctors(id, user_id),
      patient:patients(id, user_id)
    `)
        .eq('id', appointmentId)
        .single()

    if (error || !appointment) {
        return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Check permission
    const aptData = appointment as any
    const isDoctor = aptData.doctor?.user_id === user.id
    const isPatient = aptData.patient?.user_id === user.id

    if (!isDoctor && !isPatient) {
        return NextResponse.json({ error: 'No permission to access this appointment' }, { status: 403 })
    }

    // Generate unique room ID
    const roomId = uuidv4()

    // Create video session (will be updated by signaling server)
    const { error: sessionError } = await supabase
        .from('video_sessions')
        .insert({
            room_id: roomId,
            appointment_id: appointmentId,
            clinic_id: (appointment as any).clinic_id
        } as any)

    if (sessionError) {
        console.error('Error creating video session:', sessionError)
    }

    return NextResponse.json({
        roomId,
        url: `/video/${roomId}?appointmentId=${appointmentId}`
    })
}
