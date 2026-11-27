import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshCampaignCounters } from '@/lib/sales/outreach-worker'
import { DEFAULT_DIRECTOR_SIGNATURE } from '@/lib/sales/outreach-types'
import { buildWhatsappUrl } from '@/lib/sales/prospect-types'
import { PublicPresentationViewer } from '@/components/sales-hq/PublicPresentationViewer'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: 'Apresentação Executiva — CliniGO',
    description: 'Material executivo CliniGO para gestão de clínicas de terapias.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
    },
}

const TOKEN_REGEX = /^[a-f0-9]{16,64}$/i

export default async function PublicPresentationPage({
    params,
}: {
    params: Promise<{ token: string }>
}) {
    const { token } = await params
    if (!TOKEN_REGEX.test(token)) {
        notFound()
    }

    const supabaseAdmin = createServiceRoleClient()
    const { data: recData } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('id, campaign_id, clinic_name, contact_name, view_count, first_viewed_at')
        .eq('tracking_token', token)
        .maybeSingle()

    if (!recData) {
        notFound()
    }

    const rec = recData as unknown as {
        id: string
        campaign_id: string
        clinic_name: string
        contact_name: string
        view_count: number
        first_viewed_at: string | null
    }

    const { data: campData } = await supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('id, name, vault_document_id, sender_name, sender_role, sender_phone')
        .eq('id', rec.campaign_id)
        .maybeSingle()

    const camp = campData as unknown as {
        id: string
        name: string
        vault_document_id: string | null
        sender_name: string
        sender_role: string
        sender_phone: string
    } | null

    if (!camp?.vault_document_id) {
        notFound()
    }

    const { data: docData } = await supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('title, file_name')
        .eq('id', camp.vault_document_id)
        .maybeSingle()

    if (!docData) {
        notFound()
    }

    const doc = docData as unknown as { title: string; file_name: string }

    // Registra leitura do material e atualiza métrica de Lead Quente
    const nowIso = new Date().toISOString()
    await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .update({
            view_count: (rec.view_count || 0) + 1,
            first_viewed_at: rec.first_viewed_at || nowIso,
            last_viewed_at: nowIso,
        } as any)
        .eq('id', rec.id)

    await refreshCampaignCounters(supabaseAdmin, rec.campaign_id)

    const senderName = camp.sender_name || DEFAULT_DIRECTOR_SIGNATURE.name
    const senderRole = camp.sender_role || DEFAULT_DIRECTOR_SIGNATURE.role
    const senderPhone = camp.sender_phone || DEFAULT_DIRECTOR_SIGNATURE.phone

    const clinicLabel = rec.clinic_name ? ` da ${rec.clinic_name}` : ''
    const whatsappHref =
        buildWhatsappUrl(
            senderPhone,
            `Olá ${senderName.split(' ')[0]}, acabei de ver a Apresentação Executiva da CliniGO${clinicLabel} e gostaria de saber mais sobre os 7 dias de avaliação.`
        ) || 'https://wa.me/5521966960684'

    const trialHref = `https://clinigo.app/cadastro?utm_source=outreach&utm_medium=presentation&utm_campaign=${encodeURIComponent(camp.id)}`

    return (
        <PublicPresentationViewer
            token={token}
            documentTitle={doc.title}
            fileName={doc.file_name}
            clinicName={rec.clinic_name || ''}
            senderName={senderName}
            senderRole={senderRole}
            senderPhone={senderPhone}
            whatsappHref={whatsappHref}
            trialHref={trialHref}
        />
    )
}

