import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../../_auth'
import { OUTREACH_DELIVERY_MODES } from '@/lib/sales/outreach-types'
import { parseContactListInput, validateDomainsMxBatch } from '@/lib/sales/outreach-parser'
import { refreshCampaignCounters } from '@/lib/sales/outreach-worker'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchCampaignSchema = z.object({
    action: z
        .enum([
            'start',
            'pause',
            'resume',
            'cancel',
            'retry_failed',
            'mark_replied',
            'remove_recipient',
            'add_contacts',
            'duplicate',
            'update',
        ])
        .optional()
        .default('update'),
    recipient_id: z.string().uuid().optional(),
    raw_contacts_text: z.string().max(500_000).optional(),
    name: z.string().trim().min(2).max(160).optional(),
    delivery_mode: z.enum(OUTREACH_DELIVERY_MODES).optional(),
    vault_document_id: z.string().uuid().nullable().optional(),
    subject_step1: z.string().trim().min(2).max(240).optional(),
    body_step1: z.string().trim().min(10).max(8000).optional(),
    enable_cadence: z.boolean().optional(),
    subject_step2: z.string().trim().max(240).optional(),
    body_step2: z.string().trim().max(8000).optional(),
    step2_delay_days: z.coerce.number().int().min(1).max(30).optional(),
    subject_step3: z.string().trim().max(240).optional(),
    body_step3: z.string().trim().max(8000).optional(),
    step3_delay_days: z.coerce.number().int().min(2).max(60).optional(),
    daily_limit: z.coerce.number().int().min(5).max(200).optional(),
    min_interval_minutes: z.coerce.number().int().min(1).max(60).optional(),
    max_interval_minutes: z.coerce.number().int().min(1).max(120).optional(),
    business_hours_only: z.boolean().optional(),
    send_start_hour: z.coerce.number().int().min(0).max(23).optional(),
    send_end_hour: z.coerce.number().int().min(1).max(24).optional(),
    sender_name: z.string().trim().min(2).max(120).optional(),
    sender_role: z.string().trim().min(2).max(120).optional(),
    sender_phone: z.string().trim().max(40).optional(),
    sender_email: z.string().trim().email().optional(),
})

export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const [campRes, recRes] = await Promise.all([
        auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .select('*')
            .eq('id', id)
            .single(),
        auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .select('*')
            .eq('campaign_id', id)
            .order('view_count', { ascending: false })
            .order('created_at', { ascending: true }),
    ])

    if (campRes.error || !campRes.data) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    const camp = campRes.data as any
    let vaultDocument = null
    if (camp.vault_document_id) {
        const { data: doc } = await auth.supabaseAdmin
            .from('sales_vault_documents' as any)
            .select('id, title, file_name, mime_type, file_size_bytes')
            .eq('id', camp.vault_document_id)
            .maybeSingle()
        vaultDocument = doc || null
    }

    return NextResponse.json({
        data: { ...camp, vault_document: vaultDocument },
        recipients: recRes.data || [],
    })
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    const parsed = patchCampaignSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const input = parsed.data
    const { data: currentCamp, error: fetchErr } = await auth.supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('*')
        .eq('id', id)
        .single()

    if (fetchErr || !currentCamp) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    const camp = currentCamp as any

    if (input.action === 'start' || input.action === 'resume') {
        const nowIso = new Date().toISOString()
        await auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .update({ status: 'RUNNING' } as any)
            .eq('id', id)

        // Garante que o primeiro contato PENDING fique imediatamente elegível
        const { data: firstPending } = await auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .select('id')
            .eq('campaign_id', id)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true })
            .limit(1)

        if (firstPending && firstPending.length > 0) {
            await auth.supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .update({ next_send_at: nowIso } as any)
                .eq('id', (firstPending[0] as any).id)
        }

        await refreshCampaignCounters(auth.supabaseAdmin, id)
        return NextResponse.json({ success: true, status: 'RUNNING' })
    }

    if (input.action === 'pause') {
        await auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .update({ status: 'PAUSED' } as any)
            .eq('id', id)
        return NextResponse.json({ success: true, status: 'PAUSED' })
    }

    if (input.action === 'cancel') {
        await auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .update({ status: 'CANCELLED' } as any)
            .eq('id', id)
        await auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .update({ next_send_at: null } as any)
            .eq('campaign_id', id)
            .in('status', ['PENDING', 'SENT', 'FOLLOWUP_1_SENT'])
        return NextResponse.json({ success: true, status: 'CANCELLED' })
    }

    if (input.action === 'retry_failed') {
        await auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .update({
                status: 'PENDING',
                current_step: 0,
                last_error: null,
                next_send_at: new Date().toISOString(),
            } as any)
            .eq('campaign_id', id)
            .eq('status', 'FAILED')

        await refreshCampaignCounters(auth.supabaseAdmin, id)
        return NextResponse.json({ success: true })
    }

    if (input.action === 'mark_replied' && input.recipient_id) {
        const { data: rec } = await auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .update({
                status: 'REPLIED',
                next_send_at: null,
            } as any)
            .eq('id', input.recipient_id)
            .eq('campaign_id', id)
            .select('prospect_id')
            .maybeSingle()

        if ((rec as any)?.prospect_id) {
            await auth.supabaseAdmin
                .from('sales_prospects' as any)
                .update({
                    funnel_status: 'RESPONDEU',
                    last_contact_at: new Date().toISOString(),
                } as any)
                .eq('id', (rec as any).prospect_id)
        }

        await refreshCampaignCounters(auth.supabaseAdmin, id)
        return NextResponse.json({ success: true })
    }

    if (input.action === 'remove_recipient' && input.recipient_id) {
        await auth.supabaseAdmin
            .from('sales_outreach_recipients' as any)
            .delete()
            .eq('id', input.recipient_id)
            .eq('campaign_id', id)

        await refreshCampaignCounters(auth.supabaseAdmin, id)
        return NextResponse.json({ success: true })
    }

    if (input.action === 'add_contacts') {
        const parsedList = parseContactListInput(input.raw_contacts_text || '')
        if (parsedList.contacts.length === 0) {
            return NextResponse.json({ error: 'Nenhum e-mail válido encontrado para adicionar.' }, { status: 400 })
        }

        const [existingRecsRes, suppressionsRes] = await Promise.all([
            auth.supabaseAdmin
                .from('sales_outreach_recipients' as any)
                .select('email')
                .eq('campaign_id', id),
            auth.supabaseAdmin
                .from('sales_outreach_suppressions' as any)
                .select('email'),
        ])

        const existingSet = new Set(
            ((existingRecsRes.data || []) as Array<{ email: string }>).map((r) => r.email.toLowerCase())
        )
        const suppressedSet = new Set(
            ((suppressionsRes.data || []) as Array<{ email: string }>).map((r) => r.email.toLowerCase())
        )

        const fresh = parsedList.contacts.filter(
            (c) => !existingSet.has(c.email) && !suppressedSet.has(c.email)
        )

        if (fresh.length === 0) {
            return NextResponse.json({
                success: true,
                added: 0,
                message: 'Todos os contatos já estavam na campanha ou na lista de supressão.',
            })
        }

        const mxRes = await validateDomainsMxBatch(fresh.map((c) => c.email))
        const mxInvalid = new Set(mxRes.invalidEmails)
        const toAdd = fresh.filter((c) => !mxInvalid.has(c.email))

        if (toAdd.length === 0) {
            return NextResponse.json({ error: 'Nenhum novo contato passou na validação DNS MX.' }, { status: 400 })
        }

        const nowMs = Date.now()
        const rows = toAdd.map((c, idx) => ({
            campaign_id: id,
            email: c.email,
            contact_name: c.contact_name,
            clinic_name: c.clinic_name,
            phone: c.phone,
            tracking_token: crypto.randomBytes(12).toString('hex'),
            status: 'PENDING',
            current_step: 0,
            next_send_at: new Date(nowMs + idx * (camp.min_interval_minutes || 3) * 60_000).toISOString(),
            mx_valid: true,
        }))

        await auth.supabaseAdmin.from('sales_outreach_recipients' as any).insert(rows as any)
        await refreshCampaignCounters(auth.supabaseAdmin, id)

        return NextResponse.json({
            success: true,
            added: toAdd.length,
            mx_invalid_skipped: mxInvalid.size,
        })
    }

    if (input.action === 'duplicate') {
        const { data: clone, error: cloneErr } = await auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .insert({
                name: `${camp.name} (Cópia)`,
                status: 'DRAFT',
                delivery_mode: camp.delivery_mode,
                vault_document_id: camp.vault_document_id,
                subject_step1: camp.subject_step1,
                body_step1: camp.body_step1,
                enable_cadence: camp.enable_cadence,
                subject_step2: camp.subject_step2,
                body_step2: camp.body_step2,
                step2_delay_days: camp.step2_delay_days,
                subject_step3: camp.subject_step3,
                body_step3: camp.body_step3,
                step3_delay_days: camp.step3_delay_days,
                daily_limit: camp.daily_limit,
                min_interval_minutes: camp.min_interval_minutes,
                max_interval_minutes: camp.max_interval_minutes,
                business_hours_only: camp.business_hours_only,
                send_start_hour: camp.send_start_hour,
                send_end_hour: camp.send_end_hour,
                sender_name: camp.sender_name,
                sender_role: camp.sender_role,
                sender_phone: camp.sender_phone,
                sender_email: camp.sender_email,
                total_recipients: 0,
                created_by: auth.user.id,
            } as any)
            .select('*')
            .single()

        if (cloneErr || !clone) {
            return NextResponse.json({ error: 'Falha ao duplicar campanha' }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: clone }, { status: 201 })
    }

    // Atualização de campos editáveis da campanha
    const { action: _a, recipient_id: _r, raw_contacts_text: _t, ...updateFields } = input
    const { data: updated, error: updErr } = await auth.supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .update(updateFields as any)
        .eq('id', id)
        .select('*')
        .single()

    if (updErr) {
        console.error('[SALES_OUTREACH] Erro ao atualizar campanha:', updErr)
        return NextResponse.json({ error: 'Falha ao atualizar campanha' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const { error } = await auth.supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[SALES_OUTREACH] Erro ao excluir campanha:', error)
        return NextResponse.json({ error: 'Falha ao excluir campanha' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

