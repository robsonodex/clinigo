/**
 * GET /api/audit-log - List audit log entries
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { z } from 'zod'

const querySchema = z.object({
    entity_type: z.string().optional(),
    action: z.string().optional(),
    user_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
})

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // Only CLINIC_ADMIN and SUPER_ADMIN can view audit logs
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem visualizar logs de auditoria')
        }

        const { searchParams } = new URL(request.url)
        const query = querySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = await createClient()

        // Get user's clinic_id
        let clinicId: string | null = null
        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single() as { data: { clinic_id: string | null } | null }
            clinicId = user?.clinic_id || null
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let queryBuilder = (supabase as any)
            .from('audit_log')
            .select(`
                *,
                user:users(full_name, email)
            `, { count: 'exact' })

        // Apply clinic filter for non-SUPER_ADMIN
        if (clinicId) {
            queryBuilder = queryBuilder.eq('clinic_id', clinicId)
        }

        // Apply filters
        if (query.entity_type) {
            queryBuilder = queryBuilder.eq('entity_type', query.entity_type)
        }
        if (query.action) {
            queryBuilder = queryBuilder.eq('action', query.action)
        }
        if (query.user_id) {
            queryBuilder = queryBuilder.eq('user_id', query.user_id)
        }
        if (query.date_from) {
            queryBuilder = queryBuilder.gte('created_at', query.date_from)
        }
        if (query.date_to) {
            queryBuilder = queryBuilder.lte('created_at', query.date_to)
        }

        // Order by most recent and paginate
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: logs, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(logs || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}
