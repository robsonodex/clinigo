/**
 * API endpoint for SMTP configuration (Profissional+ plans)
 * GET - Get current SMTP settings
 * PATCH - Update SMTP settings
 * POST - Test SMTP connection
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, BadRequestError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { canUseFeature } from '@/lib/services/plan-limits'
import { encryptPassword, testSMTPConnection } from '@/lib/services/email-multi-tenant'
import { z } from 'zod'

const smtpConfigSchema = z.object({
    smtp_enabled: z.boolean(),
    smtp_host: z.string().optional(),
    smtp_port: z.number().min(1).max(65535).optional(),
    smtp_user: z.string().optional(),
    smtp_password: z.string().optional(),
    smtp_from_email: z.string().email().optional(),
    smtp_from_name: z.string().optional(),
})

/**
 * GET - Get current SMTP configuration (without password)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem ver configurações SMTP')
        }

        const supabase = await createClient()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user || (!(user as any).clinic_id && userRole !== 'SUPER_ADMIN')) {
            throw new BadRequestError('Clínica não encontrada')
        }

        const clinicId = (user as any).clinic_id


        // Check feature access
        if (clinicId) {
            const hasCustomSMTP = await canUseFeature(clinicId, 'custom_smtp')
            if (!hasCustomSMTP) {
                throw new ForbiddenError('SMTP personalizado disponível apenas nos planos Profissional e Enterprise')
            }
        }

        if (!clinicId) throw new BadRequestError('Clínica indefinida')

        // Get SMTP config (never return password)
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_from_name')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) throw error || new BadRequestError('Clínica não encontrada')

        return successResponse({
            config: {
                ...(clinic as any),
                smtp_password_set: !!(clinic as any).smtp_host, // Indicate if password is configured
            }
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * PATCH - Update SMTP configuration
 */
export async function PATCH(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem configurar SMTP')
        }

        const body = await request.json()
        const validatedData = smtpConfigSchema.parse(body)

        const supabase = await createClient()
        const serviceClient = createServiceRoleClient()

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user || !(user as any).clinic_id) {
            throw new BadRequestError('Clínica não encontrada')
        }

        const clinicId = (user as any).clinic_id

        // Check feature access
        const hasCustomSMTP = await canUseFeature(clinicId, 'custom_smtp')
        if (!hasCustomSMTP) {
            throw new ForbiddenError('SMTP personalizado disponível apenas nos planos Profissional e Enterprise')
        }

        // Build update object
        const updateData: Record<string, unknown> = {
            smtp_enabled: validatedData.smtp_enabled,
            smtp_host: validatedData.smtp_host,
            smtp_port: validatedData.smtp_port,
            smtp_user: validatedData.smtp_user,
            smtp_from_email: validatedData.smtp_from_email,
            smtp_from_name: validatedData.smtp_from_name,
        }

        // Only update password if provided (encrypt it)
        if (validatedData.smtp_password) {
            updateData.smtp_password = encryptPassword(validatedData.smtp_password)
        }

        // Update clinic SMTP settings
        const { error } = await (serviceClient
            .from('clinics') as any)
            .update(updateData)
            .eq('id', clinicId)

        if (error) throw error

        return successResponse({ message: 'Configurações SMTP atualizadas com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Test SMTP connection
 */
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem testar SMTP')
        }

        const body = await request.json()
        const { smtp_host, smtp_port, smtp_user, smtp_password } = body

        if (!smtp_host || !smtp_user || !smtp_password) {
            throw new BadRequestError('Host, usuário e senha são obrigatórios para teste')
        }

        // Test the connection
        const result = await testSMTPConnection({
            host: smtp_host,
            port: smtp_port || 587,
            user: smtp_user,
            password: smtp_password,
        })

        if (result.success) {
            return successResponse({ message: 'Conexão SMTP testada com sucesso!' })
        } else {
            throw new BadRequestError(`Falha no teste SMTP: ${result.error}`)
        }
    } catch (error) {
        return handleApiError(error)
    }
}

