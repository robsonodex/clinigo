import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/financial/payments/:id/cancel
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const paymentId = params.id
        const body = await request.json()
        const { reason } = body

        if (!reason) {
            return NextResponse.json({ error: 'Cancellation reason required' }, { status: 400 })
        }

        // Cancel payment
        const { data: payment, error } = await supabase
            .from('financial_entries')
            .update({
                cancelled_by: user.id,
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString()
            })
            .eq('id', paymentId)
            .select()
            .single()

        if (error) {
            console.error('Error cancelling payment:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, payment })
    } catch (error) {
        console.error('Error in cancel payment API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
