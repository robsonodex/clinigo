/**
 * Admin Mark Payment API
 * POST /api/admin/partner-payments/[id]/pay - Mark commissions as paid
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markCommissionsAsPaid } from '@/lib/services/commission.service'
import { markPaymentSchema } from '@/lib/validations/partner.schema'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        // Check if user is admin
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autenticado' },
                { status: 401 }
            )
        }

        const userRole = user.user_metadata?.role
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'SYSTEM_ADMIN') {
            return NextResponse.json(
                { error: 'Acesso negado' },
                { status: 403 }
            )
        }

        const { id: partnerId } = await params
        const body = await request.json()

        // Validate input
        const validated = markPaymentSchema.safeParse(body)

        if (!validated.success) {
            return NextResponse.json(
                {
                    error: 'Dados inválidos',
                    details: validated.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        // Mark commissions as paid
        const result = await markCommissionsAsPaid(
            validated.data.commission_ids,
            user.id,
            validated.data.proof_url || undefined,
            validated.data.notes || undefined
        )

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Erro ao processar pagamento' },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: `${validated.data.commission_ids.length} comissão(ões) marcada(s) como paga(s)`
        })
    } catch (error: any) {
        console.error('[API:admin/partner-payments/[id]/pay] Error:', error)

        return NextResponse.json(
            { error: 'Erro ao processar pagamento' },
            { status: 500 }
        )
    }
}
