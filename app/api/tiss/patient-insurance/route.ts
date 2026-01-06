import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get patient insurance cards
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const patientId = searchParams.get('patient_id')

        if (!patientId) {
            return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })
        }

        const { data: insurances, error } = await supabase
            .from('patient_insurance')
            .select(`
        *,
        operator:insurance_operators(id, name, ans_code, logo_url),
        plan:insurance_plans(id, name, plan_type)
      `)
            .eq('patient_id', patientId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Patient insurance error:', error)
            return NextResponse.json({ error: 'Erro ao buscar convênios' }, { status: 500 })
        }

        return NextResponse.json({ insurances })
    } catch (error) {
        console.error('Patient insurance error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Add insurance to patient
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const {
            patient_id,
            operator_id,
            plan_id,
            card_number,
            card_validity,
            is_holder = true,
            holder_name,
            holder_cpf,
            holder_card_number,
            company_name,
            company_cnpj
        } = body

        if (!patient_id || !operator_id || !card_number) {
            return NextResponse.json({
                error: 'Campos obrigatórios: patient_id, operator_id, card_number'
            }, { status: 400 })
        }

        // Check for duplicate
        const { data: existing } = await supabase
            .from('patient_insurance')
            .select('id')
            .eq('patient_id', patient_id)
            .eq('operator_id', operator_id)
            .eq('card_number', card_number)
            .eq('is_active', true)
            .single()

        if (existing) {
            return NextResponse.json({
                error: 'Este convênio já está cadastrado para o paciente'
            }, { status: 400 })
        }

        const { data: insurance, error } = await supabase
            .from('patient_insurance')
            .insert({
                patient_id,
                operator_id,
                plan_id,
                card_number,
                card_validity,
                is_holder,
                holder_name: is_holder ? null : holder_name,
                holder_cpf: is_holder ? null : holder_cpf,
                holder_card_number: is_holder ? null : holder_card_number,
                company_name,
                company_cnpj
            })
            .select(`
        *,
        operator:insurance_operators(id, name, ans_code)
      `)
            .single()

        if (error) {
            console.error('Add insurance error:', error)
            return NextResponse.json({ error: 'Erro ao adicionar convênio' }, { status: 500 })
        }

        return NextResponse.json({ insurance })
    } catch (error) {
        console.error('Add insurance error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update patient insurance
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        // Remove fields that shouldn't be updated
        delete updates.patient_id
        delete updates.operator_id

        const { data: insurance, error } = await supabase
            .from('patient_insurance')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update insurance error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ insurance })
    } catch (error) {
        console.error('Update insurance error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE: Deactivate patient insurance
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
        }

        const { error } = await supabase
            .from('patient_insurance')
            .update({ is_active: false })
            .eq('id', id)

        if (error) {
            console.error('Delete insurance error:', error)
            return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete insurance error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
