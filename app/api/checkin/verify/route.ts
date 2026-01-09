import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { verifyCheckinToken } from '../pre-checkin/route'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/verify
 * Verify QR code token and add patient to queue
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, priority_reason = 'normal' } = body

        if (!token) {
            throw new ValidationError('Token é obrigatório')
        }

        // Verify token
        const verification = verifyCheckinToken(token)
        if (!verification.valid) {
            throw new ValidationError(verification.error || 'Token inválido')
        }

        const { appointment_id, clinic_id } = verification.payload

        const supabase = createServiceRoleClient()

        // Get appointment details
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
                id, 
                status,
                doctor_id,
                patient_id,
                appointment_date,
                appointment_time,
                patients:patient_id (full_name),
                doctors:doctor_id (user_id)
            `)
            .eq('id', appointment_id)
            .single()

        if (appointmentError || !appointment) {
            throw new ValidationError('Agendamento não encontrado')
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
                patient_id: (appointment as any).patient_id,
                status: 'waiting',
                priority_score: priorityScore,
                priority_reason,
                queue_position: queuePosition,
                entered_queue_at: new Date().toISOString(),
            } as any, { onConflict: 'appointment_id' })
            .select()
            .single()

        if (queueError) {
            console.error('[Checkin Verify] Queue error:', queueError)
            throw queueError
        }

        // Update appointment status to WAITING_ROOM
        await (supabase
            .from('appointments') as any)
            .update({ status: 'WAITING_ROOM' })
            .eq('id', appointment_id)

        return successResponse({
            message: 'Check-in realizado com sucesso!',
            queue_id: (queue as any).id,
            queue_position: queuePosition,
            priority: priority_reason,
            estimated_wait: queuePosition * 15, // Estimate 15 min per patient
            patient_name: ((appointment as any).patients as any)?.full_name,
        })

    } catch (error) {
        return handleApiError(error)
    }
}

