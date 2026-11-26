import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdminSalesHq } from '@/app/api/super-admin/prospeccao/_auth'
import {
    dispatchSentinelAlerts,
    getOrInitSentinelState,
    runClinBotSentinelCheck,
} from '@/lib/whatsapp/clin-sentinel'

export const dynamic = 'force-dynamic'

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const supabase = createServiceRoleClient() as any
    const [state, eventsRes] = await Promise.all([
        getOrInitSentinelState(supabase),
        supabase
            .from('clin_bot_health_events')
            .select('id, event_type, severity, summary, details, created_at')
            .order('created_at', { ascending: false })
            .limit(20),
    ])

    return NextResponse.json({
        success: true,
        state,
        events: eventsRes.data || [],
    })
}

export async function PATCH(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const supabase = createServiceRoleClient() as any
        await getOrInitSentinelState(supabase)

        const updateData: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (typeof body.enabled === 'boolean') updateData.enabled = body.enabled
        if (typeof body.ntfy_enabled === 'boolean') updateData.ntfy_enabled = body.ntfy_enabled
        if (typeof body.ntfy_topic === 'string' && body.ntfy_topic.trim().length >= 6) {
            updateData.ntfy_topic = body.ntfy_topic.trim().replace(/[^a-zA-Z0-9_-]/g, '')
        }
        if (Array.isArray(body.alert_emails)) {
            const validEmails = body.alert_emails
                .map((e: any) => String(e).trim().toLowerCase())
                .filter((e: string) => e.includes('@'))
            if (validEmails.length > 0) updateData.alert_emails = validEmails
        }
        if (typeof body.telegram_bot_token === 'string') {
            updateData.telegram_bot_token = body.telegram_bot_token.trim() || null
        }
        if (typeof body.telegram_chat_id === 'string') {
            updateData.telegram_chat_id = body.telegram_chat_id.trim() || null
        }
        if (typeof body.webhook_url === 'string') {
            updateData.webhook_url = body.webhook_url.trim() || null
        }
        if (typeof body.alert_cooldown_minutes === 'number' && body.alert_cooldown_minutes >= 5 && body.alert_cooldown_minutes <= 240) {
            updateData.alert_cooldown_minutes = Math.round(body.alert_cooldown_minutes)
        }

        const { data: updated, error } = await supabase
            .from('clin_bot_health_state')
            .update(updateData)
            .eq('id', 'clin-sales-bot')
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, state: updated })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Erro ao salvar configuração' }, { status: 400 })
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const action = String(body.action || 'check_now')
        const supabase = createServiceRoleClient() as any

        if (action === 'test_alert') {
            const state = await getOrInitSentinelState(supabase)
            const alertResult = await dispatchSentinelAlerts(state, {
                kind: 'TEST',
                title: 'Teste do Sentinela 24/7 — Bot Clin WhatsApp',
                summary:
                    'Alerta de teste disparado manualmente pelo Master Hub. Se você recebeu esta notificação no celular ou e-mail, o monitoramento fora do WhatsApp está 100% operacional.',
                actionUrl: 'https://clinigo.app/system-master-hub/clin-whatsapp',
            })

            await supabase.from('clin_bot_health_events').insert({
                event_type: 'TEST_ALERT',
                severity: 'info',
                summary: 'Teste manual de alerta enviado pelos canais configurados.',
                details: alertResult,
            })

            return NextResponse.json({
                success: true,
                alertResult,
            })
        }

        const result = await runClinBotSentinelCheck({
            source: 'super_admin_manual',
            forceAlert: Boolean(body.force_alert),
        })

        return NextResponse.json({
            success: true,
            result,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'Erro ao executar ação do Sentinela' }, { status: 500 })
    }
}

