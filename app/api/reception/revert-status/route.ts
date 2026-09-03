import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/revert-status
 * Reverts an appointment to its previous status (Espaço Incluir only)
 * Body: { appointmentId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })
        }

        const { appointmentId } = await request.json()
        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        // Fetch current appointment ensuring clinic isolation
        const { data: appointment, error: fetchError } = await (supabase as any)
            .from('appointments')
            .select('id, status, checked_in_at, clinic_id')
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (fetchError || !appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        let updateData: any = { updated_at: new Date().toISOString() }
        let revertedTo = ''

        switch (appointment.status) {
            case 'WAITING':
                // Chamado → volta para CHECKED_IN (paciente ainda na clínica)
                updateData.status = 'CHECKED_IN'
                revertedTo = 'CHECKED_IN'
                break

            case 'CHECKED_IN':
                // Fez check-in → desfaz check-in, volta para CONFIRMED
                updateData.status = 'CONFIRMED'
                updateData.checked_in_at = null
                updateData.checked_in_by = null
                updateData.waiting_room_notes = null
                revertedTo = 'CONFIRMED (sem check-in)'
                break

            case 'CONFIRMED':
                if (appointment.checked_in_at) {
                    // Legacy: já fez check-in com status CONFIRMED → desfaz check-in
                    updateData.status = 'CONFIRMED'
                    updateData.checked_in_at = null
                    updateData.checked_in_by = null
                    updateData.waiting_room_notes = null
                    revertedTo = 'CONFIRMED (sem check-in)'
                } else {
                    return NextResponse.json({ error: 'Appointment is already in its initial state' }, { status: 400 })
                }
                break

            case 'IN_PROGRESS':
                // Em Atendimento → volta para Aguardando (WAITING ou CONFIRMED)
                updateData.status = appointment.checked_in_at ? 'WAITING' : 'CONFIRMED'
                updateData.started_at = null
                revertedTo = 'Aguardando'
                break

            case 'COMPLETED':
                // Concluído → volta uma casa para Em Atendimento
                updateData.status = 'IN_PROGRESS'
                updateData.completed_at = null
                revertedTo = 'Em Atendimento'
                break

            case 'NO_SHOW':
                // Não compareceu → volta para Confirmado
                updateData.status = 'CONFIRMED'
                updateData.waiting_room_notes = null
                revertedTo = 'CONFIRMED'
                break

            default:
                return NextResponse.json({ error: `Cannot revert status: ${appointment.status}` }, { status: 400 })
        }

        const { error: updateError } = await (supabase as any)
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId)

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({ success: true, revertedTo })
    } catch (error) {
        console.error('[Revert Status] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
