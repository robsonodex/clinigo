/**
 * GET /api/debug/health
 * Health check endpoint for diagnosing production issues
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
    const startTime = Date.now()
    const checks: Record<string, { status: string; latency?: number; error?: string }> = {}

    // 1. Environment check
    checks.env = {
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'ok' : 'missing',
    }

    // 2. Supabase connection check
    try {
        const supabaseStart = Date.now()
        const supabase = await createClient() as any

        // Simple query to test connection
        const { error } = await supabase.from('clinics').select('id').limit(1)

        checks.supabase = {
            status: error ? 'error' : 'ok',
            latency: Date.now() - supabaseStart,
            error: error?.message,
        }
    } catch (err) {
        checks.supabase = {
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }

    // 3. Auth check (anonymous)
    try {
        const authStart = Date.now()
        const supabase = await createClient() as any
        const { error } = await supabase.auth.getSession()

        checks.auth = {
            status: error ? 'error' : 'ok',
            latency: Date.now() - authStart,
            error: error?.message,
        }
    } catch (err) {
        checks.auth = {
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }

    const totalLatency = Date.now() - startTime
    const allOk = Object.values(checks).every(c => c.status === 'ok')

    return NextResponse.json({
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        latency_ms: totalLatency,
        checks,
        version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    })
}
