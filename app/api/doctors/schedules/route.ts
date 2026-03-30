/**
 * GET /api/doctors/schedules
 * Returns all schedules for the current clinic (used by Agenda Inversa)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { data: schedules, error } = await supabase
            .from('schedules')
            .select('id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true)
            .order('doctor_id')
            .order('day_of_week')

        if (error) {
            console.error('Error fetching schedules:', error)
            return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 })
        }

        return NextResponse.json(schedules || [])
    } catch (error) {
        console.error('Schedules fetch error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
