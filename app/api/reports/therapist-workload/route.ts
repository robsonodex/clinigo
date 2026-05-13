import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/therapist-workload
 * Relatório de carga de trabalho do terapeuta — ocupação vs capacidade
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const weekStart = searchParams.get('week_start') || (() => {
            const d = new Date()
            d.setDate(d.getDate() - d.getDay() + 1) // Monday
            return d.toISOString().split('T')[0]
        })()
        const weekEnd = (() => {
            const d = new Date(weekStart)
            d.setDate(d.getDate() + 6)
            return d.toISOString().split('T')[0]
        })()

        // Get doctors with capacity
        const { data: doctors } = await supabase
            .from('doctors')
            .select('id, name, specialty')
            .eq('clinic_id', profile.clinic_id)
            .eq('is_active', true)

        // Get capacity settings
        const { data: capacities } = await supabase
            .from('therapist_capacity')
            .select('*')
            .eq('clinic_id', profile.clinic_id)

        // Get weekly appointments
        const { data: weekAppointments } = await supabase
            .from('appointments')
            .select('doctor_id, status, appointment_date, therapy_modality')
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', weekStart)
            .lte('appointment_date', weekEnd)
            .not('status', 'in', '("cancelled","canceled")')

        const capacityMap: Record<string, any> = {}
        capacities?.forEach((c: any) => { capacityMap[c.doctor_id] = c })

        const workload = doctors?.map((doc: any) => {
            const cap = capacityMap[doc.id] || { max_weekly_patients: 30, max_daily_patients: 8, ideal_weekly_patients: 25 }
            const weekApts = weekAppointments?.filter((a: any) => a.doctor_id === doc.id) || []
            const totalWeek = weekApts.length

            // By day
            const dailyCounts: Record<string, number> = {}
            weekApts.forEach((a: any) => {
                dailyCounts[a.appointment_date] = (dailyCounts[a.appointment_date] || 0) + 1
            })

            const busiestDay = Object.entries(dailyCounts).sort((a, b) => b[1] - a[1])[0]
            const occupancyRate = cap.max_weekly_patients > 0
                ? Math.round((totalWeek / cap.max_weekly_patients) * 100)
                : 0

            let loadLevel: 'underloaded' | 'optimal' | 'overloaded'
            if (occupancyRate < 60) loadLevel = 'underloaded'
            else if (occupancyRate <= 90) loadLevel = 'optimal'
            else loadLevel = 'overloaded'

            return {
                doctor_id: doc.id,
                doctor_name: doc.name,
                specialty: doc.specialty,
                weekly_appointments: totalWeek,
                max_weekly: cap.max_weekly_patients,
                ideal_weekly: cap.ideal_weekly_patients,
                max_daily: cap.max_daily_patients,
                occupancy_rate: occupancyRate,
                load_level: loadLevel,
                busiest_day: busiestDay ? { date: busiestDay[0], count: busiestDay[1] } : null,
                daily_counts: dailyCounts,
            }
        }) || []

        const summary = {
            total_doctors: workload.length,
            overloaded: workload.filter(w => w.load_level === 'overloaded').length,
            optimal: workload.filter(w => w.load_level === 'optimal').length,
            underloaded: workload.filter(w => w.load_level === 'underloaded').length,
            avg_occupancy: workload.length > 0
                ? Math.round(workload.reduce((sum, w) => sum + w.occupancy_rate, 0) / workload.length)
                : 0,
        }

        return NextResponse.json({
            summary,
            workload: workload.sort((a, b) => b.occupancy_rate - a.occupancy_rate),
            period: { week_start: weekStart, week_end: weekEnd },
        })
    } catch (error: any) {
        console.error('[API] therapist-workload error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
