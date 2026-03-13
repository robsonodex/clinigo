/**
 * POST /api/appointments/rearrange/confirm - Execute rearrangement transfers
 * Moves appointments to new doctors/times as confirmed by receptionist
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ConfirmTransfer {
    appointment_id: string
    new_doctor_id: string
    new_time: string
    new_date?: string // optional, defaults to same date
}

interface ConfirmRequest {
    transfers: ConfirmTransfer[]
    cancel_unmatched?: boolean // cancel appointments that couldn't be rearranged
    unmatched_ids?: string[]
}

export async function POST(request: NextRequest) {
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

        const body: ConfirmRequest = await request.json()

        if (!body.transfers || body.transfers.length === 0) {
            return NextResponse.json(
                { error: 'Nenhuma transferência para confirmar' },
                { status: 400 }
            )
        }

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (const transfer of body.transfers) {
            // Verify appointment belongs to clinic
            const { data: appointment } = await supabase
                .from('appointments')
                .select('id, clinic_id, appointment_date, doctor_id, patient_id')
                .eq('id', transfer.appointment_id)
                .eq('clinic_id', profile.clinic_id)
                .single()

            if (!appointment) {
                errors.push(`Agendamento ${transfer.appointment_id} não encontrado`)
                errorCount++
                continue
            }

            // Check for conflict at destination
            const targetDate = transfer.new_date || appointment.appointment_date
            const { data: conflict } = await supabase
                .from('appointments')
                .select('id')
                .eq('doctor_id', transfer.new_doctor_id)
                .eq('appointment_date', targetDate)
                .eq('appointment_time', transfer.new_time)
                .not('status', 'in', '("CANCELLED")')
                .single()

            if (conflict) {
                errors.push(`Conflito: horário ${transfer.new_time} já ocupado`)
                errorCount++
                continue
            }

            // Execute the transfer
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    doctor_id: transfer.new_doctor_id,
                    appointment_time: transfer.new_time,
                    appointment_date: targetDate,
                    notes: `Remanejado de outro terapeuta (ausência) por ${user.id}`,
                })
                .eq('id', transfer.appointment_id)

            if (updateError) {
                errors.push(`Erro ao mover: ${updateError.message}`)
                errorCount++
            } else {
                successCount++
            }
        }

        // Cancel unmatched appointments if requested
        let cancelledCount = 0
        if (body.cancel_unmatched && body.unmatched_ids && body.unmatched_ids.length > 0) {
            const { data: cancelled } = await supabase
                .from('appointments')
                .update({
                    status: 'CANCELLED',
                    cancellation_reason: 'Terapeuta ausente - sem encaixe disponível',
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: user.id,
                })
                .in('id', body.unmatched_ids)
                .eq('clinic_id', profile.clinic_id)
                .select('id')

            cancelledCount = cancelled?.length || 0
        }

        return NextResponse.json({
            success: true,
            transferred: successCount,
            failed: errorCount,
            cancelled: cancelledCount,
            errors: errors.length > 0 ? errors : undefined,
            message: `${successCount} agendamento(s) remanejado(s) com sucesso${cancelledCount > 0 ? `, ${cancelledCount} cancelado(s)` : ''}`,
        })

    } catch (error) {
        console.error('Confirm rearrange error:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
