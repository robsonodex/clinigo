import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { processSalesOutreachQueue } from '@/lib/sales/outreach-worker'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/sales-outreach
 * Acionado a cada 2 minutos pelo pg_cron gate (sales-outreach-gate) somente quando
 * há contatos elegíveis com next_send_at <= now() em campanhas RUNNING.
 */
export async function GET() {
    const startedAt = Date.now()
    try {
        const supabaseAdmin = createServiceRoleClient()
        const result = await processSalesOutreachQueue(supabaseAdmin, {
            maxPerRun: 2,
            ignoreBusinessHours: false,
            ignoreNextSendAt: false,
        })

        return NextResponse.json({
            success: true,
            ...result,
            duration_ms: Date.now() - startedAt,
        })
    } catch (error: any) {
        console.error('[CRON:sales-outreach] Erro ao processar fila comercial:', error)
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Erro interno no worker de campanhas comerciais',
            },
            { status: 500 }
        )
    }
}

