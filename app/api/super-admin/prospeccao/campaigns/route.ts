import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../_auth'
import {
    DEFAULT_DIRECTOR_SIGNATURE,
    DEFAULT_OUTREACH_TEMPLATES,
    OUTREACH_DELIVERY_MODES,
} from '@/lib/sales/outreach-types'
import { parseContactListInput, validateDomainsMxBatch } from '@/lib/sales/outreach-parser'
import { resolveCommercialSmtpConfig } from '@/lib/sales/outreach-mailer'

const contactInputSchema = z.object({
    email: z.string().trim().email(),
    contact_name: z.string().trim().max(120).optional().default(''),
    clinic_name: z.string().trim().max(160).optional().default(''),
    phone: z.string().trim().max(40).optional().default(''),
})

const createCampaignSchema = z.object({
    name: z.string().trim().min(2, 'Informe o nome da campanha').max(160),
    delivery_mode: z.enum(OUTREACH_DELIVERY_MODES).default('BOTH'),
    vault_document_id: z.string().uuid().nullable().optional().default(null),
    subject_step1: z.string().trim().min(2).max(240).default(DEFAULT_OUTREACH_TEMPLATES.subject_step1),
    body_step1: z.string().trim().min(10).max(8000).default(DEFAULT_OUTREACH_TEMPLATES.body_step1),
    enable_cadence: z.boolean().default(true),
    subject_step2: z.string().trim().max(240).optional().default(DEFAULT_OUTREACH_TEMPLATES.subject_step2),
    body_step2: z.string().trim().max(8000).optional().default(DEFAULT_OUTREACH_TEMPLATES.body_step2),
    step2_delay_days: z.coerce.number().int().min(1).max(30).default(3),
    subject_step3: z.string().trim().max(240).optional().default(DEFAULT_OUTREACH_TEMPLATES.subject_step3),
    body_step3: z.string().trim().max(8000).optional().default(DEFAULT_OUTREACH_TEMPLATES.body_step3),
    step3_delay_days: z.coerce.number().int().min(2).max(60).default(7),
    daily_limit: z.coerce.number().int().min(5).max(200).default(40),
    min_interval_minutes: z.coerce.number().int().min(1).max(60).default(3),
    max_interval_minutes: z.coerce.number().int().min(1).max(120).default(6),
    business_hours_only: z.boolean().default(true),
    send_start_hour: z.coerce.number().int().min(0).max(23).default(8),
    send_end_hour: z.coerce.number().int().min(1).max(24).default(18),
    sender_name: z.string().trim().min(2).max(120).default(DEFAULT_DIRECTOR_SIGNATURE.name),
    sender_role: z.string().trim().min(2).max(120).default(DEFAULT_DIRECTOR_SIGNATURE.role),
    sender_phone: z.string().trim().max(40).default(DEFAULT_DIRECTOR_SIGNATURE.phone),
    sender_email: z.string().trim().email().default(DEFAULT_DIRECTOR_SIGNATURE.email),
    start_immediately: z.boolean().default(false),
    validate_mx: z.boolean().default(true),
    sync_to_crm: z.boolean().default(true),
    raw_contacts_text: z.string().max(500_000).optional(),
    contacts: z.array(contactInputSchema).max(2000).optional(),
})

function makeTrackingToken(): string {
    return crypto.randomBytes(12).toString('hex')
}

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const [campaignsRes, vaultRes, suppressionsRes, smtpCfg] = await Promise.all([
        auth.supabaseAdmin
            .from('sales_outreach_campaigns' as any)
            .select('*')
            .order('created_at', { ascending: false }),
        auth.supabaseAdmin
            .from('sales_vault_documents' as any)
            .select('id, title, file_name, mime_type, file_size_bytes'),
        auth.supabaseAdmin
            .from('sales_outreach_suppressions' as any)
            .select('id, email, reason, created_at')
            .order('created_at', { ascending: false })
            .limit(200),
        resolveCommercialSmtpConfig(auth.supabaseAdmin),
    ])

    if (campaignsRes.error) {
        console.error('[SALES_OUTREACH] Erro ao listar campanhas:', campaignsRes.error)
        return NextResponse.json({ error: 'Falha ao carregar campanhas comerciais' }, { status: 500 })
    }

    const vaultMap = new Map<string, any>()
    for (const doc of (vaultRes.data || []) as any[]) {
        vaultMap.set(doc.id, doc)
    }

    const campaigns = ((campaignsRes.data || []) as any[]).map((c) => ({
        ...c,
        vault_document: c.vault_document_id ? vaultMap.get(c.vault_document_id) || null : null,
    }))

    return NextResponse.json({
        data: campaigns,
        suppressions: suppressionsRes.data || [],
        smtp: smtpCfg
            ? {
                  configured: true,
                  host: smtpCfg.host,
                  port: smtpCfg.port,
                  from_email: smtpCfg.fromEmail,
                  source: smtpCfg.source,
              }
            : { configured: false },
    })
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    const parsed = createCampaignSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos para criação da campanha' },
            { status: 400 }
        )
    }

    const input = parsed.data
    const normalizedContacts =
        input.contacts && input.contacts.length > 0
            ? input.contacts.map((c) => ({
                  email: c.email.toLowerCase(),
                  contact_name: c.contact_name,
                  clinic_name: c.clinic_name,
                  phone: c.phone,
              }))
            : input.raw_contacts_text
                ? parseContactListInput(input.raw_contacts_text).contacts
                : []

    if (normalizedContacts.length === 0) {
        return NextResponse.json(
            { error: 'Adicione pelo menos um contato com e-mail válido para criar a campanha.' },
            { status: 400 }
        )
    }

    // Deduplica lista recebida
    const uniqueMap = new Map<string, { email: string; contact_name: string; clinic_name: string; phone: string }>()
    for (const c of normalizedContacts) {
        const key = c.email.trim().toLowerCase()
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, { ...c, email: key })
        }
    }
    let candidates = Array.from(uniqueMap.values())

    // Remove contatos na lista global de supressão (descadastrados / bounce)
    const { data: suppressionRows } = await auth.supabaseAdmin
        .from('sales_outreach_suppressions' as any)
        .select('email')
        .in(
            'email',
            candidates.map((c) => c.email)
        )

    const suppressedSet = new Set(((suppressionRows || []) as Array<{ email: string }>).map((r) => r.email.toLowerCase()))
    const suppressedCount = candidates.filter((c) => suppressedSet.has(c.email)).length
    candidates = candidates.filter((c) => !suppressedSet.has(c.email))

    if (candidates.length === 0) {
        return NextResponse.json(
            { error: 'Todos os e-mails desta lista estão na lista de supressão (descadastrados ou bounce).' },
            { status: 400 }
        )
    }

    // Validação DNS MX anti-bounce opcional
    let mxInvalidSet = new Set<string>()
    if (input.validate_mx) {
        const mxRes = await validateDomainsMxBatch(candidates.map((c) => c.email))
        mxInvalidSet = new Set(mxRes.invalidEmails.map((e) => e.toLowerCase()))
    }

    const validCandidates = candidates.filter((c) => !mxInvalidSet.has(c.email))
    if (validCandidates.length === 0) {
        return NextResponse.json(
            { error: 'Nenhum e-mail passou na verificação de domínio (MX). Revise os endereços importados.' },
            { status: 400 }
        )
    }

    // Cria campanha
    const minInterval = Math.min(input.min_interval_minutes, input.max_interval_minutes)
    const maxInterval = Math.max(input.min_interval_minutes, input.max_interval_minutes)
    const initialStatus = input.start_immediately ? 'RUNNING' : 'DRAFT'

    const { data: campaign, error: createErr } = await auth.supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .insert({
            name: input.name,
            status: initialStatus,
            delivery_mode: input.delivery_mode,
            vault_document_id: input.vault_document_id,
            subject_step1: input.subject_step1,
            body_step1: input.body_step1,
            enable_cadence: input.enable_cadence,
            subject_step2: input.subject_step2 || '',
            body_step2: input.body_step2 || '',
            step2_delay_days: input.step2_delay_days,
            subject_step3: input.subject_step3 || '',
            body_step3: input.body_step3 || '',
            step3_delay_days: input.step3_delay_days,
            daily_limit: input.daily_limit,
            min_interval_minutes: minInterval,
            max_interval_minutes: maxInterval,
            business_hours_only: input.business_hours_only,
            send_start_hour: input.send_start_hour,
            send_end_hour: input.send_end_hour,
            sender_name: input.sender_name,
            sender_role: input.sender_role,
            sender_phone: input.sender_phone,
            sender_email: input.sender_email,
            total_recipients: validCandidates.length,
            created_by: auth.user.id,
        } as any)
        .select('*')
        .single()

    if (createErr || !campaign) {
        console.error('[SALES_OUTREACH] Erro ao criar campanha:', createErr)
        return NextResponse.json({ error: 'Falha ao salvar campanha no banco' }, { status: 500 })
    }

    const campaignId = (campaign as any).id as string

    // Sincroniza contatos com o CRM (sales_prospects) sem duplicar por e-mail
    const emailToProspectId = new Map<string, string>()
    if (input.sync_to_crm) {
        const { data: existingProspects } = await auth.supabaseAdmin
            .from('sales_prospects' as any)
            .select('id, email')

        for (const p of (existingProspects || []) as Array<{ id: string; email: string }>) {
            if (p.email) {
                emailToProspectId.set(p.email.trim().toLowerCase(), p.id)
            }
        }

        const missingForCrm = validCandidates.filter((c) => !emailToProspectId.has(c.email))
        if (missingForCrm.length > 0) {
            const rowsToInsert = missingForCrm.map((c) => ({
                clinic_name: c.clinic_name || c.contact_name || c.email.split('@')[0],
                program_focus: 'Terapias Multidisciplinares',
                specialties: ['Fonoaudiologia', 'Terapia Ocupacional'],
                contact_name: c.contact_name || '',
                email: c.email,
                whatsapp: c.phone || '',
                city_state: '',
                funnel_status: 'ABORDADO',
                estimated_professionals: 5,
                notes: `Importado automaticamente via campanha "${input.name}"`,
                last_contact_at: new Date().toISOString(),
                pdf_sent_types: [],
                created_by: auth.user.id,
            }))

            const { data: insertedProspects } = await auth.supabaseAdmin
                .from('sales_prospects' as any)
                .insert(rowsToInsert as any)
                .select('id, email')

            for (const p of (insertedProspects || []) as Array<{ id: string; email: string }>) {
                if (p.email) {
                    emailToProspectId.set(p.email.trim().toLowerCase(), p.id)
                }
            }
        }
    }

    // Agenda fila inicial com escalonamento humanizado
    const nowMs = Date.now()
    const recipientRows = validCandidates.map((c, idx) => {
        const offsetMinutes = idx === 0 ? 0 : idx * minInterval
        const scheduledAt = new Date(nowMs + offsetMinutes * 60_000).toISOString()
        return {
            campaign_id: campaignId,
            prospect_id: emailToProspectId.get(c.email) || null,
            email: c.email,
            contact_name: c.contact_name,
            clinic_name: c.clinic_name,
            phone: c.phone,
            tracking_token: makeTrackingToken(),
            status: 'PENDING',
            current_step: 0,
            next_send_at: scheduledAt,
            mx_valid: true,
        }
    })

    const { error: recErr } = await auth.supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .insert(recipientRows as any)

    if (recErr) {
        console.error('[SALES_OUTREACH] Erro ao inserir destinatários:', recErr)
        await auth.supabaseAdmin.from('sales_outreach_campaigns' as any).delete().eq('id', campaignId)
        return NextResponse.json({ error: 'Falha ao salvar fila de contatos da campanha' }, { status: 500 })
    }

    return NextResponse.json(
        {
            data: campaign,
            summary: {
                imported: validCandidates.length,
                suppressed_skipped: suppressedCount,
                mx_invalid_skipped: mxInvalidSet.size,
            },
        },
        { status: 201 }
    )
}

