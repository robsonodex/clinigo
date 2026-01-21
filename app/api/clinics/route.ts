/**
 * GET /api/clinics - List all clinics (SUPER_ADMIN only)
 * POST /api/clinics - Create new clinic (SUPER_ADMIN only)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, ConflictError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createClinicSchema, listClinicsQuerySchema } from '@/lib/validations/clinic'
import { sendMail } from '@/lib/services/mail-service'

export async function GET(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        const userId = request.headers.get('x-user-id')

        console.log('[GET /api/clinics] User Role:', userRole, 'User ID:', userId)

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem listar clínicas')
        }

        const { searchParams } = new URL(request.url)
        const query = listClinicsQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = userRole === 'SUPER_ADMIN'
            ? createServiceRoleClient()
            : await createClient()

        console.log('[GET /api/clinics] Using client:', userRole === 'SUPER_ADMIN' ? 'SERVICE_ROLE' : 'AUTHENTICATED')

        let queryBuilder = supabase
            .from('clinics')
            .select('*', { count: 'exact' })

        // Apply filters
        if (query.is_active !== undefined) {
            queryBuilder = queryBuilder.eq('is_active', query.is_active)
        } else {
            // Default to active only
            queryBuilder = queryBuilder.eq('is_active', true)
        }

        if (query.plan_type) {
            queryBuilder = queryBuilder.eq('plan_type', query.plan_type)
        }

        if (query.search) {
            queryBuilder = queryBuilder.or(
                `name.ilike.%${query.search}%,email.ilike.%${query.search}%,slug.ilike.%${query.search}%`
            )
        }

        // Apply pagination
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: clinics, count, error } = await queryBuilder

        console.log('[GET /api/clinics] Found clinics:', clinics?.length, 'Total count:', count)

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(clinics || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        const userId = request.headers.get('x-user-id')

        // Debug logging
        console.log('[POST /api/clinics] ========== DEBUG ==========')
        console.log('[POST /api/clinics] User Role from header:', userRole)
        console.log('[POST /api/clinics] User ID from header:', userId)
        console.log('[POST /api/clinics] All headers:', Object.fromEntries(request.headers.entries()))
        console.log('[POST /api/clinics] ============================')

        if (userRole !== 'SUPER_ADMIN') {
            console.log('[POST /api/clinics] REJECTING - userRole is not SUPER_ADMIN:', userRole)
            throw new ForbiddenError('Apenas super administradores podem criar clínicas')
        }


        const body = await request.json()
        const validatedData = createClinicSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Error message for duplicate email
        const EMAIL_ALREADY_EXISTS_ERROR = 'Este e-mail já está vinculado a uma clínica cadastrada. Por favor, use outro e-mail ou recupere sua senha.'

        // 0. Check for existing admin email (if admin credentials provided)
        if (validatedData.admin_email) {
            // Check in users table
            const { data: existingUser } = await (supabase as any)
                .from('users')
                .select('id, email')
                .ilike('email', validatedData.admin_email)
                .maybeSingle()

            if (existingUser) {
                return handleApiError(new ConflictError(EMAIL_ALREADY_EXISTS_ERROR))
            }

            // Check in clinics table (as contact email)
            const { data: existingClinicEmail } = await (supabase as any)
                .from('clinics')
                .select('id, name')
                .ilike('email', validatedData.admin_email)
                .eq('is_active', true)
                .maybeSingle()

            if (existingClinicEmail) {
                return handleApiError(new ConflictError(EMAIL_ALREADY_EXISTS_ERROR))
            }
        }

        // 1. Check for active clinic with same slug
        const { data: existingSlug } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('slug', validatedData.slug)
            .eq('is_active', true)
            .returns<{ id: string; name: string }[]>()
            .maybeSingle()

        if (existingSlug) {
            return handleApiError(new ConflictError(`O slug "${validatedData.slug}" já está em uso por uma clínica ativa: ${existingSlug.name}`))
        }

        // 2. Check for active clinic with same CNPJ (if provided)
        if (validatedData.cnpj) {
            const { data: existingCnpj } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('cnpj', validatedData.cnpj)
                .eq('is_active', true)
                .returns<{ id: string; name: string }[]>()
                .maybeSingle()

            if (existingCnpj) {
                return handleApiError(new ConflictError(`O CNPJ "${validatedData.cnpj}" já está em uso pela clínica: ${existingCnpj.name}`))
            }
        }


        // 3. Create clinic
        const { data: clinic, error: clinicError } = await (supabase
            .from('clinics')
            .insert({
                name: validatedData.name,
                slug: validatedData.slug,
                email: validatedData.email,
                cnpj: validatedData.cnpj,
                phone: validatedData.phone,
                address: validatedData.address || {},
                plan_type: validatedData.plan_type,
            } as any) as any)
            .select()
            .single()

        if (clinicError) {
            // If we still get a duplicate error (race condition or index violation)
            if (clinicError.code === '23505') {
                return handleApiError(new ConflictError('Já existe uma clínica ativa com este slug ou CNPJ.'))
            }
            throw clinicError
        }

        // If admin credentials provided, create admin user
        if (validatedData.admin_email && validatedData.admin_password && validatedData.admin_name) {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: validatedData.admin_email,
                password: validatedData.admin_password,
                email_confirm: true,
                user_metadata: {
                    full_name: validatedData.admin_name,
                    role: 'CLINIC_ADMIN',
                },
            })

            if (authError) {
                console.error('Failed to create admin user:', authError)
            } else {
                // Create user profile
                await (supabase.from('users').insert({
                    id: authData.user.id,
                    email: validatedData.admin_email,
                    full_name: validatedData.admin_name,
                    role: 'CLINIC_ADMIN',
                    clinic_id: (clinic as any).id,
                } as any) as any)

                // Send welcome email with credentials
                const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'}/login/clinica`
                try {
                    await sendMail({
                        to: validatedData.admin_email,
                        subject: `🏥 Bem-vindo ao CliniGo - ${validatedData.name}`,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #059669, #10b981); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                                    .header h1 { color: white; margin: 0; font-size: 28px; }
                                    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
                                    .credentials { background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0; }
                                    .credentials p { margin: 8px 0; }
                                    .credentials strong { color: #059669; }
                                    .button { display: inline-block; background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                                    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>🏥 Bem-vindo ao CliniGo!</h1>
                                    </div>
                                    <div class="content">
                                        <p>Olá, <strong>${validatedData.admin_name}</strong>!</p>
                                        <p>Sua clínica <strong>${validatedData.name}</strong> foi cadastrada com sucesso no CliniGo.</p>
                                        
                                        <div class="credentials">
                                            <h3>📧 Suas Credenciais de Acesso:</h3>
                                            <p><strong>Email:</strong> ${validatedData.admin_email}</p>
                                            <p><strong>Senha:</strong> ${validatedData.admin_password}</p>
                                        </div>
                                        
                                        <p>Use as credenciais acima para acessar o painel da sua clínica:</p>
                                        
                                        <center>
                                            <a href="${loginUrl}" class="button">Acessar Minha Clínica</a>
                                        </center>
                                        
                                        <p style="color: #ef4444; font-size: 14px;">
                                            ⚠️ <strong>Importante:</strong> Por segurança, recomendamos alterar sua senha após o primeiro acesso.
                                        </p>
                                    </div>
                                    <div class="footer">
                                        <p>Este é um email automático do CliniGo.</p>
                                        <p>Em caso de dúvidas, entre em contato conosco.</p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    })
                    console.log(`[POST /api/clinics] Welcome email sent to: ${validatedData.admin_email}`)
                } catch (emailError) {
                    console.error('[POST /api/clinics] Failed to send welcome email:', emailError)
                    // Don't fail the clinic creation if email fails
                }
            }
        }

        return successResponse(
            {
                clinic_id: (clinic as any).id,
                slug: (clinic as any).slug,
                message: 'Clínica criada com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

