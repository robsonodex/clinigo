/**
 * Admin Partner Payments API
 * GET /api/admin/partner-payments - List pending partner payments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPendingPayments } from '@/lib/services/commission.service'

export async function GET(request: NextRequest) {
    try {
        // Check if user is admin
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            )
        }

        const userRole = user.user_metadata?.role
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json(
                { error: 'Acesso negado' },
                { status: 403 }
            )
        }

        // Get month filter from query params
        const { searchParams } = new URL(request.url)
        const monthParam = searchParams.get('month')
        const month = monthParam ? new Date(monthParam) : undefined

        // Fetch pending payments
        const payments = await getPendingPayments(month)

        return NextResponse.json({
            success: true,
            payments,
            total_pending: payments.reduce((sum, p) => sum + p.total_amount, 0)
        })
    } catch (error: any) {
        console.error('[API:admin/partner-payments] Error:', error)

        return NextResponse.json(
            { error: 'Erro ao buscar pagamentos' },
            { status: 500 }
        )
    }
}
