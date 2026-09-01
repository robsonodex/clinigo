import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { decryptFaceDescriptor, calculateFaceDistance } from '@/lib/utils/face-encryption'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/face-recognize
 * Attempts to recognize a patient by matching against today's appointments
 * that have face biometrics or completed pre-check-in.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { descriptor, clinic_id, date, photo } = body

        if (!clinic_id) {
            throw new ValidationError('clinic_id é obrigatório')
        }

        const today = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        const supabase = createServiceRoleClient()

        // Fetch today's appointments for this clinic
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
            .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING_PAYMENT', 'PENDING', 'CHECKED_IN', 'WAITING'])

        if (aptError) {
            console.error('[Face-Recognize] Error fetching appointments:', aptError)
            throw aptError
        }

        if (!appointments || appointments.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Nenhum agendamento encontrado para hoje nesta clínica.'
            })
        }

        const patientIds = [...new Set(appointments.map((a: any) => a.patient_id).filter(Boolean))]

        if (patientIds.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Nenhum paciente encontrado nos agendamentos de hoje.'
            })
        }

        // Check biometrics and fetch encrypted descriptors
        const { data: biometrics, error: bioError } = await supabase
            .from('patient_face_biometrics')
            .select('patient_id, face_descriptor_encrypted, reference_image_url')
            .eq('clinic_id', clinic_id)
            .in('patient_id', patientIds)

        if (bioError) {
            console.error('[Face-Recognize] Error fetching biometrics:', bioError)
        }

        let bestMatch: { patientId: string; distance: number } | null = null

        if (descriptor && Array.isArray(descriptor) && descriptor.length === 128 && biometrics && biometrics.length > 0) {
            const inputDescriptor = new Float32Array(descriptor)
            for (const bio of biometrics) {
                if (bio.face_descriptor_encrypted) {
                    try {
                        const storedDescriptor = decryptFaceDescriptor(bio.face_descriptor_encrypted)
                        const distance = calculateFaceDistance(inputDescriptor, storedDescriptor)
                        
                        if (distance < 0.6) { // Standard threshold (distance < 0.6)
                            if (!bestMatch || distance < bestMatch.distance) {
                                bestMatch = { patientId: bio.patient_id, distance }
                            }
                        }
                    } catch (e) {
                        console.error(`[Face-Recognize] Error decrypting descriptor for patient ${bio.patient_id}:`, e)
                    }
                }
            }
        }

        // Fallback para Apresentação / Modo Demo ou primeiro paciente do dia
        if (!bestMatch) {
            const { data: clinicData } = await supabase
                .from('clinics')
                .select('is_demo, id')
                .eq('id', clinic_id)
                .single()

            const isDemo = clinicData?.is_demo || clinic_id === 'de000000-0000-0000-0000-000000000001'

            if (isDemo && appointments.length > 0) {
                const targetAppt = appointments.find((a: any) => a.status === 'CONFIRMED' || a.status === 'SCHEDULED') || appointments[0]
                const { data: demoPatient } = await supabase
                    .from('patients')
                    .select('id, full_name')
                    .eq('id', targetAppt.patient_id)
                    .single()

                if (demoPatient) {
                    return NextResponse.json({
                        success: true,
                        patient: {
                            id: demoPatient.id,
                            name: demoPatient.full_name,
                        },
                        appointment_id: targetAppt.id,
                        confidence: 0.96,
                    })
                }
            }

            if (!biometrics || biometrics.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Nenhuma biometria facial cadastrada para os agendamentos de hoje.'
                })
            }

            return NextResponse.json({
                success: false,
                error: 'Biometria facial não reconhecida. Posicione o rosto mais próximo da câmera.'
            })
        }

        // Fetch patient name
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('id', bestMatch.patientId)
            .single()

        if (patientError || !patient) {
            return NextResponse.json({
                success: false,
                error: 'Paciente reconhecido não encontrado.'
            })
        }

        const matchedAppointment = appointments.find(
            (a: any) => a.patient_id === patient.id
        )

        if (!matchedAppointment) {
            return NextResponse.json({
                success: false,
                error: 'Nenhum agendamento ativo hoje para o paciente reconhecido.'
            })
        }

        return NextResponse.json({
            success: true,
            patient: {
                id: patient.id,
                name: patient.full_name,
            },
            appointment_id: matchedAppointment.id,
            confidence: Number((1 - bestMatch.distance).toFixed(2)),
        })

    } catch (error) {
        return handleApiError(error)
    }
}
