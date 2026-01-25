/**
 * API: TISS Glosas Metrics
 * GET /api/tiss/glosas/metrics
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { GlosaService } from '@/lib/services/tiss/glosa-service'

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            throw new BadRequestError('Não autorizado')
        }

        const supabase = await createClient() as any
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user?.clinic_id) {
            throw new BadRequestError('Usuário sem clínica associada')
        }

        const service = new GlosaService()
        const metrics = await service.getGlosaMetrics(user.clinic_id)

        return successResponse({ metrics })
    } catch (error) {
        return handleApiError(error)
    }
}
