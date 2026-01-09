/**
 * GET /api/consultations - List consultations
 * POST /api/consultations - Create consultation record (DOCTOR only)
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { z } from 'zod'

const createConsultationSchema = z.object({
    appointment_id: z.string().uuid('ID do agendamento inválido'),
    notes: z.string().max(10000).optional(),
    prescriptions: z.string().max(5000).optional(),
    diagnosis: z.string().max(2000).optional(),
    follow_up: z.string().max(1000).optional(),
    files: z.array(z.object({
        name: z.string(),
        url: z.string().url(),
        type: z.string(),
        size: z.number().optional(),
    })).optional(),
})

const listConsultationsSchema = z.object({
    doctor_id: z.string().uuid().optional(),
    patient_id: z.string().uuid().optional(),
    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const { searchParams } = new URL(request.url)
        const query = listConsultationsSchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = await createClient()

        // Get user's clinic and doctor_id if applicable
        const { data: currentUser } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        let doctorId: string | null = null
        if (userRole === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()
            doctorId = doctor?.id || null
        }

        let queryBuilder = supabase
            .from('consultations')
            .select(`
        *,
        doctor:doctors(
          id, specialty,
          user:users(full_name, avatar_url)
        ),
        patient:patients(id, full_name, email, cpf),
        appointment:appointments(appointment_date, appointment_time)
      `, { count: 'exact' })

        // Apply role-based filtering
        if (userRole === 'DOCTOR' && doctorId) {
            queryBuilder = queryBuilder.eq('doctor_id', doctorId)
        } else if (currentUser?.clinic_id) {
            queryBuilder = queryBuilder.eq('clinic_id', currentUser.clinic_id)
        }

        // Apply query filters
        if (query.doctor_id && userRole !== 'DOCTOR') {
            queryBuilder = queryBuilder.eq('doctor_id', query.doctor_id)
        }
        if (query.patient_id) {
            queryBuilder = queryBuilder.eq('patient_id', query.patient_id)
        }
        if (query.date_from || query.date_to) {
            // Join with appointments for date filtering
            // This is a simplified approach - for complex queries, consider a view
        }

        // Apply pagination and ordering
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: consultations, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(consultations || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        // Only doctors can create consultations
        if (userRole !== 'DOCTOR' && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas médicos podem registrar consultas')
        }

        const body = await request.json()
        const validatedData = createConsultationSchema.parse(body)

        const supabase = await createClient()

        // Get doctor_id for current user
        let doctorId: string
        if (userRole === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()

            if (!doctor) {
                throw new ForbiddenError('Perfil de médico não encontrado')
            }
            doctorId = doctor.id
        } else {
            // Super admin must specify doctor_id
            if (!body.doctor_id) {
                throw new BadRequestError('ID do médico é obrigatório')
            }
            doctorId = body.doctor_id
        }

        // Get and validate appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select(`
        *,
        payment:payments(status),
        existing_consultation:consultations(id)
      `)
            .eq('id', validatedData.appointment_id)
            .single()

        if (appointmentError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Verify doctor is assigned to this appointment
        if (userRole === 'DOCTOR' && appointment.doctor_id !== doctorId) {
            throw new ForbiddenError('Você não está atribuído a este agendamento')
        }

        // Check appointment status
        if (appointment.status !== 'CONFIRMED') {
            throw new BadRequestError(
                `Não é possível registrar consulta. Status atual: ${appointment.status}`
            )
        }

        // Check if consultation already exists
        if (appointment.existing_consultation?.id) {
            throw new BadRequestError('Consulta já registrada para este agendamento')
        }

        // Check payment status
        const payment = appointment.payment as { status: string } | null
        if (payment?.status !== 'PAID') {
            throw new BadRequestError('Pagamento não confirmado')
        }

        // Create consultation
        const { data: consultation, error: createError } = await supabase
            .from('consultations')
            .insert({
                clinic_id: appointment.clinic_id,
                appointment_id: validatedData.appointment_id,
                doctor_id: doctorId,
                patient_id: appointment.patient_id,
                started_at: new Date().toISOString(),
                notes: validatedData.notes,
                prescriptions: validatedData.prescriptions,
                diagnosis: validatedData.diagnosis,
                follow_up: validatedData.follow_up,
                files: validatedData.files || [],
            })
            .select()
            .single()

        if (createError) throw createError

        // Update appointment status to COMPLETED
        await supabase
            .from('appointments')
            .update({ status: 'COMPLETED' })
            .eq('id', validatedData.appointment_id)

        return successResponse(
            {
                consultation_id: consultation.id,
                message: 'Consulta registrada com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}

