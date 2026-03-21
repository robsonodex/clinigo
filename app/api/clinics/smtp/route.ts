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
import { encryptPassword, decryptPassword, testSMTPConnection } from '@/lib/services/email-multi-tenant'
import { z } from 'zod'

const smtpConfigSchema = z.object({
    smtp_enabled: z.boolean(),
    smtp_host: z.string().optional(),
    smtp_port: z.number().min(1).max(65535).optional(),
    smtp_user: z.string().optional(),
    smtp_password: z.string().optional(),
    smtp_from_email: z.string().email().optional().or(z.literal('')),
    smtp_from_name: z.string().optional(),
    smtp_secure: z.boolean().optional(), // Frontend sends this, ignore for now
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

        // For SUPER_ADMIN without clinic_id, fallback to x-clinic-id header or query param
        let clinicId = (user as any)?.clinic_id
        if (!clinicId && userRole === 'SUPER_ADMIN') {
            clinicId = request.headers.get('x-clinic-id') || request.nextUrl.searchParams.get('clinic_id')
        }

        if (!clinicId) {
            throw new BadRequestError('Clínica não encontrada. Para Super Admin, passe clinic_id como parâmetro.')
        }

        // Get SMTP config (never return password)
        // Note: smtp_secure is not a database column, it's derived from smtp_port
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_from_email, smtp_from_name')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) throw error || new BadRequestError('Clínica não encontrada')

        // Derive smtp_secure from port (465 = SSL/TLS enabled)
        const smtpPort = (clinic as any).smtp_port
        const smtpSecure = smtpPort === 465

        return successResponse({
            config: {
                ...(clinic as any),
                smtp_secure: smtpSecure, // Derived from port, not stored in DB
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

        // For SUPER_ADMIN without clinic_id, fallback to x-clinic-id header
        let clinicId = (user as any)?.clinic_id
        if (!clinicId && userRole === 'SUPER_ADMIN') {
            clinicId = request.headers.get('x-clinic-id')
        }

        if (!clinicId) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // SMTP is available for all plans - no feature check needed

        // Build update object
        // Note: smtp_secure is NOT a database column, it's only used by the frontend for UI state
        const updateData: Record<string, unknown> = {
            smtp_enabled: validatedData.smtp_enabled,
            smtp_host: validatedData.smtp_host,
            smtp_port: validatedData.smtp_port,
            smtp_user: validatedData.smtp_user,
            smtp_from_email: validatedData.smtp_from_email || null,
            smtp_from_name: validatedData.smtp_from_name,
            // smtp_secure is NOT saved - it's derived from smtp_port (465 = secure)
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
        const { smtp_host, smtp_port, smtp_user, smtp_password, test_email } = body

        if (!smtp_host || !smtp_user) {
            throw new BadRequestError('Host e usuário são obrigatórios para teste')
        }

        if (!test_email) {
            throw new BadRequestError('E-mail de destino é obrigatório para o teste')
        }

        let finalPassword = smtp_password;

        if (!finalPassword) {
            // we need to get it from the DB
            const supabase = await createClient()
            const { data: user } = await (supabase.from('users') as any).select('clinic_id').eq('id', userId).single()
            let testClinicId = (user as any)?.clinic_id
            if (!testClinicId && userRole === 'SUPER_ADMIN') {
                testClinicId = request.headers.get('x-clinic-id')
            }
            if (testClinicId) {
                const serviceClient = createServiceRoleClient()
                const { data: clinic } = await (serviceClient.from('clinics') as any).select('smtp_password').eq('id', testClinicId).single()
                if (clinic?.smtp_password) {
                    finalPassword = decryptPassword(clinic.smtp_password)
                }
            }
        }

        if (!finalPassword) {
            throw new BadRequestError('Senha do SMTP é obrigatória para teste')
        }

        // Test the connection and send test email
        const result = await testSMTPConnection({
            host: smtp_host,
            port: smtp_port || 587,
            user: smtp_user,
            password: finalPassword,
            testEmail: test_email,
        })

        if (result.success) {
            return successResponse({ message: 'E-mail de teste enviado com sucesso!' })
        } else {
            throw new BadRequestError(`Falha no teste SMTP: ${result.error}`)
        }
    } catch (error) {
        return handleApiError(error)
    }
}

