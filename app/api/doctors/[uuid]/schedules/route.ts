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
    params: Promise<{ uuid: string }>
}

export const dynamic = 'force-dynamic'
export const dynamicParams = true
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { uuid: doctorId } = await params
        console.log('[API] GET Doctor Schedules START', { doctorId })

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
        const { uuid: doctorId } = await params

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
        const WORLDSENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
        const JESSICA_USER_ID = 'd9c6ac75-bc7c-431a-ba76-73ecb268fef8'
        const isJessicaWorldSensory = (userId === JESSICA_USER_ID || userProfile.email?.toLowerCase() === 'wsadm.jessica@gmail.com') &&
            userProfile.clinic_id === WORLDSENSORY_CLINIC_ID && doctor.clinic_id === WORLDSENSORY_CLINIC_ID

        if (userRole === 'DOCTOR') {
            // Doctors can only update their own schedules
            if (doctor.user_id !== userId) {
                throw new ForbiddenError('Você só pode editar sua própria agenda')
            }
        } else if (userRole === 'CLINIC_ADMIN') {
            // Clinic admins can only update doctors in their clinic
            if (userProfile.clinic_id !== doctor.clinic_id) {
                throw new ForbiddenError('Acesso negado')
            }
        } else if (userRole === 'RECEPTIONIST' && isJessicaWorldSensory) {
            // Exceção cirúrgica World Sensory: Jéssica autorizada pontualmente a gerenciar horários da sua clínica
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
    } catch (error) {
        return handleApiError(error)
    }
}
