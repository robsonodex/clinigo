/**
 * Catch-all route handler for doctor-specific endpoints
 * This handles: /api/doctors/[doctorId]/[action]
 * Actions: schedules, health-insurances, probe
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateSchedulesSchema } from '@/lib/validations/doctor'

export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const runtime = 'nodejs'

interface RouteParams {
    params: Promise<{ slug: string[] }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const slugParts = resolvedParams.slug

        console.log('[CATCH-ALL] Doctor route accessed:', { slugParts })

        if (!slugParts || slugParts.length === 0) {
            return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
        }

        const doctorId = slugParts[0]
        const action = slugParts[1] || 'profile'

        console.log('[CATCH-ALL] Parsed:', { doctorId, action })

        // Handle different actions
        if (action === 'schedules') {
            return handleGetSchedules(doctorId)
        } else if (action === 'health-insurances') {
            return handleGetHealthInsurances(request, doctorId)
        } else if (action === 'probe') {
            return successResponse({
                status: 'ok',
                message: 'Dynamic probe working via catch-all',
                doctorId,
                timestamp: new Date().toISOString()
            })
        } else if (!slugParts[1]) {
            // GET /api/doctors/[doctorId] - get doctor profile
            return handleGetDoctor(request, doctorId)
        }

        return NextResponse.json({ error: 'Unknown action', action }, { status: 404 })
    } catch (error) {
        console.error('[CATCH-ALL] Error:', error)
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const slugParts = resolvedParams.slug

        if (!slugParts || slugParts.length < 2) {
            return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
        }

        const doctorId = slugParts[0]
        const action = slugParts[1]

        if (action === 'schedules') {
            return handlePostSchedules(request, doctorId)
        }

        return NextResponse.json({ error: 'Unknown action', action }, { status: 404 })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const resolvedParams = await params
        const slugParts = resolvedParams.slug

        if (!slugParts || slugParts.length === 0) {
            return NextResponse.json({ error: 'Invalid route' }, { status: 400 })
        }

        const doctorId = slugParts[0]
        const action = slugParts[1]

        if (!action) {
            // PATCH /api/doctors/[doctorId] - update doctor profile
            return handlePatchDoctor(request, doctorId)
        }

        return NextResponse.json({ error: 'Unknown action', action }, { status: 404 })
    } catch (error) {
        return handleApiError(error)
    }
}

// ================================================
// HANDLER FUNCTIONS
// ================================================

async function handleGetSchedules(doctorId: string) {
    const supabase = await createClient()

    const { data: schedules, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time')

    if (error) throw error

    return successResponse(schedules)
}

async function handlePostSchedules(request: NextRequest, doctorId: string) {
    const supabase = await createClient()

    // Get current user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

    // Get user profile
    const { data: userProfileData } = await supabase
        .from('users')
        .select('id, role, clinic_id')
        .eq('id', user.id)
        .single()

    const userProfile = userProfileData as any

    if (!userProfile) {
        return handleApiError(new ForbiddenError('Perfil não encontrado'))
    }

    const userId = userProfile.id
    const userRole = userProfile.role

    const body = await request.json()
    const validatedData = updateSchedulesSchema.parse(body)

    // Get doctor to check authorization
    const { data: doctorData, error: fetchError } = await supabase
        .from('doctors')
        .select('user_id, clinic_id')
        .eq('id', doctorId)
        .single()

    const doctor = doctorData as any

    if (fetchError || !doctor) {
        throw new NotFoundError('Médico')
    }

    // Check authorization
    if (userRole === 'DOCTOR') {
        if (doctor.user_id !== userId) {
            throw new ForbiddenError('Você só pode editar sua própria agenda')
        }
    } else if (userRole === 'CLINIC_ADMIN') {
        if (userProfile.clinic_id !== doctor.clinic_id) {
            throw new ForbiddenError('Acesso negado')
        }
    } else if (userRole !== 'SUPER_ADMIN') {
        throw new ForbiddenError('Acesso negado')
    }

    // Delete existing schedules (replace strategy)
    const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('doctor_id', doctorId)

    if (deleteError) throw deleteError

    // Insert new schedules
    if (validatedData.schedules.length > 0) {
        const schedulesToInsert = validatedData.schedules.map((schedule) => ({
            doctor_id: doctorId,
            clinic_id: doctor.clinic_id,
            day_of_week: schedule.day_of_week,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            slot_duration_minutes: schedule.slot_duration_minutes,
            is_active: true,
        }))

        const { error: insertError } = await supabase
            .from('schedules')
            .insert(schedulesToInsert as any)

        if (insertError) throw insertError
    }

    // Return updated schedules
    const { data: schedules } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time')

    return successResponse({
        schedules,
        message: 'Horários atualizados com sucesso',
    })
}

async function handleGetDoctor(request: NextRequest, doctorId: string) {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    // Use service role for public access (no auth headers) to bypass RLS
    const supabase = userId ? await createClient() : createServiceRoleClient()

    const { data: doctor, error } = await supabase
        .from('doctors')
        .select(`
            *,
            user:users(email, full_name, avatar_url, phone, is_active),
            clinic:clinics!doctors_clinic_id_fkey(id, name, slug),
            schedules(*)
        `)
        .eq('id', doctorId)
        .single()

    if (error || !doctor) {
        throw new NotFoundError('Médico')
    }

    const doctorData = doctor as any

    // Check authorization
    if (userId) {
        if (userRole !== 'SUPER_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if ((currentUser as any)?.clinic_id !== doctorData.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        }
    } else {
        // Public access: Only show if accepting appointments
        if (!doctorData.is_accepting_appointments) {
            throw new NotFoundError('Médico não encontrado ou indisponível')
        }
    }

    return successResponse(doctor)
}

async function handlePatchDoctor(request: NextRequest, doctorId: string) {
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')

    const body = await request.json()

    const supabase = await createClient()

    // Get doctor to check authorization
    const { data: doctor, error: fetchError } = await supabase
        .from('doctors')
        .select('user_id, clinic_id')
        .eq('id', doctorId)
        .single()

    if (fetchError || !doctor) {
        throw new NotFoundError('Médico')
    }

    const doctorData = doctor as any

    // Check authorization
    if (userRole === 'DOCTOR') {
        if (doctorData.user_id !== userId) {
            throw new ForbiddenError('Você só pode editar seu próprio perfil')
        }
    } else if (userRole === 'CLINIC_ADMIN') {
        const { data: currentUser } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if ((currentUser as any)?.clinic_id !== doctorData.clinic_id) {
            throw new ForbiddenError('Acesso negado')
        }
    }

    // Separate doctor fields from user fields
    const doctorFields: Record<string, unknown> = {}
    const userFields: Record<string, unknown> = {}

    if (body.specialty !== undefined) doctorFields.specialty = body.specialty
    if (body.consultation_price !== undefined) doctorFields.consultation_price = body.consultation_price
    if (body.consultation_duration !== undefined) doctorFields.consultation_duration = body.consultation_duration
    if (body.display_settings !== undefined) doctorFields.display_settings = body.display_settings
    if (body.bio !== undefined) doctorFields.bio = body.bio
    if (body.is_accepting_appointments !== undefined) doctorFields.is_accepting_appointments = body.is_accepting_appointments

    if (body.full_name !== undefined) userFields.full_name = body.full_name
    if (body.avatar_url !== undefined) userFields.avatar_url = body.avatar_url
    if (body.phone !== undefined) userFields.phone = body.phone

    // Update doctor
    if (Object.keys(doctorFields).length > 0) {
        const { error } = await supabase
            .from('doctors')
            .update(doctorFields as any)
            .eq('id', doctorId)

        if (error) throw error
    }

    // Update user profile
    if (Object.keys(userFields).length > 0) {
        const { error } = await supabase
            .from('users')
            .update(userFields as any)
            .eq('id', doctorData.user_id)

        if (error) throw error
    }

    // Fetch updated doctor
    const { data: updatedDoctor } = await supabase
        .from('doctors')
        .select(`
            *,
            user:users(email, full_name, avatar_url, phone, is_active)
        `)
        .eq('id', doctorId)
        .single()

    return successResponse(updatedDoctor)
}

async function handleGetHealthInsurances(request: NextRequest, doctorId: string) {
    const supabase = createServiceRoleClient()

    // Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id, clinic_id, user_id')
        .eq('id', doctorId)
        .single()

    if (doctorError || !doctor) {
        throw new NotFoundError('Médico')
    }

    // Get doctor's health insurances with full details
    const { data, error } = await supabase
        .from('doctor_health_insurances')
        .select(`
            id,
            doctor_id,
            health_insurance_plan_id,
            consultation_price,
            accepts_new_patients,
            notes,
            status,
            created_at,
            updated_at,
            plan:health_insurance_plans(
                id,
                name,
                code,
                type,
                coverage_type,
                health_insurance:health_insurances(
                    id,
                    name,
                    code
                )
            )
        `)
        .eq('doctor_id', doctorId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) throw error

    // Transform data to flatten structure
    const flattenedData = (data || []).map((item: any) => ({
        ...item,
        plan_name: item.plan?.name,
        plan_code: item.plan?.code,
        plan_type: item.plan?.type,
        coverage_type: item.plan?.coverage_type,
        insurance_id: item.plan?.health_insurance?.id,
        insurance_name: item.plan?.health_insurance?.name,
        insurance_code: item.plan?.health_insurance?.code,
    }))

    return successResponse(flattenedData)
}
