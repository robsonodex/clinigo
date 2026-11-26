import { createServiceRoleClient } from '@/lib/supabase/server'

const DEFAULT_RAILWAY_URL = 'https://clinigo-whatsapp-service-production.up.railway.app'

export function getClinBotServiceUrl(): string {
    const candidate = process.env.CLIN_BOT_URL || process.env.WHATSAPP_SERVICE_URL || DEFAULT_RAILWAY_URL
    if (!candidate || candidate.includes('clinigo.app') || candidate.includes('localhost') || !candidate.startsWith('http')) {
        return DEFAULT_RAILWAY_URL
    }
    return candidate.replace(/\/$/, '')
}

export interface ClinBotHealthState {
    id: string
    enabled: boolean
    last_status: string
    railway_http_status: number | null
    phone_number: string | null
    uptime_seconds: number | null
    consecutive_failures: number
    total_auto_heals: number
    last_checked_at: string | null
    last_ok_at: string | null
    last_failure_at: string | null
    last_failure_reason: string | null
    last_auto_heal_at: string | null
    last_alert_sent_at: string | null
    last_recovery_sent_at: string | null
    alert_emails: string[]
    ntfy_topic: string
    ntfy_enabled: boolean
    telegram_bot_token: string | null
    telegram_chat_id: string | null
    webhook_url: string | null
    alert_cooldown_minutes: number
    updated_at: string
}

async function fetchRailwayJson(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown, timeoutMs = 9000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const url = `${getClinBotServiceUrl()}${path}`

    try {
        const res = await fetch(url, {
            method,
            cache: 'no-store',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        })
        clearTimeout(timer)
        const text = await res.text()
        let parsed: any = null
        try {
            parsed = JSON.parse(text)
        } catch {
            parsed = { raw: text.slice(0, 300) }
        }
        return { ok: res.ok, status: res.status, data: parsed }
    } catch (err: any) {
        clearTimeout(timer)
        return {
            ok: false,
            status: 0,
            data: { error: err?.name === 'AbortError' ? 'Timeout ao consultar serviço Railway' : err?.message || 'Erro de rede' },
        }
    }
}

export function diagnoseRailwayFailure(status: number, data: any): string {
    if (status === 404) {
        return 'Serviço do Bot Clin no Railway retornou HTTP 404 (Application not found). Verifique faturamento, créditos ou status do container no painel do Railway.'
    }
    if (status === 0) {
        return `Falha de rede ou timeout ao acessar o Railway (${data?.error || 'sem resposta'}).`
    }
    if (status >= 500) {
        return `Erro interno no container do Railway (HTTP ${status}).`
    }
    if (data?.status && data.status !== 'connected') {
        return `Sessão WhatsApp do Bot Clin desconectada (status atual: ${data.status}). Pode exigir reconexão por QR Code.`
    }
    return `Bot Clin indisponível (HTTP ${status}).`
}

export async function dispatchSentinelAlerts(
    state: ClinBotHealthState,
    payload: {
        kind: 'DOWN' | 'RECOVERED' | 'TEST'
        title: string
        summary: string
        actionUrl: string
        details?: Record<string, unknown>
    }
): Promise<{ emailSent: boolean; ntfySent: boolean; telegramSent: boolean; webhookSent: boolean; errors: string[] }> {
    const results = {
        emailSent: false,
        ntfySent: false,
        telegramSent: false,
        webhookSent: false,
        errors: [] as string[],
    }

    // 1. E-mail urgente via SMTP do CliniGo (independente do WhatsApp)
    const recipients = Array.isArray(state.alert_emails) && state.alert_emails.length > 0
        ? state.alert_emails
        : ['robsonfenriz@gmail.com', 'contato@clinigo.app']

    try {
        const { sendMail } = await import('@/lib/services/mail-service')
        const accentColor = payload.kind === 'DOWN' ? '#B91C1C' : payload.kind === 'RECOVERED' ? '#155E4B' : '#0F1F1B'
        const badgeLabel =
            payload.kind === 'DOWN'
                ? 'ALERTA CRITICO · BOT WHATSAPP OFFLINE'
                : payload.kind === 'RECOVERED'
                    ? 'RECUPERADO · BOT WHATSAPP ONLINE'
                    : 'TESTE DE MONITORAMENTO · SENTINELA 24/7'

        await sendMail({
            to: recipients.join(', '),
            subject: `[CliniGo Sentinela] ${payload.title}`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FAFAF8; padding: 24px;">
                    <div style="background: #FFFFFF; border: 1px solid #E6E8E5; border-radius: 10px; overflow: hidden;">
                        <div style="height: 4px; background: ${accentColor};"></div>
                        <div style="padding: 28px;">
                            <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: ${accentColor}; margin-bottom: 10px;">
                                ${badgeLabel}
                            </div>
                            <h1 style="margin: 0 0 12px 0; font-size: 20px; color: #0F1F1B;">${payload.title}</h1>
                            <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #4B5B56;">${payload.summary}</p>
                            <div style="margin: 22px 0;">
                                <a href="${payload.actionUrl}" style="display: inline-block; background: #155E4B; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 22px; border-radius: 6px; margin-right: 10px;">
                                    Abrir Painel do Bot Clin
                                </a>
                                <a href="https://railway.app/dashboard" style="display: inline-block; background: #FFFFFF; color: #0F1F1B; border: 1px solid #D8DFDC; text-decoration: none; font-weight: 600; font-size: 14px; padding: 11px 18px; border-radius: 6px;">
                                    Abrir Railway
                                </a>
                            </div>
                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #6B7B76; border-top: 1px solid #E6E8E5; padding-top: 14px;">
                                Sentinela 24/7 CliniGo · Verificação automática a cada 5 minutos · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (BRT)
                            </p>
                        </div>
                    </div>
                </div>
            `,
        })
        results.emailSent = true
    } catch (err: any) {
        results.errors.push(`email: ${err?.message || 'erro ao enviar e-mail'}`)
    }

    // 2. Push instantâneo no celular via ntfy.sh (100% gratuito, independente do WhatsApp)
    if (state.ntfy_enabled && state.ntfy_topic && state.ntfy_topic.trim().length >= 6) {
        try {
            const topic = encodeURIComponent(state.ntfy_topic.trim())
            const ntfyRes = await fetch(`https://ntfy.sh/${topic}`, {
                method: 'POST',
                headers: {
                    Title: payload.title.replace(/[^\x20-\x7E]/g, ''),
                    Priority: payload.kind === 'DOWN' ? 'urgent' : 'default',
                    Tags: payload.kind === 'DOWN' ? 'rotating_light,warning' : 'white_check_mark',
                    Click: payload.actionUrl,
                },
                body: payload.summary,
            })
            if (ntfyRes.ok) {
                results.ntfySent = true
            } else {
                results.errors.push(`ntfy: HTTP ${ntfyRes.status}`)
            }
        } catch (err: any) {
            results.errors.push(`ntfy: ${err?.message || 'erro'}`)
        }
    }

    // 3. Telegram Bot (opcional)
    if (state.telegram_bot_token && state.telegram_chat_id) {
        try {
            const tgRes = await fetch(
                `https://api.telegram.org/bot${state.telegram_bot_token.trim()}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: state.telegram_chat_id.trim(),
                        text: `${payload.title}\n\n${payload.summary}\n\nPainel: ${payload.actionUrl}`,
                    }),
                }
            )
            if (tgRes.ok) results.telegramSent = true
            else results.errors.push(`telegram: HTTP ${tgRes.status}`)
        } catch (err: any) {
            results.errors.push(`telegram: ${err?.message || 'erro'}`)
        }
    }

    // 4. Webhook customizado (opcional)
    if (state.webhook_url && state.webhook_url.startsWith('http')) {
        try {
            const whRes = await fetch(state.webhook_url.trim(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: 'clinigo-clin-bot',
                    ...payload,
                    timestamp: new Date().toISOString(),
                }),
            })
            if (whRes.ok) results.webhookSent = true
            else results.errors.push(`webhook: HTTP ${whRes.status}`)
        } catch (err: any) {
            results.errors.push(`webhook: ${err?.message || 'erro'}`)
        }
    }

    return results
}

export async function getOrInitSentinelState(supabase: any): Promise<ClinBotHealthState> {
    const { data } = await supabase
        .from('clin_bot_health_state')
        .select('*')
        .eq('id', 'clin-sales-bot')
        .maybeSingle()

    if (data) return data as ClinBotHealthState

    const { data: created } = await supabase
        .from('clin_bot_health_state')
        .upsert({ id: 'clin-sales-bot' }, { onConflict: 'id' })
        .select('*')
        .single()

    return created as ClinBotHealthState
}

async function logSentinelEvent(
    supabase: any,
    eventType: string,
    severity: 'info' | 'warning' | 'critical',
    summary: string,
    details: Record<string, unknown> = {}
) {
    try {
        await supabase.from('clin_bot_health_events').insert({
            event_type: eventType,
            severity,
            summary,
            details,
        })
    } catch {
        // Non-fatal
    }
}

export async function runClinBotSentinelCheck(options?: { forceAlert?: boolean; source?: string }) {
    const supabase = createServiceRoleClient() as any
    const state = await getOrInitSentinelState(supabase)
    const nowIso = new Date().toISOString()
    const nowMs = Date.now()
    const actionUrl = 'https://clinigo.app/system-master-hub/clin-whatsapp'

    // Passo 1: Consultar /clin/status no Railway (keep-alive + status real)
    const statusRes = await fetchRailwayJson('/clin/status', 'GET', undefined, 8000)

    if (statusRes.ok && statusRes.data?.connected === true) {
        const hadActiveAlert = Boolean(
            state.last_alert_sent_at &&
            (!state.last_recovery_sent_at ||
                new Date(state.last_alert_sent_at).getTime() > new Date(state.last_recovery_sent_at).getTime())
        )

        const updatePayload: Record<string, any> = {
            last_status: 'connected',
            railway_http_status: statusRes.status,
            phone_number: statusRes.data?.phone_number || state.phone_number,
            uptime_seconds: typeof statusRes.data?.uptime === 'number' ? statusRes.data.uptime : state.uptime_seconds,
            consecutive_failures: 0,
            last_checked_at: nowIso,
            last_ok_at: nowIso,
            last_failure_reason: null,
            updated_at: nowIso,
        }

        let recoveryAlertResult = null
        if (hadActiveAlert || state.consecutive_failures >= 2) {
            updatePayload.last_recovery_sent_at = nowIso
            recoveryAlertResult = await dispatchSentinelAlerts(state, {
                kind: 'RECOVERED',
                title: 'Bot Clin WhatsApp voltou online',
                summary: `A conexão oficial do Bot Clin (${updatePayload.phone_number || 'WhatsApp Comercial'}) foi restabelecida com sucesso. Uptime atual: ${Math.round(Number(updatePayload.uptime_seconds || 0))}s.`,
                actionUrl,
            })
            await logSentinelEvent(supabase, 'RECOVERED', 'info', 'Conexão do Bot Clin restabelecida automaticamente.', {
                phone_number: updatePayload.phone_number,
                recoveryAlertResult,
                source: options?.source || 'cron',
            })
        }

        await supabase.from('clin_bot_health_state').update(updatePayload).eq('id', 'clin-sales-bot')

        return {
            ok: true,
            status: 'connected',
            autoHealed: false,
            alertSent: false,
            recovered: hadActiveAlert,
            phone_number: updatePayload.phone_number,
            uptime_seconds: updatePayload.uptime_seconds,
        }
    }

    // Passo 2: Se o Railway respondeu 200 mas WhatsApp está desconectado -> Auto-Cura (POST /clin/connect sem force)
    if (statusRes.ok && statusRes.data?.connected !== true) {
        await logSentinelEvent(supabase, 'AUTO_HEAL_ATTEMPT', 'warning', 'Bot desconectado no Railway. Tentando reconexão automática (auto-cura)...', {
            status_before: statusRes.data,
            source: options?.source || 'cron',
        })

        await fetchRailwayJson('/clin/connect', 'POST', undefined, 8000)
        await new Promise((r) => setTimeout(r, 6000))
        const afterHeal = await fetchRailwayJson('/clin/status', 'GET', undefined, 8000)

        if (afterHeal.ok && afterHeal.data?.connected === true) {
            const nextAutoHeals = (state.total_auto_heals || 0) + 1
            await supabase
                .from('clin_bot_health_state')
                .update({
                    last_status: 'connected',
                    railway_http_status: afterHeal.status,
                    phone_number: afterHeal.data?.phone_number || state.phone_number,
                    uptime_seconds: typeof afterHeal.data?.uptime === 'number' ? afterHeal.data.uptime : state.uptime_seconds,
                    consecutive_failures: 0,
                    total_auto_heals: nextAutoHeals,
                    last_checked_at: nowIso,
                    last_ok_at: nowIso,
                    last_auto_heal_at: nowIso,
                    last_failure_reason: null,
                    updated_at: nowIso,
                })
                .eq('id', 'clin-sales-bot')

            await logSentinelEvent(supabase, 'AUTO_HEALED', 'info', 'Auto-cura concluída com sucesso: sessão WhatsApp restaurada sem intervenção manual.', {
                phone_number: afterHeal.data?.phone_number,
                total_auto_heals: nextAutoHeals,
                source: options?.source || 'cron',
            })

            return {
                ok: true,
                status: 'connected',
                autoHealed: true,
                alertSent: false,
                phone_number: afterHeal.data?.phone_number || state.phone_number,
                uptime_seconds: afterHeal.data?.uptime || null,
            }
        }
    }

    // Passo 3: Falha persistente (Railway 404/5xx/timeout ou WhatsApp não reconectou após auto-cura)
    const nextFailures = (state.consecutive_failures || 0) + 1
    const reason = diagnoseRailwayFailure(statusRes.status, statusRes.data)
    const isHardDown = statusRes.status === 404 || statusRes.status === 0 || statusRes.status >= 500
    const cooldownMs = Math.max(5, state.alert_cooldown_minutes || 30) * 60 * 1000
    const lastAlertMs = state.last_alert_sent_at ? new Date(state.last_alert_sent_at).getTime() : 0
    const cooldownElapsed = !lastAlertMs || nowMs - lastAlertMs >= cooldownMs

    const shouldSendAlert = Boolean(
        options?.forceAlert || ((isHardDown || nextFailures >= 2) && cooldownElapsed)
    )

    let alertResult = null
    if (shouldSendAlert) {
        alertResult = await dispatchSentinelAlerts(state, {
            kind: 'DOWN',
            title: statusRes.status === 404
                ? 'URGENTE: Serviço do Bot Clin parado no Railway (404)'
                : 'ALERTA: WhatsApp do Bot Clin desconectado',
            summary: `${reason} Falhas consecutivas: ${nextFailures}.`,
            actionUrl,
            details: { railway_status: statusRes.status, response: statusRes.data },
        })

        await logSentinelEvent(supabase, 'ALERT_SENT', 'critical', `Alerta disparado: ${reason}`, {
            consecutive_failures: nextFailures,
            railway_http_status: statusRes.status,
            alertResult,
            source: options?.source || 'cron',
        })
    } else {
        await logSentinelEvent(supabase, 'DOWN_DETECTED', 'warning', reason, {
            consecutive_failures: nextFailures,
            railway_http_status: statusRes.status,
            cooldown_active: !cooldownElapsed,
            source: options?.source || 'cron',
        })
    }

    await supabase
        .from('clin_bot_health_state')
        .update({
            last_status: statusRes.status === 404 ? 'railway_down' : 'disconnected',
            railway_http_status: statusRes.status,
            consecutive_failures: nextFailures,
            last_checked_at: nowIso,
            last_failure_at: nowIso,
            last_failure_reason: reason,
            ...(shouldSendAlert ? { last_alert_sent_at: nowIso } : {}),
            updated_at: nowIso,
        })
        .eq('id', 'clin-sales-bot')

    return {
        ok: false,
        status: statusRes.status === 404 ? 'railway_down' : 'disconnected',
        autoHealed: false,
        alertSent: shouldSendAlert,
        alertResult,
        reason,
        consecutive_failures: nextFailures,
        railway_http_status: statusRes.status,
    }
}

export async function recoverOfflineLeadByClin(params: {
    phone: string
    incomingMessage?: string
    includeApologyPrefix?: boolean
}): Promise<{ success: boolean; sentTo: string; messagesSent: number; preview: string }> {
    const cleanDigits = params.phone.replace(/\D/g, '')
    if (cleanDigits.length < 10) {
        throw new Error('Informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).')
    }
    const normalizedPhone = cleanDigits.startsWith('55') ? cleanDigits : `55${cleanDigits}`
    const candidatePhones = [normalizedPhone]
    if (normalizedPhone.startsWith('55') && normalizedPhone.length === 13) {
        const ddd = parseInt(normalizedPhone.substring(2, 4), 10)
        if (ddd > 28) {
            candidatePhones.push(normalizedPhone.substring(0, 4) + normalizedPhone.substring(5))
        }
    }

    const messageText = (params.incomingMessage || 'Olá').trim() || 'Olá'
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'

    const chatRes = await fetch(`${appBaseUrl.replace(/\/$/, '')}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: messageText,
            sessionId: `wa-${normalizedPhone}`,
            sourcePage: 'whatsapp',
            source: 'whatsapp',
        }),
    })

    if (!chatRes.ok) {
        throw new Error(`Falha ao gerar resposta no motor do Bot Clin (HTTP ${chatRes.status}).`)
    }

    const chatData = await chatRes.json()
    const rawMessages: string[] =
        Array.isArray(chatData.messages) && chatData.messages.length > 0
            ? chatData.messages
            : chatData.reply
                ? [chatData.reply]
                : []

    if (rawMessages.length === 0) {
        throw new Error('O motor do Bot Clin não retornou mensagem de resposta para esta sessão.')
    }

    const apologyPrefix = params.includeApologyPrefix !== false
        ? 'Olá! Peço desculpas pela breve demora no retorno — nosso atendimento acabou de ser restabelecido.\n\n'
        : ''

    const outboundMessages = [
        `${apologyPrefix}${rawMessages[0]}`,
        ...rawMessages.slice(1),
    ]

    let deliveredTo = normalizedPhone
    for (let i = 0; i < outboundMessages.length; i++) {
        let sent = false
        let lastError = 'Serviço do WhatsApp indisponível'

        for (const target of candidatePhones) {
            const sendRes = await fetchRailwayJson('/clin/send', 'POST', {
                to: target,
                text: outboundMessages[i],
            }, 15000)

            if (sendRes.ok) {
                sent = true
                deliveredTo = target
                break
            }
            lastError = sendRes.data?.error || diagnoseRailwayFailure(sendRes.status, sendRes.data)
        }

        if (!sent) {
            throw new Error(lastError)
        }

        if (i < outboundMessages.length - 1) {
            await new Promise((r) => setTimeout(r, 600))
        }
    }

    const supabase = createServiceRoleClient() as any
    await logSentinelEvent(supabase, 'LEAD_RECOVERED', 'info', `Resposta do Bot Clin enviada manualmente para lead offline (${deliveredTo}).`, {
        phone: deliveredTo,
        messages_sent: outboundMessages.length,
    })

    return {
        success: true,
        sentTo: deliveredTo,
        messagesSent: outboundMessages.length,
        preview: outboundMessages[0].slice(0, 180),
    }
}

