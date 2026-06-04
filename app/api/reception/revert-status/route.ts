import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ESPACO_INCLUIR_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

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

        // Only available for Espaço Incluir
        if (currentUser.clinic_id !== ESPACO_INCLUIR_ID) {
            return NextResponse.json({ error: 'Feature not available' }, { status: 403 })
        }

        const { appointmentId } = await request.json()
        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        // Fetch current appointment
        const { data: appointment, error: fetchError } = await (supabase as any)
            .from('appointments')
            .select('id, status, checked_in_at, clinic_id')
            .eq('id', appointmentId)
            .eq('clinic_id', ESPACO_INCLUIR_ID)
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
                // Em Atendimento → volta para Confirmado
                updateData.status = 'CONFIRMED'
                updateData.started_at = null
                revertedTo = 'CONFIRMED'
                break

            case 'COMPLETED':
                // Concluído → volta para Confirmado
                updateData.status = 'CONFIRMED'
                updateData.completed_at = null
                revertedTo = 'CONFIRMED'
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
