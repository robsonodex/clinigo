import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshCampaignCounters } from '@/lib/sales/outreach-worker'

const TOKEN_REGEX = /^[a-f0-9]{16,64}$/i
const BUCKET_ID = 'sales-vault'

export const dynamic = 'force-dynamic'

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    if (!TOKEN_REGEX.test(token)) {
        return new NextResponse('Material não encontrado', { status: 404 })
    }

    const supabaseAdmin = createServiceRoleClient()

    const { data: recipient } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('id, campaign_id, view_count, first_viewed_at')
        .eq('tracking_token', token)
        .maybeSingle()

    if (!recipient) {
        return new NextResponse('Material não encontrado', { status: 404 })
    }

    const rec = recipient as unknown as {
        id: string
        campaign_id: string
        view_count: number
        first_viewed_at: string | null
    }

    const { data: campaign } = await supabaseAdmin
        .from('sales_outreach_campaigns' as any)
        .select('vault_document_id')
        .eq('id', rec.campaign_id)
        .maybeSingle()

    const vaultDocId = (campaign as { vault_document_id?: string | null } | null)?.vault_document_id
    if (!vaultDocId) {
        return new NextResponse('Documento não vinculado a esta apresentação', { status: 404 })
    }

    const { data: doc } = await supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('file_path, file_name, mime_type')
        .eq('id', vaultDocId)
        .maybeSingle()

    if (!doc) {
        return new NextResponse('Arquivo não encontrado no cofre', { status: 404 })
    }

    const record = doc as unknown as { file_path: string; file_name: string; mime_type: string }
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from(BUCKET_ID)
        .download(record.file_path)

    if (dlErr || !blob) {
        return new NextResponse('Falha ao carregar arquivo', { status: 500 })
    }

    // Registra leitura (evita duplicar quando ?silent=1 é usado no iframe após page view)
    const isSilent = request.nextUrl.searchParams.get('silent') === '1'
    if (!isSilent) {
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
    }

    const shouldDownload = request.nextUrl.searchParams.get('download') === '1'
    const arrayBuffer = await blob.arrayBuffer()
    const safeFileName = record.file_name.replace(/["\r\n]/g, '')

    return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
            'Content-Type': record.mime_type || 'application/pdf',
            'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="${safeFileName}"`,
            'Cache-Control': 'private, max-age=300',
            'X-Robots-Tag': 'noindex, nofollow',
        },
    })
}

