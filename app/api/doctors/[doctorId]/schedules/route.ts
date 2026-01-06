/**
 * GET /api/doctors/[doctorId]/schedules - Get doctor schedules
 * POST /api/doctors/[doctorId]/schedules - Replace schedules (bulk update)
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateSchedulesSchema } from '@/lib/validations/doctor'

interface RouteParams {
    params: Promise<{ doctorId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params

        const supabase = await createClient()

        // Get schedules
        const { data: schedules, error } = await supabase
            .from('schedules')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('is_active', true)
            .order('day_of_week')
            .order('start_time')

        if (error) throw error

        return successResponse(schedules)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateSchedulesSchema.parse(body)

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
            // Doctors can only update their own schedules
            if (doctor.user_id !== userId) {
                throw new ForbiddenError('Você só pode editar sua própria agenda')
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
                .insert(schedulesToInsert)

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
    } catch (error) {
        return handleApiError(error)
    }
}
