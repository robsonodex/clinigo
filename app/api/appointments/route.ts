/**
 * GET /api/appointments - List appointments (authenticated)
 * POST /api/appointments - Create appointment (PUBLIC - booking)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ConflictError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createAppointmentSchema, listAppointmentsQuerySchema } from '@/lib/validations/appointment'
import { cleanCPF } from '@/lib/utils/cpf'
import { isDateInPast, isToday, isSlotAvailableToday } from '@/lib/utils/date'
import { createPaymentPreference } from '@/lib/services/mercadopago'

/**
 * GET - List appointments (authenticated users only)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            return handleApiError(new BadRequestError('Não autorizado'))
        }

        const { searchParams } = new URL(request.url)
        const query = listAppointmentsQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = await createClient()

        // Get user's clinic and doctor_id if applicable
        const { data: currentUser } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', userId)
            .single()

        let doctorId: string | null = null
        if (currentUser?.role === 'DOCTOR') {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()
            doctorId = doctor?.id || null
        }

        let queryBuilder = supabase
            .from('appointments')
            .select(`
        *,
        doctor:doctors(
          id, crm, specialty, consultation_price,
          user:users(full_name, email, avatar_url)
        ),
        patient:patients(id, full_name, email, phone, cpf),
        payment:payments(id, status, amount, payment_method)
      `, { count: 'exact' })

        // Apply role-based filtering
        if (userRole === 'DOCTOR' && doctorId) {
            queryBuilder = queryBuilder.eq('doctor_id', doctorId)
        } else if (currentUser?.clinic_id) {
            queryBuilder = queryBuilder.eq('clinic_id', currentUser.clinic_id)
        }

        // Apply query filters
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status)
        }
        if (query.doctor_id && userRole !== 'DOCTOR') {
            queryBuilder = queryBuilder.eq('doctor_id', query.doctor_id)
        }
        if (query.patient_id) {
            queryBuilder = queryBuilder.eq('patient_id', query.patient_id)
        }
        if (query.date_from) {
            queryBuilder = queryBuilder.gte('appointment_date', query.date_from)
        }
        if (query.date_to) {
            queryBuilder = queryBuilder.lte('appointment_date', query.date_to)
        }

        // Apply pagination and ordering
        queryBuilder = queryBuilder
            .order('appointment_date', { ascending: true })
            .order('appointment_time', { ascending: true })
            .range(offset, offset + pageSize - 1)

        const { data: appointments, count, error } = await queryBuilder

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(appointments || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Create appointment (PUBLIC - booking flow)
 * This is the main public endpoint for patient booking
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const validatedData = createAppointmentSchema.parse(body)

        // Use service role for public operations (bypasses RLS)
        const supabase = createServiceRoleClient()

        // 1. Verify clinic exists and is active
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, mercadopago_access_token, is_active, addons')
            .eq('slug', validatedData.clinic_slug)
            .single()

        if (clinicError || !clinic) {
            throw new NotFoundError('Clínica')
        }

        if (!clinic.is_active) {
            throw new BadRequestError('Esta clínica não está aceitando agendamentos')
        }

        // 2. Verify doctor exists and accepts appointments
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select(`
        id, clinic_id, consultation_price, is_accepting_appointments,
        user:users(full_name)
      `)
            .eq('id', validatedData.doctor_id)
            .single()

        if (doctorError || !doctor) {
            throw new NotFoundError('Médico')
        }

        if (doctor.clinic_id !== clinic.id) {
            throw new BadRequestError('Médico não pertence a esta clínica')
        }

        if (!doctor.is_accepting_appointments) {
            throw new BadRequestError('Este médico não está aceitando agendamentos')
        }

        // 3. Validate date and time
        const appointmentDate = new Date(validatedData.appointment_date)

        if (isDateInPast(appointmentDate)) {
            throw new BadRequestError('Data do agendamento não pode ser no passado')
        }

        if (isToday(appointmentDate) && !isSlotAvailableToday(validatedData.appointment_time)) {
            throw new BadRequestError('Este horário não está mais disponível para hoje')
        }

        // 4. Check slot availability using database function
        const { data: isAvailable, error: availabilityError } = await supabase
            .rpc('check_slot_availability', {
                p_doctor_id: validatedData.doctor_id,
                p_date: validatedData.appointment_date,
                p_time: validatedData.appointment_time,
            })

        if (availabilityError) throw availabilityError

        if (!isAvailable) {
            // Get available slots to include in error response
            const { data: availableSlots } = await supabase
                .rpc('get_available_slots', {
                    p_doctor_id: validatedData.doctor_id,
                    p_date: validatedData.appointment_date,
                })

            throw new ConflictError(
                'Este horário já está ocupado. Escolha outro horário.',
                {
                    available_slots: availableSlots?.map((slot: { slot_time: string }) => slot.slot_time) || [],
                }
            )
        }

        // 5. UPSERT patient (create or update by clinic_id + cpf)
        const cleanedCpf = cleanCPF(validatedData.patient.cpf)

        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .eq('clinic_id', clinic.id)
            .eq('cpf', cleanedCpf)
            .is('deleted_at', null)
            .single()

        let patientId: string

        if (existingPatient) {
            // Update existing patient
            const { data: updatedPatient, error: updateError } = await supabase
                .from('patients')
                .update({
                    full_name: validatedData.patient.full_name,
                    email: validatedData.patient.email,
                    phone: validatedData.patient.phone,
                    date_of_birth: validatedData.patient.date_of_birth || null,
                })
                .eq('id', existingPatient.id)
                .select()
                .single()

            if (updateError) throw updateError
            patientId = updatedPatient.id
        } else {
            // Create new patient
            const { data: newPatient, error: createError } = await supabase
                .from('patients')
                .insert({
                    clinic_id: clinic.id,
                    cpf: cleanedCpf,
                    full_name: validatedData.patient.full_name,
                    email: validatedData.patient.email,
                    phone: validatedData.patient.phone.replace(/\D/g, ''),
                    date_of_birth: validatedData.patient.date_of_birth || null,
                })
                .select()
                .single()

            if (createError) throw createError
            patientId = newPatient.id
        }

        const isPrepaid = !!clinic.addons?.prepaid_booking
        const initialStatus = isPrepaid ? 'PENDING_PAYMENT' : 'CONFIRMED'

        // 6. Create appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                clinic_id: clinic.id,
                doctor_id: validatedData.doctor_id,
                patient_id: patientId,
                appointment_date: validatedData.appointment_date,
                appointment_time: validatedData.appointment_time,
                status: initialStatus,
            })
            .select()
            .single()

        if (appointmentError) {
            // Handle unique constraint violation (double booking)
            if (appointmentError.code === '23505') {
                const { data: availableSlots } = await supabase
                    .rpc('get_available_slots', {
                        p_doctor_id: validatedData.doctor_id,
                        p_date: validatedData.appointment_date,
                    })

                throw new ConflictError(
                    'Este horário acabou de ser reservado. Escolha outro horário.',
                    {
                        available_slots: availableSlots?.map((slot: { slot_time: string }) => slot.slot_time) || [],
                    }
                )
            }
            throw appointmentError
        }

        // 7. Handle Payment if required
        if (isPrepaid) {
            const { data: payment, error: paymentError } = await supabase
                .from('payments')
                .insert({
                    clinic_id: clinic.id,
                    appointment_id: appointment.id,
                    patient_id: patientId,
                    amount: doctor.consultation_price,
                    status: 'PENDING',
                    mercadopago_external_reference: appointment.id,
                })
                .select()
                .single()

            if (paymentError) throw paymentError

            // 8. Create Mercado Pago preference
            const doctorName = (doctor.user as { full_name: string })?.full_name || 'Médico'

            const preference = await createPaymentPreference({
                appointment_id: appointment.id,
                amount: doctor.consultation_price,
                patient_email: validatedData.patient.email,
                patient_name: validatedData.patient.full_name,
                description: `Teleconsulta com ${doctorName}`,
                clinic_name: clinic.name,
                clinic_access_token: clinic.mercadopago_access_token || undefined,
            })

            // 9. Update payment with preference ID
            await supabase
                .from('payments')
                .update({
                    mercadopago_preference_id: preference.preference_id,
                })
                .eq('id', payment.id)

            return successResponse(
                {
                    appointment_id: appointment.id,
                    payment_url: preference.init_point,
                    sandbox_payment_url: preference.sandbox_init_point,
                    preference_id: preference.preference_id,
                },
                { status: 201 }
            )
        }

        // 10. Return response for non-prepaid (confirmed directly)
        return successResponse(
            {
                appointment_id: appointment.id,
                message: 'Consulta agendada com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}
