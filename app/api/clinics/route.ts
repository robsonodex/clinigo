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
<body style="margin: 0; padding: 0; background-color: #2d3436; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #2d3436; padding: 40px 0;">
        <tr>
            <td align="center">
                <!-- CELULAR CONTAINER -->
                <table cellpadding="0" cellspacing="0" border="0" style="width: 320px;">
                    <tr>
                        <td>
                            <!-- Moldura do Celular -->
                            <div style="background: linear-gradient(145deg, #1a1a1a, #3d3d3d); border-radius: 40px; padding: 12px; box-shadow: 0 25px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);">
                                <!-- Notch do celular -->
                                <div style="background-color: #1a1a1a; width: 120px; height: 25px; border-radius: 15px; margin: 0 auto 8px auto;"></div>
                                
                                <!-- Tela do Celular -->
                                <div style="background-color: #ffffff; border-radius: 28px; overflow: hidden; min-height: 550px;">
                                    <!-- Header com Logo -->
                                    <div style="padding: 25px 20px 15px 20px; text-align: center; border-bottom: 1px solid #f0f0f0;">
                                        <img src="${logoUrl}" alt="CliniGo" width="100" style="display: block; margin: 0 auto;">
                                    </div>
                                    
                                    <!-- Conteúdo -->
                                    <div style="padding: 20px;">
                                        <h1 style="font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 0 0 5px 0; text-align: center;">Bem-vindo à CliniGo</h1>
                                        <p style="font-size: 12px; color: #888888; margin: 0 0 20px 0; text-align: center;">O próximo passo da sua gestão começou</p>
                                        
                                        <p style="font-size: 13px; color: #555555; margin: 0 0 5px 0;">Olá, <strong>${validatedData.admin_name}</strong>,</p>
                                        <p style="font-size: 12px; color: #777777; margin: 0 0 15px 0; line-height: 1.4;">Sua clínica está pronta para uso.</p>
                                        
                                        <!-- Card de Credenciais -->
                                        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 15px; margin-bottom: 15px;">
                                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #007664; font-weight: bold; margin-bottom: 10px; text-align: center;">Credenciais de Acesso</div>
                                            
                                            <div style="font-size: 10px; text-transform: uppercase; color: #aaaaaa; margin-bottom: 3px;">E-mail</div>
                                            <div style="font-size: 13px; font-weight: 600; color: #2d3436; margin-bottom: 10px; word-break: break-all;">${validatedData.admin_email}</div>
                                            
                                            <div style="font-size: 10px; text-transform: uppercase; color: #aaaaaa; margin-bottom: 3px;">Senha Temporária</div>
                                            <div style="font-size: 13px; font-weight: 600; color: #2d3436; margin-bottom: 12px;">${validatedData.admin_password}</div>
                                            
                                            <a href="${loginUrl}" style="display: block; background-color: #007664; color: #ffffff !important; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-align: center;">ACESSAR MEU PAINEL</a>
                                        </div>
                                        
                                        <p style="font-size: 10px; color: #999999; font-style: italic; text-align: center; margin: 0 0 15px 0;">
                                            * Altere sua senha no primeiro acesso
                                        </p>
                                        
                                        <!-- Passos -->
                                        <div style="border-top: 1px solid #eeeeee; padding-top: 12px;">
                                            <div style="font-size: 12px; font-weight: bold; color: #333; margin-bottom: 10px;">Próximos passos:</div>
                                            
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
                                                <tr>
                                                    <td width="24" valign="top"><div style="background-color: #e6f2f0; color: #007664; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-weight: bold; font-size: 11px;">1</div></td>
                                                    <td style="padding-left: 8px;"><span style="font-size: 12px; color: #555;">Configure o perfil da clínica</span></td>
                                                </tr>
                                            </table>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 8px;">
                                                <tr>
                                                    <td width="24" valign="top"><div style="background-color: #e6f2f0; color: #007664; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-weight: bold; font-size: 11px;">2</div></td>
                                                    <td style="padding-left: 8px;"><span style="font-size: 12px; color: #555;">Cadastre sua equipe médica</span></td>
                                                </tr>
                                            </table>
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                <tr>
                                                    <td width="24" valign="top"><div style="background-color: #e6f2f0; color: #007664; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-weight: bold; font-size: 11px;">3</div></td>
                                                    <td style="padding-left: 8px;"><span style="font-size: 12px; color: #555;">Ative o agendamento online</span></td>
                                                </tr>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <!-- Footer -->
                                    <div style="background-color: #f8f9fa; padding: 12px; text-align: center; border-top: 1px solid #eeeeee;">
                                        <p style="margin: 0; font-size: 10px; color: #999999;">Equipe CliniGo</p>
                                    </div>
                                </div>
                                
                                <!-- Botão Home do celular -->
                                <div style="width: 100px; height: 4px; background-color: #555; border-radius: 2px; margin: 10px auto 0 auto;"></div>
                            </div>
                        </td>
                    </tr>
                </table>
                
                <!-- Footer externo -->
                <table cellpadding="0" cellspacing="0" border="0" style="margin-top: 30px;">
                    <tr>
                        <td align="center">
                            <p style="margin: 0 0 5px 0; font-size: 12px; color: #888888;">&copy; 2026 CliniGo - Gestão Inteligente para Clínicas</p>
                            <p style="margin: 0; font-size: 11px;"><a href="https://clinigo.app/suporte" style="color: #888888;">Suporte</a> &nbsp;|&nbsp; <a href="https://clinigo.app/privacidade" style="color: #888888;">Privacidade</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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

