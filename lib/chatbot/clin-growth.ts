/**
 * Motor de Crescimento e Automação — Bot Clin 2.0
 *
 * Responsável por:
 * 1. Cascata gratuita de IA Fallback (Groq -> OpenRouter -> Cloudflare -> MSG_MENU).
 * 2. Captura progressiva de leads em chatbot_leads.
 * 3. Sincronização automática de leads qualificados com o HQ Privado de Prospecção B2B (sales_prospects).
 * 4. Alerta Push instantâneo no celular (ntfy.sh) + E-mail quando um lead quente pede especialista/recontratação.
 * 5. Follow-up automático elegante (2h e 24h) respeitando horário comercial BRT e pausa humana.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
    dispatchSentinelAlerts,
    getClinBotServiceUrl,
    getOrInitSentinelState,
} from '@/lib/whatsapp/clin-sentinel'
import type { LeadData } from './clin-engine'
import { MSG_INATIVIDADE, MSG_MENU, MSG_RECUPERACAO_24H } from './clin-messages'

const EMOJI_REGEX = /[\p{Extended_Pictographic}]/gu

export interface ChatHistoryMessage {
    role: 'user' | 'assistant'
    content: string
}

function sanitizeAiText(raw: string): string {
    let content = String(raw || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(EMOJI_REGEX, '')
        .trim()

    if (
        content.includes('The user is asking') ||
        content.includes("Let's check") ||
        content.includes('In the previous context')
    ) {
        const cleanParagraphs = content
            .split(/\n\s*\n/)
            .filter(
                (p) =>
                    !p.startsWith('The user') &&
                    !p.startsWith("Let's") &&
                    !p.startsWith('Now, answer') &&
                    !p.startsWith('In the previous') &&
                    !p.startsWith('So CliniGo DOES')
            )
        content = cleanParagraphs.join('\n\n').trim()
    }

    return content
}

export async function callClinAiFallbackCascade(
    systemPrompt: string,
    history: ChatHistoryMessage[]
): Promise<{ messages: string[]; provider: string }> {
    const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history.slice(-10),
    ]

    const attempts: Array<{ provider: 'groq' | 'openrouter' | 'cloudflare'; model: string }> = [
        { provider: 'groq', model: 'llama-3.3-70b-versatile' },
        { provider: 'groq', model: 'openai/gpt-oss-20b' },
        { provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it:free' },
        { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' },
        { provider: 'cloudflare', model: '@cf/meta/llama-3.1-8b-instruct-fast' },
        { provider: 'openrouter', model: 'openrouter/free' },
    ]

    for (const attempt of attempts) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 11000)

        try {
            if (attempt.provider === 'groq') {
                const apiKey = process.env.GROQ_API_KEY?.trim()
                if (!apiKey) {
                    clearTimeout(timer)
                    continue
                }
                const body: Record<string, unknown> = {
                    model: attempt.model,
                    messages,
                    max_tokens: 480,
                    temperature: 0.45,
                }
                if (attempt.model.startsWith('openai/gpt-oss')) {
                    body.reasoning_effort = 'low'
                }
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                })
                clearTimeout(timer)
                if (res.ok) {
                    const data = await res.json()
                    const cleaned = sanitizeAiText(data?.choices?.[0]?.message?.content || '')
                    if (cleaned) {
                        return { messages: [cleaned], provider: `groq:${attempt.model}` }
                    }
                }
                continue
            }

            if (attempt.provider === 'openrouter') {
                const apiKey = process.env.OPENROUTER_API_KEY?.trim()
                if (!apiKey) {
                    clearTimeout(timer)
                    continue
                }
                const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://clinigo.app',
                        'X-Title': 'CliniGo Chatbot Clin',
                    },
                    body: JSON.stringify({
                        model: attempt.model,
                        messages,
                        max_tokens: 480,
                        temperature: 0.45,
                    }),
                    signal: controller.signal,
                })
                clearTimeout(timer)
                if (res.ok) {
                    const data = await res.json()
                    const cleaned = sanitizeAiText(data?.choices?.[0]?.message?.content || '')
                    if (cleaned) {
                        return { messages: [cleaned], provider: `openrouter:${attempt.model}` }
                    }
                }
                continue
            }

            if (attempt.provider === 'cloudflare') {
                const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
                const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
                if (!token || !accountId) {
                    clearTimeout(timer)
                    continue
                }
                const res = await fetch(
                    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${attempt.model}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages,
                            max_tokens: 480,
                            temperature: 0.45,
                        }),
                        signal: controller.signal,
                    }
                )
                clearTimeout(timer)
                if (res.ok) {
                    const data = await res.json()
                    const cleaned = sanitizeAiText(data?.result?.response || '')
                    if (cleaned) {
                        return { messages: [cleaned], provider: `cloudflare:${attempt.model}` }
                    }
                }
                continue
            }
        } catch {
            clearTimeout(timer)
        }
    }

    return { messages: MSG_MENU, provider: 'deterministic-menu-fallback' }
}

export function extractWhatsappDigits(sessionId: string, leadPhone?: string): string | null {
    const raw = leadPhone || (sessionId.startsWith('wa-') ? sessionId.replace(/^wa-/, '') : '')
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10) return null
    return digits.startsWith('55') ? digits : `55${digits}`
}

export async function upsertProgressiveChatbotLead(
    supabase: any,
    params: {
        sessionId: string
        sourcePage: string
        lead: LeadData
        transferred: boolean
        transferTag?: string
        trialRequested?: boolean
    }
): Promise<{ saved: boolean; phone: string | null }> {
    const phone = extractWhatsappDigits(params.sessionId, params.lead.telefone)
    const hasMeaningfulData = Boolean(
        params.transferred ||
        params.trialRequested ||
        params.lead.nome ||
        params.lead.clinica ||
        params.lead.numProfissionais ||
        params.lead.dorPrincipal
    )

    if (!hasMeaningfulData) {
        return { saved: false, phone }
    }

    const { data: existingLead } = await supabase
        .from('chatbot_leads')
        .select('id, status')
        .eq('session_id', params.sessionId)
        .maybeSingle()

    const preserveExistingStatus =
        existingLead?.status === 'converted' || existingLead?.status === 'contacted'

    const computedStatus = preserveExistingStatus
        ? existingLead.status
        : params.transferred
            ? 'qualified'
            : 'new'

    const notesParts = [
        params.lead.clinica ? `Clínica: ${params.lead.clinica}` : null,
        params.lead.cargo ? `Cargo: ${params.lead.cargo}` : null,
        params.lead.numProfissionais ? `Profissionais: ${params.lead.numProfissionais}` : null,
        params.lead.planoIndicado ? `Plano: ${params.lead.planoIndicado}` : null,
        params.transferTag ? `Tag: ${params.transferTag}` : null,
        params.trialRequested ? 'Solicitou link de teste grátis 7 dias' : null,
    ].filter(Boolean)

    const payload: Record<string, any> = {
        name: params.lead.nome || null,
        phone,
        specialty: params.lead.dorPrincipal || null,
        clinic_size: params.lead.numProfissionais ? String(params.lead.numProfissionais) : null,
        interest: params.lead.dorPrincipal || (params.trialRequested ? 'Teste grátis 7 dias' : null),
        plan_interest: params.lead.planoIndicado || null,
        source_page: params.sourcePage || '/',
        status: computedStatus,
        notes: notesParts.join(' | ') || null,
        updated_at: new Date().toISOString(),
    }

    if (existingLead?.id) {
        await supabase.from('chatbot_leads').update(payload).eq('id', existingLead.id)
    } else {
        await supabase.from('chatbot_leads').insert({
            ...payload,
            email: null,
            session_id: params.sessionId,
        })
    }

    await supabase
        .from('chatbot_sessions')
        .update({
            lead_captured: true,
            ...(params.lead.nome ? { visitor_name: params.lead.nome } : {}),
            ...(phone ? { visitor_phone: phone } : {}),
            ...(params.lead.numProfissionais ? { visitor_clinic_size: String(params.lead.numProfissionais) } : {}),
        })
        .eq('session_id', params.sessionId)

    return { saved: true, phone }
}

export function sanitizeEstimatedProfessionals(value?: number | null): number {
    const num = Number(value)
    if (!Number.isFinite(num) || num < 1) return 5
    return Math.min(500, Math.round(num))
}

export function buildSalesProspectInsertPayload(params: {
    lead: LeadData
    phone: string | null
    transferTag?: string
    nowIso?: string
    tomorrowIso?: string
}) {
    const nowIso = params.nowIso || new Date().toISOString()
    const tomorrowIso =
        params.tomorrowIso ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const cleanClinic = (params.lead.clinica || '').trim()
    const cleanName = (params.lead.nome || '').trim()
    const cleanPhone = (params.phone || '').trim()

    const clinicLabel =
        cleanClinic ||
        (cleanName ? `Clínica — ${cleanName}` : `Lead Bot Clin (${cleanPhone || 'WhatsApp'})`)

    const summaryLine = `[Bot Clin ${new Date(nowIso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}] ${params.lead.dorPrincipal || 'Interesse comercial'}${params.lead.planoIndicado ? ` · ${params.lead.planoIndicado}` : ''}`

    return {
        clinic_name: clinicLabel,
        contact_name: cleanName,
        whatsapp: cleanPhone,
        program_focus:
            params.transferTag === 'nova_contratacao_encerrada'
                ? 'Recontratação'
                : 'Inbound Bot Clin',
        funnel_status: 'RESPONDEU' as const,
        estimated_professionals: sanitizeEstimatedProfessionals(params.lead.numProfissionais),
        notes: summaryLine,
        last_contact_at: nowIso,
        next_followup_at: tomorrowIso,
    }
}

export async function syncQualifiedLeadToSalesHq(
    supabase: any,
    params: {
        sessionId: string
        lead: LeadData
        phone: string | null
        transferTag?: string
        transferred: boolean
    }
): Promise<boolean> {
    const isQualified = Boolean(
        params.transferred ||
        params.transferTag === 'nova_contratacao_encerrada' ||
        (params.lead.numProfissionais && params.lead.numProfissionais >= 2)
    )
    if (!isQualified) return false
    if (!params.phone && !params.lead.clinica) return false

    try {
        let existing: { id: string; notes: string | null } | null = null
        if (params.phone) {
            const { data } = await supabase
                .from('sales_prospects')
                .select('id, notes')
                .ilike('whatsapp', `%${params.phone.slice(-9)}%`)
                .limit(1)
                .maybeSingle()
            existing = data || null
        }

        const insertPayload = buildSalesProspectInsertPayload({
            lead: params.lead,
            phone: params.phone,
            transferTag: params.transferTag,
        })

        if (existing?.id) {
            const mergedNotes =
                existing.notes && existing.notes.includes(insertPayload.notes)
                    ? existing.notes
                    : [existing.notes, insertPayload.notes].filter(Boolean).join('\n')
            const hasExplicitProfessionals =
                typeof params.lead.numProfissionais === 'number' &&
                Number.isFinite(params.lead.numProfissionais) &&
                params.lead.numProfissionais >= 1

            const { error: updateError } = await supabase
                .from('sales_prospects')
                .update({
                    last_contact_at: insertPayload.last_contact_at,
                    updated_at: insertPayload.last_contact_at,
                    notes: mergedNotes,
                    ...(hasExplicitProfessionals
                        ? {
                              estimated_professionals: sanitizeEstimatedProfessionals(
                                  params.lead.numProfissionais
                              ),
                          }
                        : {}),
                })
                .eq('id', existing.id)

            if (updateError) {
                console.error('[ClinGrowth] Erro ao atualizar sales_prospects:', updateError.message)
                return false
            }
            return true
        }

        const { error: insertError } = await supabase
            .from('sales_prospects')
            .insert(insertPayload)

        if (insertError) {
            console.error('[ClinGrowth] Erro ao inserir em sales_prospects:', insertError.message)
            return false
        }
        return true
    } catch {
        return false
    }
}

export async function notifyHotLeadAlert(
    supabase: any,
    params: {
        sessionId: string
        lead: LeadData
        phone: string | null
        transfer: boolean
        transferTag?: string
    }
): Promise<boolean> {
    if (params.lead.hotAlertSent) return false

    const isReactivation = params.transferTag === 'nova_contratacao_encerrada'
    const isLargeClinic = Boolean(params.lead.numProfissionais && params.lead.numProfissionais >= 6)
    const shouldAlert = Boolean(isReactivation || params.transfer || isLargeClinic)

    if (!shouldAlert) return false

    try {
        const sentinelState = await getOrInitSentinelState(supabase)
        const waDirectUrl = params.phone
            ? `https://wa.me/${params.phone}`
            : 'https://clinigo.app/system-master-hub/chatbot'

        const title = isReactivation
            ? `RECONTRATACAO: ${params.lead.clinica || 'Clinica Encerrada'}`
            : params.transfer
                ? `LEAD QUENTE NO BOT CLIN: ${params.lead.clinica || params.lead.nome || params.phone || 'Novo contato'}`
                : `CLINICA GRANDE (${params.lead.numProfissionais} prof.): ${params.lead.clinica || params.phone || 'Lead Bot Clin'}`

        const summary = [
            params.lead.nome ? `Contato: ${params.lead.nome}` : null,
            params.lead.clinica ? `Clínica: ${params.lead.clinica}` : null,
            params.phone ? `WhatsApp: +${params.phone}` : null,
            params.lead.numProfissionais ? `Equipe: ${params.lead.numProfissionais} profissionais` : null,
            params.lead.planoIndicado ? `Plano indicado: ${params.lead.planoIndicado}` : null,
            params.lead.dorPrincipal ? `Assunto: ${params.lead.dorPrincipal}` : null,
            `Responder direto: ${waDirectUrl}`,
        ]
            .filter(Boolean)
            .join(' | ')

        await dispatchSentinelAlerts(sentinelState, {
            kind: isReactivation ? 'DOWN' : 'TEST',
            title,
            summary,
            actionUrl: waDirectUrl,
            details: { sessionId: params.sessionId, transferTag: params.transferTag },
        })
        return true
    } catch {
        return false
    }
}

export function isWithinBrtBusinessHours(referenceDate: Date = new Date()): boolean {
    const brtFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
    const parts = brtFormatter.formatToParts(referenceDate)
    const hour = Number(parts.find((p) => p.type === 'hour')?.value || 0)
    const minute = Number(parts.find((p) => p.type === 'minute')?.value || 0)
    const totalMinutes = hour * 60 + minute
    // Janela comercial elegante: 08:30 às 19:30 BRT
    return totalMinutes >= 8 * 60 + 30 && totalMinutes <= 19 * 60 + 30
}

const EXCLUDED_FOLLOWUP_STEP_PREFIXES = ['fluxo_6', 'fluxo_encerrada', 'transferred', 'encerrado']

export function isSessionEligibleForFollowUp(
    step: string | undefined,
    status: string | undefined,
    botPausedUntil: string | null | undefined,
    nowMs: number = Date.now()
): boolean {
    if (status !== 'active') return false
    if (botPausedUntil && new Date(botPausedUntil).getTime() > nowMs) return false
    const safeStep = (step || 'menu').toLowerCase()
    if (EXCLUDED_FOLLOWUP_STEP_PREFIXES.some((prefix) => safeStep.startsWith(prefix))) {
        return false
    }
    return true
}

async function sendRailwayClinText(phone: string, text: string): Promise<boolean> {
    const baseUrl = getClinBotServiceUrl()
    const clean = phone.replace(/\D/g, '')
    const candidates = [clean]
    if (clean.startsWith('55') && clean.length === 13) {
        const ddd = parseInt(clean.substring(2, 4), 10)
        if (ddd > 28) {
            candidates.push(clean.substring(0, 4) + clean.substring(5))
        }
    }

    for (const target of candidates) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 12000)
        try {
            const res = await fetch(`${baseUrl}/clin/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: target, text }),
                signal: controller.signal,
            })
            clearTimeout(timer)
            if (res.ok) return true
        } catch {
            clearTimeout(timer)
        }
    }
    return false
}

export async function runClinBotFollowUpSweep(options?: { dryRun?: boolean }) {
    const now = new Date()
    const nowMs = now.getTime()

    if (!options?.dryRun && !isWithinBrtBusinessHours(now)) {
        return {
            ok: true,
            skipped: 'outside_business_hours_brt',
            sent2h: 0,
            sent24h: 0,
            checked: 0,
        }
    }

    const supabase = createServiceRoleClient() as any
    const twoHoursAgoIso = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString()
    const thirtySixHoursAgoIso = new Date(nowMs - 36 * 60 * 60 * 1000).toISOString()

    const { data: candidates, error } = await supabase
        .from('chatbot_sessions')
        .select('id, session_id, status, conversation_state, updated_at, followup_2h_sent_at, followup_24h_sent_at, bot_paused_until, message_count')
        .like('session_id', 'wa-%')
        .eq('status', 'active')
        .gte('updated_at', thirtySixHoursAgoIso)
        .lte('updated_at', twoHoursAgoIso)
        .order('updated_at', { ascending: true })
        .limit(20)

    if (error) {
        return { ok: false, error: error.message, sent2h: 0, sent24h: 0, checked: 0 }
    }

    let sent2h = 0
    let sent24h = 0
    const eligibleList: Array<{ sessionId: string; kind: '2h' | '24h' }> = []

    for (const session of candidates || []) {
        const convState = (session.conversation_state || {}) as { step?: string; leadData?: LeadData }
        if (!isSessionEligibleForFollowUp(convState.step, session.status, session.bot_paused_until, nowMs)) {
            continue
        }
        if ((session.message_count || 0) < 1) continue

        const phone = extractWhatsappDigits(session.session_id)
        if (!phone) continue

        const ageHours = (nowMs - new Date(session.updated_at).getTime()) / (60 * 60 * 1000)
        let kind: '2h' | '24h' | null = null

        if (ageHours >= 24 && !session.followup_24h_sent_at) {
            kind = '24h'
        } else if (ageHours >= 2 && ageHours < 20 && !session.followup_2h_sent_at) {
            kind = '2h'
        }

        if (!kind) continue
        eligibleList.push({ sessionId: session.session_id, kind })

        if (options?.dryRun) continue

        const outboundText = kind === '24h' ? MSG_RECUPERACAO_24H[0] : MSG_INATIVIDADE[0]
        const delivered = await sendRailwayClinText(phone, outboundText)
        if (!delivered) continue

        const nowIso = new Date().toISOString()
        await supabase.from('chatbot_messages').insert({
            session_id: session.session_id,
            role: 'assistant',
            content: outboundText,
        })

        const nextConvState =
            kind === '24h'
                ? { ...convState, step: 'recuperacao_24h', leadData: convState.leadData || {} }
                : convState

        await supabase
            .from('chatbot_sessions')
            .update({
                ...(kind === '24h' ? { followup_24h_sent_at: nowIso } : { followup_2h_sent_at: nowIso }),
                conversation_state: nextConvState,
            })
            .eq('id', session.id)

        if (kind === '24h') sent24h += 1
        else sent2h += 1
    }

    if (!options?.dryRun && (sent2h > 0 || sent24h > 0)) {
        try {
            await supabase.from('clin_bot_health_events').insert({
                event_type: 'FOLLOWUP_SWEEP',
                severity: 'info',
                summary: `Follow-up automático do Bot Clin enviado: ${sent2h} lembrete(s) de 2h e ${sent24h} recuperação(ões) de 24h.`,
                details: { sent2h, sent24h, checked: (candidates || []).length },
            })
        } catch {
            // Non-fatal
        }
    }

    return {
        ok: true,
        dryRun: Boolean(options?.dryRun),
        checked: (candidates || []).length,
        eligibleCount: eligibleList.length,
        sent2h,
        sent24h,
        withinBusinessHours: isWithinBrtBusinessHours(now),
    }
}

