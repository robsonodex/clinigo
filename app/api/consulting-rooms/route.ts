import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/consulting-rooms
 * Lists consulting rooms for the current user's clinic.
 * Query param: ?clinicId=xxx (for public TV panel access)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const publicClinicId = searchParams.get('clinicId')
        const supabase = await createClient()

        // Public access for TV panel
        if (publicClinicId) {
            const { data: rooms, error } = await (supabase as any)
                .from('consulting_rooms')
                .select(`
                    id, name, display_name, room_number, show_on_tv,
                    doctor:doctors(id, user:users(full_name), specialty)
                `)
                .eq('clinic_id', publicClinicId)
                .eq('is_active', true)
                .eq('show_on_tv', true)
                .order('room_number', { ascending: true })

            if (error) throw error
            return NextResponse.json({ rooms: rooms || [] })
        }

        // Authenticated access
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const { data: rooms, error } = await (supabase as any)
            .from('consulting_rooms')
            .select(`
                id, name, display_name, room_number, show_on_tv, is_active,
                doctor_id,
                doctor:doctors(id, user:users(full_name), specialty)
            `)
            .eq('clinic_id', currentUser.clinic_id)
            .order('room_number', { ascending: true })

        if (error) throw error
        return NextResponse.json({ rooms: rooms || [] })
    } catch (error) {
        console.error('[Consulting Rooms] GET error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * POST /api/consulting-rooms
 * Creates a consulting room. Checks plan limits.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const body = await request.json()
        const { name, display_name, doctor_id, show_on_tv } = body

        // Check plan limit (max_doctors = max_consulting_rooms)
        const { data: clinic } = await (supabase as any)
            .from('clinics').select('plan').eq('id', currentUser.clinic_id).single()

        const planLimits: Record<string, number> = {
            'BASICO': 1, 'AVANCADO': 5, 'PROFESSIONAL': 30, 'ENTERPRISE': -1
        }
        const maxRooms = planLimits[clinic?.plan || 'BASICO'] || 1

        const { count } = await (supabase as any)
            .from('consulting_rooms')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', currentUser.clinic_id)
            .eq('is_active', true)

        if (maxRooms !== -1 && (count || 0) >= maxRooms) {
            return NextResponse.json({
                error: `Limite do plano atingido. Seu plano permite ${maxRooms} consultório(s).`
            }, { status: 403 })
        }

        // Get next room number
        const nextNumber = (count || 0) + 1

        const { data: room, error } = await (supabase as any)
            .from('consulting_rooms')
            .insert({
                clinic_id: currentUser.clinic_id,
                name: name || `Consultório ${String(nextNumber).padStart(2, '0')}`,
                display_name: display_name || null,
                room_number: nextNumber,
                doctor_id: doctor_id || null,
                show_on_tv: show_on_tv ?? true,
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, room })
    } catch (error) {
        console.error('[Consulting Rooms] POST error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
