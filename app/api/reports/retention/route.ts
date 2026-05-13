import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/retention
 * Relatório de retenção de pacientes — funil de abandono por faixa de sessões
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

        // Get all patients with their appointment counts
        let query = supabase
            .from('appointments')
            .select('patient_id, status, appointment_date')
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', startDate)
            .lte('appointment_date', endDate)
            .in('status', ['completed', 'confirmed', 'CONFIRMED', 'COMPLETED', 'attended'])

        if (doctorId) query = query.eq('doctor_id', doctorId)

        const { data: appointments, error } = await query
        if (error) throw error

        // Group by patient
        const patientSessions: Record<string, number> = {}
        appointments?.forEach((apt: any) => {
            patientSessions[apt.patient_id] = (patientSessions[apt.patient_id] || 0) + 1
        })

        // Retention funnel
        const totalPatients = Object.keys(patientSessions).length
        const bands = [
            { label: '1 sessão', min: 1, max: 1, count: 0 },
            { label: '2-4 sessões', min: 2, max: 4, count: 0 },
            { label: '5-10 sessões', min: 5, max: 10, count: 0 },
            { label: '11-20 sessões', min: 11, max: 20, count: 0 },
            { label: '21-50 sessões', min: 21, max: 50, count: 0 },
            { label: '50+ sessões', min: 51, max: 99999, count: 0 },
        ]

        Object.values(patientSessions).forEach(count => {
            for (const band of bands) {
                if (count >= band.min && count <= band.max) {
                    band.count++
                    break
                }
            }
        })

        const funnel = bands.map(band => ({
            ...band,
            percentage: totalPatients > 0 ? Math.round((band.count / totalPatients) * 100) : 0,
        }))

        // Retention rate: patients with 5+ sessions / total patients
        const retainedPatients = Object.values(patientSessions).filter(c => c >= 5).length
        const retentionRate = totalPatients > 0 ? Math.round((retainedPatients / totalPatients) * 100) : 0

        // Churn: patients with only 1 session
        const churnedPatients = Object.values(patientSessions).filter(c => c === 1).length
        const churnRate = totalPatients > 0 ? Math.round((churnedPatients / totalPatients) * 100) : 0

        // Average sessions per patient
        const totalSessions = Object.values(patientSessions).reduce((a, b) => a + b, 0)
        const avgSessions = totalPatients > 0 ? Math.round((totalSessions / totalPatients) * 10) / 10 : 0

        return NextResponse.json({
            summary: {
                total_patients: totalPatients,
                retention_rate: retentionRate,
                churn_rate: churnRate,
                avg_sessions_per_patient: avgSessions,
                total_sessions: totalSessions,
                retained_patients: retainedPatients,
                churned_patients: churnedPatients,
            },
            funnel,
            period: { start_date: startDate, end_date: endDate },
        })
    } catch (error: any) {
        console.error('[API] retention error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
