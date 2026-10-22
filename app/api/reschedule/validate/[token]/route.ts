import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
/**
 * GET /api/reschedule/validate/[token]
 * Validate reschedule token and return appointment data
 */
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const GET = withAxiom(async (request: AxiomRequest, { params }: { params: { token: string } }) => {
    try {
        const { token } = params
        const supabase = createServiceRoleClient() as any

        // Validate token
        const { data: tokenData, error } = await supabase
            .from('reschedule_tokens')
            .select(`
        *,
        appointment:appointments(
          *,
          patient:patients(*),
          doctor:doctors(*, user:users(full_name)),
          clinic:clinics(name, phone)
        )
      `)
            .eq('token', token)
            .is('used_at', null)
            .gte('expires_at', new Date().toISOString())
            .single()

        if (error || !tokenData) {
            throw new NotFoundError('Token inválido ou expirado')
        }

        return successResponse({ tokenData })
    } catch (error) {
        request.log.error('reschedule/validate/[token]', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})
