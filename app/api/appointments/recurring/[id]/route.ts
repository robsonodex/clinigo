/**
 * PATCH /api/appointments/recurring/[id] - Update/pause/resume a series (includes day/time changes)
 * DELETE /api/appointments/recurring/[id] - Cancel a series and all future appointments
 * GET /api/appointments/recurring/[id] - Get series details
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
        const dayOfWeek = current.getDay()
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

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params
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

        const { data: series, error } = await supabase
            .from('recurring_appointment_series')
            .select(`
                *,
                patient:patients(id, full_name, phone),
                doctor:doctors(id, user:users(full_name), specialty)
            `)
            .eq('id', seriesId)
            .eq('clinic_id', (profile as any).clinic_id)
            .single() as { data: any; error: any }

        if (error || !series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        // Count future appointments
        const today = new Date().toISOString().split('T')[0]
        const { count } = await supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('series_id', seriesId)
            .gte('appointment_date', today)
            .not('status', 'in', '("CANCELLED")')

        return NextResponse.json({ ...(series as any), future_appointments_count: count || 0 })

    } catch (error) {
        console.error('Get series error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params
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

        // Verify series exists and belongs to clinic - fetch full data for schedule changes
        const { data: series } = await supabase
            .from('recurring_appointment_series')
            .select('*')
            .eq('id', seriesId)
            .eq('clinic_id', (profile as any).clinic_id)
            .single() as { data: any }

        if (!series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        const body = await request.json()

        // Detect if schedule is changing (day/time)
        const isScheduleChange =
            (body.days_of_week && JSON.stringify(body.days_of_week) !== JSON.stringify(series.days_of_week)) ||
            (body.appointment_time && body.appointment_time !== series.appointment_time)

        if (isScheduleChange) {
            // === SCHEDULE CHANGE: Recalculate and regenerate future appointments ===
            const newDays: number[] = body.days_of_week || series.days_of_week
            const newTime: string = body.appointment_time || series.appointment_time
            const doctorId = series.doctor_id
            const today = new Date().toISOString().split('T')[0]

            // Validate days_of_week
            const validDays = newDays.every((d: number) => d >= 0 && d <= 6)
            if (!validDays) {
                return NextResponse.json(
                    { error: 'Dias da semana inválidos. Use 0=Domingo a 6=Sábado' },
                    { status: 400 }
                )
            }

            // Generate new dates from today to end_date
            const newDates = generateDatesForSeries(newDays, today, series.end_date)

            if (newDates.length === 0) {
                return NextResponse.json(
                    { error: 'Nenhuma data futura encontrada para os dias selecionados' },
                    { status: 400 }
                )
            }

            // Check for conflicts with OTHER appointments (not from this series)
            const { data: conflicts } = await supabase
                .from('appointments')
                .select('appointment_date, appointment_time')
                .eq('doctor_id', doctorId)
                .eq('appointment_time', newTime)
                .in('appointment_date', newDates)
                .not('status', 'in', '("CANCELLED")')
                .neq('series_id', seriesId)

            if (conflicts && conflicts.length > 0) {
                const conflictDates = conflicts.map((c: any) => c.appointment_date)
                return NextResponse.json(
                    {
                        error: 'Existem conflitos de horário com outros agendamentos nas datas abaixo.',
                        conflict: true,
                        conflicting_dates: conflictDates,
                        total_conflicts: conflictDates.length,
                    },
                    { status: 409 }
                )
            }

            // Step 1: Delete all future appointments from this series (CONFIRMED/PENDING_PAYMENT)
            const { error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .eq('series_id', seriesId)
                .gte('appointment_date', today)
                .in('status', ['CONFIRMED', 'PENDING_PAYMENT'])

            if (deleteError) {
                console.error('Error deleting old appointments:', deleteError)
                return NextResponse.json(
                    { error: 'Erro ao remover agendamentos antigos' },
                    { status: 500 }
                )
            }

            // Step 2: Also clean up any CANCELLED appointments on the new dates that would block inserts
            await supabase
                .from('appointments')
                .delete()
                .eq('doctor_id', doctorId)
                .eq('appointment_time', newTime)
                .in('appointment_date', newDates)
                .eq('status', 'CANCELLED')

            // Step 3: Create new appointments on the correct dates
            const newAppointments = newDates.map(date => ({
                id: crypto.randomUUID(),
                clinic_id: (profile as any).clinic_id,
                doctor_id: doctorId,
                patient_id: series.patient_id,
                appointment_date: date,
                appointment_time: newTime,
                status: 'CONFIRMED' as const,
                payment_type: series.payment_type || 'PARTICULAR',
                appointment_type: series.appointment_type || 'presencial',
                health_insurance_plan_id: series.health_insurance_plan_id || null,
                series_id: seriesId,
            }))

            // Insert in batches
            const batchSize = 100
            let totalCreated = 0

            for (let i = 0; i < newAppointments.length; i += batchSize) {
                const batch = newAppointments.slice(i, i + batchSize)
                const { error: batchError } = await supabase
                    .from('appointments')
                    .insert(batch as any)

                if (batchError) {
                    console.error(`Batch error (${i}-${i + batch.length}):`, batchError)
                } else {
                    totalCreated += batch.length
                }
            }

            // Step 4: Update the series record
            const seriesUpdate: Record<string, unknown> = {
                days_of_week: newDays,
                appointment_time: newTime,
                updated_at: new Date().toISOString(),
            }
            if (body.therapy_type !== undefined) seriesUpdate.therapy_type = body.therapy_type
            if (body.notes !== undefined) seriesUpdate.notes = body.notes

            const { error: seriesUpdateError } = await supabase
                .from('recurring_appointment_series')
                .update(seriesUpdate as any)
                .eq('id', seriesId)

            if (seriesUpdateError) {
                console.error('Error updating series:', seriesUpdateError)
            }

            const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
            const dayLabels = newDays.map((d: number) => dayNames[d]).join(', ')

            return NextResponse.json({
                success: true,
                schedule_changed: true,
                total_created: totalCreated,
                new_days: dayLabels,
                new_time: newTime,
                message: `Série atualizada com sucesso! ${totalCreated} agendamentos reagendados para ${dayLabels} às ${newTime}.`,
            })
        }

        // === SIMPLE UPDATE: Only metadata fields ===
        const updateData: Record<string, unknown> = {}

        if (typeof body.is_active === 'boolean') {
            updateData.is_active = body.is_active
        }
        if (body.therapy_type !== undefined) {
            updateData.therapy_type = body.therapy_type
        }
        if (body.notes !== undefined) {
            updateData.notes = body.notes
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'Nenhum campo para atualizar' },
                { status: 400 }
            )
        }

        const { error: updateError } = await supabase
            .from('recurring_appointment_series')
            .update(updateData as any)
            .eq('id', seriesId)

        if (updateError) {
            console.error('Error updating series:', updateError)
            return NextResponse.json(
                { error: 'Erro ao atualizar série' },
                { status: 500 }
            )
        }

        const action = updateData.is_active === false ? 'pausada' : updateData.is_active === true ? 'reativada' : 'atualizada'

        return NextResponse.json({
            success: true,
            message: `Série ${action} com sucesso`,
        })

    } catch (error) {
        console.error('Update series error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params
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

        // Verify series exists
        const { data: series } = await supabase
            .from('recurring_appointment_series')
            .select('id, clinic_id')
            .eq('id', seriesId)
            .eq('clinic_id', (profile as any).clinic_id)
            .single()

        if (!series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        const today = new Date().toISOString().split('T')[0]

        // Cancel all future CONFIRMED appointments from this series
        const { data: cancelledAppointments, error: cancelError } = await supabase
            .from('appointments')
            .update({
                status: 'CANCELLED',
                cancellation_reason: 'Série recorrente cancelada',
                cancelled_at: new Date().toISOString(),
                cancelled_by: user.id,
            } as any)
            .eq('series_id', seriesId)
            .gte('appointment_date', today)
            .in('status', ['CONFIRMED', 'PENDING_PAYMENT'])
            .select('id')

        if (cancelError) {
            console.error('Error cancelling series appointments:', cancelError)
        }

        // Deactivate the series
        const { error: deactivateError } = await supabase
            .from('recurring_appointment_series')
            .update({ is_active: false } as any)
            .eq('id', seriesId)

        if (deactivateError) {
            console.error('Error deactivating series:', deactivateError)
            return NextResponse.json(
                { error: 'Erro ao cancelar série' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            cancelled_appointments: cancelledAppointments?.length || 0,
            message: `Série cancelada. ${cancelledAppointments?.length || 0} agendamento(s) futuro(s) cancelado(s).`,
        })

    } catch (error) {
        console.error('Delete series error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
