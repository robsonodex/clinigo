/**
 * GET /api/doctors/detail?id=<doctorId>&action=<schedules|health-insurances|probe>
 * Fallback route when dynamic segments don't work
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateSchedulesSchema } from '@/lib/validations/doctor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('id')
        const action = searchParams.get('action') || 'profile'

        console.log('[DETAIL ROUTE] Request:', { doctorId, action })

        if (!doctorId) {
            return NextResponse.json({ error: 'Missing doctor ID' }, { status: 400 })
        }

        if (action === 'schedules') {
            return handleGetSchedules(doctorId)
        } else if (action === 'health-insurances') {
            return handleGetHealthInsurances(doctorId)
        } else if (action === 'probe') {
            return successResponse({
                status: 'ok',
                message: 'Detail probe working',
                doctorId,
                timestamp: new Date().toISOString()
            })
        } else if (action === 'profile') {
            return handleGetDoctor(request, doctorId)
        }

        return NextResponse.json({ error: 'Unknown action', action }, { status: 404 })
    } catch (error) {
        console.error('[DETAIL ROUTE] Error:', error)
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('id')
        const action = searchParams.get('action')

        if (!doctorId || !action) {
            return NextResponse.json({ error: 'Missing doctor ID or action' }, { status: 400 })
        }

        if (action === 'schedules') {
            return handlePostSchedules(request, doctorId)
        } else if (action === 'health-insurances') {
            return handlePostHealthInsurance(request, doctorId)
        }

        return NextResponse.json({ error: 'Unknown action', action }, { status: 404 })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('id')
        const action = searchParams.get('action')
        const insuranceId = searchParams.get('insuranceId')

        if (!doctorId) {
            return NextResponse.json({ error: 'Missing doctor ID' }, { status: 400 })
        }

        if (action === 'health-insurances' && insuranceId) {
            return handlePatchHealthInsurance(request, doctorId, insuranceId)
        }

        return handlePatchDoctor(request, doctorId)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('id')
        const action = searchParams.get('action')
        const insuranceId = searchParams.get('insuranceId')

        if (!doctorId) {
            return NextResponse.json({ error: 'Missing doctor ID' }, { status: 400 })
        }

        if (action === 'health-insurances' && insuranceId) {
            return handleDeleteHealthInsurance(doctorId, insuranceId)
        }

        // Default: delete/deactivate doctor
        return handleDeleteDoctor(doctorId)
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

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

    const { data: doctorData, error: fetchError } = await supabase
        .from('doctors')
        .select('user_id, clinic_id')
        .eq('id', doctorId)
        .single()

    const doctor = doctorData as any

    if (fetchError || !doctor) {
        throw new NotFoundError('Médico')
    }

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

    const { error: deleteError } = await supabase
        .from('schedules')
        .delete()
        .eq('doctor_id', doctorId)

    if (deleteError) throw deleteError

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

    const { data: doctor, error: fetchError } = await supabase
        .from('doctors')
        .select('user_id, clinic_id')
        .eq('id', doctorId)
        .single()

    if (fetchError || !doctor) {
        throw new NotFoundError('Médico')
    }

    const doctorData = doctor as any

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

    const doctorFields: Record<string, unknown> = {}
    const userFields: Record<string, unknown> = {}

    if (body.specialty !== undefined) doctorFields.specialty = body.specialty
    if (body.specialties_additional !== undefined) doctorFields.specialties_additional = body.specialties_additional
    if (body.consultation_price !== undefined) doctorFields.consultation_price = body.consultation_price
    if (body.consultation_duration !== undefined) doctorFields.consultation_duration = body.consultation_duration
    if (body.display_settings !== undefined) doctorFields.display_settings = body.display_settings
    if (body.bio !== undefined) doctorFields.bio = body.bio
    if (body.is_accepting_appointments !== undefined) doctorFields.is_accepting_appointments = body.is_accepting_appointments
    if (body.cnpj !== undefined) doctorFields.cnpj = body.cnpj

    if (body.full_name !== undefined) userFields.full_name = body.full_name
    if (body.avatar_url !== undefined) userFields.avatar_url = body.avatar_url
    if (body.phone !== undefined) userFields.phone = body.phone

    if (Object.keys(doctorFields).length > 0) {
        const { error } = await supabase
            .from('doctors')
            .update(doctorFields as any)
            .eq('id', doctorId)

        if (error) throw error
    }

    if (Object.keys(userFields).length > 0) {
        const { error } = await supabase
            .from('users')
            .update(userFields as any)
            .eq('id', doctorData.user_id)

        if (error) throw error
    }

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

async function handleGetHealthInsurances(doctorId: string) {
    const supabase = createServiceRoleClient()

    const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id, clinic_id, user_id')
        .eq('id', doctorId)
        .single()

    if (doctorError || !doctor) {
        throw new NotFoundError('Médico')
    }

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

async function handlePostHealthInsurance(request: NextRequest, doctorId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

    const body = await request.json()

    // Verify doctor exists
    const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id, clinic_id')
        .eq('id', doctorId)
        .single()

    if (doctorError || !doctor) {
        throw new NotFoundError('Médico')
    }

    // Insert the health insurance link
    const { data: newInsurance, error: insertError } = await supabase
        .from('doctor_health_insurances')
        .insert({
            doctor_id: doctorId,
            health_insurance_plan_id: body.health_insurance_plan_id,
            consultation_price: body.consultation_price,
            accepts_new_patients: body.accepts_new_patients ?? true,
            notes: body.notes || null,
            status: 'ACTIVE'
        } as any)
        .select()
        .single()

    if (insertError) throw insertError

    return successResponse(newInsurance)
}

async function handlePatchHealthInsurance(request: NextRequest, doctorId: string, insuranceId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

    const body = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.consultation_price !== undefined) updateData.consultation_price = body.consultation_price
    if (body.accepts_new_patients !== undefined) updateData.accepts_new_patients = body.accepts_new_patients
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status

    const { data: updated, error: updateError } = await supabase
        .from('doctor_health_insurances')
        .update(updateData as any)
        .eq('id', insuranceId)
        .eq('doctor_id', doctorId)
        .select()
        .single()

    if (updateError) throw updateError

    return successResponse(updated)
}

async function handleDeleteHealthInsurance(doctorId: string, insuranceId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

    // Soft delete by setting deleted_at
    const { error: deleteError } = await supabase
        .from('doctor_health_insurances')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', insuranceId)
        .eq('doctor_id', doctorId)

    if (deleteError) throw deleteError

    return successResponse({ message: 'Convênio removido com sucesso' })
}

async function handleDeleteDoctor(doctorId: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return handleApiError(new ForbiddenError('Não autorizado'))
    }

    // Get doctor user_id before deleting
    const { data: doctor } = await supabase
        .from('doctors')
        .select('user_id')
        .eq('id', doctorId)
        .single()
        
    if (!doctor) {
        throw new NotFoundError('Médico')
    }

    const doctorUserId = (doctor as any).user_id
    const adminClient = createServiceRoleClient() as any

    // 1. Clean up non-critical child tables
    try {
        await adminClient.from('doctor_schedules').delete().eq('doctor_id', doctorId)
        await adminClient.from('schedules').delete().eq('doctor_id', doctorId)
        await adminClient.from('doctor_health_insurances').delete().eq('doctor_id', doctorId)
        await adminClient.from('doctor_contracts').delete().eq('doctor_id', doctorId)
        await adminClient.from('therapist_agreements').delete().eq('therapist_id', doctorId)
        await adminClient.from('appointment_slot_locks').delete().eq('doctor_id', doctorId)
        await adminClient.from('appointment_queue').delete().eq('doctor_id', doctorId)
    } catch (e) {
        console.warn('[DELETE DOCTOR] Non-critical child cleanup warning:', e)
    }

    // 2. Try hard-delete on doctors table
    const { error: doctorDeleteError } = await adminClient
        .from('doctors')
        .delete()
        .eq('id', doctorId)

    if (doctorDeleteError) {
        console.log('[DELETE DOCTOR] Doctor has historical records, applying soft inactivation:', doctorDeleteError.message)

        // Perform safe inactivation (Soft Delete)
        await adminClient
            .from('doctors')
            .update({ is_accepting_appointments: false })
            .eq('id', doctorId)

        await adminClient
            .from('users')
            .update({ is_active: false })
            .eq('id', doctorUserId)

        // Delete Auth user to free email & license immediately
        try {
            await adminClient.auth.admin.deleteUser(doctorUserId)
        } catch (authErr) {
            console.error('[DELETE DOCTOR] Auth user deletion error:', authErr)
        }

        return successResponse({ message: 'Profissional inativado com sucesso (histórico de atendimentos preservado).' })
    }

    // 3. If doctor record was hard deleted, delete user profile and auth user
    await adminClient
        .from('users')
        .delete()
        .eq('id', doctorUserId)

    try {
        await adminClient.auth.admin.deleteUser(doctorUserId)
    } catch (authErr) {
        console.error('[DELETE DOCTOR] Auth user deletion error:', authErr)
    }

    return successResponse({ message: 'Profissional excluído com sucesso.' })
}
