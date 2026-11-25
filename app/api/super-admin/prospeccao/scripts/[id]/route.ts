import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../../_auth'
import { SCRIPT_CHANNELS, SCRIPT_STAGES } from '@/lib/sales/prospect-types'

const updateScriptSchema = z.object({
    title: z.string().trim().min(2).max(140).optional(),
    stage: z.enum(SCRIPT_STAGES).optional(),
    channel: z.enum(SCRIPT_CHANNELS).optional(),
    subject_template: z.string().trim().max(220).optional(),
    body_template: z.string().trim().min(10).max(8000).optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
})

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const parsed = updateScriptSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const { data, error } = await auth.supabaseAdmin
        .from('sales_script_templates' as any)
        .update(parsed.data as any)
        .eq('id', id)
        .select('*')
        .single()

    if (error) {
        console.error('[SALES_HQ] Erro ao atualizar script:', error)
        return NextResponse.json({ error: 'Falha ao atualizar script' }, { status: 500 })
    }

    return NextResponse.json({ data })
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
        .from('sales_script_templates' as any)
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[SALES_HQ] Erro ao excluir script:', error)
        return NextResponse.json({ error: 'Falha ao excluir script' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

