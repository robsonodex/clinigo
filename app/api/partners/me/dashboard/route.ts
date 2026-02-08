/**
 * Partner Dashboard API (for logged-in partner)
 * GET /api/partners/me/dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPartnerDashboard } from '@/lib/services/partner.service'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Check if user is a partner
        const role = user.user_metadata?.role
        if (role !== 'PARTNER') {
            return NextResponse.json(
                { error: 'Acesso negado - não é parceiro' },
                { status: 403 }
            )
        }

        // Get partner by user_id
        const { data: partner, error: partnerError } = await supabase
            .from('partners')
            .select('id')
            .eq('user_id', user.id)
            .single()

        if (partnerError || !partner) {
            return NextResponse.json(
                { error: 'Parceiro não encontrado' },
                { status: 404 }
            )
        }

        // Get dashboard data
        const result = await getPartnerDashboard(partner.id)

        if (!result) {
            return NextResponse.json(
                { error: 'Erro ao carregar dashboard' },
                { status: 500 }
            )
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API:partners/me/dashboard] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno' },
            { status: 500 }
        )
    }
}
