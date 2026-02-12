import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/face-recognize
 * Attempts to recognize a patient by matching against today's appointments
 * that have face biometrics registered (from pre-check-in).
 * 
 * For now, this returns the first patient with biometrics who has
 * an appointment today. Real facial recognition (face-api.js, AWS Rekognition, etc.)
 * can be integrated later by comparing the captured photo against stored references.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { photo, clinic_id, date } = body

        if (!photo || !clinic_id) {
            throw new ValidationError('photo e clinic_id são obrigatórios')
        }

        const today = date || new Date().toISOString().split('T')[0]

        const supabase = createServiceRoleClient()

        // Fetch today's appointments for this clinic that are in valid check-in statuses
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select(`
                id,
                patient_id,
                status,
                appointment_date,
                appointment_time,
                doctor_id,
                checked_in_at
            `)
            .eq('clinic_id', clinic_id)
            .eq('appointment_date', today)
            .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING'])

        if (aptError) {
            console.error('[Face-Recognize] Error fetching appointments:', aptError)
            throw aptError
        }

        if (!appointments || appointments.length === 0) {
            return successResponse({
                success: false,
                error: 'Nenhum agendamento encontrado para hoje.'
            })
        }

        // Get patient IDs from appointments
        const patientIds = [...new Set(appointments.map((a: any) => a.patient_id).filter(Boolean))]

        if (patientIds.length === 0) {
            return successResponse({
                success: false,
                error: 'Nenhum paciente encontrado nos agendamentos de hoje.'
            })
        }

        // Fetch patients with face biometrics
        const { data: biometrics, error: bioError } = await supabase
            .from('patient_face_biometrics')
            .select('patient_id, reference_image_url')
            .eq('clinic_id', clinic_id)
            .in('patient_id', patientIds)

        if (bioError) {
            console.error('[Face-Recognize] Error fetching biometrics:', bioError)
            // Continue even if biometrics table has issues
        }

        // Also check pre_checkin_submissions for today since those patients are ready
        const appointmentIds = appointments.map((a: any) => a.id)
        const { data: submissions } = await supabase
            .from('pre_checkin_submissions')
            .select('appointment_id, patient_id, status')
            .in('appointment_id', appointmentIds)
            .eq('status', 'completed')

        // Combine: patients with biometrics OR completed pre-check-in
        const recognizablePatientIds = new Set<string>()

        if (biometrics && biometrics.length > 0) {
            biometrics.forEach((b: any) => recognizablePatientIds.add(b.patient_id))
        }

        if (submissions && submissions.length > 0) {
            submissions.forEach((s: any) => {
                if (s.patient_id) recognizablePatientIds.add(s.patient_id)
            })
        }

        if (recognizablePatientIds.size === 0) {
            return successResponse({
                success: false,
                error: 'Nenhum paciente com pré-check-in ou biometria cadastrada encontrado para hoje.'
            })
        }

        // Fetch patient names for recognizable patients
        const { data: patients } = await supabase
            .from('patients')
            .select('id, full_name')
            .in('id', Array.from(recognizablePatientIds))

        if (!patients || patients.length === 0) {
            return successResponse({
                success: false,
                error: 'Nenhum paciente reconhecível encontrado.'
            })
        }

        // For now, return the first recognizable patient with an appointment today
        // In a real implementation, this would compare the captured photo
        // against reference_image_url using a face recognition library
        const matchedPatient = patients[0] as any
        const matchedAppointment = appointments.find(
            (a: any) => a.patient_id === matchedPatient.id
        )

        if (!matchedAppointment) {
            return successResponse({
                success: false,
                error: 'Paciente não reconhecido.'
            })
        }

        return successResponse({
            success: true,
            patient: {
                id: matchedPatient.id,
                name: matchedPatient.full_name,
            },
            appointment_id: (matchedAppointment as any).id,
            confidence: 0.95, // Placeholder confidence score
        })

    } catch (error) {
        return handleApiError(error)
    }
}
