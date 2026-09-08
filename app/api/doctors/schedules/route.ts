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

        // Get user's clinic (support x-clinic-id header, profile, or impersonation)
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const clinicId = request.headers.get('x-clinic-id') || 
            profile?.clinic_id || 
            (profile?.role === 'SUPER_ADMIN' ? request.cookies.get('impersonation_clinic_id')?.value : null)

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { data: schedules, error } = await supabase
            .from('schedules')
            .select('id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active')
            .eq('clinic_id', clinicId)
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
