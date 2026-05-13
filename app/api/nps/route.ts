import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/nps — Listar pesquisas NPS
 * POST /api/nps — Criar pesquisa NPS
 * DELETE /api/nps — Excluir pesquisa NPS
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
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const doctorId = searchParams.get('doctor_id')

        let query = supabase
            .from('nps_surveys')
            .select('*, patients!inner(name), doctors(name)')
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })

        if (doctorId) query = query.eq('doctor_id', doctorId)
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate + 'T23:59:59')

        const { data: surveys, error } = await query
        if (error) throw error

        const total = surveys?.length || 0
        let promoters = 0, neutrals = 0, detractors = 0

        surveys?.forEach((s: any) => {
            if (s.score >= 9) promoters++
            else if (s.score >= 7) neutrals++
            else detractors++
        })

        const npsScore = total > 0
            ? Math.round(((promoters - detractors) / total) * 100)
            : 0

        const avgScore = total > 0
            ? Math.round((surveys!.reduce((sum: number, s: any) => sum + s.score, 0) / total) * 10) / 10
            : 0

        // Trend by month (last 6)
        const trend: Record<string, { promoters: number, neutrals: number, detractors: number, total: number }> = {}
        const now = new Date()
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            trend[key] = { promoters: 0, neutrals: 0, detractors: 0, total: 0 }
        }
        surveys?.forEach((s: any) => {
            const d = new Date(s.created_at)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (trend[key]) {
                trend[key].total++
                if (s.score >= 9) trend[key].promoters++
                else if (s.score >= 7) trend[key].neutrals++
                else trend[key].detractors++
            }
        })

        const monthlyTrend = Object.entries(trend).map(([month, data]) => ({
            month,
            ...data,
            nps: data.total > 0 ? Math.round(((data.promoters - data.detractors) / data.total) * 100) : 0,
        }))

        // Recent comments
        const recentComments = surveys
            ?.filter((s: any) => s.comment)
            .slice(0, 20)
            .map((s: any) => ({
                score: s.score,
                category: s.category,
                comment: s.comment,
                patient_name: s.patients?.name || 'Anônimo',
                doctor_name: s.doctors?.name || null,
                date: s.created_at,
            }))

        return NextResponse.json({
            summary: {
                total_responses: total,
                nps_score: npsScore,
                avg_score: avgScore,
                promoters,
                neutrals,
                detractors,
                promoters_pct: total > 0 ? Math.round((promoters / total) * 100) : 0,
                detractors_pct: total > 0 ? Math.round((detractors / total) * 100) : 0,
            },
            trend: monthlyTrend,
            recent_comments: recentComments,
        })
    } catch (error: any) {
        console.error('[API] nps GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
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

        const body = await request.json()
        if (!body.patient_id || body.score === undefined) {
            return NextResponse.json({ error: 'patient_id e score são obrigatórios' }, { status: 400 })
        }
        if (body.score < 0 || body.score > 10) {
            return NextResponse.json({ error: 'Score deve ser entre 0 e 10' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('nps_surveys')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: body.patient_id,
                doctor_id: body.doctor_id,
                appointment_id: body.appointment_id,
                score: body.score,
                comment: body.comment,
                tags: body.tags,
                source: body.source || 'manual',
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('[API] nps POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const { error } = await supabase
            .from('nps_surveys')
            .delete()
            .eq('id', body.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API] nps DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
