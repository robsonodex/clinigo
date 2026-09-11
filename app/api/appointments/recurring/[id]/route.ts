import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { resolveClinicId } from '@/lib/utils/resolve-clinic-id'

/**
 * Generate all dates matching days_of_week between start and end
 */
function generateDatesForSeries(
    daysOfWeek: number[],
    startDate: string,
    endDate: string,
    recurrenceInterval: number = 1
): string[] {
    const dates: string[] = []
    const start = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')

    const interval = Math.max(1, recurrenceInterval || 1)

    // Base week start (Sunday of the start date week)
    const baseWeekStart = new Date(start)
    baseWeekStart.setDate(start.getDate() - start.getDay())
    baseWeekStart.setHours(0, 0, 0, 0)

    const current = new Date(start)
    while (current <= end) {
        const dayOfWeek = current.getDay()
        if (daysOfWeek.includes(dayOfWeek)) {
            const currentWeekStart = new Date(current)
            currentWeekStart.setDate(current.getDate() - current.getDay())
            currentWeekStart.setHours(0, 0, 0, 0)

            const diffDays = Math.round((currentWeekStart.getTime() - baseWeekStart.getTime()) / (1000 * 60 * 60 * 24))
            const diffWeeks = Math.floor(diffDays / 7)

            if (diffWeeks % interval === 0) {
                const yyyy = current.getFullYear()
                const mm = String(current.getMonth() + 1).padStart(2, '0')
                const dd = String(current.getDate()).padStart(2, '0')
                dates.push(`${yyyy}-${mm}-${dd}`)
            }
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
        const supabase = (await createClient()) as any

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient() as any

        const { data: profile } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const headerClinicId = request.headers.get('x-clinic-id')
        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: profile.clinic_id,
            profileRole: profile.role,
        })
        const effectiveClinicId = headerClinicId || resolvedClinicId || profile.clinic_id

        if (!effectiveClinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        const { data: series, error } = await adminDb
            .from('recurring_appointment_series')
            .select(`
                *,
                patient:patients(id, full_name, phone),
                student:students!recurring_appointment_series_student_id_fkey(id, full_name, contact_phone, program),
                doctor:doctors!recurring_appointment_series_doctor_id_fkey(id, user:users(full_name), specialty),
                co_doctor:doctors!recurring_appointment_series_co_doctor_id_fkey(id, user:users(full_name), specialty)
            `)
            .eq('id', seriesId)
            .eq('clinic_id', effectiveClinicId)
            .single() as { data: any; error: any }

        if (error || !series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        // Count future appointments
        const today = new Date().toISOString().split('T')[0]
        const { count } = await adminDb
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('series_id', seriesId)
            .gte('appointment_date', today)
            .not('status', 'in', '("CANCELLED","COMPLETED")')

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
        const supabase = (await createClient()) as any

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient() as any

        const { data: profile } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const headerClinicId = request.headers.get('x-clinic-id')
        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: profile.clinic_id,
            profileRole: profile.role,
        })
        const effectiveClinicId = headerClinicId || resolvedClinicId || profile.clinic_id

        if (!effectiveClinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        // Verify series exists and belongs to clinic
        const { data: series } = await adminDb
            .from('recurring_appointment_series')
            .select('*')
            .eq('id', seriesId)
            .eq('clinic_id', effectiveClinicId)
            .single() as { data: any }

        if (!series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        const body = await request.json()

        const newInterval = body.recurrence_interval || (body.frequency === 'biweekly' ? 2 : body.frequency === 'monthly' ? 4 : (series.recurrence_interval || 1))
        const newFrequency = body.frequency || (newInterval === 2 ? 'biweekly' : newInterval === 4 ? 'monthly' : (series.frequency || 'weekly'))

        // Detect if schedule is changing (day/time/frequency/interval)
        const isScheduleChange =
            (body.days_of_week && JSON.stringify(body.days_of_week) !== JSON.stringify(series.days_of_week)) ||
            (body.appointment_time && body.appointment_time !== series.appointment_time) ||
            (body.recurrence_interval !== undefined && body.recurrence_interval !== series.recurrence_interval) ||
            (body.frequency !== undefined && body.frequency !== series.frequency)

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

            // Generate new dates from today to end_date respecting recurrence interval
            const newDates = generateDatesForSeries(newDays, today, series.end_date, newInterval)

            if (newDates.length === 0) {
                return NextResponse.json(
                    { error: 'Nenhuma data futura encontrada para os dias selecionados' },
                    { status: 400 }
                )
            }

            // Check for conflicts with OTHER appointments (not from this series)
            const { data: conflicts } = await adminDb
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
                        error: 'Existem conflitos de horário com outros agendamentos nas datas selecionadas.',
                        conflict: true,
                        conflicting_dates: conflictDates,
                        total_conflicts: conflictDates.length,
                    },
                    { status: 409 }
                )
            }

            // Step 1: Remove all future appointments from this series that are not completed
            const { error: deleteError } = await adminDb
                .from('appointments')
                .delete()
                .eq('series_id', seriesId)
                .gte('appointment_date', today)
                .not('status', 'in', '("COMPLETED")')

            if (deleteError) {
                console.error('Error deleting old appointments:', deleteError)
                return NextResponse.json(
                    { error: 'Erro ao remover agendamentos antigos: ' + deleteError.message },
                    { status: 500 }
                )
            }

            // Step 2: Also clean up any CANCELLED appointments on the new dates that would block inserts
            await adminDb
                .from('appointments')
                .delete()
                .eq('doctor_id', doctorId)
                .eq('appointment_time', newTime)
                .in('appointment_date', newDates)
                .eq('status', 'CANCELLED')

            // Step 3: Create new appointments on the correct dates
            const newAppointments = newDates.map(date => ({
                id: crypto.randomUUID(),
                clinic_id: effectiveClinicId,
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
                const { error: batchError } = await adminDb
                    .from('appointments')
                    .insert(batch as any)

                if (batchError) {
                    console.error(`Batch error (${i}-${i + batch.length}):`, batchError)
                    return NextResponse.json(
                        { error: 'Erro ao gerar agendamentos futuros da série: ' + batchError.message },
                        { status: 500 }
                    )
                } else {
                    totalCreated += batch.length
                }
            }

            // Step 4: Update the series record and ensure is_active is true upon schedule change
            const seriesUpdate: Record<string, unknown> = {
                days_of_week: newDays,
                appointment_time: newTime,
                recurrence_interval: newInterval,
                frequency: newFrequency,
                is_active: body.is_active !== undefined ? body.is_active : true,
                updated_at: new Date().toISOString(),
            }
            if (body.therapy_type !== undefined) seriesUpdate.therapy_type = body.therapy_type
            if (body.notes !== undefined) seriesUpdate.notes = body.notes

            const { error: seriesUpdateError } = await adminDb
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
                message: `Série atualizada com sucesso! ${totalCreated} agendamento(s) reagendado(s) para ${dayLabels} às ${newTime}.`,
            })
        }

        // === SIMPLE UPDATE: Metadata or Pause/Resume ===
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
        if (body.recurrence_interval !== undefined) {
            updateData.recurrence_interval = body.recurrence_interval
        }
        if (body.frequency !== undefined) {
            updateData.frequency = body.frequency
        }
        if (body.co_doctor_id !== undefined) {
            if (body.co_doctor_id && body.co_doctor_id === series.doctor_id) {
                return NextResponse.json(
                    { error: 'O co-terapeuta não pode ser o mesmo profissional que o titular' },
                    { status: 400 }
                )
            }
            updateData.co_doctor_id = body.co_doctor_id || null
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: 'Nenhum campo para atualizar' },
                { status: 400 }
            )
        }

        updateData.updated_at = new Date().toISOString()

        const { error: updateError } = await adminDb
            .from('recurring_appointment_series')
            .update(updateData as any)
            .eq('id', seriesId)

        if (updateError) {
            console.error('Error updating series:', updateError)
            return NextResponse.json(
                { error: 'Erro ao atualizar série: ' + updateError.message },
                { status: 500 }
            )
        }

        const today = new Date().toISOString().split('T')[0]

        // Se a série foi pausada (is_active: false), cancelar os agendamentos futuros não realizados
        if (body.is_active === false) {
            await adminDb
                .from('appointments')
                .update({
                    status: 'CANCELLED',
                    cancellation_reason: 'Série recorrente cancelada',
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: user.id,
                })
                .eq('series_id', seriesId)
                .gte('appointment_date', today)
                .not('status', 'in', '("COMPLETED","CANCELLED")')
        }

        // Propagar co_doctor_id para os agendamentos futuros da série se alterado
        if (body.co_doctor_id !== undefined) {
            await adminDb
                .from('appointments')
                .update({ co_doctor_id: updateData.co_doctor_id })
                .eq('series_id', seriesId)
                .gte('appointment_date', today)
                .not('status', 'in', '("CANCELLED","COMPLETED")')
        }

        const action = updateData.is_active === false ? 'pausada' : updateData.is_active === true ? 'reativada' : 'atualizada'

        return NextResponse.json({
            success: true,
            message: `Série ${action} com sucesso`,
        })

    } catch (error: any) {
        console.error('Update series error:', error)
        return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: seriesId } = await params
        const supabase = (await createClient()) as any

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminDb = createServiceRoleClient() as any

        const { data: profile } = await adminDb
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const headerClinicId = request.headers.get('x-clinic-id')
        const { clinicId: resolvedClinicId } = await resolveClinicId({
            profileClinicId: profile.clinic_id,
            profileRole: profile.role,
        })
        const effectiveClinicId = headerClinicId || resolvedClinicId || profile.clinic_id

        if (!effectiveClinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        // Verify series exists and belongs to clinic
        const { data: series, error: seriesError } = await adminDb
            .from('recurring_appointment_series')
            .select('id, clinic_id, doctor_id')
            .eq('id', seriesId)
            .eq('clinic_id', effectiveClinicId)
            .single()

        if (seriesError || !series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        if (profile.role === 'DOCTOR') {
            const { data: doctor } = await adminDb
                .from('doctors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!doctor || doctor.id !== series.doctor_id) {
                return NextResponse.json({ error: 'Acesso negado: apenas o profissional responsável ou a gestão podem excluir a série' }, { status: 403 })
            }
        }

        const today = new Date().toISOString().split('T')[0]
        const url = new URL(request.url)
        const isPermanent = url.searchParams.get('permanent') === 'true' || url.searchParams.get('delete_series') === 'true'

        // 1. Cancelar TODOS os agendamentos futuros não concluídos desta série
        const { data: cancelledAppointments, error: cancelError } = await adminDb
            .from('appointments')
            .update({
                status: 'CANCELLED',
                cancellation_reason: 'Série recorrente cancelada',
                cancelled_at: new Date().toISOString(),
                cancelled_by: user.id,
            } as any)
            .eq('series_id', seriesId)
            .gte('appointment_date', today)
            .not('status', 'in', '("COMPLETED")')
            .select('id')

        if (cancelError) {
            console.error('Error cancelling series appointments:', cancelError)
            return NextResponse.json(
                { error: 'Erro ao cancelar agendamentos futuros da série: ' + cancelError.message },
                { status: 500 }
            )
        }

        const totalCancelled = cancelledAppointments?.length || 0

        // 2. Se for exclusão permanente (ou padrão ao deletar série na lixeira):
        // Exclui a série da tabela recurring_appointment_series para não poluir a listagem
        if (isPermanent) {
            const { error: deleteSeriesError } = await adminDb
                .from('recurring_appointment_series')
                .delete()
                .eq('id', seriesId)
                .eq('clinic_id', effectiveClinicId)

            if (deleteSeriesError) {
                console.error('Error deleting series permanently:', deleteSeriesError)
                // Fallback: inativa a série caso haja alguma restrição
                await adminDb
                    .from('recurring_appointment_series')
                    .update({ is_active: false })
                    .eq('id', seriesId)
            }

            return NextResponse.json({
                success: true,
                cancelled_appointments: totalCancelled,
                series_deleted: true,
                message: `Série recorrente excluída permanentemente. ${totalCancelled} agendamento(s) cancelado(s) e removido(s) da grade.`,
            })
        }

        // 3. Caso não seja permanente, apenas desativa a série
        const { error: deactivateError } = await adminDb
            .from('recurring_appointment_series')
            .update({ is_active: false } as any)
            .eq('id', seriesId)
            .eq('clinic_id', effectiveClinicId)

        if (deactivateError) {
            console.error('Error deactivating series:', deactivateError)
            return NextResponse.json(
                { error: 'Erro ao desativar série: ' + deactivateError.message },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            cancelled_appointments: totalCancelled,
            series_deleted: false,
            message: `Série cancelada. ${totalCancelled} agendamento(s) futuro(s) cancelado(s).`,
        })

    } catch (error: any) {
        console.error('Delete series error:', error)
        return NextResponse.json({ error: error?.message || 'Erro interno do servidor' }, { status: 500 })
    }
}

