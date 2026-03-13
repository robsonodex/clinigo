/**
 * PATCH /api/appointments/recurring/[id] - Update/pause/resume a series
 * DELETE /api/appointments/recurring/[id] - Cancel a series and all future appointments
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

        // Verify series exists and belongs to clinic
        const { data: series } = await supabase
            .from('recurring_appointment_series')
            .select('id, clinic_id, is_active')
            .eq('id', seriesId)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (!series) {
            return NextResponse.json({ error: 'Série não encontrada' }, { status: 404 })
        }

        const body = await request.json()

        // Only allow toggling is_active and updating notes/therapy_type
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
            .update(updateData)
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
            .eq('clinic_id', profile.clinic_id)
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
            })
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
            .update({ is_active: false })
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
