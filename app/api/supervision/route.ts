import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/supervision — Listar registros de supervisão
 * POST /api/supervision — Criar registro
 * PUT /api/supervision — Atualizar registro (body.id)
 * DELETE /api/supervision — Excluir registro (body.id)
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
        const doctorId = searchParams.get('doctor_id')
        const month = searchParams.get('month') // YYYY-MM

        let query = supabase
            .from('supervision_records')
            .select('*, doctors!inner(name)')
            .eq('clinic_id', profile.clinic_id)
            .order('session_date', { ascending: false })

        if (doctorId) query = query.eq('doctor_id', doctorId)

        // For DOCTOR role, filter by own records
        if (profile.role === 'DOCTOR') {
            const { data: doc } = await supabase.from('doctors').select('id').eq('user_id', user.id).single()
            if (doc) query = query.eq('doctor_id', doc.id)
        }

        if (month) {
            const startDate = `${month}-01`
            const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
                .toISOString().split('T')[0]
            query = query.gte('session_date', startDate).lte('session_date', endDate)
        }

        const { data: records, error } = await query
        if (error) throw error

        // Calculate monthly totals per doctor
        const doctorTotals: Record<string, { name: string, total_minutes: number, sessions: number }> = {}
        records?.forEach((r: any) => {
            const did = r.doctor_id
            if (!doctorTotals[did]) {
                doctorTotals[did] = { name: r.doctors?.name || 'N/A', total_minutes: 0, sessions: 0 }
            }
            doctorTotals[did].total_minutes += r.duration_minutes || 0
            doctorTotals[did].sessions++
        })

        // Get capacity for supervision goal
        const { data: capacities } = await supabase
            .from('therapist_capacity')
            .select('doctor_id, supervision_hours_goal')
            .eq('clinic_id', profile.clinic_id)

        const goalMap: Record<string, number> = {}
        capacities?.forEach((c: any) => { goalMap[c.doctor_id] = c.supervision_hours_goal || 4 })

        const summary = Object.entries(doctorTotals).map(([id, stats]) => ({
            doctor_id: id,
            doctor_name: stats.name,
            sessions: stats.sessions,
            total_hours: Math.round((stats.total_minutes / 60) * 10) / 10,
            goal_hours: goalMap[id] || 4,
            progress_pct: Math.round(((stats.total_minutes / 60) / (goalMap[id] || 4)) * 100),
        }))

        return NextResponse.json({
            summary,
            records: records?.map((r: any) => ({
                ...r,
                doctor_name: r.doctors?.name || 'N/A',
            })),
        })
    } catch (error: any) {
        console.error('[API] supervision GET error:', error)
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
        const { data, error } = await supabase
            .from('supervision_records')
            .insert({
                clinic_id: profile.clinic_id,
                doctor_id: body.doctor_id,
                supervisor_name: body.supervisor_name,
                supervisor_crp: body.supervisor_crp,
                session_date: body.session_date,
                duration_minutes: body.duration_minutes || 60,
                modality: body.modality || 'individual',
                format: body.format || 'presencial',
                topic: body.topic,
                notes: body.notes,
                patient_ids: body.patient_ids,
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('[API] supervision POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const { data, error } = await supabase
            .from('supervision_records')
            .update({
                supervisor_name: body.supervisor_name,
                supervisor_crp: body.supervisor_crp,
                session_date: body.session_date,
                duration_minutes: body.duration_minutes,
                modality: body.modality,
                format: body.format,
                topic: body.topic,
                notes: body.notes,
                patient_ids: body.patient_ids,
                updated_at: new Date().toISOString(),
            })
            .eq('id', body.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API] supervision PUT error:', error)
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
            .from('supervision_records')
            .delete()
            .eq('id', body.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API] supervision DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
