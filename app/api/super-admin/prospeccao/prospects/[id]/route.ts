import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../../_auth'
import { FUNNEL_STATUSES } from '@/lib/sales/prospect-types'

const updateProspectSchema = z.object({
    clinic_name: z.string().trim().min(2).max(160).optional(),
    program_focus: z.string().trim().max(160).optional(),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
    contact_name: z.string().trim().max(120).optional(),
    email: z.string().trim().max(160).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    city_state: z.string().trim().max(100).optional(),
    funnel_status: z.enum(FUNNEL_STATUSES).optional(),
    estimated_professionals: z.coerce.number().int().min(1).max(500).optional(),
    notes: z.string().trim().max(4000).optional(),
    next_followup_at: z.string().trim().nullable().optional(),
    last_contact_at: z.string().trim().optional(),
    pdf_sent_types: z.array(z.string().trim().max(40)).max(10).optional(),
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

    const parsed = updateProspectSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const updates: Record<string, unknown> = { ...parsed.data }
    if ('next_followup_at' in updates) {
        const raw = updates.next_followup_at as string | null
        updates.next_followup_at = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null
    }
    if (updates.funnel_status && !updates.last_contact_at) {
        updates.last_contact_at = new Date().toISOString()
    }

    const { data, error } = await auth.supabaseAdmin
        .from('sales_prospects' as any)
        .update(updates as any)
        .eq('id', id)
        .select('*')
        .single()

    if (error) {
        console.error('[SALES_HQ] Erro ao atualizar prospect:', error)
        return NextResponse.json({ error: 'Falha ao atualizar clínica' }, { status: 500 })
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
        .from('sales_prospects' as any)
        .delete()
        .eq('id', id)

    if (error) {
        console.error('[SALES_HQ] Erro ao excluir prospect:', error)
        return NextResponse.json({ error: 'Falha ao excluir clínica' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

