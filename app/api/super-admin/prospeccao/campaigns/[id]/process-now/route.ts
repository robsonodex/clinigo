import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminSalesHq } from '../../../_auth'
import { processSalesOutreachQueue } from '@/lib/sales/outreach-worker'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
    _request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await context.params
    if (!UUID_REGEX.test(id)) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const result = await processSalesOutreachQueue(auth.supabaseAdmin, {
        campaignId: id,
        maxPerRun: 1,
        ignoreBusinessHours: true,
        ignoreNextSendAt: true,
    })

    return NextResponse.json({
        success: true,
        ...result,
    })
}

