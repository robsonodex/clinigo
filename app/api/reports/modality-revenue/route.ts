import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/modality-revenue
 * Receita por modalidade terapêutica (individual vs casal vs família vs grupo)
 * e formato (presencial vs online)
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
        const startDate = searchParams.get('start_date') || new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]

        // Get completed appointments with financial data
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select('id, therapy_modality, session_format, appointment_date, doctor_id, patient_id')
            .eq('clinic_id', profile.clinic_id)
            .in('status', ['completed', 'attended', 'confirmed', 'COMPLETED', 'CONFIRMED'])
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)

        if (aptError) throw aptError

        // Get financial entries for these appointments
        const { data: financial } = await supabase
            .from('financial_entries')
            .select('amount, appointment_id')
            .eq('clinic_id', profile.clinic_id)
            .eq('type', 'income')
            .gte('date', startDate)
            .lte('date', endDate)

        // Map financial by appointment
        const financialMap: Record<string, number> = {}
        financial?.forEach((f: any) => {
            if (f.appointment_id) {
                financialMap[f.appointment_id] = (financialMap[f.appointment_id] || 0) + (f.amount || 0)
            }
        })

        // Get doctor contracts for estimated pricing
        const { data: contracts } = await supabase
            .from('doctor_contracts')
            .select('doctor_id, session_price')
            .eq('clinic_id', profile.clinic_id)

        const priceMap: Record<string, number> = {}
        contracts?.forEach((c: any) => { priceMap[c.doctor_id] = c.session_price || 0 })

        // By modality
        const byModality: Record<string, { sessions: number, revenue: number }> = {}
        appointments?.forEach((apt: any) => {
            const mod = apt.therapy_modality || 'individual'
            if (!byModality[mod]) byModality[mod] = { sessions: 0, revenue: 0 }
            byModality[mod].sessions++
            byModality[mod].revenue += financialMap[apt.id] || priceMap[apt.doctor_id] || 0
        })

        // By format
        const byFormat: Record<string, { sessions: number, revenue: number }> = {}
        appointments?.forEach((apt: any) => {
            const fmt = apt.session_format || 'presencial'
            if (!byFormat[fmt]) byFormat[fmt] = { sessions: 0, revenue: 0 }
            byFormat[fmt].sessions++
            byFormat[fmt].revenue += financialMap[apt.id] || priceMap[apt.doctor_id] || 0
        })

        // Monthly trend by modality
        const monthlyModality: Record<string, Record<string, number>> = {}
        appointments?.forEach((apt: any) => {
            const d = new Date(apt.appointment_date)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const mod = apt.therapy_modality || 'individual'
            if (!monthlyModality[key]) monthlyModality[key] = {}
            monthlyModality[key][mod] = (monthlyModality[key][mod] || 0) + 1
        })

        const totalSessions = appointments?.length || 0
        const totalRevenue = Object.values(byModality).reduce((sum, m) => sum + m.revenue, 0)

        return NextResponse.json({
            summary: {
                total_sessions: totalSessions,
                total_revenue: Math.round(totalRevenue * 100) / 100,
                avg_revenue_per_session: totalSessions > 0 ? Math.round((totalRevenue / totalSessions) * 100) / 100 : 0,
            },
            by_modality: Object.entries(byModality).map(([modality, data]) => ({
                modality,
                ...data,
                revenue: Math.round(data.revenue * 100) / 100,
                percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions) * 100) : 0,
                avg_ticket: data.sessions > 0 ? Math.round((data.revenue / data.sessions) * 100) / 100 : 0,
            })),
            by_format: Object.entries(byFormat).map(([format, data]) => ({
                format,
                ...data,
                revenue: Math.round(data.revenue * 100) / 100,
                percentage: totalSessions > 0 ? Math.round((data.sessions / totalSessions) * 100) : 0,
            })),
            monthly_trend: Object.entries(monthlyModality).map(([month, mods]) => ({
                month,
                ...mods,
            })).sort((a, b) => a.month.localeCompare(b.month)),
            period: { start_date: startDate, end_date: endDate },
        })
    } catch (error: any) {
        console.error('[API] modality-revenue error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
