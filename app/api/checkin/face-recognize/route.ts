import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { decryptFaceDescriptor, calculateFaceDistance } from '@/lib/utils/face-encryption'

export const runtime = 'nodejs'

/**
 * Cache em memoria para descriptors decriptados por clinica.
 * Evita re-decriptar AES-256-GCM a cada ciclo de 350ms.
 * TTL de 60 segundos — apos expirar, recarrega do banco.
 */
interface CachedClinicData {
    timestamp: number
    appointments: any[]
    patientIds: string[]
    descriptors: Array<{ patient_id: string; descriptor: Float32Array }>
}

const clinicCache = new Map<string, CachedClinicData>()
const CACHE_TTL_MS = 60_000 // 60 segundos

/**
 * POST /api/checkin/face-recognize
 * Reconhece paciente comparando descriptor facial contra biometrias do dia.
 * Otimizado com cache para suportar varreduras a cada 350ms.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { descriptor, clinic_id, date } = body

        if (!clinic_id) {
            throw new ValidationError('clinic_id é obrigatório')
        }

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json({
                success: false,
                error: 'Descriptor facial inválido.'
            })
        }

        const today = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        const cacheKey = `${clinic_id}:${today}`
        const now = Date.now()

        let cached = clinicCache.get(cacheKey)

        // Carregar dados do banco se cache expirado ou inexistente
        if (!cached || (now - cached.timestamp) > CACHE_TTL_MS) {
            const supabase = createServiceRoleClient()

            const { data: appointments, error: aptError } = await supabase
                .from('appointments')
                .select(`
                    id,
                    patient_id,
                    status,
                    appointment_date,
                    appointment_time,
                    checked_in_at
                `)
                .eq('clinic_id', clinic_id)
                .eq('appointment_date', today)
                .in('status', ['SCHEDULED', 'CONFIRMED', 'PENDING_PAYMENT', 'PAYMENT_PENDING', 'WAITING', 'WAITING_ROOM'])

            if (aptError) {
                console.error('[Face-Recognize] Appointments query error:', JSON.stringify(aptError))
                // Nao lanca erro — retorna falha graceful para nao gerar 400 em cascata
                return NextResponse.json({
                    success: false,
                    error: 'Erro ao buscar agendamentos do dia.'
                })
            }

            if (!appointments || appointments.length === 0) {
                // Preenche cache vazio para nao re-consultar a cada 350ms
                cached = { timestamp: now, appointments: [], patientIds: [], descriptors: [] }
                clinicCache.set(cacheKey, cached)
                return NextResponse.json({
                    success: false,
                    error: 'Nenhum agendamento encontrado para hoje nesta clinica.'
                })
            }

            const patientIds = [...new Set(appointments.map((a: any) => a.patient_id).filter(Boolean))]

            if (patientIds.length === 0) {
                return NextResponse.json({
                    success: false,
                    error: 'Nenhum paciente encontrado nos agendamentos de hoje.'
                })
            }

            // Buscar e pre-decriptar todos os descriptors de uma vez
            const { data: biometricsRaw, error: bioError } = await supabase
                .from('patient_face_biometrics')
                .select('patient_id, face_descriptor_encrypted, reference_image_url')
                .eq('clinic_id', clinic_id)
                .in('patient_id', patientIds)

            if (bioError) {
                console.error('[Face-Recognize] Error fetching biometrics:', bioError)
            }

            const biometrics = (biometricsRaw || []) as Array<{ patient_id: string; face_descriptor_encrypted: string | null; reference_image_url: string | null }>
            const decryptedDescriptors: Array<{ patient_id: string; descriptor: Float32Array }> = []

            if (biometrics.length > 0) {
                for (const bio of biometrics) {
                    if (bio.face_descriptor_encrypted) {
                        try {
                            const desc = decryptFaceDescriptor(bio.face_descriptor_encrypted)
                            decryptedDescriptors.push({ patient_id: bio.patient_id, descriptor: desc })
                        } catch (e) {
                            console.error(`[Face-Recognize] Error decrypting for patient ${bio.patient_id}:`, e)
                        }
                    }
                }
            }

            cached = {
                timestamp: now,
                appointments,
                patientIds,
                descriptors: decryptedDescriptors,
            }
            clinicCache.set(cacheKey, cached)
        }

        // Comparar descriptor recebido com os pre-decriptados do cache
        const inputDescriptor = new Float32Array(descriptor)
        let bestMatch: { patientId: string; distance: number } | null = null

        for (const entry of cached.descriptors) {
            const distance = calculateFaceDistance(inputDescriptor, entry.descriptor)
            
            if (distance < 0.72) {
                if (!bestMatch || distance < bestMatch.distance) {
                    bestMatch = { patientId: entry.patient_id, distance }
                }
            }
        }

        // Fallback demo
        if (!bestMatch) {
            const supabase = createServiceRoleClient()

            const { data: clinicDataRaw } = await supabase
                .from('clinics')
                .select('is_demo, id')
                .eq('id', clinic_id)
                .single()

            const clinicData = clinicDataRaw as { is_demo: boolean; id: string } | null
            const isDemo = clinicData?.is_demo || clinic_id === 'de000000-0000-0000-0000-000000000001'

            if (isDemo && cached.appointments.length > 0) {
                const targetAppt = cached.appointments.find((a: any) => a.status === 'CONFIRMED' || a.status === 'SCHEDULED') || cached.appointments[0]
                const { data: demoPatientRaw } = await supabase
                    .from('patients')
                    .select('id, full_name')
                    .eq('id', targetAppt.patient_id)
                    .single()

                const demoPatient = demoPatientRaw as { id: string; full_name: string } | null
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

            if (cached.descriptors.length === 0) {
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

        // Match encontrado — buscar nome do paciente
        const supabase = createServiceRoleClient()
        const { data: patientRaw, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('id', bestMatch.patientId)
            .single()

        const patient = patientRaw as { id: string; full_name: string } | null
        if (patientError || !patient) {
            return NextResponse.json({
                success: false,
                error: 'Paciente reconhecido não encontrado.'
            })
        }

        const matchedAppointment = cached.appointments.find(
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
