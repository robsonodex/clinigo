/**
 * POST /api/reschedule/[token]
 * Process reschedule request using token
 */
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const rescheduleSchema = z.object({
    appointment_date: z.string().min(1),
    appointment_time: z.string().min(1),
})

export async function POST(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params
        const body = await request.json()
        const { appointment_date, appointment_time } = rescheduleSchema.parse(body)

        const supabase = createServiceRoleClient() as any

        //1. Validate token (must be unused and not expired)
        const { data: tokenData, error: tokenError } = await supabase
            .from('reschedule_tokens')
            .select('*, appointment:appointments(*)')
            .eq('token', token)
            .is('used_at', null)
            .gte('expires_at', new Date().toISOString())
            .single()

        if (tokenError || !tokenData) {
            throw new NotFoundError('Token inválido ou expirado')
        }

        // 2. Check slot availability
        const { data: isAvailable } = await supabase
            .rpc('check_slot_availability', {
                p_doctor_id: tokenData.appointment.doctor_id,
                p_date: appointment_date,
                p_time: appointment_time,
            })

        if (!isAvailable) {
            throw new BadRequestError('Este horário não está mais disponível')
        }

        // 3. Create new appointment
        const { data: newAppointment, error: createError } = await supabase
            .from('appointments')
            .insert({
                clinic_id: tokenData.appointment.clinic_id,
                patient_id: tokenData.appointment.patient_id,
                doctor_id: tokenData.appointment.doctor_id,
                appointment_date,
                appointment_time,
                status: 'CONFIRMED',
                type: tokenData.appointment.type,
                payment_type: tokenData.appointment.payment_type,
                health_insurance_plan_id: tokenData.appointment.health_insurance_plan_id,
                notes: `Reagendado via link após falta. Consulta original: ${tokenData.appointment.appointment_date} ${tokenData.appointment.appointment_time}`,
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating appointment:', createError)
            throw new BadRequestError('Erro ao criar agendamento')
        }

        // 4. Mark token as used
        await supabase
            .from('reschedule_tokens')
            .update({
                used_at: new Date().toISOString(),
                new_appointment_id: newAppointment.id,
            })
            .eq('id', tokenData.id)

        // 5. Send confirmation email (optional)
        // TODO: Send confirmation email to patient

        return successResponse({
            success: true,
            message: 'Consulta reagendada com sucesso!',
            appointment: newAppointment,
        })

    } catch (error) {
        return handleApiError(error)
    }
}
