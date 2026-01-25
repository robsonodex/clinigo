/**
 * DEBUG API - Test actual login flow
 * POST /api/debug/test-login
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    const timings: Record<string, number> = {}
    const startTotal = Date.now()

    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        // 1. Create client
        const startClient = Date.now()
        const supabase = await createClient() as any
        timings.client_creation_ms = Date.now() - startClient

        // 2. Actual signInWithPassword (the real test)
        const startSignIn = Date.now()
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        timings.sign_in_ms = Date.now() - startSignIn

        timings.total_ms = Date.now() - startTotal

        if (error) {
            return NextResponse.json({
                success: false,
                timings,
                error: error.message,
                error_code: error.code,
            })
        }

        return NextResponse.json({
            success: true,
            timings,
            user_id: data.user?.id,
            session_exists: !!data.session,
            diagnosis: {
                client_creation: timings.client_creation_ms > 1000 ? '⚠️ SLOW' : '✅ OK',
                sign_in: timings.sign_in_ms > 5000 ? '⚠️ SLOW' : '✅ OK',
            }
        })
    } catch (error) {
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timings,
        }, { status: 500 })
    }
}
