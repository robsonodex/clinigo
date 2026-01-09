/**
 * GET /api/medical-records - List medical records
 * POST /api/medical-records - Create medical record (Profissional+ only)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { canUseFeature } from '@/lib/services/plan-limits'
import { logAuditEvent, AuditActions, extractRequestMeta } from '@/lib/utils/audit-log'
import { z } from 'zod'

const vitalSignsSchema = z.object({
    blood_pressure: z.string().optional(),
    heart_rate: z.number().optional(),
    temperature: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    spo2: z.number().optional(),
}).optional()

const diagnosisSchema = z.object({
    code: z.string(), // ICD-10
    description: z.string(),
})

const prescriptionSchema = z.object({
    medication: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string().optional(),
    instructions: z.string().optional(),
})

const createRecordSchema = z.object({
    appointment_id: z.string().uuid().optional(),
    patient_id: z.string().uuid(),
    chief_complaint: z.string().optional(),
    history_present_illness: z.string().optional(),
    vital_signs: vitalSignsSchema,
    physical_examination: z.string().optional(),
    diagnoses: z.array(diagnosisSchema).default([]),
    prescriptions: z.array(prescriptionSchema).default([]),
    follow_up_instructions: z.string().optional(),
    next_appointment_suggestion: z.string().optional(),
})

const listQuerySchema = z.object({
    patient_id: z.string().uuid().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
})

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // CRITICAL: SUPER_ADMIN NÃO pode acessar prontuários médicos!
        // Dados médicos são confidenciais e pertencem à clínica (LGPD/HIPAA)
        if (userRole === 'SUPER_ADMIN') {
            throw new ForbiddenError('Acesso negado. Prontuários médicos são confidenciais e pertencem às clínicas.')
        }

        const { searchParams } = new URL(request.url)
        const query = listQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = await createClient()

        // Get user info
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', userId)
            .single() as { data: { clinic_id: string | null; role: string } | null }

        if (!user?.clinic_id && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Clínica não encontrada')
        }

        // Check feature access
        if (user?.clinic_id) {
            const hasMedicalRecords = await canUseFeature(user.clinic_id, 'medical_records')
            if (!hasMedicalRecords) {
                throw new ForbiddenError('Prontuário eletrônico disponível apenas nos planos Profissional e Enterprise.')
            }
        }

        // Build query
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let queryBuilder = (supabase as any)
            .from('medical_records')
            .select(`
                *,
                patient:patients(id, full_name, cpf, email),
                doctor:doctors(
                    id, specialty,
                    user:users(full_name)
                )
            `, { count: 'exact' })

        // Role-based filtering
        if (user?.role === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single() as { data: { id: string } | null }

            if (doctor) {
                queryBuilder = queryBuilder.eq('doctor_id', doctor.id)
            }
        } else if (user?.clinic_id) {
            queryBuilder = queryBuilder.eq('clinic_id', user.clinic_id)
        }

        // Apply filters
        if (query.patient_id) {
            queryBuilder = queryBuilder.eq('patient_id', query.patient_id)
        }
        if (query.date_from) {
            queryBuilder = queryBuilder.gte('created_at', query.date_from)
        }
        if (query.date_to) {
            queryBuilder = queryBuilder.lte('created_at', query.date_to)
        }

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: records, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(records || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // CRITICAL: Apenas médicos podem criar prontuários
        // SUPER_ADMIN não tem acesso a dados médicos (LGPD/HIPAA)
        if (userRole !== 'DOCTOR') {
            throw new ForbiddenError('Apenas médicos podem criar prontuários')
        }

        const supabase = await createClient()
        const adminClient = createServiceRoleClient()

        // Get doctor info
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('user_id', userId)
            .single() as { data: { id: string; clinic_id: string } | null }

        if (!doctor && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Perfil de médico não encontrado')
        }

        const clinicId = doctor?.clinic_id

        // Check feature access
        if (clinicId) {
            const hasMedicalRecords = await canUseFeature(clinicId, 'medical_records')
            if (!hasMedicalRecords) {
                throw new ForbiddenError('Prontuário eletrônico disponível apenas nos planos Profissional e Enterprise. Faça upgrade para continuar.')
            }
        }

        const body = await request.json()
        const validatedData = createRecordSchema.parse(body)

        // Verify patient exists and belongs to clinic
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, clinic_id')
            .eq('id', validatedData.patient_id)
            .single() as { data: { id: string; clinic_id: string } | null; error: Error | null }

        if (patientError || !patient) {
            throw new NotFoundError('Paciente')
        }

        if (clinicId && patient.clinic_id !== clinicId) {
            throw new ForbiddenError('Paciente não pertence a esta clínica')
        }

        // Create medical record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: record, error } = await (adminClient as any)
            .from('medical_records')
            .insert({
                clinic_id: clinicId || patient.clinic_id,
                appointment_id: validatedData.appointment_id || null,
                patient_id: validatedData.patient_id,
                doctor_id: doctor?.id,
                chief_complaint: validatedData.chief_complaint,
                history_present_illness: validatedData.history_present_illness,
                vital_signs: validatedData.vital_signs || {},
                physical_examination: validatedData.physical_examination,
                diagnoses: validatedData.diagnoses,
                prescriptions: validatedData.prescriptions,
                follow_up_instructions: validatedData.follow_up_instructions,
                next_appointment_suggestion: validatedData.next_appointment_suggestion,
            })
            .select()
            .single()

        if (error) throw error

        // Log audit event
        const requestMeta = extractRequestMeta(request)
        await logAuditEvent({
            clinic_id: clinicId,
            user_id: userId,
            action: AuditActions.MEDICAL_RECORD_CREATED,
            entity_type: 'medical_record',
            entity_id: record.id,
            new_values: { patient_id: validatedData.patient_id, has_diagnoses: validatedData.diagnoses.length > 0 },
            ...requestMeta,
        })

        return successResponse(
            {
                medical_record_id: record.id,
                message: 'Prontuário criado com sucesso'
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

