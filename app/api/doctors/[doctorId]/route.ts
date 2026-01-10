/**
 * GET /api/doctors/[doctorId] - Get doctor by ID
 * PATCH /api/doctors/[doctorId] - Update doctor
 * DELETE /api/doctors/[doctorId] - Deactivate doctor
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse, noContentResponse } from '@/lib/utils/responses'
import { updateDoctorSchema } from '@/lib/validations/doctor'

interface RouteParams {
    params: Promise<{ doctorId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()

        const { data: doctor, error } = await supabase
            .from('doctors')
            .select(`
        *,
        user:users(email, full_name, avatar_url, phone, is_active),
        clinic:clinics(id, name, slug),
        schedules(*)
      `)
            .eq('id', doctorId)
            .single()

        if (error || !doctor) {
            throw new NotFoundError('Médico')
        }

        // Check authorization
        // If user is authenticated, check roles
        if (userId) {
            if (userRole !== 'SUPER_ADMIN') {
                const { data: currentUser } = await supabase
                    .from('users')
                    .select('clinic_id')
                    .eq('id', userId)
                    .single()

                if (currentUser?.clinic_id !== doctor.clinic_id) {
                    throw new ForbiddenError('Acesso negado')
                }
            }
        } else {
            // Public access: Only show if accepting appointments
            if (!doctor.is_accepting_appointments) {
                throw new NotFoundError('Médico não encontrado ou indisponível')
            }
        }

        return successResponse(doctor)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateDoctorSchema.parse(body)

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

        // Check authorization
        if (userRole === 'DOCTOR') {
            // Doctors can only update their own profile
            if (doctor.user_id !== userId) {
                throw new ForbiddenError('Você só pode editar seu próprio perfil')
            }
        } else if (userRole === 'CLINIC_ADMIN') {
            // Clinic admins can only update doctors in their clinic
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== doctor.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        // Separate doctor fields from user fields
        const doctorFields: Record<string, unknown> = {}
        const userFields: Record<string, unknown> = {}

        if (validatedData.specialty !== undefined) doctorFields.specialty = validatedData.specialty
        if (validatedData.consultation_price !== undefined) doctorFields.consultation_price = validatedData.consultation_price
        if (validatedData.consultation_duration !== undefined) doctorFields.consultation_duration = validatedData.consultation_duration
        if (validatedData.display_settings !== undefined) doctorFields.display_settings = validatedData.display_settings
        if (validatedData.bio !== undefined) doctorFields.bio = validatedData.bio
        if (validatedData.is_accepting_appointments !== undefined) doctorFields.is_accepting_appointments = validatedData.is_accepting_appointments

        if (validatedData.full_name !== undefined) userFields.full_name = validatedData.full_name
        if (validatedData.avatar_url !== undefined) userFields.avatar_url = validatedData.avatar_url
        if (validatedData.phone !== undefined) userFields.phone = validatedData.phone

        // Update doctor
        if (Object.keys(doctorFields).length > 0) {
            const { error } = await supabase
                .from('doctors')
                .update(doctorFields)
                .eq('id', doctorId)

            if (error) throw error
        }

        // Update user profile
        if (Object.keys(userFields).length > 0) {
            const { error } = await supabase
                .from('users')
                .update(userFields)
                .eq('id', doctor.user_id)

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
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

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

        // Check authorization
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem desativar médicos')
        }

        if (userRole === 'CLINIC_ADMIN') {
            const { data: currentUser } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (currentUser?.clinic_id !== doctor.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        // Soft delete - deactivate both doctor and user
        await supabase
            .from('doctors')
            .update({ is_accepting_appointments: false })
            .eq('id', doctorId)

        await supabase
            .from('users')
            .update({ is_active: false })
            .eq('id', doctor.user_id)

        return noContentResponse()
    } catch (error) {
        return handleApiError(error)
    }
}
