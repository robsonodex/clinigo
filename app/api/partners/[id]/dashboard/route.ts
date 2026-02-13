/**
 * Partner Dashboard API
 * GET /api/partners/[id]/dashboard - Get partner dashboard data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

interface RouteParams {
    params: Promise<{ id: string }>
}

// Inline service role client to avoid type issues with Database generic
function getServiceClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: partnerId } = await params

        console.log('[PARTNER-DASHBOARD] Request for partnerId:', partnerId)

        if (!partnerId) {
            return NextResponse.json(
                { error: 'ID do parceiro não fornecido' },
                { status: 400 }
            )
        }

        const supabase = getServiceClient()

        // Query the view directly (untyped client to avoid Database type issues)
        const { data: dashboard, error: viewError } = await supabase
            .from('vw_partner_dashboard')
            .select('*')
            .eq('partner_id', partnerId)
            .single()

        console.log('[PARTNER-DASHBOARD] View result:', {
            hasData: !!dashboard,
            error: viewError?.message,
            code: viewError?.code
        })

        if (viewError || !dashboard) {
            // Fallback: direct query on partners table
            console.warn('[PARTNER-DASHBOARD] View failed, trying partners table directly')
            const { data: partner, error: partnerError } = await supabase
                .from('partners')
                .select('id, full_name, referral_code, pix_key, pix_key_type, status, commission_rate')
                .eq('id', partnerId)
                .single()

            console.log('[PARTNER-DASHBOARD] Partners table result:', {
                hasData: !!partner,
                error: partnerError?.message
            })

            if (partnerError || !partner) {
                return NextResponse.json(
                    { error: 'Parceiro não encontrado' },
                    { status: 404 }
                )
            }

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
                clinics: [],
                commission_history: []
            })
        }

        // Fetch clinics and commissions in parallel
        const [clinicsResult, commissionsResult] = await Promise.all([
            supabase
                .from('clinic_referrals')
                .select('*, clinic:clinics(id, name, slug)')
                .eq('partner_id', partnerId),
            supabase
                .from('partner_commissions')
                .select('*')
                .eq('partner_id', partnerId)
                .order('created_at', { ascending: false })
                .limit(20)
        ])

        return NextResponse.json({
            success: true,
            dashboard,
            clinics: clinicsResult.data || [],
            commission_history: commissionsResult.data || []
        })
    } catch (error: any) {
        console.error('[PARTNER-DASHBOARD] Unhandled error:', error?.message || error)

        return NextResponse.json(
            { error: 'Erro ao buscar dados do parceiro' },
            { status: 500 }
        )
    }
}
