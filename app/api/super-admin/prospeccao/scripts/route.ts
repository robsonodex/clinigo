import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../_auth'
import { SCRIPT_CHANNELS, SCRIPT_STAGES } from '@/lib/sales/prospect-types'

const createScriptSchema = z.object({
    title: z.string().trim().min(2, 'Informe o título do script').max(140),
    stage: z.enum(SCRIPT_STAGES).optional().default('PRIMEIRO_CONTATO'),
    channel: z.enum(SCRIPT_CHANNELS).optional().default('EMAIL'),
    subject_template: z.string().trim().max(220).optional().default(''),
    body_template: z.string().trim().min(10, 'Escreva o conteúdo do template').max(8000),
    sort_order: z.coerce.number().int().min(0).max(9999).optional().default(100),
})

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
        .from('sales_script_templates' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

    if (error) {
        console.error('[SALES_HQ] Erro ao listar scripts:', error)
        return NextResponse.json({ error: 'Falha ao carregar scripts' }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
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

    const parsed = createScriptSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const { data, error } = await auth.supabaseAdmin
        .from('sales_script_templates' as any)
        .insert({
            ...parsed.data,
            is_default: false,
            created_by: auth.user.id,
        } as any)
        .select('*')
        .single()

    if (error) {
        console.error('[SALES_HQ] Erro ao criar script:', error)
        return NextResponse.json({ error: 'Falha ao salvar script' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
}

