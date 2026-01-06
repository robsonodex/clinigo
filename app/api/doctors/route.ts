/**
 * GET /api/doctors - List doctors
 * POST /api/doctors - Create new doctor
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createDoctorSchema, listDoctorsQuerySchema } from '@/lib/validations/doctor'
import { sendWelcomeEmail, isEmailConfigured } from '@/lib/services/email'

// Force Node.js runtime for nodemailer support
export const runtime = 'nodejs'


export async function GET(request: NextRequest) {
    try {
        console.log('GET /api/doctors started');
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const { searchParams } = new URL(request.url)
        const query = listDoctorsQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = userRole === 'SUPER_ADMIN'
            ? createServiceRoleClient()
            : await createClient()

        console.log('[GET /api/doctors] Using client:', userRole === 'SUPER_ADMIN' ? 'SERVICE_ROLE' : 'AUTHENTICATED')

        let clinicId: string | null = null

        // Priority 1: Direct clinic_id from query
        if (query.clinic_id) {
            clinicId = query.clinic_id
        }
        // Priority 2: Public access via clinic_slug
        else if (query.clinic_slug) {
            const { data: clinic } = await supabase
                .from('clinics')
                .select('id')
                .eq('slug', query.clinic_slug)
                .single()

            if (clinic) {
                clinicId = (clinic as any).id
            }
        }
        // Priority 3: Private access via authenticated user
        else if (userRole !== 'SUPER_ADMIN' && userId) {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId as any)
                .single()
            clinicId = (user as any)?.clinic_id || null
        }

        // If no clinic identified and not super admin, return empty or forbidden
        // But for public API if they just hit /api/doctors without slug, maybe we should block?
        // Let's rely on the query builder logic.

        let queryBuilder = supabase
            .from('doctors')
            .select(`
        *,
        user:users(email, full_name, avatar_url, phone, is_active),
        clinic:clinics(name, slug)
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
        } else {
            // Default to active only
            queryBuilder = queryBuilder.eq('is_accepting_appointments', true)
        }

        // Apply pagination
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: doctors, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(doctors || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        // Only CLINIC_ADMIN or SUPER_ADMIN can create doctors
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem cadastrar médicos')
        }

        const body = await request.json()
        console.log('[POST /api/doctors] Body:', body)

        const validatedData = createDoctorSchema.parse(body)

        const supabase = await createClient()
        const adminClient = createServiceRoleClient()

        // Get clinic_id
        let clinicId: string
        if (userRole === 'SUPER_ADMIN' && body.clinic_id) {
            clinicId = body.clinic_id
        } else {
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

        // Check plan limits
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name, plan_limits, addons')
            .eq('id', clinicId as any)
            .single()

        const { count: doctorCount } = await (supabase as any)
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId as any)

        const baseMaxDoctors = ((clinic as any)?.plan_limits as { max_doctors?: number })?.max_doctors || 1
        const extraDoctors = ((clinic as any)?.addons as { extra_doctors?: number })?.extra_doctors || 0
        const totalMaxDoctors = baseMaxDoctors + extraDoctors

        if ((doctorCount || 0) >= totalMaxDoctors) {
            throw new BadRequestError(
                `Limite de médicos atingido (Base: ${baseMaxDoctors} + Extras: ${extraDoctors} = ${totalMaxDoctors}). Faça upgrade do plano ou adicione médicos extras.`
            )
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
            throw new BadRequestError(authError.message)
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
                specialty: validatedData.specialty,
                consultation_price: validatedData.consultation_price,
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

        // Send welcome email
        if (isEmailConfigured()) {
            try {
                await sendWelcomeEmail({
                    doctor_email: validatedData.email,
                    doctor_name: validatedData.full_name,
                    clinic_name: (clinic as any)?.name || 'CliniGo',
                })
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError)
            }
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
