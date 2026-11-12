import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
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
import { generateQRToken, generateWhatsAppShareUrl, generateCheckinUrl } from '@/lib/utils/qr-code'
// Gateway-Agnostic: Mercado Pago removido - clínica gerencia pagamentos externamente

// In-memory short-lived caches to eliminate redundant round-trips on high-frequency agenda fetches
const userContextCache = new Map<string, { clinic_id: string | null; role: string | null; is_coordinator: boolean; doctorId: string | null; expiresAt: number }>()
const clinicDoctorsCache = new Map<string, { doctorsMap: Map<string, any>; expiresAt: number }>()

const APPOINTMENT_SCALAR_COLUMNS = [
    'id', 'clinic_id', 'doctor_id', 'patient_id', 'appointment_date', 'appointment_time',
    'status', 'cancellation_reason', 'cancelled_at', 'cancelled_by', 'video_link', 'video_room_id',
    'created_at', 'updated_at', 'appointment_type', 'payment_type',
    'health_insurance_plan_id', 'insurance_card_number', 'insurance_card_validity', 'source',
    'created_by_user_id', 'manual_payment_type', 'manual_payment_details', 'schedule_overrides',
    'checked_in_at', 'checked_in_by', 'priority_level', 'waiting_room_notes', 'ticket_number',
    'confirmation_status', 'no_show', 'no_show_reason', 'started_at', 'completed_at',
    'reception_notes', 'marked_no_show_at', 'marked_no_show_by', 'called_at', 'called_by',
    'consulting_room_id', 'series_id', 'therapy_modality', 'session_format',
    'was_late_cancel', 'late_cancel_charged', 'late_cancel_hours', 'discharge_type', 'discharge_notes',
    'discharge_date', 'session_status', 'session_status_notes', 'digital_signature_hash',
    'digital_signature_at', 'digital_signature_by', 'rate_source', 'repasse_rate_id', 'co_doctor_id',
    'professional_supervised_id', 'supervision_notes', 'checkin_confirmed_at', 'checkin_method',
    'therapist_start_verified_at', 'doctor_checked_in_at', 'doctor_checked_in_by',
    'doctor_checkin_method', 'verification_level', 'repasse_amount', 'repasse_rate_applied',
    'repasse_contract_id', 'in_consultation_at', 'manual_checkin_unlocked_at',
    'manual_checkin_unlocked_by', 'digital_signature_date', 'digital_signature_signer', 'student_id',
    'mentoring_notes'
].join(', ')

/**
 * GET - List appointments (authenticated users only)
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            return handleApiError(new BadRequestError('Não autorizado'))
        }

        const { searchParams } = new URL(request.url)
        const query = listAppointmentsQuerySchema.parse(Object.fromEntries(searchParams))
        let { page, pageSize, offset } = parsePaginationParams(searchParams)

        // Allow larger page size for agenda/calendar views if explicitly requested
        const requestedPageSize = parseInt(searchParams.get('pageSize') || searchParams.get('page_size') || '0', 10)
        if (requestedPageSize > 100) {
            pageSize = Math.min(requestedPageSize, 1500)
            offset = (page - 1) * pageSize
        }

        const isStaff = userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN' || userRole === 'RECEPTIONIST' || userRole === 'DOCTOR'
        const adminClient = createServiceRoleClient() as any
        const supabase = isStaff ? adminClient : (await createClient() as any)

        // Resolve user context + doctorId with 60s cache (and parallel lookup on cold cache)
        const now = Date.now()
        let cachedCtx = userContextCache.get(userId)
        if (!cachedCtx || cachedCtx.expiresAt < now) {
            const [userRes, docRes] = await Promise.all([
                adminClient
                    .from('users')
                    .select('clinic_id, role, is_coordinator')
                    .eq('id', userId)
                    .maybeSingle(),
                adminClient
                    .from('doctors')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle()
            ])
            cachedCtx = {
                clinic_id: userRes.data?.clinic_id || null,
                role: userRes.data?.role || userRole || null,
                is_coordinator: !!userRes.data?.is_coordinator,
                doctorId: docRes.data?.id || null,
                expiresAt: now + 60_000,
            }
            userContextCache.set(userId, cachedCtx)
        }

        // Resolve effective clinic id with strict priority:
        // 1. Direct query param (allowed ONLY for SUPER_ADMIN)
        // 2. Verified header from middleware (session or impersonation)
        // 3. User's database profile clinic_id
        // 4. Impersonation cookie fallback for SUPER_ADMIN
        let effectiveClinicId: string | null = null
        if (query.clinic_id && userRole === 'SUPER_ADMIN') {
            effectiveClinicId = query.clinic_id
        } else if (request.headers.get('x-clinic-id')) {
            effectiveClinicId = request.headers.get('x-clinic-id')
        } else if (cachedCtx.clinic_id) {
            effectiveClinicId = cachedCtx.clinic_id
        } else if (userRole === 'SUPER_ADMIN') {
            effectiveClinicId = request.cookies.get('impersonation_clinic_id')?.value || null
        }

        // Security boundary: Non-superadmin users MUST be bounded to their own clinic
        if (userRole !== 'SUPER_ADMIN' && !effectiveClinicId) {
            return paginatedResponse(buildPaginatedData([], 0, page, pageSize))
        }

        const isCoordinator = cachedCtx.is_coordinator
        let targetDoctorId: string | null = null
        if (query.doctor_id && (userRole !== 'DOCTOR' || isCoordinator)) {
            targetDoctorId = query.doctor_id
        } else if ((cachedCtx.role === 'DOCTOR' || userRole === 'DOCTOR') && !isCoordinator) {
            if (!cachedCtx.doctorId) {
                return paginatedResponse(buildPaginatedData([], 0, page, pageSize))
            }
            targetDoctorId = cachedCtx.doctorId
        }

        const applyCommonFilters = (qb: any) => {
            let b = qb
            if (query.status) {
                b = b.eq('status', query.status)
            }
            if (query.appointment_type) {
                if (['online', 'telemedicina', 'teleconsulta'].includes(query.appointment_type.toLowerCase())) {
                    b = b.in('appointment_type', ['online', 'telemedicina', 'TELEMEDICINA', 'teleconsulta', 'TELECONSULTA'])
                } else {
                    b = b.eq('appointment_type', query.appointment_type)
                }
            }
            if (query.patient_id) {
                b = b.eq('patient_id', query.patient_id)
            }
            if (query.date_from) {
                b = b.gte('appointment_date', query.date_from)
            }
            if (query.date_to) {
                b = b.lte('appointment_date', query.date_to)
            }
            return b
        }

        let rawAppointments: any[] = []

        if (targetDoctorId) {
            // Query primary doctor_id and co_doctor_id separately without clinic_id/order_time planner trap
            // so PostgreSQL uses idx_appointments_doctor_date / idx_appointments_doctor_date_status directly
            // instead of scanning all 59k+ clinic rows in idx_appointments_clinic_date_time.
            const fetchLimit = Math.min(offset + pageSize + 40, 1500)
            const [primaryRes, coDoctorRes] = await Promise.all([
                applyCommonFilters(
                    supabase
                        .from('appointments')
                        .select(APPOINTMENT_SCALAR_COLUMNS)
                        .eq('doctor_id', targetDoctorId)
                )
                    .order('appointment_date', { ascending: true })
                    .limit(fetchLimit),
                applyCommonFilters(
                    supabase
                        .from('appointments')
                        .select(APPOINTMENT_SCALAR_COLUMNS)
                        .eq('co_doctor_id', targetDoctorId)
                )
                    .limit(fetchLimit)
            ])

            if (primaryRes.error) throw primaryRes.error
            if (coDoctorRes.error) throw coDoctorRes.error

            const seenIds = new Set<string>()
            for (const apt of [...(primaryRes.data || []), ...(coDoctorRes.data || [])]) {
                if (!apt || seenIds.has(apt.id)) continue
                // Strict multi-tenant isolation check
                if (effectiveClinicId && apt.clinic_id !== effectiveClinicId) continue
                // Exclui cancelamentos decorrentes de exclusão de série recorrente
                if (apt.cancellation_reason === 'Série recorrente cancelada') continue
                seenIds.add(apt.id)
                rawAppointments.push(apt)
            }

            rawAppointments.sort((a, b) => {
                const d = (a.appointment_date || '').localeCompare(b.appointment_date || '')
                if (d !== 0) return d
                return (a.appointment_time || '').localeCompare(b.appointment_time || '')
            })
            rawAppointments = rawAppointments.slice(offset, offset + pageSize)
        } else {
            // Clinic-wide query using idx_appointments_clinic_date_time without unindexed OR filters
            let qb = supabase
                .from('appointments')
                .select(APPOINTMENT_SCALAR_COLUMNS)
            if (effectiveClinicId) {
                qb = qb.eq('clinic_id', effectiveClinicId)
            }
            qb = applyCommonFilters(qb)
                .order('appointment_date', { ascending: true })
                .order('appointment_time', { ascending: true })
                .range(offset, offset + pageSize + 30)

            const { data, error } = await qb
            if (error) throw error

            rawAppointments = (data || [])
                .filter((apt: any) => apt.cancellation_reason !== 'Série recorrente cancelada')
                .slice(0, pageSize)
        }

        if (rawAppointments.length === 0) {
            return paginatedResponse(buildPaginatedData([], 0, page, pageSize))
        }

        // Batch hydrate relations (doctors, patients, students, payments, video_rooms) in parallel
        // instead of executing 7 nested LATERAL JOINs per row in PostgreSQL.
        const uniqueDoctorIds = [...new Set(
            rawAppointments.flatMap((a: any) => [a.doctor_id, a.co_doctor_id, a.professional_supervised_id]).filter(Boolean)
        )] as string[]
        const uniquePatientIds = [...new Set(rawAppointments.map((a: any) => a.patient_id).filter(Boolean))] as string[]
        const uniqueStudentIds = [...new Set(rawAppointments.map((a: any) => a.student_id).filter(Boolean))] as string[]
        const onlineAptIds = rawAppointments
            .filter((a: any) => a.video_room_id || ['online', 'telemedicina', 'TELEMEDICINA', 'teleconsulta', 'TELECONSULTA'].includes(a.appointment_type || ''))
            .map((a: any) => a.id) as string[]
        const allAptIds = rawAppointments.map((a: any) => a.id) as string[]

        const chunkArray = <T,>(arr: T[], size: number): T[][] => {
            const chunks: T[][] = []
            for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
            return chunks
        }

        const getDoctorsMap = async (): Promise<Map<string, any>> => {
            if (uniqueDoctorIds.length === 0) return new Map()
            if (effectiveClinicId) {
                const cached = clinicDoctorsCache.get(effectiveClinicId)
                if (cached && cached.expiresAt > now) {
                    const hasAll = uniqueDoctorIds.every(id => cached.doctorsMap.has(id))
                    if (hasAll) return cached.doctorsMap
                }
            }
            const { data: docs } = await adminClient
                .from('doctors')
                .select('id, crm, specialty, consultation_price, consultation_duration, user:users(full_name, email, avatar_url)')
                .in('id', uniqueDoctorIds)
            const map = new Map<string, any>()
            for (const d of docs || []) map.set(d.id, d)
            if (effectiveClinicId && map.size > 0) {
                const existing = clinicDoctorsCache.get(effectiveClinicId)?.doctorsMap || new Map<string, any>()
                for (const [k, v] of map.entries()) existing.set(k, v)
                clinicDoctorsCache.set(effectiveClinicId, { doctorsMap: existing, expiresAt: now + 60_000 })
            }
            return map
        }

        const [doctorsMap, patientsChunks, studentsRes, paymentsChunks, videoRoomsRes] = await Promise.all([
            getDoctorsMap(),
            Promise.all(
                chunkArray(uniquePatientIds, 200).map(chunk =>
                    adminClient.from('patients').select('id, full_name, email, phone, cpf').in('id', chunk)
                )
            ),
            uniqueStudentIds.length > 0
                ? adminClient.from('students').select('id, full_name, contact_phone, contact_email, program').in('id', uniqueStudentIds)
                : Promise.resolve({ data: [] }),
            Promise.all(
                chunkArray(allAptIds, 200).map(chunk =>
                    adminClient.from('payments').select('id, appointment_id, status, amount, payment_method').in('appointment_id', chunk)
                )
            ),
            onlineAptIds.length > 0
                ? adminClient.from('video_rooms').select('appointment_id, room_id, patient_token, doctor_token').in('appointment_id', onlineAptIds)
                : Promise.resolve({ data: [] })
        ])

        const patientsMap = new Map<string, any>()
        for (const res of patientsChunks) {
            for (const p of res.data || []) patientsMap.set(p.id, p)
        }

        const studentsMap = new Map<string, any>()
        for (const s of studentsRes.data || []) studentsMap.set(s.id, s)

        const paymentsMap = new Map<string, any[]>()
        for (const res of paymentsChunks) {
            for (const pay of res.data || []) {
                const list = paymentsMap.get(pay.appointment_id) || []
                list.push({ id: pay.id, status: pay.status, amount: pay.amount, payment_method: pay.payment_method })
                paymentsMap.set(pay.appointment_id, list)
            }
        }

        const videoRoomsMap = new Map<string, any[]>()
        for (const vr of videoRoomsRes.data || []) {
            const list = videoRoomsMap.get(vr.appointment_id) || []
            list.push({ room_id: vr.room_id, patient_token: vr.patient_token, doctor_token: vr.doctor_token })
            videoRoomsMap.set(vr.appointment_id, list)
        }

        const formattedAppointments = rawAppointments.map((apt: any) => {
            const vrs = videoRoomsMap.get(apt.id) || []
            return {
                ...apt,
                doctor: apt.doctor_id ? (doctorsMap.get(apt.doctor_id) || null) : null,
                co_doctor: apt.co_doctor_id ? (doctorsMap.get(apt.co_doctor_id) || null) : null,
                professional_supervised: apt.professional_supervised_id ? (doctorsMap.get(apt.professional_supervised_id) || null) : null,
                student: apt.student_id ? (studentsMap.get(apt.student_id) || null) : null,
                patient: apt.patient_id ? (patientsMap.get(apt.patient_id) || null) : null,
                payment: paymentsMap.get(apt.id) || [],
                video_rooms: vrs,
                video_room: vrs[0] || null,
            }
        })

        return paginatedResponse(
            buildPaginatedData(formattedAppointments, formattedAppointments.length, page, pageSize)
        )
    } catch (error) {
        request.log.error('appointments', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})

/**
 * POST - Create appointment (PUBLIC - booking flow)
 * This is the main public endpoint for patient booking
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const body = await request.json()
        const validatedData = createAppointmentSchema.parse(body)

        // Use service role for public operations (bypasses RLS)
        const supabase = createServiceRoleClient() as any

        // 1. Verify clinic exists and is active
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, mercadopago_access_token, is_active, addons')
            .eq('slug', validatedData.clinic_slug)
            .single()

        if (clinicError || !clinic) {
            throw new NotFoundError('Clínica')
        }

        // Type-safe extraction for clinic
        const clinicData = clinic as { id?: string; name?: string; is_active?: boolean; mercadopago_access_token?: string; addons?: Record<string, unknown> } | null

        if (!clinicData?.is_active) {
            throw new BadRequestError('Esta clínica não está aceitando agendamentos')
        }

        // Note: Appointment limits have been removed - all plans have unlimited consultations

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



        const isPrepaid = !!clinic.addons?.prepaid_booking && validatedData.payment_type !== 'CONVENIO'
        const initialStatus = isPrepaid ? 'PENDING_PAYMENT' : 'CONFIRMED'

        // 6. Create appointment (limpando registro cancelado prévio no mesmo slot se houver)
        try {
            const adminDb = createServiceRoleClient() as any
            const { data: cancelledSlot } = await adminDb
                .from('appointments')
                .select('id')
                .eq('doctor_id', validatedData.doctor_id)
                .eq('appointment_date', validatedData.appointment_date)
                .eq('appointment_time', validatedData.appointment_time)
                .eq('status', 'CANCELLED')
                .maybeSingle()

            if (cancelledSlot) {
                await adminDb.from('appointment_qr_codes').delete().eq('appointment_id', cancelledSlot.id)
                await adminDb.from('video_rooms').delete().eq('appointment_id', cancelledSlot.id)
                await adminDb.from('appointments').delete().eq('id', cancelledSlot.id)
            }
        } catch { }

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                clinic_id: clinic.id,
                doctor_id: validatedData.doctor_id,
                patient_id: patientId,
                appointment_date: validatedData.appointment_date,
                appointment_time: validatedData.appointment_time,
                status: initialStatus,
                payment_type: validatedData.payment_type || 'PARTICULAR',
                appointment_type: validatedData.type || 'IN_PERSON', // TELEMEDICINA, online or IN_PERSON
                health_insurance_plan_id: validatedData.health_insurance_plan_id || null,
                insurance_card_number: validatedData.insurance_card_number || null,
                insurance_card_validity: validatedData.insurance_card_validity || null,
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
                    }) as { data: Array<{ slot_time: string }> | null }

                throw new ConflictError(
                    'Este horário acabou de ser reservado. Escolha outro horário.',
                    {
                        available_slots: (availableSlots || []).map(slot => slot.slot_time),
                    }
                )
            }
            throw appointmentError
        }

        // 6.1 Auto-insert into CRM funnel (non-blocking)
        try {
            const { data: existingCrmStage } = await supabase
                .from('crm_stages')
                .select('id, stage')
                .eq('patient_id', patientId)
                .eq('clinic_id', clinic.id)
                .single()

            if (!existingCrmStage) {
                // New patient in CRM — enter as 'lead'
                await supabase.from('crm_stages').insert({
                    patient_id: patientId,
                    clinic_id: clinic.id,
                    stage: 'lead',
                    created_at: new Date().toISOString(),
                })
                console.log('[CRM] New lead created for patient:', patientId)
            } else if (existingCrmStage.stage === 'lead') {
                // Already a lead — advance to 'agendou'
                await supabase
                    .from('crm_stages')
                    .update({ stage: 'agendou' })
                    .eq('id', existingCrmStage.id)
                console.log('[CRM] Lead advanced to agendou for patient:', patientId)
            }
            // If stage is 'compareceu', 'retornou', or 'recorrente' — don't regress
        } catch (crmError) {
        request.log.error('appointments', { error: crmError instanceof Error ? crmError.message : String(crmError) })
            console.error('[CRM] Non-blocking CRM insert error:', crmError)
            // Never block appointment creation due to CRM failure
        }

        // 6.2 Auto-create video_room for TELEMEDICINA appointments
        let videoRoom = null
        // Check for both 'TELEMEDICINA' and 'online' as both are valid teleconsulta types
        const appointmentType = validatedData.type || 'IN_PERSON'
        if (appointmentType === 'TELEMEDICINA' || appointmentType === 'online') {
            const roomId = `room_${appointment.id.substring(0, 8)}_${Date.now()}`
            const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}`
            const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}`

            const { data: createdRoom, error: roomError } = await supabase
                .from('video_rooms')
                .insert({
                    appointment_id: appointment.id,
                    room_id: roomId,
                    patient_token: patientToken,
                    doctor_token: doctorToken,
                })
                .select()
                .single()

            if (roomError) {
                console.error('[VIDEO_ROOM] Error creating room:', roomError)
                // Don't fail the appointment creation, just log the error
            } else {
                videoRoom = createdRoom
            }
        }


        // 7. Handle Payment Registration (Gateway-Agnostic)
        // Agora apenas registramos que pagamento é necessário, sem gateway integrado
        if (isPrepaid) {
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    clinic_id: clinic.id,
                    appointment_id: appointment.id,
                    patient_id: patientId,
                    amount: doctor.consultation_price,
                    status: 'PENDING',
                } as Record<string, unknown>)

            if (paymentError) throw paymentError

            // Buscar dados da clínica para instruções de pagamento
            const { data: clinicPaymentInfo } = await supabase
                .from('clinics')
                .select('pix_key, bank_account_info, payment_instructions, phone, email')
                .eq('id', clinic.id)
                .single()

            const doctorName = (doctor.user as { full_name: string })?.full_name || 'Médico'

            // Generate QR Code token
            const qrToken = generateQRToken(appointment.id)
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
            const checkinUrl = generateCheckinUrl(baseUrl, appointment.id)
            const whatsappShareUrl = generateWhatsAppShareUrl({
                clinicName: clinic.name,
                doctorName,
                appointmentDate: validatedData.appointment_date,
                appointmentTime: validatedData.appointment_time,
                appointmentId: appointment.id,
                baseUrl,
            })

            // 🔥 FIX: Save QR code token to database
            const { error: qrError } = await supabase
                .from('appointment_qr_codes')
                .insert({
                    appointment_id: appointment.id,
                    clinic_id: clinic.id,
                    qr_token: qrToken,
                    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
                })

            if (qrError) {
                console.error('[QR_CODE] Error saving QR token:', qrError)
                // Don't fail appointment creation, just log
            }

            // ============================================================
            // SEND NOTIFICATIONS (PREPAID FLOW): Email to Patient + Notification to Clinic
            // ============================================================
            const { data: patientData } = await supabase
                .from('patients')
                .select('full_name, email, phone')
                .eq('id', patientId)
                .single()

            const { data: clinicNotifData } = await supabase
                .from('clinics')
                .select('name, email')
                .eq('id', clinic.id)
                .single()

            const prepaidAppointmentType = validatedData.type || 'IN_PERSON'
            const isPrepaidTelemedicine = prepaidAppointmentType === 'TELEMEDICINA' || prepaidAppointmentType === 'online'

            // Send email to patient
            if (patientData?.email) {
                try {
                    const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                    const QRCode = (await import('qrcode')).default

                    // Generate QR code image for the email
                    let qrCodeImageHtml = ''
                    if (!isPrepaidTelemedicine) {
                        try {
                            const qrImageDataUrl = await QRCode.toDataURL(checkinUrl, {
                                width: 200,
                                margin: 2,
                                color: { dark: '#000000', light: '#FFFFFF' },
                                errorCorrectionLevel: 'M'
                            })
                            qrCodeImageHtml = `
                                <div style="text-align: center; margin: 20px 0;">
                                    <img src="${qrImageDataUrl}" alt="QR Code Check-in" style="width: 200px; height: 200px;"/>
                                    <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Escaneie o QR Code no dia da consulta para fazer check-in</p>
                                </div>
                            `
                        } catch (qrImageError) {
        request.log.error('appointments', { error: qrImageError instanceof Error ? qrImageError.message : String(qrImageError) })
                            console.warn('[EMAIL] QR code image generation failed:', qrImageError)
                        }
                    }

                    // Video link section for telemedicine
                    let videoLinkHtml = ''
                    if (isPrepaidTelemedicine && videoRoom) {
                        const videoUrl = `${baseUrl}/video/${appointment.id}?token=${(videoRoom as any).patient_token}`
                        videoLinkHtml = `
                            <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                                <h3 style="color: #1e40af; margin: 0 0 8px 0;">📹 Link da Teleconsulta</h3>
                                <p style="margin: 0 0 12px 0;">Acesse o link abaixo no horário da consulta:</p>
                                <p style="text-align: center;">
                                    <a href="${videoUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                        Acessar Consulta Online
                                    </a>
                                </p>
                            </div>
                        `
                    }

                    // Pre-checkin section for in-person appointments
                    let checkinHtml = ''
                    if (!isPrepaidTelemedicine) {
                        checkinHtml = `
                            <h3 style="color: #3b82f6;">Faça seu Pré-Check-in Online</h3>
                            <p>Agilize seu atendimento fazendo o pré-check-in antes da consulta:</p>
                            <p style="text-align: center;">
                                <a href="${checkinUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Fazer Pré-Check-in
                                </a>
                            </p>
                            ${qrCodeImageHtml}
                        `
                    }

                    await sendEmailMultiTenant({
                        clinicId: clinic.id,
                        to: patientData.email,
                        subject: `Agendamento Pendente - Complete o Pagamento - ${validatedData.appointment_date} às ${validatedData.appointment_time}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #f59e0b;">Agendamento Pendente de Pagamento</h2>
                                <p>Olá <strong>${patientData.full_name}</strong>,</p>
                                <p>Sua consulta foi pré-agendada. Complete o pagamento para confirmar:</p>
                                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p style="margin: 4px 0;"><strong>Médico:</strong> Dr(a). ${doctorName}</p>
                                    <p style="margin: 4px 0;"><strong>Data:</strong> ${validatedData.appointment_date}</p>
                                    <p style="margin: 4px 0;"><strong>Horário:</strong> ${validatedData.appointment_time}</p>
                                    <p style="margin: 4px 0;"><strong>Clínica:</strong> ${clinicNotifData?.name || clinic.name}</p>
                                    <p style="margin: 4px 0;"><strong>Tipo:</strong> ${isPrepaidTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                    <p style="margin: 4px 0;"><strong>Valor:</strong> R$ ${(doctor.consultation_price / 100).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #f59e0b;">
                                    <h3 style="color: #92400e; margin: 0 0 8px 0;">Instruções de Pagamento</h3>
                                    ${clinicPaymentInfo?.pix_key ? `<p><strong>Chave PIX:</strong> ${clinicPaymentInfo.pix_key}</p>` : ''}
                                    ${clinicPaymentInfo?.bank_account_info ? `<p><strong>Dados Bancários:</strong> ${clinicPaymentInfo.bank_account_info}</p>` : ''}
                                    <p>${clinicPaymentInfo?.payment_instructions || 'Entre em contato com a clínica para realizar o pagamento.'}</p>
                                </div>
                                ${videoLinkHtml}
                                ${checkinHtml}
                                <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                    Este e-mail foi enviado automaticamente. Após o pagamento, sua consulta será confirmada.
                                </p>
                            </div>
                        `,
                    })
                    console.log('[NOTIFICATION] Prepaid patient email sent to:', patientData.email)
                } catch (emailError) {
        request.log.error('appointments', { error: emailError instanceof Error ? emailError.message : String(emailError) })
                    console.error('[NOTIFICATION] Prepaid patient email send failed:', emailError)
                    // Non-blocking - don't fail the appointment creation
                }
            }

            // Send notification to clinic
            if (clinicNotifData?.email) {
                try {
                    const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                    await sendEmailMultiTenant({
                        clinicId: clinic.id,
                        to: clinicNotifData.email,
                        subject: `Novo Agendamento (Pendente Pagamento) - ${patientData?.full_name || 'Paciente'}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h2 style="color: #f59e0b;">Novo Agendamento - Aguardando Pagamento</h2>
                                <p>Um novo agendamento foi realizado e está aguardando confirmação de pagamento:</p>
                                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                    <p style="margin: 4px 0;"><strong>Paciente:</strong> ${patientData?.full_name || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>Email:</strong> ${patientData?.email || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>Telefone:</strong> ${patientData?.phone || 'N/A'}</p>
                                    <p style="margin: 4px 0;"><strong>Médico:</strong> Dr(a). ${doctorName}</p>
                                    <p style="margin: 4px 0;"><strong>Data:</strong> ${validatedData.appointment_date}</p>
                                    <p style="margin: 4px 0;"><strong>Horário:</strong> ${validatedData.appointment_time}</p>
                                    <p style="margin: 4px 0;"><strong>Tipo:</strong> ${isPrepaidTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                    <p style="margin: 4px 0;"><strong>Pagamento:</strong> Particular (Pendente)</p>
                                    <p style="margin: 4px 0;"><strong>💰 Valor:</strong> R$ ${(doctor.consultation_price / 100).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <p style="color: #6b7280; font-size: 14px;">
                                    Aguarde a confirmação do pagamento para liberar o agendamento.
                                </p>
                            </div>
                        `,
                    })
                    console.log('[NOTIFICATION] Prepaid clinic notification sent to:', clinicNotifData.email)
                } catch (emailError) {
        request.log.error('appointments', { error: emailError instanceof Error ? emailError.message : String(emailError) })
                    console.error('[NOTIFICATION] Prepaid clinic email send failed:', emailError)
                    // Non-blocking - don't fail the appointment creation
                }
            }

            // Gateway-Agnostic: Retornar instruções de pagamento em vez de URL do gateway
            return successResponse(
                {
                    appointment_id: appointment.id,
                    status: 'PENDING_PAYMENT',
                    message: 'Agendamento criado! Complete o pagamento para confirmar.',
                    qr_code: {
                        token: qrToken,
                        checkin_url: checkinUrl,
                        whatsapp_share_url: whatsappShareUrl,
                    },
                    payment_instructions: {
                        amount: doctor.consultation_price,
                        doctor_name: doctorName,
                        clinic_name: clinic.name,
                        clinic_phone: clinicPaymentInfo?.phone || null,
                        clinic_email: clinicPaymentInfo?.email || clinic.email,
                        pix_key: clinicPaymentInfo?.pix_key || null,
                        bank_account: clinicPaymentInfo?.bank_account_info || null,
                        instructions: clinicPaymentInfo?.payment_instructions ||
                            'Entre em contato com a clínica para realizar o pagamento.',
                    }
                },
                { status: 201 }
            )
        }



        // 10. Generate QR Code and return response for non-prepaid (confirmed directly)
        const qrToken = generateQRToken(appointment.id)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
        const checkinUrl = generateCheckinUrl(baseUrl, appointment.id)
        const doctorName = (doctor.user as { full_name: string })?.full_name || 'Médico'
        const whatsappShareUrl = generateWhatsAppShareUrl({
            clinicName: clinic.name,
            doctorName,
            appointmentDate: validatedData.appointment_date,
            appointmentTime: validatedData.appointment_time,
            appointmentId: appointment.id,
            baseUrl,
        })

        // 🔥 FIX: Save QR code token to database
        const { error: qrError } = await supabase
            .from('appointment_qr_codes')
            .insert({
                appointment_id: appointment.id,
                clinic_id: clinic.id,
                qr_token: qrToken,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            })

        if (qrError) {
            console.error('[QR_CODE] Error saving QR token:', qrError)
            // Don't fail appointment creation, just log
        }

        // ============================================================
        // SEND NOTIFICATIONS: Email to Patient + Notification to Clinic
        // ============================================================

        // Fetch patient and clinic data for notifications
        const { data: patientData } = await supabase
            .from('patients')
            .select('full_name, email, phone')
            .eq('id', patientId)
            .single()

        const { data: clinicNotifData } = await supabase
            .from('clinics')
            .select('name, email')
            .eq('id', clinic.id)
            .single()

        const notifAppointmentType = validatedData.type || 'IN_PERSON'
        const isTelemedicine = notifAppointmentType === 'TELEMEDICINA' || notifAppointmentType === 'online'

        // Send email to patient
        if (patientData?.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                const QRCode = (await import('qrcode')).default

                // Generate QR code image for the email
                let qrCodeImageHtml = ''
                if (!isTelemedicine) {
                    try {
                        const qrImageDataUrl = await QRCode.toDataURL(checkinUrl, {
                            width: 200,
                            margin: 2,
                            color: { dark: '#000000', light: '#FFFFFF' },
                            errorCorrectionLevel: 'M'
                        })
                        qrCodeImageHtml = `
                            <div style="text-align: center; margin: 20px 0;">
                                <img src="${qrImageDataUrl}" alt="QR Code Check-in" style="width: 200px; height: 200px;"/>
                                <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">Escaneie o QR Code no dia da consulta para fazer check-in</p>
                            </div>
                        `
                    } catch (qrImageError) {
        request.log.error('appointments', { error: qrImageError instanceof Error ? qrImageError.message : String(qrImageError) })
                        console.warn('[EMAIL] QR code image generation failed:', qrImageError)
                    }
                }

                // Video link section for telemedicine
                let videoLinkHtml = ''
                if (isTelemedicine && videoRoom) {
                    const videoUrl = `${baseUrl}/video/${appointment.id}?token=${(videoRoom as any).patient_token}`
                    videoLinkHtml = `
                        <div style="background: #dbeafe; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                            <h3 style="color: #1e40af; margin: 0 0 8px 0;">📹 Link da Teleconsulta</h3>
                            <p style="margin: 0 0 12px 0;">Acesse o link abaixo no horário da consulta:</p>
                            <p style="text-align: center;">
                                <a href="${videoUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                    Acessar Consulta Online
                                </a>
                            </p>
                        </div>
                    `
                }

                // Pre-checkin section for in-person appointments
                let checkinHtml = ''
                if (!isTelemedicine) {
                    checkinHtml = `
                        <h3 style="color: #3b82f6;">Faça seu Pré-Check-in Online</h3>
                        <p>Agilize seu atendimento fazendo o pré-check-in antes da consulta:</p>
                        <p style="text-align: center;">
                            <a href="${checkinUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Fazer Pré-Check-in
                            </a>
                        </p>
                        ${qrCodeImageHtml}
                    `
                }

                await sendEmailMultiTenant({
                    clinicId: clinic.id,
                    to: patientData.email,
                    subject: `Consulta Confirmada - ${validatedData.appointment_date} às ${validatedData.appointment_time}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #10b981;">Agendamento Confirmado</h2>
                            <p>Olá <strong>${patientData.full_name}</strong>,</p>
                            <p>Sua consulta foi agendada com sucesso:</p>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>Médico:</strong> Dr(a). ${doctorName}</p>
                                <p style="margin: 4px 0;"><strong>Data:</strong> ${validatedData.appointment_date}</p>
                                <p style="margin: 4px 0;"><strong>Horário:</strong> ${validatedData.appointment_time}</p>
                                <p style="margin: 4px 0;"><strong>Clínica:</strong> ${clinicNotifData?.name || clinic.name}</p>
                                <p style="margin: 4px 0;"><strong>Tipo:</strong> ${isTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                            </div>
                            ${videoLinkHtml}
                            ${checkinHtml}
                            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                                Este e-mail foi enviado automaticamente. Caso precise cancelar ou reagendar, entre em contato com a clínica.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Patient email sent to:', patientData.email)
            } catch (emailError) {
        request.log.error('appointments', { error: emailError instanceof Error ? emailError.message : String(emailError) })
                console.error('[NOTIFICATION] Patient email send failed:', emailError)
                // Non-blocking - don't fail the appointment creation
            }
        }

        // Send notification to clinic
        if (clinicNotifData?.email) {
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')

                await sendEmailMultiTenant({
                    clinicId: clinic.id,
                    to: clinicNotifData.email,
                    subject: `Novo Agendamento Online - ${patientData?.full_name || 'Paciente'}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #3b82f6;">Novo Agendamento Recebido</h2>
                            <p>Um novo agendamento foi realizado através da página pública de agendamento:</p>
                            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <p style="margin: 4px 0;"><strong>Paciente:</strong> ${patientData?.full_name || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>Email:</strong> ${patientData?.email || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>Telefone:</strong> ${patientData?.phone || 'N/A'}</p>
                                <p style="margin: 4px 0;"><strong>Médico:</strong> Dr(a). ${doctorName}</p>
                                <p style="margin: 4px 0;"><strong>Data:</strong> ${validatedData.appointment_date}</p>
                                <p style="margin: 4px 0;"><strong>Horário:</strong> ${validatedData.appointment_time}</p>
                                <p style="margin: 4px 0;"><strong>Tipo:</strong> ${isTelemedicine ? 'Teleconsulta' : 'Presencial'}</p>
                                <p style="margin: 4px 0;"><strong>Pagamento:</strong> ${validatedData.payment_type === 'CONVENIO' ? 'Convênio' : 'Particular'}</p>
                            </div>
                            <p style="color: #6b7280; font-size: 14px;">
                                O agendamento já está visível na agenda do sistema.
                            </p>
                        </div>
                    `,
                })
                console.log('[NOTIFICATION] Clinic notification sent to:', clinicNotifData.email)
            } catch (emailError) {
        request.log.error('appointments', { error: emailError instanceof Error ? emailError.message : String(emailError) })
                console.error('[NOTIFICATION] Clinic email send failed:', emailError)
                // Non-blocking - don't fail the appointment creation
            }
        }

        return successResponse(
            {
                appointment_id: appointment.id,
                message: 'Consulta agendada com sucesso',
                qr_code: {
                    token: qrToken,
                    checkin_url: checkinUrl,
                    whatsapp_share_url: whatsappShareUrl,
                },
            },
            { status: 201 }
        )

    } catch (error) {
        request.log.error('appointments', { error: error instanceof Error ? error.message : String(error) })
        return handleApiError(error)
    }
})

