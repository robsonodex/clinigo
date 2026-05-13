import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/reports/demographics
 * Perfil demográfico dos pacientes — gênero × idade × queixa × origem
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

        const { data: patients, error } = await supabase
            .from('patients')
            .select('id, name, gender, age_group, origin, presenting_complaint, birth_date, created_at')
            .eq('clinic_id', profile.clinic_id)

        if (error) throw error

        const total = patients?.length || 0

        // By gender
        const byGender: Record<string, number> = {}
        patients?.forEach((p: any) => {
            const g = p.gender || 'não informado'
            byGender[g] = (byGender[g] || 0) + 1
        })

        // By age group
        const byAgeGroup: Record<string, number> = {}
        patients?.forEach((p: any) => {
            let group = p.age_group
            if (!group && p.birth_date) {
                const age = Math.floor((Date.now() - new Date(p.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                if (age < 12) group = 'crianca'
                else if (age < 18) group = 'adolescente'
                else if (age < 60) group = 'adulto'
                else group = 'idoso'
            }
            group = group || 'não informado'
            byAgeGroup[group] = (byAgeGroup[group] || 0) + 1
        })

        // By origin
        const byOrigin: Record<string, number> = {}
        patients?.forEach((p: any) => {
            const o = p.origin || 'não informado'
            byOrigin[o] = (byOrigin[o] || 0) + 1
        })

        // By presenting complaint (top 15)
        const byComplaint: Record<string, number> = {}
        patients?.forEach((p: any) => {
            if (p.presenting_complaint) {
                const c = p.presenting_complaint.trim().toLowerCase()
                byComplaint[c] = (byComplaint[c] || 0) + 1
            }
        })
        const topComplaints = Object.entries(byComplaint)
            .map(([complaint, count]) => ({ complaint, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15)

        // New patients per month (last 12 months)
        const monthlyNew: Record<string, number> = {}
        const now = new Date()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthlyNew[key] = 0
        }
        patients?.forEach((p: any) => {
            if (p.created_at) {
                const d = new Date(p.created_at)
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                if (monthlyNew[key] !== undefined) monthlyNew[key]++
            }
        })

        return NextResponse.json({
            summary: { total_patients: total },
            by_gender: Object.entries(byGender).map(([label, count]) => ({
                label,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            })),
            by_age_group: Object.entries(byAgeGroup).map(([label, count]) => ({
                label,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            })),
            by_origin: Object.entries(byOrigin).map(([label, count]) => ({
                label,
                count,
                percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            })),
            top_complaints: topComplaints,
            monthly_new: Object.entries(monthlyNew).map(([month, count]) => ({ month, count })),
        })
    } catch (error: any) {
        console.error('[API] demographics error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
