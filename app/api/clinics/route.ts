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
                const logoUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'}/images/logo-clinigo.png`
                try {
                    await sendMail({
                        to: validatedData.admin_email,
                        subject: `Bem-vindo à CliniGo - ${validatedData.name}`,
                        html: `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo à CliniGo</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9f9f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <div style="padding: 40px 20px; text-align: center;">
            <img src="${logoUrl}" alt="CliniGo" width="150" style="display: block; margin: 0 auto;">
        </div>

        <div style="padding: 0 40px 40px 40px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #1a1a1a; margin-bottom: 10px;">Bem-vindo à CliniGo</h1>
            <p style="font-size: 16px; color: #666666; margin-bottom: 30px;">O próximo passo da sua gestão começou.</p>

            <p>Olá, <strong>${validatedData.admin_name}</strong>,</p>
            <p>Sua clínica <strong>${validatedData.name}</strong> está pronta. Use as credenciais abaixo para configurar seu painel administrativo:</p>

            <div style="background-color: #ffffff; border: 1px solid #eeeeee; border-radius: 12px; padding: 25px; margin-bottom: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.03);">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999999; margin-bottom: 5px;">E-mail de Acesso</div>
                <div style="font-size: 16px; font-weight: 600; color: #2d3436; margin-bottom: 15px;">${validatedData.admin_email}</div>
                
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #999999; margin-bottom: 5px;">Senha Temporária</div>
                <div style="font-size: 16px; font-weight: 600; color: #2d3436; margin-bottom: 15px;">${validatedData.admin_password}</div>

                <a href="${loginUrl}" style="display: inline-block; background-color: #007664; color: #ffffff !important; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; box-shadow: 0 4px 12px rgba(0, 118, 100, 0.2);">ACESSAR MEU PAINEL</a>
            </div>

            <p style="font-size: 13px; color: #999999; font-style: italic;">
                * Por segurança, você deverá alterar sua senha no primeiro acesso.
            </p>

            <div style="border-top: 1px solid #eeeeee; padding-top: 30px; margin-top: 30px;">
                <h3 style="font-size: 16px; margin-bottom: 20px;">Próximos passos recomendados:</h3>
                
                <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                    <div style="background-color: #e6f2f0; color: #007664; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-right: 15px; flex-shrink: 0;">1</div>
                    <div>
                        <b style="color: #1a1a1a; display: block; margin-bottom: 4px;">Perfil da Clínica</b>
                        <p style="margin: 0; font-size: 14px; color: #777777; line-height: 1.5;">Adicione seu logotipo e horários de funcionamento.</p>
                    </div>
                </div>

                <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                    <div style="background-color: #e6f2f0; color: #007664; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-right: 15px; flex-shrink: 0;">2</div>
                    <div>
                        <b style="color: #1a1a1a; display: block; margin-bottom: 4px;">Equipe Médica</b>
                        <p style="margin: 0; font-size: 14px; color: #777777; line-height: 1.5;">Cadastre os profissionais e configure as agendas.</p>
                    </div>
                </div>

                <div style="margin-bottom: 20px; display: flex; align-items: flex-start;">
                    <div style="background-color: #e6f2f0; color: #007664; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-weight: bold; font-size: 14px; margin-right: 15px; flex-shrink: 0;">3</div>
                    <div>
                        <b style="color: #1a1a1a; display: block; margin-bottom: 4px;">Agendamento Online</b>
                        <p style="margin: 0; font-size: 14px; color: #777777; line-height: 1.5;">Ative sua página exclusiva para marcação de consultas.</p>
                    </div>
                </div>
            </div>
        </div>

        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
            <p style="margin: 0 0 10px 0;">&copy; 2026 CliniGo - Gestão Inteligente para Clínicas</p>
            <p style="margin: 0;"><a href="https://clinigo.app/suporte" style="color: #999999;">Suporte Técnico</a> | <a href="https://clinigo.app/privacidade" style="color: #999999;">Política de Privacidade</a></p>
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

