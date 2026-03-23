/**
 * GET /api/patient-reimbursement-rules?patient_id=xxx
 * POST /api/patient-reimbursement-rules
 * PUT /api/patient-reimbursement-rules
 * DELETE /api/patient-reimbursement-rules?id=xxx
 * 
 * Gerencia regras de reembolso por paciente e tipo de terapia
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patient_id')

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        let query = (supabase as any)
            .from('patient_reimbursement_rules')
            .select('*, patient:patients(id, full_name)')
            .eq('clinic_id', (profile as any).clinic_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (patientId) {
            query = query.eq('patient_id', patientId)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data: data || [] })
    } catch (error) {
        console.error('Patient reimbursement rules GET error:', error)
        return NextResponse.json({ error: 'Erro ao buscar regras' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        const body = await request.json()
        const { patient_id, therapy_type, billing_therapy_type, billing_amount, reimbursement_amount, guides_per_session, actual_session_duration, guide_session_duration, notes } = body

        if (!patient_id || !therapy_type) {
            return NextResponse.json({ error: 'Paciente e tipo de terapia são obrigatórios' }, { status: 400 })
        }

        const { data, error } = await (supabase as any)
            .from('patient_reimbursement_rules')
            .insert({
                clinic_id: (profile as any).clinic_id,
                patient_id,
                therapy_type,
                billing_therapy_type: billing_therapy_type || null,
                billing_amount: billing_amount || 0,
                reimbursement_amount: reimbursement_amount || 0,
                guides_per_session: guides_per_session || 1,
                actual_session_duration: actual_session_duration || 50,
                guide_session_duration: guide_session_duration || 30,
                notes: notes || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Regra de reembolso criada' })
    } catch (error) {
        console.error('Patient reimbursement rules POST error:', error)
        return NextResponse.json({ error: 'Erro ao criar regra' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const { data, error } = await (supabase as any)
            .from('patient_reimbursement_rules')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Regra atualizada' })
    } catch (error) {
        console.error('Patient reimbursement rules PUT error:', error)
        return NextResponse.json({ error: 'Erro ao atualizar regra' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        // Soft delete
        const { error } = await (supabase as any)
            .from('patient_reimbursement_rules')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ message: 'Regra desativada' })
    } catch (error) {
        console.error('Patient reimbursement rules DELETE error:', error)
        return NextResponse.json({ error: 'Erro ao desativar regra' }, { status: 500 })
    }
}
