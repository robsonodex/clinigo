import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'waiting' // waiting, in_service, completed

        // Fetch appointments that are checked in but not completed
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select(`
        id,
        appointment_date,
        status,
        checked_in_at,
        priority_level,
        waiting_room_notes,
        ticket_number,
        patient:patients(id, full_name, birth_date, gender),
        doctor:doctors(id, user:users(name))
      `)
            .eq('status', status === 'waiting' ? 'CONFIRMED' : 'IN_PROGRESS') // Adapt status mapping
            .not('checked_in_at', 'is', null) // Must be checked in
            .order('priority_level', { ascending: false }) // Priority first
            .order('checked_in_at', { ascending: true }) // Then FIFO

        // Fetch walk-ins
        const { data: walkIns, error: walkInError } = await supabase
            .from('walk_in_registrations')
            .select(`
        id,
        arrival_time,
        urgency_level,
        status,
        reason,
        patient:patients(id, full_name, birth_date, gender),
        doctor:doctors(id, user:users(name))
      `)
            .eq('status', status)
            .order('urgency_level', { ascending: false }) // Priority logic needed (text vs int)
            .order('arrival_time', { ascending: true })

        if (apptError || walkInError) {
            return NextResponse.json({ error: 'Error fetching queue' }, { status: 500 })
        }

        // Merge and sort combined list
        const queue = [
            ...appointments.map(a => ({
                id: a.id,
                type: 'appointment',
                patient: a.patient,
                doctor: a.doctor,
                arrivalTime: a.checked_in_at,
                isPriority: a.priority_level > 0,
                status: a.status,
                notes: a.waiting_room_notes
            })),
            ...walkIns.map(w => ({
                id: w.id,
                type: 'walk-in',
                patient: w.patient,
                doctor: w.doctor,
                arrivalTime: w.arrival_time,
                isPriority: w.urgency_level !== 'normal',
                status: w.status,
                notes: w.reason
            }))
        ].sort((a, b) => {
            // Sort by priority first
            if (a.isPriority && !b.isPriority) return -1
            if (!a.isPriority && b.isPriority) return 1
            // Then by arrival time
            return new Date(a.arrivalTime).getTime() - new Date(b.arrivalTime).getTime()
        })

        return NextResponse.json({ queue })
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
