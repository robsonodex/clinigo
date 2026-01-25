/**
 * API: Check Feature Access
 * GET /api/features/check
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError } from '@/lib/utils/responses'
import { FeatureGateService } from '@/lib/services/feature-gate'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const feature = searchParams.get('feature')

        if (!feature) {
            throw new BadRequestError('Feature key is required')
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        // Buscar clinic_id do usuário
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            throw new BadRequestError('User not associated with clinic')
        }

        const service = new FeatureGateService()
        const access = await service.checkFeatureAccess(userData.clinic_id, feature)

        return successResponse(access)
    } catch (error) {
        return handleApiError(error)
    }
}
