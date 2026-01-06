import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get single entry
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: entry, error } = await supabase
            .from('financial_entries')
            .select(`
        *,
        category:financial_categories(id, name, color),
        patient:patients(id, full_name, cpf),
        doctor:doctors(id, users(full_name)),
        account:financial_accounts(id, name),
        payments:financial_entry_payments(*)
      `)
            .eq('id', id)
            .single()

        if (error || !entry) {
            return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ entry })
    } catch (error) {
        console.error('Get entry error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update entry
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()

        // Remove fields that shouldn't be updated
        delete body.id
        delete body.clinic_id
        delete body.created_by
        delete body.created_at

        const { data: entry, error } = await supabase
            .from('financial_entries')
            .update(body)
            .eq('id', id)
            .select(`
        *,
        category:financial_categories(id, name, color)
      `)
            .single()

        if (error) {
            console.error('Update entry error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ entry })
    } catch (error) {
        console.error('Update entry error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE: Delete entry
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Check if entry has payments
        const { count: paymentCount } = await supabase
            .from('financial_entry_payments')
            .select('id', { count: 'exact', head: true })
            .eq('entry_id', id)

        if (paymentCount && paymentCount > 0) {
            // Instead of deleting, mark as cancelled
            const { error } = await supabase
                .from('financial_entries')
                .update({ status: 'CANCELLED' })
                .eq('id', id)

            if (error) {
                return NextResponse.json({ error: 'Erro ao cancelar' }, { status: 500 })
            }

            return NextResponse.json({ message: 'Lançamento cancelado (possui pagamentos)' })
        }

        const { error } = await supabase
            .from('financial_entries')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Delete entry error:', error)
            return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete entry error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
