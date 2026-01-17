import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Check if the current user belongs to the demo clinic
 * Use this in API routes to block certain actions for demo users
 */
export async function isDemoClinic(): Promise<boolean> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return false

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) return false

        const { data: clinic } = await supabase
            .from('clinics')
            .select('slug')
            .eq('id', profile.clinic_id)
            .single()

        return clinic?.slug === 'demo'
    } catch {
        return false
    }
}

/**
 * Helper to return a blocked response for demo accounts
 */
export function demoBlockedResponse(action: string) {
    return NextResponse.json(
        {
            success: false,
            error: {
                message: `Ação "${action}" não permitida na conta de demonstração. Crie uma conta real para usar esta funcionalidade.`,
                code: 'DEMO_ACTION_BLOCKED'
            }
        },
        { status: 403 }
    )
}

/**
 * Middleware-style function to check and block demo actions
 * Returns null if action is allowed, or a Response if blocked
 */
export async function blockDemoAction(action: string): Promise<NextResponse | null> {
    const isDemo = await isDemoClinic()
    if (isDemo) {
        return demoBlockedResponse(action)
    }
    return null
}
