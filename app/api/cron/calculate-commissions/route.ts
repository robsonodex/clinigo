/**
 * Commission Calculation CRON API
 * POST /api/cron/calculate-commissions - Calculate monthly partner commissions
 * 
 * This endpoint is called by a cron job on the 1st of each month
 * Requires CRON_SECRET_KEY for authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateMonthlyCommissions } from '@/lib/services/commission.service'

const CRON_SECRET_KEY = process.env.CRON_SECRET_KEY

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization')

        if (!CRON_SECRET_KEY) {
            console.warn('[CRON:calculate-commissions] CRON_SECRET_KEY not configured')
            return NextResponse.json(
                { error: 'Cron secret not configured' },
                { status: 500 }
            )
        }

        if (authHeader !== `Bearer ${CRON_SECRET_KEY}`) {
            console.warn('[CRON:calculate-commissions] Invalid cron secret')
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        console.log('[CRON:calculate-commissions] Starting commission calculation...')

        // Calculate commissions
        const result = await calculateMonthlyCommissions()

        if (!result.success) {
            console.error('[CRON:calculate-commissions] Failed:', result.error)
            return NextResponse.json(
                {
                    error: result.error || 'Erro ao calcular comissões',
                    commissions_created: 0,
                    total_amount: 0
                },
                { status: 500 }
            )
        }

        console.log(`[CRON:calculate-commissions] Success: ${result.commissions_created} commissions, R$ ${result.total_amount.toFixed(2)}`)

        return NextResponse.json({
            success: true,
            commissions_created: result.commissions_created,
            total_amount: result.total_amount,
            message: `${result.commissions_created} comissões calculadas, total: R$ ${result.total_amount.toFixed(2)}`
        })
    } catch (error: any) {
        console.error('[CRON:calculate-commissions] Error:', error)

        return NextResponse.json(
            { error: 'Erro interno ao calcular comissões' },
            { status: 500 }
        )
    }
}

// Also allow GET for Vercel cron
export async function GET(request: NextRequest) {
    return POST(request)
}
