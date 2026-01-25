/**
 * DEBUG API - Diagnose login performance issues
 * GET /api/debug/login-performance
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const timings: Record<string, number> = {}
    const startTotal = Date.now()

    try {
        // 1. Test Supabase client creation
        const startClient = Date.now()
        const supabase = await createClient()
        timings.client_creation_ms = Date.now() - startClient

        // 2. Test simple auth check (no actual login)
        const startAuthCheck = Date.now()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        timings.auth_check_ms = Date.now() - startAuthCheck

        // 3. Test database connectivity with simple query
        const startDbQuery = Date.now()
        const { data: dbTest, error: dbError } = await supabase
            .from('users')
            .select('id')
            .limit(1)
        timings.db_query_ms = Date.now() - startDbQuery

        // 4. Test environment variables
        const envCheck = {
            supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            supabase_url_value: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
        }

        timings.total_ms = Date.now() - startTotal

        return NextResponse.json({
            success: true,
            timings,
            environment: envCheck,
            errors: {
                user_error: userError?.message || null,
                db_error: dbError?.message || null,
            },
            diagnosis: {
                client_creation: timings.client_creation_ms > 1000 ? '⚠️ SLOW' : '✅ OK',
                auth_check: timings.auth_check_ms > 3000 ? '⚠️ SLOW' : '✅ OK',
                db_query: timings.db_query_ms > 2000 ? '⚠️ SLOW' : '✅ OK',
                total: timings.total_ms > 5000 ? '⚠️ SLOW' : '✅ OK',
            },
            recommendations: [
                timings.client_creation_ms > 1000 && 'Client creation is slow - check Vercel region vs Supabase region',
                timings.auth_check_ms > 3000 && 'Auth check is slow - Supabase Auth API may be timing out',
                timings.db_query_ms > 2000 && 'Database queries are slow - check connection pooling',
                timings.total_ms > 10000 && '🚨 CRITICAL: Total time exceeds serverless timeout limit',
            ].filter(Boolean),
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timings,
            stack: error instanceof Error ? error.stack : null,
        }, { status: 500 })
    }
}
