import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/adherence
 * Relatório de aderência ao tratamento — comparecimento vs faltas/cancelamentos
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
        const startDate = searchParams.get('start_date') || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
        const doctorId = searchParams.get('doctor_id')

        let query = supabase
            .from('appointments')
            .select(`
                id, 
                status, 
                patient_id, 
                doctor_id, 
                appointment_date, 
                was_late_cancel, 
                therapy_modality, 
                doctors!inner(
                    id,
                    user:users(full_name)
                )
            `)
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)

        if (doctorId) query = query.eq('doctor_id', doctorId)

        const { data: appointments, error } = await query
        if (error) throw error

        const total = appointments?.length || 0
        let attended = 0, noShow = 0, cancelled = 0, lateCancelled = 0, rescheduled = 0

        appointments?.forEach((apt: any) => {
            const s = (apt.status || '').toLowerCase()
            if (['completed', 'attended', 'confirmed'].includes(s)) attended++
            else if (['no_show', 'no-show', 'faltou'].includes(s)) noShow++
            else if (['cancelled', 'canceled'].includes(s)) {
                cancelled++
                if (apt.was_late_cancel) lateCancelled++
            }
            else if (['rescheduled', 'reagendado'].includes(s)) rescheduled++
        })

        const adherenceRate = total > 0 ? Math.round((attended / total) * 100) : 0
        const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0

        // By doctor
        const doctorStats: Record<string, { name: string; attended: number; total: number }> = {}
        appointments?.forEach((apt: any) => {
            const did = apt.doctor_id
            const docUser = (apt.doctors as any)?.user
            const docName = docUser ? (Array.isArray(docUser) ? docUser[0]?.full_name : (docUser as any)?.full_name) : 'N/A'
            if (!doctorStats[did]) {
                doctorStats[did] = { name: docName || 'N/A', attended: 0, total: 0 }
            }
            doctorStats[did].total++
            const s = (apt.status || '').toLowerCase()
            if (['completed', 'attended', 'confirmed'].includes(s)) doctorStats[did].attended++
        })

        const byDoctor = Object.entries(doctorStats).map(([id, stats]) => ({
            doctor_id: id,
            doctor_name: stats.name,
            attended: stats.attended,
            total: stats.total,
            adherence_rate: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
        })).sort((a, b) => b.adherence_rate - a.adherence_rate)

        // By modality
        const modalityStats: Record<string, { attended: number, total: number }> = {}
        appointments?.forEach((apt: any) => {
            const mod = apt.therapy_modality || 'individual'
            if (!modalityStats[mod]) modalityStats[mod] = { attended: 0, total: 0 }
            modalityStats[mod].total++
            const s = (apt.status || '').toLowerCase()
            if (['completed', 'attended', 'confirmed'].includes(s)) modalityStats[mod].attended++
        })

        const byModality = Object.entries(modalityStats).map(([mod, stats]) => ({
            modality: mod,
            attended: stats.attended,
            total: stats.total,
            adherence_rate: stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0,
        }))

        return NextResponse.json({
            summary: {
                total_appointments: total,
                attended,
                no_show: noShow,
                cancelled,
                late_cancelled: lateCancelled,
                rescheduled,
                adherence_rate: adherenceRate,
                no_show_rate: noShowRate,
            },
            by_doctor: byDoctor,
            by_modality: byModality,
            period: { start_date: startDate, end_date: endDate },
        })
    } catch (error: any) {
        console.error('[API] adherence error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
