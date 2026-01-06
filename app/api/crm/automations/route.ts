import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List automation rules
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const { data: rules, error } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Automations fetch error:', error)
            return NextResponse.json({ error: 'Erro ao buscar automações' }, { status: 500 })
        }

        return NextResponse.json({ rules })
    } catch (error) {
        console.error('Automations error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create automation rule
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()
        const { name, description, trigger, trigger_filters, actions, is_active = true } = body

        if (!name || !trigger || !actions) {
            return NextResponse.json({
                error: 'Campos obrigatórios: name, trigger, actions'
            }, { status: 400 })
        }

        const { data: rule, error } = await supabase
            .from('automation_rules')
            .insert({
                clinic_id: clinicId,
                name,
                description,
                trigger,
                trigger_filters: trigger_filters || {},
                actions,
                is_active,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Create automation error:', error)
            return NextResponse.json({ error: 'Erro ao criar automação' }, { status: 500 })
        }

        return NextResponse.json({ rule })
    } catch (error) {
        console.error('Create automation error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// Trigger types are defined in lib/constants/crm.ts

