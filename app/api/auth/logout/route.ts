import { withAxiom, AxiomRequest } from 'next-axiom'
/**
 * POST /api/auth/logout
 * Logout and clear session
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, isUserAllowedConcurrentSessions } from '@/lib/services/single-session'

export const POST = withAxiom(async (_request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            try {
                const supabaseAdmin = createServiceRoleClient()
                const cookieStore = await cookies()
                const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

                if (sessionToken) {
                    await (supabaseAdmin
                        .from('active_sessions') as any)
                        .update({ is_active: false, last_active_at: new Date().toISOString() })
                        .eq('user_id', user.id)
                        .eq('session_token', sessionToken)
                } else if (!isUserAllowedConcurrentSessions(user.id, user.email)) {
                    await (supabaseAdmin
                        .from('active_sessions') as any)
                        .update({ is_active: false, last_active_at: new Date().toISOString() })
                        .eq('user_id', user.id)
                        .eq('is_active', true)
                }
            } catch (sessionErr) {
        _request.log.error('auth/logout', { error: sessionErr instanceof Error ? sessionErr.message : String(sessionErr) })
                console.error('[LOGOUT] Error deactivating session:', sessionErr)
            }
        }

        await supabase.auth.signOut()

        return successResponse({ message: 'Logout realizado com sucesso' })
    } catch (error) {
        _request.log.error('auth/logout', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})

