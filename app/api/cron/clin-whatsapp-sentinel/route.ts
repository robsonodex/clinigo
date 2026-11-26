import { NextResponse } from 'next/server'
import { runClinBotSentinelCheck } from '@/lib/whatsapp/clin-sentinel'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/clin-whatsapp-sentinel
 * Acionado a cada 5 minutos pelo pg_cron do Supabase (via pg_net).
 * Realiza keep-alive no Railway, tenta auto-cura em caso de desconexão
 * e dispara alertas multi-canal (E-mail + Push ntfy.sh + Telegram/Webhook).
 */
export async function GET() {
    try {
        const result = await runClinBotSentinelCheck({ source: 'pg_cron' })
        return NextResponse.json({
            success: true,
            ...result,
            checked_at: new Date().toISOString(),
        })
    } catch (error: any) {
        console.error('[CRON:clin-whatsapp-sentinel] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'Erro interno no Sentinela do Bot Clin',
            },
            { status: 500 }
        )
    }
}

