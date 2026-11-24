import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'
import { computeOperatorIntelligence } from '@/lib/tiss/operator-intelligence'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const guard = await requireTissAction(request as any, 'lote.ver')
    if (!guard.authorized) {
        return 'response' in guard
            ? guard.response
            : NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }

    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null } | null }

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 })
        }

        const clinicId = profile.clinic_id
        const { searchParams } = new URL(request.url)
        const operatorIdFilter = searchParams.get('operator_id')

        let batchQuery = (supabase as any)
            .from('tiss_batches')
            .select(
                'id, insurance_company_id, insurance_company_name, total_value, approved_value, glosa_value, submission_date, submitted_at, return_processed_at'
            )
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(400)

        if (operatorIdFilter) {
            batchQuery = batchQuery.eq('insurance_company_id', operatorIdFilter)
        }

        const [{ data: batches }, { data: glosas }] = await Promise.all([
            batchQuery,
            (supabase as any)
                .from('tiss_glosas')
                .select(
                    'id, batch_id, guide_id, glosa_code, glosa_description, glosa_value, is_irrecoverable, irrecoverable_value, contest_status, status'
                )
                .eq('clinic_id', clinicId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(1000),
        ])

        const report = computeOperatorIntelligence(
            Array.isArray(batches) ? batches : [],
            Array.isArray(glosas) ? glosas : []
        )

        return NextResponse.json({
            success: true,
            data: report,
        })
    } catch (error) {
        console.error('[TISS-OPERATOR-INTELLIGENCE] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao calcular inteligência de operadoras' },
            { status: 500 }
        )
    }
}

