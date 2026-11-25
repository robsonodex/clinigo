import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdminSalesHq } from '../_auth'
import { FUNNEL_STATUSES } from '@/lib/sales/prospect-types'

const createProspectSchema = z.object({
    clinic_name: z.string().trim().min(2, 'Informe o nome da clínica').max(160),
    program_focus: z.string().trim().max(160).optional().default(''),
    specialties: z.array(z.string().trim().min(1).max(80)).max(12).optional().default(['Fonoaudiologia', 'Terapia Ocupacional']),
    contact_name: z.string().trim().max(120).optional().default(''),
    email: z.string().trim().max(160).optional().default(''),
    whatsapp: z.string().trim().max(40).optional().default(''),
    city_state: z.string().trim().max(100).optional().default(''),
    funnel_status: z.enum(FUNNEL_STATUSES).optional().default('ABORDADO'),
    estimated_professionals: z.coerce.number().int().min(1).max(500).optional().default(5),
    notes: z.string().trim().max(4000).optional().default(''),
    next_followup_at: z.string().trim().nullable().optional(),
    pdf_sent_types: z.array(z.string().trim().max(40)).max(10).optional().default([]),
})

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { data, error } = await auth.supabaseAdmin
        .from('sales_prospects' as any)
        .select('*')
        .order('updated_at', { ascending: false })

    if (error) {
        console.error('[SALES_HQ] Erro ao listar prospects:', error)
        return NextResponse.json({ error: 'Falha ao carregar clínicas prospectadas' }, { status: 500 })
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

    const parsed = createProspectSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Dados inválidos' },
            { status: 400 }
        )
    }

    const payload = parsed.data
    const cleanedDate =
        payload.next_followup_at && /^\d{4}-\d{2}-\d{2}$/.test(payload.next_followup_at)
            ? payload.next_followup_at
            : null

    const { data, error } = await auth.supabaseAdmin
        .from('sales_prospects' as any)
        .insert({
            clinic_name: payload.clinic_name,
            program_focus: payload.program_focus,
            specialties: payload.specialties.length > 0 ? payload.specialties : ['Fonoaudiologia', 'Terapia Ocupacional'],
            contact_name: payload.contact_name,
            email: payload.email,
            whatsapp: payload.whatsapp,
            city_state: payload.city_state,
            funnel_status: payload.funnel_status,
            estimated_professionals: payload.estimated_professionals,
            notes: payload.notes,
            next_followup_at: cleanedDate,
            pdf_sent_types: payload.pdf_sent_types,
            last_contact_at: new Date().toISOString(),
            created_by: auth.user.id,
        } as any)
        .select('*')
        .single()

    if (error) {
        console.error('[SALES_HQ] Erro ao criar prospect:', error)
        return NextResponse.json({ error: 'Falha ao salvar clínica no CRM' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
}

