/**
 * Partner Dashboard API (for logged-in partner)
 * GET /api/partners/me/dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// Untyped service client to access views not in Database types
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

        // Get partner_id from metadata
        let partnerId = user.user_metadata?.partner_id

        if (!partnerId) {
            // Fallback: fetch partner_id by user_id using RLS-aware client
            const { data: partner } = await supabase
                .from('partners')
                .select('id')
                .eq('user_id', user.id)
                .single()

            partnerId = partner?.id
        }

        if (!partnerId) {
            return NextResponse.json(
                { error: 'Parceiro não encontrado' },
                { status: 404 }
            )
        }

        console.log('[PARTNER-ME-DASHBOARD] Fetching for partnerId:', partnerId)

        // Use untyped service client to query the view
        const serviceClient = getServiceClient()

        const { data: dashboard, error: viewError } = await serviceClient
            .from('vw_partner_dashboard')
            .select('*')
            .eq('partner_id', partnerId)
            .single()

        console.log('[PARTNER-ME-DASHBOARD] View result:', {
            hasData: !!dashboard,
            error: viewError?.message,
            code: viewError?.code
        })

        if (viewError || !dashboard) {
            // Fallback: direct query on partners table
            const { data: partner, error: partnerError } = await serviceClient
                .from('partners')
                .select('id, full_name, referral_code, pix_key, pix_key_type, status, commission_rate')
                .eq('id', partnerId)
                .single()

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
            serviceClient
                .from('clinic_referrals')
                .select('*, clinic:clinics(id, name, slug)')
                .eq('partner_id', partnerId),
            serviceClient
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
        console.error('[API:partners/me/dashboard] Error:', error)
        return NextResponse.json(
            { error: 'Erro interno' },
            { status: 500 }
        )
    }
}
