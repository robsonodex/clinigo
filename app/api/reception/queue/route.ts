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

        // 🔒 SECURITY FIX: Get user's clinic_id to ensure data isolation
        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinic not found for user' }, { status: 403 })
        }

        const clinicId = currentUser.clinic_id

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') || 'waiting' // waiting, in_service, completed

        // Fetch appointments for all active statuses (3-panel layout)
        let appointments = []
        try {
            const { data, error: apptError } = await (supabase as any)
                .from('appointments')
                .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        checked_in_at,
        priority_level,
        waiting_room_notes,
        ticket_number,
        consulting_room_id,
        patient:patients(id, full_name, date_of_birth, gender),
        doctor:doctors(id, user:users(full_name))
      `)
                .eq('clinic_id', clinicId)
                .eq('appointment_date', new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }))
                .in('status', ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'])
                .order('priority_level', { ascending: false })
                .order('checked_in_at', { ascending: true, nullsFirst: false })

            if (apptError) throw apptError
            appointments = data || []
        } catch (e) {
            console.error('[DEBUG] Error fetching queue appointments:', e)
            // Don't fail entire request, just return empty for this part but log deep
        }

        // Fetch walk-ins
        let walkIns = []
        try {
            const { data, error: walkInError } = await (supabase as any)
                .from('walk_in_registrations')
                .select(`
        id,
        arrival_time,
        urgency_level,
        status,
        reason,
        patient:patients(id, full_name, cpf, phone, clinic_id),
        doctor:doctors(id, user:users(full_name))
      `)
                .eq('status', status)
                .order('urgency_level', { ascending: false }) // Priority logic needed (text vs int)
                .order('arrival_time', { ascending: true })

            if (walkInError) throw walkInError
            // 🔒 SECURITY: Filter by patient's clinic in JS (walk_in_registrations has no clinic_id column)
            walkIns = (data || []).filter((w: any) => w.patient?.clinic_id === clinicId)
        } catch (e) {
            console.error('[DEBUG] Error fetching queue walk-ins:', e)
        }

        if (false) { // Disabled generic error check
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
                scheduledTime: (a.appointment_date && a.appointment_time ? `${a.appointment_date}T${a.appointment_time}` : a.checked_in_at),
                isPriority: a.priority_level > 0,
                status: a.status,
                notes: a.waiting_room_notes,
                checkedInAt: a.checked_in_at // 🔥 Add this field
            })),
            ...walkIns.map(w => ({
                id: w.id,
                type: 'walk-in',
                patient: w.patient,
                doctor: w.doctor,
                arrivalTime: w.arrival_time,
                scheduledTime: w.arrival_time,
                isPriority: w.urgency_level !== 'normal',
                status: w.status,
                notes: w.reason
            }))
        ].sort((a, b) => {
            // Sort by priority first
            if (a.isPriority && !b.isPriority) return -1
            if (!a.isPriority && b.isPriority) return 1

            // For Espaço Incluir, sort strictly by scheduled appointment time ignoring standard statusOrder
            if (clinicId === '5163c916-8b82-4d80-8a71-01726836ee46') {
                const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : (a.arrivalTime ? new Date(a.arrivalTime).getTime() : 0)
                const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : (b.arrivalTime ? new Date(b.arrivalTime).getTime() : 0)
                if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeA - timeB
            }

            // Then by status: WAITING (called) before CONFIRMED (not yet called)
            const statusOrder: Record<string, number> = { 'WAITING': 0, 'CONFIRMED': 1, 'IN_PROGRESS': 2, 'COMPLETED': 3, 'NO_SHOW': 4 }
            const aOrder = statusOrder[a.status] ?? 5
            const bOrder = statusOrder[b.status] ?? 5
            if (aOrder !== bOrder) return aOrder - bOrder
            
            // Then by arrival time (default)
            const timeArrA = a.arrivalTime ? new Date(a.arrivalTime).getTime() : 0
            const timeArrB = b.arrivalTime ? new Date(b.arrivalTime).getTime() : 0
            return timeArrA - timeArrB
        })

        return NextResponse.json({ queue })
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
