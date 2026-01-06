/**
 * GET /api/api-keys - List API keys for clinic
 * POST /api/api-keys - Create new API key (Enterprise only)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { generateApiKey, hashSHA256 } from '@/lib/utils/encryption'
import { canUseFeature } from '@/lib/services/plan-limits'
import { logAuditEvent, AuditActions, extractRequestMeta } from '@/lib/utils/audit-log'
import { z } from 'zod'

const createKeySchema = z.object({
    key_name: z.string().min(3).max(100),
    permissions: z.array(z.enum(['read', 'write', 'appointments', 'patients', 'doctors'])).default(['read']),
    rate_limit_per_minute: z.number().min(10).max(1000).default(60),
    expires_at: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // Only CLINIC_ADMIN can manage API keys
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem gerenciar chaves de API')
        }

        const { searchParams } = new URL(request.url)
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
            .from('api_keys')
            .select('id, key_name, key_prefix, permissions, rate_limit_per_minute, last_used_at, request_count, expires_at, is_active, created_at', { count: 'exact' })

        if (clinicId) {
            queryBuilder = queryBuilder.eq('clinic_id', clinicId)
        }

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: keys, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(keys || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem criar chaves de API')
        }

        const supabase = await createClient()
        const adminClient = createServiceRoleClient()

        // Get clinic_id
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single() as { data: { clinic_id: string | null } | null }

        const clinicId = user?.clinic_id

        if (!clinicId && userRole !== 'SUPER_ADMIN') {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Check if clinic has API access (Enterprise only)
        if (clinicId) {
            const hasApiAccess = await canUseFeature(clinicId, 'api_access')
            if (!hasApiAccess) {
                throw new ForbiddenError('Acesso à API disponível apenas no plano Enterprise. Faça upgrade para continuar.')
            }
        }

        const body = await request.json()
        const validatedData = createKeySchema.parse(body)

        // Generate API key
        const { key, prefix, hash } = generateApiKey()

        // Save to database (never store the actual key!)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: apiKey, error } = await (adminClient as any)
            .from('api_keys')
            .insert({
                clinic_id: clinicId,
                key_name: validatedData.key_name,
                key_hash: hash,
                key_prefix: prefix,
                permissions: validatedData.permissions,
                rate_limit_per_minute: validatedData.rate_limit_per_minute,
                expires_at: validatedData.expires_at || null,
                created_by: userId,
            })
            .select('id, key_name, key_prefix, permissions, rate_limit_per_minute, expires_at, created_at')
            .single()

        if (error) throw error

        // Log audit event
        const requestMeta = extractRequestMeta(request)
        await logAuditEvent({
            clinic_id: clinicId,
            user_id: userId,
            action: AuditActions.API_KEY_CREATED,
            entity_type: 'api_key',
            entity_id: apiKey.id,
            new_values: { key_name: validatedData.key_name, permissions: validatedData.permissions },
            ...requestMeta,
        })

        // Return the key ONLY ONCE - it cannot be retrieved again!
        return successResponse(
            {
                ...apiKey,
                api_key: key, // This is the only time the key is shown!
                warning: 'Guarde esta chave com segurança. Ela não poderá ser visualizada novamente.',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem excluir chaves de API')
        }

        const { searchParams } = new URL(request.url)
        const keyId = searchParams.get('id')

        if (!keyId) {
            throw new BadRequestError('ID da chave é obrigatório')
        }

        const supabase = await createClient()

        // Soft delete by deactivating
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', keyId)

        if (error) throw error

        // Log audit event
        const requestMeta = extractRequestMeta(request)
        await logAuditEvent({
            user_id: userId,
            action: AuditActions.API_KEY_DELETED,
            entity_type: 'api_key',
            entity_id: keyId,
            ...requestMeta,
        })

        return successResponse({ message: 'Chave de API desativada com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}
