import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/validate
 * Validate appointment and get patient data (without adding to queue)
 * Accepts appointment_id directly (from new CLINIGO:{id} QR format)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token } = body // token is actually the appointment_id in new format

        if (!token) {
            throw new ValidationError('Token/ID é obrigatório')
        }

        const supabase = createServiceRoleClient()

        // Try to find appointment by ID (new format: token IS the appointment_id)
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
                id, 
                status,
                clinic_id,
                doctor_id,
                patient_id,
                appointment_date,
                appointment_time,
                patients:patient_id (full_name, phone, email),
                doctors:doctor_id (user_id, users(full_name))
            `)
            .eq('id', token)
            .single()

        if (appointmentError || !appointment) {
            throw new ValidationError('Agendamento não encontrado ou QR Code inválido')
        }

        // Check if pre-checkin was completed
        const { data: preCheckin } = await supabase
            .from('pre_checkin_submissions')
            .select('id, status, form_data')
            .eq('appointment_id', token)
            .single()

        // Check if already in queue
        const { data: existingQueue } = await supabase
            .from('appointment_queue')
            .select('id, status, queue_position')
            .eq('appointment_id', token)
            .single()

        const patientData = (appointment as any).patients as any
        const doctorData = (appointment as any).doctors as any

        return successResponse({
            appointment_id: (appointment as any).id,
            patient_name: patientData?.full_name || 'Paciente',
            patient_phone: patientData?.phone,
            doctor_name: doctorData?.users?.full_name,
            appointment_date: (appointment as any).appointment_date,
            appointment_time: (appointment as any).appointment_time,
            clinic_id: (appointment as any).clinic_id,
            has_pre_checkin: !!preCheckin,
            main_complaint: (preCheckin as any)?.form_data?.main_complaint,
            health_insurance: (preCheckin as any)?.form_data?.insurance_name,
            already_in_queue: !!existingQueue,
            queue_position: (existingQueue as any)?.queue_position,
        })

    } catch (error) {
        return handleApiError(error)
    }
}
