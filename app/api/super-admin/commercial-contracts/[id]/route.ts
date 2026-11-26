import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdminSalesHq } from '@/app/api/super-admin/prospeccao/_auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    try {
        const { id } = await params
        const body = await request.json()
        const supabase = createServiceRoleClient() as any

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (body.clinic_id !== undefined) updatePayload.clinic_id = body.clinic_id || null
        if (typeof body.contract_number === 'string') updatePayload.contract_number = body.contract_number.trim()
        if (typeof body.title === 'string') updatePayload.title = body.title.trim()
        if (['draft', 'ready', 'sent', 'signed', 'cancelled'].includes(String(body.status))) {
            updatePayload.status = String(body.status)
        }
        if (['BASICO', 'AVANCADO', 'PROFESSIONAL'].includes(String(body.plan_type))) {
            updatePayload.plan_type = String(body.plan_type)
        }
        if (body.fidelity_months !== undefined) updatePayload.fidelity_months = Number(body.fidelity_months)
        if (body.early_termination_penalty_pct !== undefined) {
            updatePayload.early_termination_penalty_pct = Number(body.early_termination_penalty_pct)
        }
        if (body.monthly_value_cents !== undefined) updatePayload.monthly_value_cents = Math.max(0, Math.round(Number(body.monthly_value_cents)))
        if (body.setup_fee_cents !== undefined) updatePayload.setup_fee_cents = Math.max(0, Math.round(Number(body.setup_fee_cents)))
        if (body.included_licenses !== undefined) updatePayload.included_licenses = Math.max(1, Math.round(Number(body.included_licenses)))
        if (body.extra_license_price_cents !== undefined) updatePayload.extra_license_price_cents = Math.max(0, Math.round(Number(body.extra_license_price_cents)))
        if (body.due_day !== undefined) updatePayload.due_day = Math.min(28, Math.max(1, Math.round(Number(body.due_day))))
        if (typeof body.start_date === 'string' && body.start_date) updatePayload.start_date = body.start_date
        if (body.form_data !== undefined) updatePayload.form_data = body.form_data
        if (typeof body.contract_body === 'string') updatePayload.contract_body = body.contract_body

        const { data, error } = await supabase
            .from('commercial_contracts')
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, contract: data })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Erro ao atualizar contrato' }, { status: 400 })
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const { id } = await params
    const supabase = createServiceRoleClient() as any
    const { error } = await supabase.from('commercial_contracts').delete().eq('id', id)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

