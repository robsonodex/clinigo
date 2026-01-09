/**
 * API Keys Management Endpoint (Enterprise Plan)
 * GET /api/clinics/api-keys - List API keys
 * POST /api/clinics/api-keys - Create new API key
 */
import { type NextRequest } from 'next/server'
import crypto from 'crypto'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, BadRequestError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { canUseFeature } from '@/lib/services/plan-limits'

// Force Node.js runtime for crypto support
export const runtime = 'nodejs'

/**
 * GET - List clinic's API keys
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem gerenciar API keys')
        }

        const supabase = await createClient()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!(user as any)?.clinic_id) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Check if clinic has API access feature
        const hasApiAccess = await canUseFeature((user as any).clinic_id, 'api_access')
        if (!hasApiAccess) {
            throw new ForbiddenError('Acesso à API disponível apenas no plano Enterprise')
        }

        // List API keys (never return the actual key hash)
        const { data: keys, error } = await (supabase
            .from('api_keys') as any)
            .select('id, key_name, key_prefix, permissions, rate_limit_per_minute, last_used_at, expires_at, is_active, created_at')
            .eq('clinic_id', (user as any).clinic_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse({ keys })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Create new API key
 */
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem criar API keys')
        }

        const body = await request.json()
        const { key_name, permissions = ['read'], expires_in_days } = body

        if (!key_name || key_name.length < 3) {
            throw new BadRequestError('Nome da chave deve ter pelo menos 3 caracteres')
        }

        const supabase = await createClient()
        const serviceClient = createServiceRoleClient()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!(user as any)?.clinic_id) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Check if clinic has API access feature
        const hasApiAccess = await canUseFeature((user as any).clinic_id, 'api_access')
        if (!hasApiAccess) {
            throw new ForbiddenError('Acesso à API disponível apenas no plano Enterprise')
        }

        // Generate API key
        const rawKey = `ck_${crypto.randomBytes(32).toString('hex')}`
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
        const keyPrefix = rawKey.substring(0, 12)

        // Calculate expiration
        let expiresAt: string | null = null
        if (expires_in_days) {
            const expDate = new Date()
            expDate.setDate(expDate.getDate() + expires_in_days)
            expiresAt = expDate.toISOString()
        }

        // Insert API key (using service role to bypass RLS for creation)
        const { data: newKey, error } = await (serviceClient
            .from('api_keys') as any)
            .insert({
                clinic_id: (user as any).clinic_id,
                key_name,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                permissions,
                expires_at: expiresAt,
                created_by: userId,
            })
            .select('id, key_name, key_prefix, permissions, expires_at, created_at')
            .single()

        if (error) throw error

        // Return the raw key ONLY ONCE - it cannot be retrieved again
        return successResponse(
            {
                ...newKey,
                api_key: rawKey, // ⚠️ Only shown this one time!
                warning: 'Guarde esta chave em local seguro. Ela não poderá ser visualizada novamente.',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * DELETE - Revoke API key
 */
export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem revogar API keys')
        }

        const { searchParams } = new URL(request.url)
        const keyId = searchParams.get('id')

        if (!keyId) {
            throw new BadRequestError('ID da chave não informado')
        }

        const supabase = await createClient()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!(user as any)?.clinic_id) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Deactivate the key (soft delete)
        const { error } = await (supabase
            .from('api_keys') as any)
            .update({ is_active: false })
            .eq('id', keyId)
            .eq('clinic_id', (user as any).clinic_id)

        if (error) throw error

        return successResponse({ message: 'API key revogada com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}

