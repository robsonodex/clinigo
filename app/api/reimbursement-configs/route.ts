/**
 * GET /api/reimbursement-configs?doctor_id=xxx
 * POST /api/reimbursement-configs
 * PUT /api/reimbursement-configs (update)
 * DELETE /api/reimbursement-configs?id=xxx
 * 
 * Gerencia configurações de reembolso (múltiplas guias por atendimento)
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        let query = (supabase as any)
            .from('reimbursement_configs')
            .select('*, doctor:doctors(id, user:users(full_name), specialty)')
            .eq('clinic_id', (profile as any).clinic_id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (doctorId) {
            query = query.eq('doctor_id', doctorId)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data: data || [] })
    } catch (error) {
        console.error('Reimbursement configs GET error:', error)
        return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
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
        const { name, doctor_id, sessions_per_appointment, billing_price, real_price, notes } = body

        if (!name || !sessions_per_appointment) {
            return NextResponse.json({ error: 'Nome e sessões por atendimento são obrigatórios' }, { status: 400 })
        }

        const { data, error } = await (supabase as any)
            .from('reimbursement_configs')
            .insert({
                clinic_id: (profile as any).clinic_id,
                doctor_id: doctor_id || null,
                name,
                sessions_per_appointment,
                billing_price: billing_price || null,
                real_price: real_price || null,
                notes: notes || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Configuração de reembolso criada' })
    } catch (error) {
        console.error('Reimbursement configs POST error:', error)
        return NextResponse.json({ error: 'Erro ao criar configuração' }, { status: 500 })
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
            .from('reimbursement_configs')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Configuração atualizada' })
    } catch (error) {
        console.error('Reimbursement configs PUT error:', error)
        return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
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
            .from('reimbursement_configs')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ message: 'Configuração desativada' })
    } catch (error) {
        console.error('Reimbursement configs DELETE error:', error)
        return NextResponse.json({ error: 'Erro ao desativar configuração' }, { status: 500 })
    }
}
