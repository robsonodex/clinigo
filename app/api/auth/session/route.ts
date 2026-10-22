import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/auth/session
 * Returns current session info for client-side auth
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (userError || sessionError || !user || !session) {
            return NextResponse.json({ user: null, session: null }, { status: 200 })
        }

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
            },
            session: {
                access_token: session.access_token,
                expires_at: session.expires_at,
            }
        })
    } catch (error) {
        request.log.error('auth/session', { error: error instanceof Error ? error.message : String(error) })
        console.error('Session error:', error)
        return NextResponse.json({ user: null, session: null }, { status: 200 })
    }
})
