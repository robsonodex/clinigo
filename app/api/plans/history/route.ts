import { withAxiom, AxiomRequest } from 'next-axiom'
/**
 * API: Plan History
 * GET /api/plans/history
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError } from '@/lib/utils/responses'
import { createClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            throw new BadRequestError('User not associated with clinic')
        }

        // Buscar histórico
        const { data: history, error } = await supabase
            .from('clinic_plan_history')
            .select(`
        *,
        changed_by_user:users!clinic_plan_history_changed_by_user_id_fkey(full_name, email)
      `)
            .eq('clinic_id', userData.clinic_id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) throw error

        return successResponse({
            history: history || [],
            total: history?.length || 0,
        })
    } catch (error) {
        request.log.error('plans/history', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})
