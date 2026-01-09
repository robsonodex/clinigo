import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List insurance operators
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const clinicOnly = searchParams.get('clinic_only') === 'true'
        const search = searchParams.get('search')

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id

        let query = supabase
            .from('insurance_operators')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (search) {
            query = query.or(`name.ilike.%${search}%,ans_code.ilike.%${search}%`)
        }

        const { data: operators, error } = await query

        if (error) {
            console.error('Operators error:', error)
            return NextResponse.json({ error: 'Erro ao buscar operadoras' }, { status: 500 })
        }

        // If clinic_only, filter to operators the clinic has contract with
        if (clinicOnly && clinicId) {
            const { data: clinicOperators } = await supabase
                .from('clinic_operators')
                .select('operator_id')
                .eq('clinic_id', clinicId)
                .eq('is_active', true)

            const clinicOperatorIds = (clinicOperators || []).map((co: any) => co.operator_id)
            const filteredOperators = operators?.filter(op => clinicOperatorIds.includes(op.id))

            return NextResponse.json({ operators: filteredOperators })
        }

        return NextResponse.json({ operators })
    } catch (error) {
        console.error('Operators error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Add operator to clinic
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        // Check admin permissions
        if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes((userData as any)?.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body = await request.json()
        const {
            operator_id,
            registry_number,
            cnes_code,
            contract_number,
            contract_start,
            contract_end,
            billing_day
        } = body

        if (!operator_id) {
            return NextResponse.json({ error: 'operator_id é obrigatório' }, { status: 400 })
        }

        // Check if already exists
        const { data: existing } = await supabase
            .from('clinic_operators')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('operator_id', operator_id)
            .single()

        if (existing) {
            // Update existing
            const { data: clinicOperator, error } = await supabase
                .from('clinic_operators')
                .update({
                    registry_number,
                    cnes_code,
                    contract_number,
                    contract_start,
                    contract_end,
                    billing_day,
                    is_active: true
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) {
                return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
            }

            return NextResponse.json({ clinicOperator, updated: true })
        }

        // Create new
        const { data: clinicOperator, error } = await supabase
            .from('clinic_operators')
            .insert({
                clinic_id: clinicId,
                operator_id,
                registry_number,
                cnes_code,
                contract_number,
                contract_start,
                contract_end,
                billing_day
            })
            .select()
            .single()

        if (error) {
            console.error('Create clinic operator error:', error)
            return NextResponse.json({ error: 'Erro ao adicionar operadora' }, { status: 500 })
        }

        return NextResponse.json({ clinicOperator, created: true })
    } catch (error) {
        console.error('Add operator error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

