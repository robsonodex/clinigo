import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireSuperAdminSalesHq } from '@/app/api/super-admin/prospeccao/_auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    const supabase = createServiceRoleClient() as any
    const [contractsRes, clinicsRes] = await Promise.all([
        supabase
            .from('commercial_contracts')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(100),
        supabase
            .from('clinics')
            .select('id, name, slug, cnpj, email, phone, address, responsible_name, responsible_phone, plan_type, is_active, block_type, manual_unlock_only')
            .order('name', { ascending: true }),
    ])

    if (contractsRes.error) {
        return NextResponse.json({ error: contractsRes.error.message }, { status: 500 })
    }

    return NextResponse.json({
        success: true,
        contracts: contractsRes.data || [],
        clinics: clinicsRes.data || [],
    })
}

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const supabase = createServiceRoleClient() as any

        const contractNumber = String(body.contract_number || '').trim()
        const title = String(body.title || '').trim()
        const contractBody = String(body.contract_body || '').trim()

        if (!contractNumber || !title || !contractBody) {
            return NextResponse.json(
                { error: 'Número do contrato, título e texto do contrato são obrigatórios.' },
                { status: 400 }
            )
        }

        const planType = ['BASICO', 'AVANCADO', 'PROFESSIONAL'].includes(String(body.plan_type))
            ? String(body.plan_type)
            : 'PROFESSIONAL'

        const status = ['draft', 'ready', 'sent', 'signed', 'cancelled'].includes(String(body.status))
            ? String(body.status)
            : 'draft'

        const { data, error } = await supabase
            .from('commercial_contracts')
            .insert({
                clinic_id: body.clinic_id || null,
                contract_number: contractNumber,
                title,
                status,
                plan_type: planType,
                fidelity_months: Number.isFinite(Number(body.fidelity_months)) ? Number(body.fidelity_months) : 12,
                early_termination_penalty_pct: Number.isFinite(Number(body.early_termination_penalty_pct))
                    ? Number(body.early_termination_penalty_pct)
                    : 30,
                monthly_value_cents: Math.max(0, Math.round(Number(body.monthly_value_cents ?? 44900))),
                setup_fee_cents: Math.max(0, Math.round(Number(body.setup_fee_cents ?? 0))),
                included_licenses: Math.max(1, Math.round(Number(body.included_licenses ?? 30))),
                extra_license_price_cents: Math.max(0, Math.round(Number(body.extra_license_price_cents ?? 4990))),
                due_day: Math.min(28, Math.max(1, Math.round(Number(body.due_day ?? 7)))),
                start_date: body.start_date || new Date().toISOString().slice(0, 10),
                form_data: body.form_data || {},
                contract_body: contractBody,
                created_by: auth.user.id,
            })
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, contract: data }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error?.message || 'Erro ao salvar contrato' }, { status: 400 })
    }
}

