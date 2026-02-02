/**
 * GET /api/clinics - List all clinics (SUPER_ADMIN only)
 * POST /api/clinics - Create new clinic (SUPER_ADMIN only)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, ConflictError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createClinicSchema, listClinicsQuerySchema } from '@/lib/validations/clinic'
// import { sendClinicWelcomeEmail } from '@/lib/services/email'

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

                // Send professional welcome email (uses stub if @react-email not installed)
                const loginUrl = 'https://clinigo.app/clinica'

                try {
                    const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                    const emailResult = await sendEmailMultiTenant({
                        clinicId: (clinic as any).id,
                        to: validatedData.admin_email,
                        subject: '🎉 Bem-vindo ao CliniGo! Sua clínica foi criada',
                        html: `
                            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
                                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Clínica Criada com Sucesso!</h1>
                                </div>
                                <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                    <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Olá, <strong>${validatedData.admin_name}</strong>!</p>
                                    <p style="color: #4b5563; line-height: 1.6;">A clínica <strong>${validatedData.name}</strong> foi cadastrada com sucesso no sistema CliniGo.</p>
                                    
                                    <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0;">
                                        <h3 style="color: #166534; margin: 0 0 15px 0;">🔐 Dados de Acesso:</h3>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Portal:</strong> ${loginUrl}</p>
                                        <p style="margin: 5px 0; color: #374151;"><strong>E-mail:</strong> ${validatedData.admin_email}</p>
                                        <p style="margin: 5px 0; color: #374151;"><strong>Senha:</strong> <em>A senha definida no cadastro</em></p>
                                    </div>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${loginUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            👉 ACESSAR SISTEMA
                                        </a>
                                    </div>
                                    
                                    <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-top: 25px;">
                                        <h4 style="color: #1e40af; margin: 0 0 10px 0;">🚀 Próximos Passos:</h4>
                                        <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                                            <li>Configure as agendas dos médicos</li>
                                            <li>Personalize o prontuário</li>
                                            <li>Cadastre os primeiros pacientes</li>
                                        </ul>
                                    </div>
                                    
                                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                                        Precisa de ajuda? Responda este e-mail ou fale conosco no WhatsApp.
                                    </p>
                                </div>
                            </div>
                        `
                    })

                    if (emailResult.success) {
                        console.log(`[POST /api/clinics] Welcome email sent successfully to: ${validatedData.admin_email}`)
                        // Log success in db
                        await (supabase as any)
                            .from('email_logs')
                            .insert({
                                recipient: validatedData.admin_email,
                                subject: 'Bem-vindo ao CliniGo',
                                template_used: 'CLINIC_WELCOME',
                                status: 'sent',
                                sent_at: new Date().toISOString(),
                                clinic_id: (clinic as any).id,
                                user_id: authData.user.id
                            })
                    } else {
                        console.error('[POST /api/clinics] Welcome email failed:', emailResult.error)
                        await (supabase as any)
                            .from('email_logs')
                            .insert({
                                recipient: validatedData.admin_email,
                                subject: 'Bem-vindo ao CliniGo',
                                template_used: 'CLINIC_WELCOME',
                                status: 'failed',
                                error_message: emailResult.error || 'Unknown error',
                                clinic_id: (clinic as any).id,
                                user_id: authData.user.id
                            })
                    }
                } catch (emailError) {
                    console.error('[POST /api/clinics] Failed to send welcome email:', emailError)
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

