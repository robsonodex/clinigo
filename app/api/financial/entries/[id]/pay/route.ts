import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST: Register payment for an entry
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()
        const { id: entryId } = await params

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, payment_method, account_id, notes, paid_at } = body

        if (!amount || !payment_method) {
            return NextResponse.json({
                error: 'Campos obrigatórios: amount, payment_method'
            }, { status: 400 })
        }

        // Check entry exists and get details
        const { data: entry, error: entryError } = await supabase
            .from('financial_entries')
            .select('id, amount, amount_paid, discount, interest, status')
            .eq('id', entryId)
            .single()

        if (entryError || !entry) {
            return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 })
        }

        if ((entry as any).status === 'PAID') {
            return NextResponse.json({ error: 'Lançamento já está pago' }, { status: 400 })
        }

        if ((entry as any).status === 'CANCELLED') {
            return NextResponse.json({ error: 'Lançamento cancelado' }, { status: 400 })
        }

        // Create payment
        const { data: payment, error: paymentError } = await supabase
            .from('financial_entry_payments')
            .insert({
                entry_id: entryId,
                amount,
                payment_method,
                account_id,
                notes,
                paid_at: paid_at || new Date().toISOString(),
                created_by: user.id
            })
            .select()
            .single()

        if (paymentError) {
            console.error('Create payment error:', paymentError)
            return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
        }

        // Get updated entry
        const { data: updatedEntry } = await supabase
            .from('financial_entries')
            .select(`
        *,
        category:financial_categories(id, name, color),
        payments:financial_entry_payments(*)
      `)
            .eq('id', entryId)
            .single()

        return NextResponse.json({
            payment,
            entry: updatedEntry
        })
    } catch (error) {
        console.error('Payment error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
