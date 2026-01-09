import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface PaymentRow {
    amount: number
    status: string
    created_at: string
}

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ data: { total: 0, formatted: 'R$ 0,00', thisMonth: 0, lastMonth: 0, growth: 0 } })
        }

        const clinicId = profile.clinic_id

        // Get current month start and end
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

        try {
            // Fetch this month's payments
            const { data: thisMonthPayments } = await supabase
                .from('payments')
                .select('amount')
                .eq('clinic_id', clinicId)
                .eq('status', 'PAID')
                .gte('created_at', thisMonthStart) as { data: PaymentRow[] | null }

            // Fetch last month's payments
            const { data: lastMonthPayments } = await supabase
                .from('payments')
                .select('amount')
                .eq('clinic_id', clinicId)
                .eq('status', 'PAID')
                .gte('created_at', lastMonthStart)
                .lte('created_at', lastMonthEnd) as { data: PaymentRow[] | null }

            // Calculate totals (amount is in cents)
            const thisMonthTotal = (thisMonthPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)
            const lastMonthTotal = (lastMonthPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0)

            // Format for display
            const formatted = `R$ ${(thisMonthTotal / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

            // Calculate growth percentage
            const growth = lastMonthTotal > 0
                ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
                : thisMonthTotal > 0 ? 100 : 0

            return NextResponse.json({
                data: {
                    thisMonth: thisMonthTotal,
                    lastMonth: lastMonthTotal,
                    formatted,
                    growth,
                }
            })
        } catch {
            return NextResponse.json({ data: { total: 0, formatted: 'R$ 0,00', thisMonth: 0, lastMonth: 0, growth: 0 } })
        }
    } catch (error) {
        console.error('Revenue API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
