import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../../../_auth'
import {
    interpolateOutreachTemplate,
    type SalesOutreachCampaign,
} from '@/lib/sales/outreach-types'
import {
    loadVaultDocumentAttachment,
    sendCommercialOutreachEmail,
} from '@/lib/sales/outreach-mailer'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const APP_BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app').replace(/\/$/, '')

const testSendSchema = z.object({
    to_email: z.string().trim().email('Informe um e-mail de destino válido para teste'),
    step: z.coerce.number().int().min(1).max(3).default(1),
    sample_clinic_name: z.string().trim().max(120).optional().default('Clínica Espaço Terapêutico'),
    sample_contact_name: z.string().trim().max(120).optional().default('Dra. Camila'),
})

export async function POST(
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
        return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }

    const parsed = testSendSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos para envio de teste' },
            { status: 400 }
        )
    }

    const { data: campRow, error: campErr } = await auth.supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('*')
        .eq('id', id)
        .single()

    if (campErr || !campRow) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
    }

    const campaign = campRow as unknown as SalesOutreachCampaign
    const { to_email, step, sample_clinic_name, sample_contact_name } = parsed.data

    const rawSubject =
        step === 1
            ? campaign.subject_step1
            : step === 2
                ? campaign.subject_step2 || `Re: ${campaign.subject_step1}`
                : campaign.subject_step3 || 'Encerrando meu contato por aqui — {{clinica}}'

    const rawBody =
        step === 1 ? campaign.body_step1 : step === 2 ? campaign.body_step2 : campaign.body_step3

    const ctx = {
        contact_name: sample_contact_name,
        clinic_name: sample_clinic_name,
        email: to_email,
        phone: '',
    }

    const subject = `[TESTE] ${interpolateOutreachTemplate(rawSubject, ctx)}`
    const bodyText = interpolateOutreachTemplate(rawBody, ctx)

    let attachment = null
    let attachmentWarning: string | undefined
    if (step === 1 && campaign.vault_document_id && campaign.delivery_mode !== 'TRACKED_LINK') {
        const loaded = await loadVaultDocumentAttachment(auth.supabaseAdmin, campaign.vault_document_id)
        attachment = loaded.attachment
        attachmentWarning = loaded.skippedReason
    }

    // Busca um token existente da campanha para o link funcionar no preview real (ou link raiz /planos se vazia)
    const { data: firstRec } = await auth.supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('tracking_token')
        .eq('campaign_id', id)
        .limit(1)
        .maybeSingle()

    const sampleToken = (firstRec as { tracking_token?: string } | null)?.tracking_token
    const presentationUrl =
        step === 1 &&
        campaign.vault_document_id &&
        (campaign.delivery_mode === 'TRACKED_LINK' || campaign.delivery_mode === 'BOTH') &&
        sampleToken
            ? `${APP_BASE_URL}/apresentacao/${sampleToken}`
            : null

    const result = await sendCommercialOutreachEmail({
        supabaseAdmin: auth.supabaseAdmin,
        to: to_email,
        subject,
        bodyText,
        deliveryMode: step === 1 ? campaign.delivery_mode : 'TRACKED_LINK',
        senderName: campaign.sender_name,
        senderRole: campaign.sender_role,
        senderPhone: campaign.sender_phone,
        senderEmail: campaign.sender_email,
        attachment,
        presentationUrl,
        unsubscribeUrl: null,
    })

    if (!result.success) {
        return NextResponse.json(
            { error: result.error || 'Falha ao enviar e-mail de teste via Hostinger' },
            { status: 500 }
        )
    }

    return NextResponse.json({
        success: true,
        message: `E-mail de teste enviado para ${to_email}`,
        messageId: result.messageId,
        attachedFile: attachment?.filename || null,
        attachmentWarning,
    })
}

