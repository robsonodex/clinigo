import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/referrals — Listar encaminhamentos clínicos
 * POST /api/referrals — Criar encaminhamento
 * PUT /api/referrals — Atualizar encaminhamento
 * DELETE /api/referrals — Excluir encaminhamento
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
        const status = searchParams.get('status')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')

        let query = supabase
            .from('referrals')
            .select(`
                *,
                patients!inner(name, phone, email),
                referring_doctor:referring_doctor_id(name),
                target_doctor:target_doctor_id(name)
            `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })

        if (status) query = query.eq('status', status)
        if (startDate) query = query.gte('created_at', startDate)
        if (endDate) query = query.lte('created_at', endDate + 'T23:59:59')

        const { data: referrals, error } = await query
        if (error) throw error

        // Stats
        const total = referrals?.length || 0
        const converted = referrals?.filter((r: any) => r.status === 'completed' || r.status === 'scheduled').length || 0
        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0

        const byStatus: Record<string, number> = {}
        referrals?.forEach((r: any) => {
            byStatus[r.status] = (byStatus[r.status] || 0) + 1
        })

        // Top referrers
        const referrerCounts: Record<string, { name: string, count: number }> = {}
        referrals?.forEach((r: any) => {
            const name = r.referring_external_name || r.referring_doctor?.name || 'Não informado'
            if (!referrerCounts[name]) referrerCounts[name] = { name, count: 0 }
            referrerCounts[name].count++
        })
        const topReferrers = Object.values(referrerCounts).sort((a, b) => b.count - a.count).slice(0, 10)

        return NextResponse.json({
            summary: {
                total,
                converted,
                conversion_rate: conversionRate,
                by_status: byStatus,
            },
            top_referrers: topReferrers,
            referrals: referrals?.map((r: any) => ({
                ...r,
                patient_name: r.patients?.name || 'N/A',
                patient_phone: r.patients?.phone,
                referring_doctor_name: r.referring_doctor?.name || r.referring_external_name || 'Externo',
                target_doctor_name: r.target_doctor?.name || 'N/A',
            })),
        })
    } catch (error: any) {
        console.error('[API] referrals GET error:', error)
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
            .from('referrals')
            .insert({
                clinic_id: profile.clinic_id,
                patient_id: body.patient_id,
                referring_doctor_id: body.referring_doctor_id,
                referring_external_name: body.referring_external_name,
                referring_external_specialty: body.referring_external_specialty,
                referring_external_phone: body.referring_external_phone,
                target_doctor_id: body.target_doctor_id,
                target_specialty: body.target_specialty,
                reason: body.reason,
                diagnosis_code: body.diagnosis_code,
                notes: body.notes,
            })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data, { status: 201 })
    } catch (error: any) {
        console.error('[API] referrals POST error:', error)
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

        const updateData: any = { updated_at: new Date().toISOString() }
        if (body.status) updateData.status = body.status
        if (body.status === 'completed' && body.converted_appointment_id) {
            updateData.converted_appointment_id = body.converted_appointment_id
            updateData.converted_at = new Date().toISOString()
        }
        if (body.notes !== undefined) updateData.notes = body.notes
        if (body.target_doctor_id) updateData.target_doctor_id = body.target_doctor_id

        const { data, error } = await supabase
            .from('referrals')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API] referrals PUT error:', error)
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
            .from('referrals')
            .delete()
            .eq('id', body.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API] referrals DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
