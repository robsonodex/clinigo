/**
 * POST /api/appointments/recurring - Create recurring appointment series
 * GET /api/appointments/recurring - List recurring series for the clinic
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface RecurringSeriesRequest {
    patient_id: string
    doctor_id: string
    days_of_week: number[]       // [1, 3] = Monday + Wednesday
    appointment_time: string     // "08:00"
    therapy_type?: string        // "ABA", "Fono", etc.
    start_date: string           // "2026-01-01"
    end_date: string             // "2026-12-31"
    payment_type?: string        // "PARTICULAR" | "CONVENIO"
    appointment_type?: string    // "presencial" | "online"
    health_insurance_plan_id?: string
    notes?: string
}

/**
 * Generate all dates matching days_of_week between start and end
 */
function generateDatesForSeries(
    daysOfWeek: number[],
    startDate: string,
    endDate: string
): string[] {
    const dates: string[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')

    const current = new Date(start)
    while (current <= end) {
        const dayOfWeek = current.getDay() // 0=Sunday, 1=Monday, etc.
        if (daysOfWeek.includes(dayOfWeek)) {
            const yyyy = current.getFullYear()
            const mm = String(current.getMonth() + 1).padStart(2, '0')
            const dd = String(current.getDate()).padStart(2, '0')
            dates.push(`${yyyy}-${mm}-${dd}`)
        }
        current.setDate(current.getDate() + 1)
    }

    return dates
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR']
        if (!allowedRoles.includes(profile.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const body: RecurringSeriesRequest = await request.json()
        const clinicId = profile.clinic_id

        // Validate required fields
        if (!body.patient_id || !body.doctor_id || !body.days_of_week?.length || !body.appointment_time || !body.start_date || !body.end_date) {
            return NextResponse.json(
                { error: 'Paciente, médico, dias da semana, horário, data início e data fim são obrigatórios' },
                { status: 400 }
            )
        }

        // Validate days_of_week values
        const validDays = body.days_of_week.every(d => d >= 0 && d <= 6)
        if (!validDays) {
            return NextResponse.json(
                { error: 'Dias da semana inválidos. Use 0=Domingo a 6=Sábado' },
                { status: 400 }
            )
        }

        // Validate date range
        if (new Date(body.end_date) <= new Date(body.start_date)) {
            return NextResponse.json(
                { error: 'Data fim deve ser posterior à data início' },
                { status: 400 }
            )
        }

        // Validate doctor belongs to clinic
        const { data: doctor } = await supabase
            .from('doctors')
            .select('id, consultation_price, user:users(full_name)')
            .eq('id', body.doctor_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!doctor) {
            return NextResponse.json(
                { error: 'Médico/Terapeuta não encontrado nesta clínica' },
                { status: 404 }
            )
        }

        // Validate patient belongs to clinic
        const { data: patient } = await supabase
            .from('patients')
            .select('id, full_name')
            .eq('id', body.patient_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!patient) {
            return NextResponse.json(
                { error: 'Paciente não encontrado nesta clínica' },
                { status: 404 }
            )
        }

        // Generate all dates for the series
        const allDates = generateDatesForSeries(body.days_of_week, body.start_date, body.end_date)

        if (allDates.length === 0) {
            return NextResponse.json(
                { error: 'Nenhuma data encontrada para os dias da semana selecionados no período informado' },
                { status: 400 }
            )
        }

        // Check ALL dates for conflicts - if any conflict exists, BLOCK creation
        const { data: conflicts } = await supabase
            .from('appointments')
            .select('appointment_date, appointment_time')
            .eq('doctor_id', body.doctor_id)
            .eq('appointment_time', body.appointment_time)
            .in('appointment_date', allDates)
            .not('status', 'in', '("CANCELLED")')

        if (conflicts && conflicts.length > 0) {
            const conflictDates = conflicts.map((c: any) => c.appointment_date)
            return NextResponse.json(
                {
                    error: 'Existem conflitos de horário nas datas abaixo. Resolva os conflitos antes de criar a série.',
                    conflict: true,
                    conflicting_dates: conflictDates,
                    total_conflicts: conflictDates.length,
                    total_planned: allDates.length,
                },
                { status: 409 }
            )
        }

        // Create the series record
        const seriesId = uuidv4()
        const { error: seriesError } = await supabase
            .from('recurring_appointment_series')
            .insert({
                id: seriesId,
                clinic_id: clinicId,
                patient_id: body.patient_id,
                doctor_id: body.doctor_id,
                days_of_week: body.days_of_week,
                appointment_time: body.appointment_time,
                therapy_type: body.therapy_type || null,
                start_date: body.start_date,
                end_date: body.end_date,
                payment_type: body.payment_type || 'PARTICULAR',
                appointment_type: body.appointment_type || 'presencial',
                health_insurance_plan_id: body.health_insurance_plan_id || null,
                notes: body.notes || null,
                is_active: true,
                created_by: user.id,
            })

        if (seriesError) {
            console.error('Error creating recurring series:', seriesError)
            return NextResponse.json(
                { error: 'Erro ao criar série recorrente', details: seriesError.message },
                { status: 500 }
            )
        }

        // Remove CANCELLED appointments that would conflict with the new series
        // The UNIQUE constraint (doctor_id, appointment_date, appointment_time) blocks inserts
        // even when the existing appointment is cancelled
        const { error: cleanupError } = await supabase
            .from('appointments')
            .delete()
            .eq('doctor_id', body.doctor_id)
            .eq('appointment_time', body.appointment_time)
            .in('appointment_date', allDates)
            .eq('status', 'CANCELLED')

        if (cleanupError) {
            console.error('Error cleaning up cancelled appointments:', cleanupError)
            // Non-blocking: proceed anyway, individual inserts may still succeed
        }

        // Generate all appointments in batch
        const appointmentRecords = allDates.map(date => ({
            id: uuidv4(),
            clinic_id: clinicId,
            doctor_id: body.doctor_id,
            patient_id: body.patient_id,
            appointment_date: date,
            appointment_time: body.appointment_time,
            status: 'CONFIRMED' as const,
            payment_type: body.payment_type === 'CONVENIO' ? 'CONVENIO' : 'PARTICULAR',
            appointment_type: body.appointment_type || 'presencial',
            health_insurance_plan_id: body.health_insurance_plan_id || null,
            series_id: seriesId,
        }))

        // Insert in batches of 100 to avoid payload limits
        const batchSize = 100
        let totalCreated = 0
        const errors: string[] = []

        for (let i = 0; i < appointmentRecords.length; i += batchSize) {
            const batch = appointmentRecords.slice(i, i + batchSize)
            const { error: batchError } = await supabase
                .from('appointments')
                .insert(batch)

            if (batchError) {
                console.error(`Batch error (${i}-${i + batch.length}):`, batchError)
                errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${batchError.message}`)
            } else {
                totalCreated += batch.length
            }
        }

        if (totalCreated === 0) {
            // Rollback: delete the series if no appointments were created
            await supabase
                .from('recurring_appointment_series')
                .delete()
                .eq('id', seriesId)

            return NextResponse.json(
                { error: 'Nenhum agendamento foi criado', details: errors },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            series_id: seriesId,
            total_created: totalCreated,
            total_planned: allDates.length,
            patient_name: patient.full_name,
            doctor_name: (doctor as any).user?.full_name || 'Terapeuta',
            therapy_type: body.therapy_type,
            errors: errors.length > 0 ? errors : undefined,
            message: `${totalCreated} agendamentos criados com sucesso para a série recorrente`,
        })

    } catch (error) {
        console.error('Recurring appointment error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const activeOnly = searchParams.get('active') !== 'false'
        const patientId = searchParams.get('patient_id')
        const doctorId = searchParams.get('doctor_id')

        let query = supabase
            .from('recurring_appointment_series')
            .select(`
                *,
                patient:patients(id, full_name, phone),
                doctor:doctors(id, user:users(full_name), specialty),
                created_by_user:users!recurring_appointment_series_created_by_fkey(full_name)
            `)
            .eq('clinic_id', profile.clinic_id)
            .order('created_at', { ascending: false })

        if (activeOnly) {
            query = query.eq('is_active', true)
        }
        if (patientId) {
            query = query.eq('patient_id', patientId)
        }
        if (doctorId) {
            query = query.eq('doctor_id', doctorId)
        }

        const { data: series, error } = await query

        if (error) {
            console.error('Error fetching recurring series:', error)
            return NextResponse.json(
                { error: 'Erro ao buscar séries recorrentes' },
                { status: 500 }
            )
        }

        return NextResponse.json(series || [])

    } catch (error) {
        console.error('Recurring series list error:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
