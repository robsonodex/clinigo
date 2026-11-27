import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const TOKEN_REGEX = /^[a-f0-9]{16,64}$/i

export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ token: string }> }
) {
    const { token } = await context.params
    if (!TOKEN_REGEX.test(token)) {
        return NextResponse.json({ ok: false }, { status: 404 })
    }

    const supabaseAdmin = createServiceRoleClient()
    const { data: rec } = await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .select('id, cta_clicks')
        .eq('tracking_token', token)
        .maybeSingle()

    if (!rec) {
        return NextResponse.json({ ok: false }, { status: 404 })
    }

    const record = rec as unknown as { id: string; cta_clicks: number }
    await supabaseAdmin
        .from('sales_outreach_recipients' as any)
        .update({
            cta_clicks: (record.cta_clicks || 0) + 1,
            last_viewed_at: new Date().toISOString(),
        } as any)
        .eq('id', record.id)

    return NextResponse.json({ ok: true })
}

