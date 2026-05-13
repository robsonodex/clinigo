import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/seasonality
 * Análise de sazonalidade — novos pacientes e sessões mês a mês
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const months = parseInt(searchParams.get('months') || '24')

        const startDate = new Date()
        startDate.setMonth(startDate.getMonth() - months)
        const startStr = startDate.toISOString().split('T')[0]

        // Get appointments in period
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select('id, status, appointment_date, patient_id, doctor_id')
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', startStr)

        if (aptError) throw aptError

        // Get patients by creation date
        const { data: patients, error: patError } = await supabase
            .from('patients')
            .select('id, created_at')
            .eq('clinic_id', profile.clinic_id)
            .gte('created_at', startStr)

        if (patError) throw patError

        // Build monthly data
        const monthly: Record<string, {
            total_sessions: number,
            completed: number,
            no_shows: number,
            cancelled: number,
            new_patients: number,
            unique_patients: Set<string>,
        }> = {}

        const now = new Date()
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthly[key] = { total_sessions: 0, completed: 0, no_shows: 0, cancelled: 0, new_patients: 0, unique_patients: new Set() }
        }

        appointments?.forEach((apt: any) => {
            const d = new Date(apt.appointment_date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (!monthly[key]) return

            monthly[key].total_sessions++
            monthly[key].unique_patients.add(apt.patient_id)

            const s = (apt.status || '').toLowerCase()
            if (['completed', 'attended', 'confirmed'].includes(s)) monthly[key].completed++
            else if (['no_show', 'no-show', 'faltou'].includes(s)) monthly[key].no_shows++
            else if (['cancelled', 'canceled'].includes(s)) monthly[key].cancelled++
        })

        patients?.forEach((p: any) => {
            if (p.created_at) {
                const d = new Date(p.created_at)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (monthly[key]) monthly[key].new_patients++
            }
        })

        const monthlyData = Object.entries(monthly).map(([month, data]) => ({
            month,
            total_sessions: data.total_sessions,
            completed: data.completed,
            no_shows: data.no_shows,
            cancelled: data.cancelled,
            new_patients: data.new_patients,
            active_patients: data.unique_patients.size,
            adherence_rate: data.total_sessions > 0 ? Math.round((data.completed / data.total_sessions) * 100) : 0,
        })).sort((a, b) => a.month.localeCompare(b.month))

        // Year-over-year comparison (if enough data)
        const currentYear = now.getFullYear()
        const yoyComparison = monthlyData.reduce((acc: any[], m) => {
            const [year, monthNum] = m.month.split('-')
            if (parseInt(year) === currentYear) {
                const prevYearKey = `${currentYear - 1}-${monthNum}`
                const prevMonth = monthlyData.find(d => d.month === prevYearKey)
                acc.push({
                    month: monthNum,
                    current_year: m.total_sessions,
                    previous_year: prevMonth?.total_sessions || 0,
                    growth_pct: prevMonth && prevMonth.total_sessions > 0
                        ? Math.round(((m.total_sessions - prevMonth.total_sessions) / prevMonth.total_sessions) * 100)
                        : null,
                })
            }
            return acc
        }, [])

        // Peak months
        const peakMonth = monthlyData.reduce((max, m) => m.total_sessions > max.total_sessions ? m : max, monthlyData[0] || { month: '', total_sessions: 0 })
        const lowMonth = monthlyData.reduce((min, m) => m.total_sessions < min.total_sessions ? m : min, monthlyData[0] || { month: '', total_sessions: 0 })

        return NextResponse.json({
            summary: {
                peak_month: peakMonth?.month,
                peak_sessions: peakMonth?.total_sessions,
                low_month: lowMonth?.month,
                low_sessions: lowMonth?.total_sessions,
                avg_monthly_sessions: monthlyData.length > 0
                    ? Math.round(monthlyData.reduce((sum, m) => sum + m.total_sessions, 0) / monthlyData.length)
                    : 0,
                avg_new_patients_monthly: monthlyData.length > 0
                    ? Math.round(monthlyData.reduce((sum, m) => sum + m.new_patients, 0) / monthlyData.length)
                    : 0,
            },
            monthly: monthlyData,
            year_over_year: yoyComparison,
        })
    } catch (error: any) {
        console.error('[API] seasonality error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
