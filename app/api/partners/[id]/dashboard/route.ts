/**
 * Partner Dashboard API
 * GET /api/partners/[id]/dashboard - Get partner dashboard data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPartnerDashboard, getPartnerClinics } from '@/lib/services/partner.service'
import { getPartnerCommissionHistory } from '@/lib/services/commission.service'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: partnerId } = await params

        if (!partnerId) {
            return NextResponse.json(
                { error: 'ID do parceiro não fornecido' },
                { status: 400 }
            )
        }

        // Fetch dashboard data in parallel
        const [dashboard, clinics, commissionHistory] = await Promise.all([
            getPartnerDashboard(partnerId),
            getPartnerClinics(partnerId),
            getPartnerCommissionHistory(partnerId)
        ])

        if (!dashboard) {
            return NextResponse.json(
                { error: 'Parceiro não encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            dashboard,
            clinics,
            commission_history: commissionHistory
        })
    } catch (error: any) {
        console.error('[API:partners/[id]/dashboard] Error:', error)

        return NextResponse.json(
            { error: 'Erro ao buscar dados do parceiro' },
            { status: 500 }
        )
    }
}
