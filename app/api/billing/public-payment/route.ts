import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

// =============================================================================
// GET /api/billing/public-payment?token=UUID
// Endpoint PÚBLICO (sem auth) - retorna dados do pagamento para exibir na página
// =============================================================================

const PLAN_NAMES: Record<string, string> = {
    STARTER: 'Starter',
    BASIC: 'Básico',
    BASICO: 'CliniGo Básico',
    AVANCADO: 'CliniGo Avançado',
    PROFESSIONAL: 'Profissional',
    ENTERPRISE: 'Enterprise',
    NETWORK: 'Network',
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
        }

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(token)) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
        }

        const supabase = createServiceRoleClient() as any

        // Buscar payment_request pelo ID (token)
        const { data: pr, error } = await supabase
            .from('payment_requests')
            .select('id, clinic_id, amount, plan_type, description, status, created_at, mercadopago_init_point')
            .eq('id', token)
            .single()

        if (error || !pr) {
            return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
        }

        // Buscar nome da clínica
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name, subscription_due_date')
            .eq('id', pr.clinic_id)
            .single()

        return NextResponse.json({
            id: pr.id,
            clinic_name: clinic?.name || 'Clínica',
            amount: pr.amount,
            plan_type: pr.plan_type,
            plan_name: PLAN_NAMES[pr.plan_type] || pr.plan_type,
            description: pr.description,
            status: pr.status,
            linha_digitavel: pr.mercadopago_init_point,
            due_date: clinic?.subscription_due_date,
            created_at: pr.created_at,
        })

    } catch (error) {
        console.error('[Public Payment]', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
