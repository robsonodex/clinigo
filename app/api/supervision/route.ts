import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/supervision — Listar registros de supervisão
 * POST /api/supervision — Criar registro
 * PUT /api/supervision — Atualizar registro (body.id)
 * DELETE /api/supervision — Excluir registro (body.id)
 */

const SUPERVISION_ALLOWED_ROLES = new Set([
    'CLINIC_ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'SUPER_ADMIN',
])

function extractDoctorName(doctorRel: any): string {
    const doc = Array.isArray(doctorRel) ? doctorRel[0] : doctorRel
    const userRel = Array.isArray(doc?.user) ? doc.user[0] : doc?.user
    return userRel?.full_name || doc?.specialty || 'Profissional'
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const sb = supabase as any
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = (await sb
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()) as {
            data: { clinic_id: string | null; role: string | null; is_coordinator?: boolean | null } | null
        }

        const role = (profile?.role || '').toUpperCase()
        if (!SUPERVISION_ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão para acessar supervisão clínica' }, { status: 403 })
        }

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')
        const month = searchParams.get('month') // YYYY-MM

        let query = sb
            .from('supervision_records')
            .select('*, doctors(id, specialty, user:users(full_name))')
            .eq('clinic_id', profile.clinic_id)
            .order('session_date', { ascending: false })

        if (doctorId) query = query.eq('doctor_id', doctorId)

        // Para DOCTOR não-coordenador, filtra estritamente pelos próprios registros
        if (role === 'DOCTOR' && !profile.is_coordinator) {
            const { data: doc } = (await sb
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle()) as { data: { id: string } | null }

            if (!doc?.id) {
                return NextResponse.json({ summary: [], records: [] })
            }
            query = query.eq('doctor_id', doc.id)
        }

        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const startDate = `${month}-01`
            const endDate = new Date(parseInt(month.split('-')[0], 10), parseInt(month.split('-')[1], 10), 0)
                .toISOString().split('T')[0]
            query = query.gte('session_date', startDate).lte('session_date', endDate)
        }

        const { data: records, error } = await query
        if (error) throw error

        // Calculate monthly totals per doctor
        const doctorTotals: Record<string, { name: string, total_minutes: number, sessions: number }> = {}
        records?.forEach((r: any) => {
            const did = r.doctor_id
            const resolvedName = extractDoctorName(r.doctors)
            if (!doctorTotals[did]) {
                doctorTotals[did] = { name: resolvedName, total_minutes: 0, sessions: 0 }
            }
            doctorTotals[did].total_minutes += r.duration_minutes || 0
            doctorTotals[did].sessions++
        })

        // Get capacity for supervision goal
        const { data: capacities } = await sb
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
            records: (records || []).map((r: any) => ({
                ...r,
                doctor_name: extractDoctorName(r.doctors),
            })),
        })
    } catch (error: any) {
        request.log.error('supervision', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API] supervision GET error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const sb = supabase as any
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = (await sb
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()) as {
            data: { clinic_id: string | null; role: string | null; is_coordinator?: boolean | null } | null
        }

        const role = (profile?.role || '').toUpperCase()
        if (!SUPERVISION_ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão para registrar supervisão' }, { status: 403 })
        }

        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        let targetDoctorId = body.doctor_id

        if (role === 'DOCTOR' && !profile.is_coordinator) {
            const { data: ownDoc } = (await sb
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle()) as { data: { id: string } | null }
            if (!ownDoc?.id) {
                return NextResponse.json({ error: 'Profissional não vinculado à clínica' }, { status: 403 })
            }
            targetDoctorId = ownDoc.id
        }

        if (!targetDoctorId) {
            return NextResponse.json({ error: 'Profissional obrigatório' }, { status: 400 })
        }

        const { data, error } = await sb
            .from('supervision_records')
            .insert({
                clinic_id: profile.clinic_id,
                doctor_id: targetDoctorId,
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
        request.log.error('supervision', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API] supervision POST error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const PUT = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const sb = supabase as any
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = (await sb
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()) as {
            data: { clinic_id: string | null; role: string | null; is_coordinator?: boolean | null } | null
        }

        const role = (profile?.role || '').toUpperCase()
        if (!SUPERVISION_ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão para editar supervisão' }, { status: 403 })
        }
        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        let updateQuery = sb
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
            .eq('clinic_id', profile.clinic_id)

        if (role === 'DOCTOR' && !profile.is_coordinator) {
            const { data: ownDoc } = (await sb
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle()) as { data: { id: string } | null }
            if (!ownDoc?.id) {
                return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
            }
            updateQuery = updateQuery.eq('doctor_id', ownDoc.id)
        }

        const { data, error } = await updateQuery.select().single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        request.log.error('supervision', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API] supervision PUT error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

export const DELETE = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const sb = supabase as any
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = (await sb
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()) as {
            data: { clinic_id: string | null; role: string | null; is_coordinator?: boolean | null } | null
        }

        const role = (profile?.role || '').toUpperCase()
        if (!SUPERVISION_ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ error: 'Sem permissão para excluir supervisão' }, { status: 403 })
        }
        if (!profile?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        if (!body.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        let deleteQuery = sb
            .from('supervision_records')
            .delete()
            .eq('id', body.id)
            .eq('clinic_id', profile.clinic_id)

        if (role === 'DOCTOR' && !profile.is_coordinator) {
            const { data: ownDoc } = (await sb
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle()) as { data: { id: string } | null }
            if (!ownDoc?.id) {
                return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
            }
            deleteQuery = deleteQuery.eq('doctor_id', ownDoc.id)
        }

        const { error } = await deleteQuery

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        request.log.error('supervision', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API] supervision DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
