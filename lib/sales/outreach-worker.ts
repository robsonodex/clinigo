/**
 * Motor de fila e cadência comercial (D+0, D+3, D+7) com gotejamento seguro para Hostinger.
 * Acionado pelo pg_cron gate (/api/cron/sales-outreach) ou manualmente pelo Super Admin.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    interpolateOutreachTemplate,
    type SalesOutreachCampaign,
    type SalesOutreachRecipient,
} from './outreach-types'
import {
    loadVaultDocumentAttachment,
    sendCommercialOutreachEmail,
    type LoadedVaultAttachment,
} from './outreach-mailer'

const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app').replace(/\/$/, '')

function getBrasiliaParts(date: Date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        hour12: false,
    })
    const parts = Object.fromEntries(
        formatter.formatToParts(date).map((p) => [p.type, p.value])
    )
    const hour = Number(parts.hour === '24' ? 0 : parts.hour)
    const isWeekend = parts.weekday === 'Sat' || parts.weekday === 'Sun'
    const isoDate = `${parts.year}-${parts.month}-${parts.day}`
    return { hour, isWeekend, isoDate }
}

export function isWithinBusinessWindow(
    campaign: Pick<SalesOutreachCampaign, 'business_hours_only' | 'send_start_hour' | 'send_end_hour'>,
    now: Date = new Date()
): boolean {
    if (!campaign.business_hours_only) return true
    const { hour, isWeekend } = getBrasiliaParts(now)
    if (isWeekend) return false
    return hour >= campaign.send_start_hour && hour < campaign.send_end_hour
}

export function computeNextFollowupIso(delayDays: number, startHour = 9): string {
    const target = new Date()
    target.setDate(target.getDate() + Math.max(1, delayDays))

    // Se cair no fim de semana em Brasília, move para segunda-feira
    for (let guard = 0; guard < 4; guard++) {
        const { isWeekend } = getBrasiliaParts(target)
        if (!isWeekend) break
        target.setDate(target.getDate() + 1)
    }

    // Agenda entre startHour e startHour+2 no horário de Brasília (UTC-3 => +3h UTC)
    const jitterMinutes = Math.floor(Math.random() * 110)
    const utcHour = (Math.min(Math.max(startHour, 8), 16) + 3) % 24
    target.setUTCHours(utcHour, 0, 0, 0)
    target.setUTCMinutes(target.getUTCMinutes() + jitterMinutes)
    return target.toISOString()
}

function getRandomIntervalMs(minMin: number, maxMin: number): number {
    const low = Math.max(1, Math.min(minMin, maxMin))
    const high = Math.max(low, maxMin)
    const minutes = low + Math.random() * (high - low)
    return Math.round(minutes * 60 * 1000)
}

export async function refreshCampaignCounters(
    supabaseAdmin: SupabaseClient,
    campaignId: string
): Promise<void> {
    const { data: rows } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('status, view_count, next_send_at')
        .eq('campaign_id', campaignId)

    const list = (rows || []) as Array<{
        status: string
        view_count: number
        next_send_at: string | null
    }>

    const total = list.length
    const sent = list.filter((r) =>
        ['SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT', 'REPLIED'].includes(r.status)
    ).length
    const failed = list.filter((r) => r.status === 'FAILED').length
    const opened = list.filter((r) => (r.view_count || 0) > 0).length
    const replied = list.filter((r) => r.status === 'REPLIED').length

    const hasRemainingWork = list.some(
        (r) =>
            ['PENDING', 'SENDING', 'SENT', 'FOLLOWUP_1_SENT'].includes(r.status) &&
            r.next_send_at !== null
    )

    const { data: camp } = await supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('status')
        .eq('id', campaignId)
        .maybeSingle()

    const currentStatus = (camp as { status?: string } | null)?.status
    const nextCampaignStatus =
        currentStatus === 'RUNNING' && total > 0 && !hasRemainingWork
            ? 'COMPLETED'
            : currentStatus

    await supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .update({
            total_recipients: total,
            sent_count: sent,
            failed_count: failed,
            opened_count: opened,
            replied_count: replied,
            status: nextCampaignStatus,
            last_run_at: new Date().toISOString(),
        } as any)
        .eq('id', campaignId)
}

async function countSentTodayBrasilia(
    supabaseAdmin: SupabaseClient,
    campaignId: string
): Promise<number> {
    const { isoDate } = getBrasiliaParts(new Date())
    const startOfDayUtc = new Date(`${isoDate}T03:00:00.000Z`).toISOString()

    const { count } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .gte('last_sent_at', startOfDayUtc)
        .in('status', ['SENT', 'FOLLOWUP_1_SENT', 'FOLLOWUP_2_SENT', 'REPLIED'])

    return count || 0
}

export interface ProcessQueueResult {
    processed: number
    sent: number
    skipped: number
    failed: number
    details: Array<{
        campaign_id: string
        recipient_email: string
        step: number
        outcome: string
    }>
}

export async function processSalesOutreachQueue(
    supabaseAdmin: SupabaseClient,
    options?: {
        campaignId?: string
        maxPerRun?: number
        ignoreBusinessHours?: boolean
        ignoreNextSendAt?: boolean
    }
): Promise<ProcessQueueResult> {
    const maxPerRun = Math.max(1, Math.min(options?.maxPerRun ?? 3, 5))
    const result: ProcessQueueResult = {
        processed: 0,
        sent: 0,
        skipped: 0,
        failed: 0,
        details: [],
    }

    let campQuery = supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('*')

    if (options?.campaignId) {
        campQuery = campQuery.eq('id', options.campaignId)
    } else {
        campQuery = campQuery.eq('status', 'RUNNING')
    }

    const { data: campaignsData, error: campErr } = await campQuery
    if (campErr || !campaignsData || campaignsData.length === 0) {
        return result
    }

    const campaigns = campaignsData as unknown as SalesOutreachCampaign[]
    const attachmentCache = new Map<string, LoadedVaultAttachment | null>()

    for (const campaign of campaigns) {
        if (result.processed >= maxPerRun) break
        if (!options?.campaignId && campaign.status !== 'RUNNING') continue
        if (!options?.ignoreBusinessHours && !isWithinBusinessWindow(campaign)) {
            continue
        }

        const sentToday = await countSentTodayBrasilia(supabaseAdmin, campaign.id)
        if (sentToday >= campaign.daily_limit) {
            continue
        }

        // Busca próximo destinatário elegível
        let recQuery = supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .select('*')
            .eq('campaign_id', campaign.id)
            .in('status', ['PENDING', 'SENT', 'FOLLOWUP_1_SENT'])
            .not('next_send_at', 'is', null)
            .order('next_send_at', { ascending: true })
            .limit(1)

        if (!options?.ignoreNextSendAt) {
            recQuery = recQuery.lte('next_send_at', new Date().toISOString())
        }

        const { data: candidateRows } = await recQuery
        const candidate = (candidateRows?.[0] || null) as unknown as SalesOutreachRecipient | null
        if (!candidate) {
            await refreshCampaignCounters(supabaseAdmin, campaign.id)
            continue
        }

        // Claim atômico para evitar envio duplicado entre execuções concorrentes
        const { data: claimed } = await supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .update({ status: 'SENDING' } as any)
            .eq('id', candidate.id)
            .eq('status', candidate.status)
            .select('*')
            .maybeSingle()

        if (!claimed) continue

        result.processed++
        const nextStep = candidate.current_step + 1

        // 1. Checa lista global de supressão (descadastro / bounce)
        const { data: suppressed } = await supabaseAdmin
            .from('sales_outreach_suppressions' as any)
            .select('id, reason')
            .eq('email', candidate.email.toLowerCase())
            .maybeSingle()

        if (suppressed) {
            await supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .update({
                    status: 'UNSUBSCRIBED',
                    next_send_at: null,
                    last_error: `Lista de supressão (${(suppressed as any).reason})`,
                } as any)
                .eq('id', candidate.id)
            result.skipped++
            result.details.push({
                campaign_id: campaign.id,
                recipient_email: candidate.email,
                step: nextStep,
                outcome: 'suppressed',
            })
            await refreshCampaignCounters(supabaseAdmin, campaign.id)
            continue
        }

        // 2. Se for follow-up (step >= 2), verifica se o lead já avançou no CRM
        if (nextStep >= 2 && candidate.prospect_id) {
            const { data: prospectRow } = await supabaseAdmin
                .from('sales_prospects' as any)
                .select('funnel_status')
                .eq('id', candidate.prospect_id)
                .maybeSingle()

            const fStatus = (prospectRow as { funnel_status?: string } | null)?.funnel_status
            if (fStatus && ['RESPONDEU', 'DEMO_AGENDADA', 'FECHADO', 'PERDIDO'].includes(fStatus)) {
                await supabaseAdmin
                    .from('sales_outreach_recipients' as any)
                    .update({
                        status: fStatus === 'PERDIDO' ? 'SKIPPED' : 'REPLIED',
                        next_send_at: null,
                    } as any)
                    .eq('id', candidate.id)
                result.skipped++
                result.details.push({
                    campaign_id: campaign.id,
                    recipient_email: candidate.email,
                    step: nextStep,
                    outcome: `stopped_crm_${fStatus}`,
                })
                await refreshCampaignCounters(supabaseAdmin, campaign.id)
                continue
            }
        }

        // 3. Seleciona assunto, corpo e anexo conforme a etapa (1 = D+0, 2 = D+3, 3 = D+7)
        const rawSubject =
            nextStep === 1
                ? campaign.subject_step1
                : nextStep === 2
                    ? campaign.subject_step2 || `Re: ${campaign.subject_step1}`
                    : campaign.subject_step3 || `Encerrando por aqui — {{clinica}}`

        const rawBody =
            nextStep === 1
                ? campaign.body_step1
                : nextStep === 2
                    ? campaign.body_step2
                    : campaign.body_step3

        if (!rawBody || !rawBody.trim()) {
            await supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .update({
                    status: candidate.current_step === 1 ? 'SENT' : 'FOLLOWUP_1_SENT',
                    next_send_at: null,
                } as any)
                .eq('id', candidate.id)
            result.skipped++
            await refreshCampaignCounters(supabaseAdmin, campaign.id)
            continue
        }

        const ctx = {
            contact_name: candidate.contact_name,
            clinic_name: candidate.clinic_name,
            email: candidate.email,
            phone: candidate.phone,
        }
        const subject = interpolateOutreachTemplate(rawSubject, ctx)
        const bodyText = interpolateOutreachTemplate(rawBody, ctx)

        // Carrega anexo apenas no Toque 1 (follow-ups D+3/D+7 são leves para parecer resposta humana!)
        let attachment: LoadedVaultAttachment | null = null
        if (nextStep === 1 && campaign.vault_document_id && campaign.delivery_mode !== 'TRACKED_LINK') {
            if (attachmentCache.has(campaign.vault_document_id)) {
                attachment = attachmentCache.get(campaign.vault_document_id) || null
            } else {
                const loaded = await loadVaultDocumentAttachment(supabaseAdmin, campaign.vault_document_id)
                attachment = loaded.attachment
                attachmentCache.set(campaign.vault_document_id, attachment)
            }
        }

        const presentationUrl =
            campaign.vault_document_id &&
            (campaign.delivery_mode === 'TRACKED_LINK' || campaign.delivery_mode === 'BOTH')
                ? `${APP_BASE_URL}/apresentacao/${candidate.tracking_token}`
                : null

        const unsubscribeUrl = `${APP_BASE_URL}/api/public/outreach/unsubscribe/${candidate.tracking_token}`

        const sendRes = await sendCommercialOutreachEmail({
            supabaseAdmin,
            to: candidate.email,
            subject,
            bodyText,
            deliveryMode: nextStep === 1 ? campaign.delivery_mode : 'TRACKED_LINK',
            senderName: campaign.sender_name,
            senderRole: campaign.sender_role,
            senderPhone: campaign.sender_phone,
            senderEmail: campaign.sender_email,
            attachment,
            presentationUrl: nextStep === 1 ? presentationUrl : null,
            unsubscribeUrl,
            inReplyToMessageId: nextStep >= 2 ? candidate.last_message_id : null,
        })

        if (sendRes.success) {
            result.sent++

            let nextStatus: SalesOutreachRecipient['status'] = 'SENT'
            let nextFollowupAt: string | null = null

            if (nextStep === 1) {
                nextStatus = 'SENT'
                if (campaign.enable_cadence && campaign.body_step2?.trim()) {
                    nextFollowupAt = computeNextFollowupIso(
                        campaign.step2_delay_days || 3,
                        campaign.send_start_hour || 9
                    )
                }
            } else if (nextStep === 2) {
                nextStatus = 'FOLLOWUP_1_SENT'
                if (campaign.enable_cadence && campaign.body_step3?.trim()) {
                    const delta = Math.max(1, (campaign.step3_delay_days || 7) - (campaign.step2_delay_days || 3))
                    nextFollowupAt = computeNextFollowupIso(delta, campaign.send_start_hour || 9)
                }
            } else {
                nextStatus = 'FOLLOWUP_2_SENT'
                nextFollowupAt = null
            }

            await supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .update({
                    status: nextStatus,
                    current_step: nextStep,
                    last_sent_at: new Date().toISOString(),
                    last_message_id: sendRes.messageId || candidate.last_message_id,
                    last_error: null,
                    next_send_at: nextFollowupAt,
                } as any)
                .eq('id', candidate.id)

            // Atualiza CRM vinculado (sales_prospects) sem sobrescrever estágios avançados
            if (candidate.prospect_id) {
                const { data: existingProspect } = await supabaseAdmin
                    .from('sales_prospects' as any)
                    .select('funnel_status')
                    .eq('id', candidate.prospect_id)
                    .maybeSingle()

                const currentFunnel = (existingProspect as { funnel_status?: string } | null)?.funnel_status
                const updateFields: Record<string, unknown> = {
                    last_contact_at: new Date().toISOString(),
                }
                if (
                    currentFunnel === 'ABORDADO' &&
                    nextStep === 1 &&
                    campaign.vault_document_id
                ) {
                    updateFields.funnel_status = 'MATERIAL_ENVIADO'
                }
                if (nextFollowupAt) {
                    updateFields.next_followup_at = nextFollowupAt.slice(0, 10)
                }
                await supabaseAdmin
                    .from('sales_prospects' as any)
                    .update(updateFields as any)
                    .eq('id', candidate.prospect_id)
            }

            // Espaça humanizadamente o próximo contato PENDING da mesma campanha (gotejamento Hostinger)
            const intervalMs = getRandomIntervalMs(
                campaign.min_interval_minutes || 3,
                campaign.max_interval_minutes || 6
            )
            const nextPendingSlot = new Date(Date.now() + intervalMs).toISOString()

            const { data: overduePendings } = await supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .select('id')
                .eq('campaign_id', campaign.id)
                .eq('status', 'PENDING')
                .lte('next_send_at', nextPendingSlot)
                .order('next_send_at', { ascending: true })
                .limit(1)

            if (overduePendings && overduePendings.length > 0) {
                await supabaseAdmin
                    .from('sales_outreach_recipients' as any)
                    .update({ next_send_at: nextPendingSlot } as any)
                    .eq('id', (overduePendings[0] as any).id)
            }

            result.details.push({
                campaign_id: campaign.id,
                recipient_email: candidate.email,
                step: nextStep,
                outcome: 'sent',
            })
        } else {
            result.failed++
            await supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .update({
                    status: 'FAILED',
                    next_send_at: null,
                    last_error: sendRes.error || 'Erro desconhecido SMTP',
                } as any)
                .eq('id', candidate.id)

            if (sendRes.permanentBounce) {
                await supabaseAdmin
                    .from('sales_outreach_suppressions' as any)
                    .upsert(
                        {
                            email: candidate.email.toLowerCase(),
                            reason: 'BOUNCE',
                            source_campaign_id: campaign.id,
                        } as any,
                        { onConflict: 'email' }
                    )
            }

            result.details.push({
                campaign_id: campaign.id,
                recipient_email: candidate.email,
                step: nextStep,
                outcome: `failed: ${sendRes.error || 'unknown'}`,
            })
        }

        await refreshCampaignCounters(supabaseAdmin, campaign.id)
    }

    return result
}

