import { NextRequest, NextResponse } from 'next/server'
import { runClinBotFollowUpSweep } from '@/lib/chatbot/clin-growth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/clin-whatsapp-followup
 *
 * Acionado a cada 30 minutos via pg_cron (`clinigo-clin-bot-followup`).
 * Envia no máximo 1 lembrete elegante após 2h e 1 recuperação após 24h
 * para leads comerciais ativos no WhatsApp, respeitando horário comercial BRT (08h30–19h30)
 * e nunca interferindo em conversas transferidas, pausadas ou de conta encerrada/bloqueada.
 */
export async function GET(request: NextRequest) {
    try {
        const dryRun = request.nextUrl.searchParams.get('dryRun') === '1'
        const result = await runClinBotFollowUpSweep({ dryRun })
        return NextResponse.json({
            ...result,
            checked_at: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[CRON:clin-whatsapp-followup]', error)
        return NextResponse.json(
            { ok: false, error: error?.message || 'Erro interno no follow-up do Bot Clin' },
            { status: 500 }
        )
    }
}

