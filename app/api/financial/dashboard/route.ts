import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/financial/dashboard
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic ID
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = profile?.clinic_id

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        const today = new Date()
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

        // Revenue today
        const { data: todayRevenue } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('type', 'income')
            .gte('date', today.toISOString().split('T')[0])
            .is('cancelled_at', null)

        const revenueToday = todayRevenue?.reduce((sum, entry) => sum + entry.amount, 0) || 0

        // Revenue this month
        const { data: monthRevenue } = await supabase
            .from('financial_entries')
            .select('amount')
            .eq('clinic_id', clinicId)
            .eq('type', 'income')
            .gte('date', startOfMonth.toISOString())
            .is('cancelled_at', null)

        const revenueMonth = monthRevenue?.reduce((sum, entry) => sum + entry.amount, 0) || 0

        // Pending (appointments without payment)
        const { count: pendingCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('status', 'COMPLETED')
            .is('payment_status', null)

        // Revenue by payment method (this month)
        const { data: byMethod } = await supabase
            .from('financial_entries')
            .select('payment_method, amount')
            .eq('clinic_id', clinicId)
            .eq('type', 'income')
            .gte('date', startOfMonth.toISOString())
            .is('cancelled_at', null)

        const revenueByMethod = byMethod?.reduce((acc, entry) => {
            const method = entry.payment_method || 'other'
            acc[method] = (acc[method] || 0) + entry.amount
            return acc
        }, {} as Record<string, number>)

        return NextResponse.json({
            revenueToday,
            revenueMonth,
            pendingCount: pendingCount || 0,
            revenueByMethod: revenueByMethod || {}
        })
    } catch (error) {
        console.error('Error in financial dashboard API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
