/**
 * Partner Dashboard Test - Temporary debug endpoint
 * GET /api/partners/test-dashboard - Test if route resolves and env vars exist
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
        const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
        const keyPrefix = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) || 'MISSING'

        if (!hasUrl || !hasKey) {
            return NextResponse.json({
                test: 'ENV_MISSING',
                hasUrl,
                hasKey,
                keyPrefix
            })
        }

        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Test 1: Query partners table
        const { data: partner, error: pErr } = await supabase
            .from('partners')
            .select('id, full_name')
            .limit(1)
            .single()

        // Test 2: Query the view
        const { data: dashboard, error: vErr } = await supabase
            .from('vw_partner_dashboard')
            .select('partner_id, full_name')
            .limit(1)
            .single()

        return NextResponse.json({
            test: 'OK',
            hasUrl,
            hasKey,
            keyPrefix,
            partners_table: { hasData: !!partner, error: pErr?.message || null },
            view: { hasData: !!dashboard, error: vErr?.message || null }
        })
    } catch (error: any) {
        return NextResponse.json({
            test: 'ERROR',
            message: error?.message || 'Unknown error'
        }, { status: 500 })
    }
}
