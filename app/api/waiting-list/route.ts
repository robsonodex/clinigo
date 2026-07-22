import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/waiting-list — Listar fila de espera
 * POST /api/waiting-list — Adicionar à fila
 * PUT /api/waiting-list — Atualizar status
 * DELETE /api/waiting-list — Remover da fila
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

        let query = supabase
            .from('waiting_list')
            .select(`
                *,
                doctors:preferred_doctor_id(
                    id,
                    user:users(full_name)
                )
            `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: true })

        if (status) query = query.eq('status', status)

        const { data: list, error } = await query
        if (error) throw error

        // Metrics
        const waiting = list?.filter((i: any) => i.status === 'waiting') || []
        const avgWaitDays = waiting.length > 0
            ? Math.round(waiting.reduce((sum: number, i: any) => {
                const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24))
                return sum + days
            }, 0) / waiting.length)
            : 0

        const scheduled = list?.filter((i: any) => i.status === 'scheduled') || []
        const conversionRate = list && list.length > 0
            ? Math.round((scheduled.length / list.length) * 100)
            : 0

        return NextResponse.json({
            summary: {
                total: list?.length || 0,
                waiting: waiting.length,
                contacted: list?.filter((i: any) => i.status === 'contacted').length || 0,
                scheduled: scheduled.length,
                cancelled: list?.filter((i: any) => i.status === 'cancelled').length || 0,
                avg_wait_days: avgWaitDays,
                conversion_rate: conversionRate,
            },
            items: list?.map((i: any) => {
                const docUser = i.doctors?.user
                const docName = docUser ? (Array.isArray(docUser) ? docUser[0]?.full_name : (docUser as any)?.full_name) : null
                return {
                    ...i,
                    preferred_doctor_name: docName || null,
                    wait_days: Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)),
                }
            }),
        })
    } catch (error: any) {
        console.error('[API] waiting-list GET error:', error)
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
        const isArray = Array.isArray(body)

        if (isArray) {
            const inserts = body.map((item: any) => ({
                clinic_id: profile.clinic_id,
                patient_id: item.patient_id || null,
                patient_name: item.patient_name,
                patient_phone: item.patient_phone || null,
                patient_email: item.patient_email || null,
                preferred_doctor_id: item.preferred_doctor_id || null,
                therapy_type: item.therapy_type || null,
                modality: item.modality || 'individual',
                preferred_shift: item.preferred_shift || 'any',
                preferred_days: item.preferred_days || null,
                urgency: item.urgency || 'normal',
                notes: item.notes || null,
                responsible_name: item.responsible_name || null,
                therapies: item.therapies || [],
                commercial_notes: item.commercial_notes || null,
                financial_contact_date: item.financial_contact_date || null,
                financial_result: item.financial_result || null,
                financial_notes: item.financial_notes || null,
            }))

            const { data, error } = await supabase
                .from('waiting_list')
                .insert(inserts)
                .select()

            if (error) throw error
            return NextResponse.json(data, { status: 201 })
        } else {
            const { data, error } = await supabase
                .from('waiting_list')
                .insert({
                    clinic_id: profile.clinic_id,
                    patient_id: body.patient_id || null,
                    patient_name: body.patient_name,
                    patient_phone: body.patient_phone,
                    patient_email: body.patient_email,
                    preferred_doctor_id: body.preferred_doctor_id || null,
                    therapy_type: body.therapy_type,
                    modality: body.modality || 'individual',
                    preferred_shift: body.preferred_shift || 'any',
                    preferred_days: body.preferred_days,
                    urgency: body.urgency || 'normal',
                    notes: body.notes,
                    responsible_name: body.responsible_name || null,
                    therapies: body.therapies || [],
                    commercial_notes: body.commercial_notes || null,
                    financial_contact_date: body.financial_contact_date || null,
                    financial_result: body.financial_result || null,
                    financial_notes: body.financial_notes || null,
                })
                .select()
                .single()

            if (error) throw error
            return NextResponse.json(data, { status: 201 })
        }
    } catch (error: any) {
        console.error('[API] waiting-list POST error:', error)
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
        if (body.status === 'contacted') updateData.contacted_at = new Date().toISOString()
        if (body.status === 'scheduled') {
            updateData.scheduled_at = new Date().toISOString()
            if (body.scheduled_appointment_id) updateData.scheduled_appointment_id = body.scheduled_appointment_id
        }
        if (body.notes !== undefined) updateData.notes = body.notes
        if (body.urgency) updateData.urgency = body.urgency
        if (body.preferred_doctor_id) updateData.preferred_doctor_id = body.preferred_doctor_id
        if (body.responsible_name !== undefined) updateData.responsible_name = body.responsible_name
        if (body.therapies !== undefined) updateData.therapies = body.therapies
        if (body.commercial_notes !== undefined) updateData.commercial_notes = body.commercial_notes
        if (body.financial_contact_date !== undefined) updateData.financial_contact_date = body.financial_contact_date
        if (body.financial_result !== undefined) updateData.financial_result = body.financial_result
        if (body.financial_notes !== undefined) updateData.financial_notes = body.financial_notes

        const { data, error } = await supabase
            .from('waiting_list')
            .update(updateData)
            .eq('id', body.id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json(data)
    } catch (error: any) {
        console.error('[API] waiting-list PUT error:', error)
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
            .from('waiting_list')
            .delete()
            .eq('id', body.id)

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[API] waiting-list DELETE error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
