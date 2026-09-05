/**
 * GET /api/doctors - List doctors
 * POST /api/doctors - Create new doctor
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createDoctorSchema, listDoctorsQuerySchema } from '@/lib/validations/doctor'
import { PLANS, type PlanType } from '@/lib/constants/plans'

// Force Node.js runtime for nodemailer support
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
    try {
        console.log('GET /api/doctors started');
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const { searchParams } = new URL(request.url)
        const query = listDoctorsQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const isPublicClinicRequest = !userRole && (!!query.clinic_slug || !!query.clinic_id)

        // Use Service Role for CLINIC_ADMIN and RECEPTIONIST, or public requests to bypass RLS issues (Trust inputs & filtering)
        const supabase = (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN' || userRole === 'RECEPTIONIST' || isPublicClinicRequest)
            ? createServiceRoleClient() as any
            : await createClient()

        console.log('[GET /api/doctors] Debug:', {
            userRole,
            isServiceRole: (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN' || userRole === 'RECEPTIONIST' || isPublicClinicRequest),
            query: Object.fromEntries(searchParams)
        })

        console.log('[GET /api/doctors] Using client:', (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN' || userRole === 'RECEPTIONIST' || isPublicClinicRequest) ? 'SERVICE_ROLE' : 'AUTHENTICATED')

        let clinicId: string | null = null

        // Priority 1: Direct clinic_id from query
        if (query.clinic_id) {
            clinicId = query.clinic_id
            console.log('[GET /api/doctors] Resolved clinicId via Priority 1 (query.clinic_id):', clinicId)
        }
        // Priority 2: Public access via clinic_slug (explicit query parameter takes precedence over session headers)
        else if (query.clinic_slug) {
            console.log('[GET /api/doctors] Resolving clinicId via Priority 2 (query.clinic_slug):', query.clinic_slug)
            const { data: clinic, error: clinicError } = await supabase
                .from('clinics')
                .select('id')
                .eq('slug', query.clinic_slug)
                .single()

            if (clinicError) {
                console.error('[GET /api/doctors] Error resolving clinic_slug:', clinicError)
            }

            if (clinic) {
                clinicId = (clinic as any).id
                console.log('[GET /api/doctors] Successfully resolved clinic_slug to clinicId:', clinicId)
            } else {
                console.log('[GET /api/doctors] No clinic found with slug:', query.clinic_slug)
            }
        }
        // Priority 3: Clinic ID from verified Middleware Header (Session fallback for dashboard requests)
        else if (request.headers.get('x-clinic-id')) {
            clinicId = request.headers.get('x-clinic-id')
            console.log('[GET /api/doctors] Resolved clinicId via Priority 3 (x-clinic-id header):', clinicId)
        }
        // Priority 4: Private access via authenticated user
        // ⚠️ FIX: Use Service Role to bypass RLS when fetching user's clinic_id
        else if (userRole !== 'SUPER_ADMIN' && userId) {
            const adminClient = createServiceRoleClient() as any
            const { data: user, error: userError } = await adminClient
                .from('users')
                .select('clinic_id')
                .eq('id', userId as any)
                .single()
            if (userError) {
                console.error('[GET /api/doctors] Error fetching user clinic_id:', userError)
            }
            clinicId = (user as any)?.clinic_id || null
            console.log('[GET /api/doctors] Resolved clinicId via Priority 4 (auth user profile):', clinicId)
        }

        // If no clinic identified and not super admin, return empty or forbidden
        // But for public API if they just hit /api/doctors without slug, maybe we should block?
        // Let's rely on the query builder logic.

        let queryBuilder = supabase
            .from('doctors')
            .select(`
        *,
        user:users(email, full_name, avatar_url, phone, is_active),
        clinic:clinics!doctors_clinic_id_fkey(name, slug)
      `, { count: 'exact' })

        // Apply filters
        if (clinicId) {
            queryBuilder = queryBuilder.eq('clinic_id', clinicId)
        } else if (userRole !== 'SUPER_ADMIN') {
            // Unauthenticated and no slug provided -> Forbidden or empty
            // To be safe, if we didn't find a clinic and not super admin, don't show anything
            return paginatedResponse(buildPaginatedData([], 0, page, pageSize))
        }

        if (query.specialty) {
            queryBuilder = queryBuilder.eq('specialty', query.specialty)
        }

        if (query.is_accepting !== undefined) {
            queryBuilder = queryBuilder.eq('is_accepting_appointments', query.is_accepting)
        } else if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN' && userRole !== 'RECEPTIONIST') {
            // Default to active only for public/patients
            // Admins and receptionists see ALL by default
            queryBuilder = queryBuilder.eq('is_accepting_appointments', true)
        }

        // Apply pagination
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        console.log('[GET /api/doctors] FINAL DEBUG:', {
            clinicId,
            userRole,
            xClinicIdHeader: request.headers.get('x-clinic-id'),
            is_accepting_filter: query.is_accepting,
        })

        const { data: doctors, count, error } = await queryBuilder

        console.log('[GET /api/doctors] RESULT:', {
            doctorCount: doctors?.length || 0,
            totalCount: count,
            error: error?.message || null,
            firstDoctor: doctors?.[0] ? { id: (doctors[0] as any).id, name: (doctors[0] as any).user?.full_name } : null
        })

        if (error) throw error

        // Map online status
        let doctorsWithOnlineStatus = doctors || []
        if (doctors && doctors.length > 0) {
            const userIds = doctors.map((d: any) => d.user_id).filter(Boolean)
            const { data: activeSessions } = await supabase
                .from('active_sessions')
                .select('user_id')
                .eq('is_active', true)
                .in('user_id', userIds)

            const activeUserIds = new Set(activeSessions?.map((s: any) => s.user_id) || [])
            doctorsWithOnlineStatus = doctors.map((d: any) => ({
                ...d,
                is_online: activeUserIds.has(d.user_id)
            }))
        }

        return paginatedResponse(
            buildPaginatedData(doctorsWithOnlineStatus, count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        console.log('[POST /api/doctors] Auth Debug:', {
            userId,
            userRole,
            headers: Object.fromEntries(request.headers.entries())
        })

        // Only CLINIC_ADMIN, SUPER_ADMIN or DOCTOR can create doctors
        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR']
        if (!userRole || !allowedRoles.includes(userRole)) {
            throw new ForbiddenError('Apenas administradores e médicos podem cadastrar médicos')
        }

        const body = await request.json()
        console.log('[POST /api/doctors] Body:', body)

        const validatedData = createDoctorSchema.parse(body)

        const supabase = await createClient()
        const adminClient = createServiceRoleClient() as any

        // Get clinic_id
        let clinicId: string | null = null

        // Priority 1: Super Admin overrides clinic
        if (userRole === 'SUPER_ADMIN' && body.clinic_id) {
            clinicId = body.clinic_id
        }
        // Priority 2: Use verified header from middleware (Fastest & Safest)
        else if (request.headers.get('x-clinic-id')) {
            clinicId = request.headers.get('x-clinic-id')
        }
        // Priority 3: Fallback to DB (should rarely be reached)
        else {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId as any)
                .single()

            if (!(user as any)?.clinic_id) {
                throw new BadRequestError('Clínica não encontrada')
            }
            clinicId = (user as any).clinic_id
        }

        if (!clinicId) {
            throw new BadRequestError('Clínica não encontrada (ID inválido)')
        }

        // 🔥 COST PROTECTION: Check plan limits with plan_type validation
        // Use adminClient to ensure we can read the clinic details regardless of RLS

        console.log('[POST /api/doctors] Lookup Clinic ID:', JSON.stringify(clinicId))

        const { data: clinic, error: clinicError } = await adminClient
            .from('clinics')
            .select('name, plan_type, plan_limits, addons')
            .eq('id', clinicId as any)
            .single()

        if (clinicError) {
            console.error('[POST /api/doctors] FAILIURE TO FIND CLINIC:', {
                clinicId,
                error: clinicError,
                details: clinicError.details,
                hint: clinicError.hint,
                code: clinicError.code
            })
            // Throw detailed error for debugging (remove in prod later if sensitive, but safe for now)
            throw new BadRequestError(`Erro ao buscar clínica: ${clinicError.message} (${clinicError.code})`)
        }

        if (!clinic) {
            console.error('[POST /api/doctors] Clinic not found (no error, but null data)')
            throw new BadRequestError('Clínica não encontrada (Dados nulos)')
        }

        const { count: doctorCount } = await (supabase as any)
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId as any)

        // Usar limites do banco, ou fallback para configuração do plans.ts
        const planType = (clinic as any).plan_type as PlanType
        const planConfig = PLANS[planType] || PLANS.BASICO
        const dbMaxDoctors = ((clinic as any)?.plan_limits as { max_doctors?: number })?.max_doctors

        // Garante que o limite base seja no mínimo o limite concedido pelo plano ativo
        let baseMaxDoctors = planConfig.limits.max_doctors
        if (baseMaxDoctors !== -1) {
            if (dbMaxDoctors === -1) {
                baseMaxDoctors = -1
            } else if (dbMaxDoctors !== undefined && dbMaxDoctors !== null) {
                baseMaxDoctors = Math.max(dbMaxDoctors, planConfig.limits.max_doctors)
            }
        }

        const extraDoctors = ((clinic as any)?.addons as { extra_doctors?: number })?.extra_doctors || 0
        const totalMaxDoctors = baseMaxDoctors === -1 ? -1 : baseMaxDoctors + extraDoctors

        // -1 significa ilimitado, não verificar limite
        if (totalMaxDoctors !== -1 && (doctorCount || 0) >= totalMaxDoctors) {
            const planName = planConfig.name
            throw new BadRequestError(
                `Limite de médicos atingido (${totalMaxDoctors === -1 ? 'ilimitado' : totalMaxDoctors} médicos no plano ${planName}). Faça upgrade ou adicione médicos extras.`
            )
        }

        // Check if email already exists (tabela users)
        const { data: existingUser } = await (adminClient as any)
            .from('users')
            .select('id')
            .eq('email', validatedData.email)
            .maybeSingle()

        if (existingUser) {
            throw new BadRequestError('Este e-mail já está cadastrado no sistema. Utilize um e-mail diferente.')
        }

        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email: validatedData.email,
            password: validatedData.password,
            email_confirm: true,
            user_metadata: {
                full_name: validatedData.full_name,
                role: 'DOCTOR',
            },
        })

        if (authError) {
            // Intercepta TODAS as variações de erro de e-mail duplicado do Supabase Auth
            const msg = authError.message.toLowerCase()
            const isEmailDuplicate =
                msg.includes('already been registered') ||
                msg.includes('already registered') ||
                msg.includes('already exists') ||
                msg.includes('database error checking email')
            if (isEmailDuplicate) {
                throw new BadRequestError('Este e-mail já está cadastrado. Utilize um e-mail diferente.')
            }
            throw new BadRequestError(`Erro ao criar usuário: ${authError.message}`)
        }

        // Create users profile
        const { error: userError } = await (adminClient as any)
            .from('users')
            .insert({
                id: authData.user.id,
                email: validatedData.email,
                full_name: validatedData.full_name,
                role: 'DOCTOR',
                clinic_id: clinicId,
            })

        if (userError) {
            // Rollback auth user
            await adminClient.auth.admin.deleteUser(authData.user.id)
            throw new BadRequestError(userError.message)
        }

        // Create doctor profile
        const { data: doctor, error: doctorError } = await (adminClient as any)
            .from('doctors')
            .insert({
                user_id: authData.user.id,
                clinic_id: clinicId,
                crm: validatedData.crm,
                crm_state: validatedData.crm_state,
                council_name: (validatedData as any).council_name || null,
                specialty: validatedData.specialty,
                specialties_additional: (validatedData as any).specialties_additional || [],
                consultation_price: validatedData.consultation_price,
                consultation_duration: validatedData.consultation_duration,
                display_settings: validatedData.display_settings,
                bio: validatedData.bio,
            })
            .select()
            .single()

        if (doctorError) {
            // Rollback
            await (adminClient as any).from('users').delete().eq('id', authData.user.id)
            await adminClient.auth.admin.deleteUser(authData.user.id)
            throw new BadRequestError(doctorError.message)
        }

        // Send welcome email to the new doctor
        try {
            const { sendMail } = await import('@/lib/services/mail-service')
            const clinicName = (clinic as any)?.name || 'CliniGo'
            const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app'}/login`

            await sendMail({
                to: validatedData.email,
                subject: `Bem-vindo ao ${clinicName} - Suas credenciais de acesso`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #1a1a1a;">Olá, Dr(a). ${validatedData.full_name}!</h2>
                        <p>Sua conta na clínica <strong>${clinicName}</strong> foi criada com sucesso.</p>
                        <p>Suas credenciais de acesso são:</p>
                        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                            <p style="margin: 4px 0;"><strong>Email:</strong> ${validatedData.email}</p>
                            <p style="margin: 4px 0;"><strong>Senha:</strong> ${validatedData.password}</p>
                        </div>
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="${loginUrl}" style="background: #000; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Acessar Painel</a>
                        </div>
                        <p style="color: #666; font-size: 14px;">Se tiver alguma dúvida, entre em contato com a administração da clínica.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                        <p style="color: #999; font-size: 12px;">Este email foi enviado automaticamente pelo sistema ${clinicName}.</p>
                    </div>
                `,
            })
            console.log('[POST /api/doctors] Welcome email sent to:', validatedData.email)
        } catch (emailError) {
            console.error('[POST /api/doctors] Failed to send welcome email:', emailError)
            // Don't fail the doctor creation if email fails
        }

        return successResponse(
            {
                doctor_id: (doctor as any)?.id,
                user_id: authData.user.id,
                message: 'Médico cadastrado com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

