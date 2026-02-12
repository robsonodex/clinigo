import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/face-confirm
 * Confirm facial check-in and add patient to appointment queue
 * Called after successful face match at reception
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointment_id, clinic_id, patient_id, priority_reason = 'normal' } = body

        if (!appointment_id || !clinic_id || !patient_id) {
            throw new ValidationError('appointment_id, clinic_id e patient_id são obrigatórios')
        }

        const supabase = createServiceRoleClient()

        // Get appointment details (including doctor_id)
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, status, doctor_id, patient_id, appointment_date, appointment_time')
            .eq('id', appointment_id)
            .single()

        if (appointmentError || !appointment) {
            throw new ValidationError('Agendamento não encontrado')
        }

        // Validate appointment date is today
        const today = new Date().toISOString().split('T')[0]
        const appointmentDate = (appointment as any).appointment_date
        if (appointmentDate && appointmentDate !== today) {
            // Format date for display (DD/MM/YYYY)
            const [year, month, day] = appointmentDate.split('-')
            const formattedDate = `${day}/${month}/${year}`
            throw new ValidationError(
                `Check-in não pode ser realizado. Sua consulta está agendada para ${formattedDate}.`
            )
        }

        // Check if already in queue
        const { data: existingQueue } = await supabase
            .from('appointment_queue')
            .select('id, status')
            .eq('appointment_id', appointment_id)
            .single()

        if (existingQueue) {
            if ((existingQueue as any).status === 'waiting') {
                return successResponse({
                    message: 'Paciente já está na fila de espera',
                    queue_id: (existingQueue as any).id,
                    already_in_queue: true,
                })
            } else if ((existingQueue as any).status === 'in_consultation') {
                return successResponse({
                    message: 'Paciente já está em atendimento',
                    queue_id: (existingQueue as any).id,
                    in_consultation: true,
                })
            }
        }

        // Calculate priority score
        const priorityScores: Record<string, number> = {
            emergencia: 10,
            idoso: 30,
            gestante: 40,
            deficiente: 40,
            retorno_urgente: 50,
            normal: 100,
        }
        const priorityScore = priorityScores[priority_reason] || 100

        // Get queue position
        const { count } = await supabase
            .from('appointment_queue')
            .select('*', { count: 'exact', head: true })
            .eq('doctor_id', (appointment as any).doctor_id)
            .eq('status', 'waiting')

        const queuePosition = (count || 0) + 1

        // Add to queue
        const { data: queue, error: queueError } = await supabase
            .from('appointment_queue')
            .upsert({
                appointment_id,
                doctor_id: (appointment as any).doctor_id,
                clinic_id,
                patient_id,
                status: 'waiting',
                priority_score: priorityScore,
                priority_reason,
                queue_position: queuePosition,
                entered_queue_at: new Date().toISOString(),
            } as any, { onConflict: 'appointment_id' })
            .select()
            .single()

        if (queueError) {
            console.error('[Face-Confirm] Queue error:', queueError)
            throw queueError
        }

        // Update appointment status to WAITING_ROOM
        await (supabase
            .from('appointments') as any)
            .update({
                status: 'WAITING_ROOM',
                checked_in_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', appointment_id)

        return successResponse({
            message: 'Check-in facial confirmado! Paciente na fila.',
            queue_id: (queue as any).id,
            queue_position: queuePosition,
            priority: priority_reason,
            estimated_wait: queuePosition * 15,
        })

    } catch (error) {
        return handleApiError(error)
    }
}
