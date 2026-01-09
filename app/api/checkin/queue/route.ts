import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const runtime = 'nodejs'

/**
 * GET /api/checkin/queue
 * Get queue for a doctor or clinic
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const clinicId = request.headers.get('x-clinic-id') || searchParams.get('clinic_id')
        const doctorId = searchParams.get('doctor_id')

        if (!clinicId) {
            throw new ValidationError('clinic_id é obrigatório')
        }

        const supabase = createServiceRoleClient()

        let query = supabase
            .from('appointment_queue')
            .select(`
                id,
                appointment_id,
                status,
                priority_score,
                priority_reason,
                queue_position,
                entered_queue_at,
                called_at,
                appointments:appointment_id (
                    appointment_date,
                    appointment_time,
                    patients:patient_id (full_name, phone)
                ),
                doctors:doctor_id (
                    users:user_id (full_name)
                )
            `)
            .eq('clinic_id', clinicId)
            .in('status', ['waiting', 'called', 'in_consultation'])
            .order('priority_score', { ascending: true })
            .order('entered_queue_at', { ascending: true })

        if (doctorId) {
            query = query.eq('doctor_id', doctorId)
        }

        const { data, error } = await query

        if (error) throw error

        // Calculate wait times
        const queueWithWaitTime = (data || []).map((item: any, index: number) => ({
            ...item,
            wait_time_minutes: Math.floor(
                (Date.now() - new Date(item.entered_queue_at).getTime()) / 60000
            ),
            position_in_queue: index + 1,
        }))

        // Get stats
        const stats = {
            total_waiting: queueWithWaitTime.filter((q: any) => q.status === 'waiting').length,
            total_called: queueWithWaitTime.filter((q: any) => q.status === 'called').length,
            total_in_consultation: queueWithWaitTime.filter((q: any) => q.status === 'in_consultation').length,
            avg_wait_time: queueWithWaitTime.length > 0
                ? Math.round(queueWithWaitTime.reduce((acc: number, q: any) => acc + q.wait_time_minutes, 0) / queueWithWaitTime.length)
                : 0,
        }

        return successResponse({
            queue: queueWithWaitTime,
            stats,
        })

    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST /api/checkin/queue
 * Update queue item status (call next, start consultation, etc.)
 */
export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        if (!userRole || !['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR'].includes(userRole)) {
            throw new ForbiddenError('Sem permissão para gerenciar a fila')
        }

        const body = await request.json()
        const { action, queue_id, doctor_id } = body

        const supabase = createServiceRoleClient()

        switch (action) {
            case 'call_next': {
                // Get next patient in queue for doctor
                const { data: nextPatient, error } = await supabase
                    .from('appointment_queue')
                    .select('*')
                    .eq('doctor_id', doctor_id)
                    .eq('status', 'waiting')
                    .order('priority_score', { ascending: true })
                    .order('entered_queue_at', { ascending: true })
                    .limit(1)
                    .single()

                if (error || !nextPatient) {
                    return successResponse({ message: 'Nenhum paciente na fila', called: false })
                }

                // Update status to called
                await (supabase
                    .from('appointment_queue') as any)
                    .update({ status: 'called', called_at: new Date().toISOString() })
                    .eq('id', (nextPatient as any).id)

                return successResponse({
                    message: 'Paciente chamado!',
                    called: true,
                    queue_item: nextPatient,
                })
            }

            case 'start_consultation': {
                if (!queue_id) throw new ValidationError('queue_id é obrigatório')

                await (supabase
                    .from('appointment_queue') as any)
                    .update({
                        status: 'in_consultation',
                        consultation_started_at: new Date().toISOString()
                    })
                    .eq('id', queue_id)

                return successResponse({ message: 'Consulta iniciada' })
            }

            case 'end_consultation': {
                if (!queue_id) throw new ValidationError('queue_id é obrigatório')

                // Get queue item to update appointment
                const { data: queueItem } = await supabase
                    .from('appointment_queue')
                    .select('appointment_id')
                    .eq('id', queue_id)
                    .single()

                await (supabase
                    .from('appointment_queue') as any)
                    .update({
                        status: 'completed',
                        consultation_ended_at: new Date().toISOString()
                    })
                    .eq('id', queue_id)

                // Update appointment status
                if (queueItem) {
                    await (supabase
                        .from('appointments') as any)
                        .update({ status: 'COMPLETED' })
                        .eq('id', (queueItem as any).appointment_id)
                }

                return successResponse({ message: 'Consulta finalizada' })
            }

            case 'no_show': {
                if (!queue_id) throw new ValidationError('queue_id é obrigatório')

                const { data: queueItem } = await supabase
                    .from('appointment_queue')
                    .select('appointment_id')
                    .eq('id', queue_id)
                    .single()

                await (supabase
                    .from('appointment_queue') as any)
                    .update({ status: 'no_show' })
                    .eq('id', queue_id)

                if (queueItem) {
                    await (supabase
                        .from('appointments') as any)
                        .update({ status: 'NO_SHOW' })
                        .eq('id', (queueItem as any).appointment_id)
                }

                return successResponse({ message: 'Paciente marcado como não compareceu' })
            }

            default:
                throw new ValidationError('Ação inválida')
        }

    } catch (error) {
        return handleApiError(error)
    }
}

