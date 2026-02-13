/**
 * Partner Dashboard API
 * GET /api/partners/[id]/dashboard - Get partner dashboard data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPartnerDashboard, getPartnerClinics } from '@/lib/services/partner.service'
import { getPartnerCommissionHistory } from '@/lib/services/commission.service'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: partnerId } = await params

        console.log('[API:partners/dashboard] Fetching for partnerId:', partnerId)

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
            // Fallback: try direct query on partners table
            console.warn('[API:partners/dashboard] View returned null, trying direct query for:', partnerId)
            const supabase = createServiceRoleClient()
            const { data: partner, error: partnerError } = await (supabase as any)
                .from('partners')
                .select('id, full_name, referral_code, pix_key, pix_key_type, status, commission_rate')
                .eq('id', partnerId)
                .single()

            if (partnerError || !partner) {
                console.error('[API:partners/dashboard] Direct query also failed:', partnerError)
                return NextResponse.json(
                    { error: 'Parceiro não encontrado' },
                    { status: 404 }
                )
            }

            // Return basic dashboard data from partners table
            console.log('[API:partners/dashboard] Fallback success for:', partnerId)
            return NextResponse.json({
                success: true,
                dashboard: {
                    partner_id: partner.id,
                    full_name: partner.full_name,
                    referral_code: partner.referral_code,
                    pix_key: partner.pix_key,
                    pix_key_type: partner.pix_key_type,
                    status: partner.status,
                    commission_rate: partner.commission_rate,
                    total_clinics: 0,
                    active_clinics: 0,
                    total_sales: 0,
                    paid_sales: 0,
                    pending_sales: 0,
                    total_earned: 0,
                    pending_commissions: 0,
                    this_month_estimate: 0,
                    this_month_sales: 0
                },
                clinics: clinics || [],
                commission_history: commissionHistory || []
            })
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
