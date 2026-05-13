import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/discharge
 * Relatório de alta e desfechos terapêuticos
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
        const startDate = searchParams.get('start_date') || new Date(new Date().setMonth(new Date().getMonth() - 12)).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
        const doctorId = searchParams.get('doctor_id')

        // Get appointments with discharge info
        let query = supabase
            .from('appointments')
            .select(`
                id, patient_id, doctor_id, discharge_type, discharge_date, discharge_notes,
                appointment_date, status,
                patients!inner(name),
                doctors!inner(name)
            `)
            .eq('clinic_id', profile.clinic_id)
            .not('discharge_type', 'is', null)
            .gte('discharge_date', startDate)
            .lte('discharge_date', endDate)

        if (doctorId) query = query.eq('doctor_id', doctorId)

        const { data: discharges, error } = await query
        if (error) throw error

        // Count by type
        const typeCounts: Record<string, number> = {
            alta_programada: 0,
            abandono: 0,
            encaminhamento: 0,
            alta_administrativa: 0,
        }

        const recentDischarges: any[] = []

        discharges?.forEach((d: any) => {
            if (d.discharge_type && typeCounts[d.discharge_type] !== undefined) {
                typeCounts[d.discharge_type]++
            }
            recentDischarges.push({
                id: d.id,
                patient_name: d.patients?.name || 'N/A',
                doctor_name: d.doctors?.name || 'N/A',
                discharge_type: d.discharge_type,
                discharge_date: d.discharge_date,
                discharge_notes: d.discharge_notes,
            })
        })

        const totalDischarges = discharges?.length || 0
        const successRate = totalDischarges > 0
            ? Math.round((typeCounts.alta_programada / totalDischarges) * 100)
            : 0

        return NextResponse.json({
            summary: {
                total_discharges: totalDischarges,
                success_rate: successRate,
                by_type: typeCounts,
            },
            discharges: recentDischarges.sort((a, b) =>
                new Date(b.discharge_date).getTime() - new Date(a.discharge_date).getTime()
            ).slice(0, 50),
            period: { start_date: startDate, end_date: endDate },
        })
    } catch (error: any) {
        console.error('[API] discharge error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
