import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/modality-revenue
 * Receita por modalidade terapêutica (individual vs casal vs família vs grupo)
 * e formato (presencial vs online)
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
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
            .in('status', ['COMPLETED', 'CONFIRMED'])
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)

        if (aptError) throw aptError

        // Map financial by appointment
        const appointmentIds = (appointments || []).map((a: any) => a.id).filter(Boolean)
        const financialMap: Record<string, number> = {}
        for (let i = 0; i < appointmentIds.length; i += 200) {
            const { data: financial } = await supabase
                .from('financial_entries')
                .select('amount, appointment_id')
                .eq('clinic_id', profile.clinic_id)
                .eq('entry_type', 'INCOME')
                .in('appointment_id', appointmentIds.slice(i, i + 200))

            financial?.forEach((f: any) => {
                if (f.appointment_id) {
                    financialMap[f.appointment_id] = (financialMap[f.appointment_id] || 0) + (Number(f.amount) || 0)
                }
            })
        }

        // Get doctors consultation_price for fallback pricing
        const { data: doctors } = await supabase
            .from('doctors')
            .select('id, consultation_price')
            .eq('clinic_id', profile.clinic_id)

        const priceMap: Record<string, number> = {}
        doctors?.forEach((d: any) => { priceMap[d.id] = Number(d.consultation_price) || 0 })

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
        const errMsg = error?.message || (error instanceof Error ? error.message : String(error))
        request.log.error('reports/modality-revenue', { error: errMsg })
        console.error('[API] modality-revenue error:', error)
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
})
