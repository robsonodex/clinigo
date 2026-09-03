import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ESPACO_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'

// POST /api/reception/checkin/:appointmentId
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const appointmentId = id
        
        let notes = ''
        try {
            const body = await request.json()
            notes = body?.notes || ''
        } catch (e) {
            // body pode vir vazio nos check-ins antigos
        }

        // Buscar agendamento para checar escopo da clínica
        const { data: currentAppt } = await (supabase as any)
            .from('appointments')
            .select('id, clinic_id, status')
            .eq('id', appointmentId)
            .maybeSingle()

        const isEspacoIncluir = currentAppt?.clinic_id === ESPACO_INCLUIR_CLINIC_ID

        const updateData: any = {
            checked_in_at: new Date().toISOString(),
            checked_in_by: user.id,
        }

        // Para Espaço Incluir, não sobrescreve o enum status com CHECKED_IN para não violar o constraint
        if (!isEspacoIncluir) {
            updateData.status = 'CHECKED_IN'
        }
        
        if (notes) {
            updateData.waiting_room_notes = notes
        }

        // Update appointment with check-in timestamp
        let { data: appointment, error } = await (supabase
            .from('appointments') as any)
            .update(updateData)
            .eq('id', appointmentId)
            .select()
            .single()

        // Fallback de segurança se o enum do banco rejeitar CHECKED_IN (código 22P02)
        if (error && error.code === '22P02') {
            const fallbackData: any = {
                checked_in_at: updateData.checked_in_at,
                checked_in_by: updateData.checked_in_by,
            }
            if (notes) fallbackData.waiting_room_notes = notes

            const retry = await (supabase
                .from('appointments') as any)
                .update(fallbackData)
                .eq('id', appointmentId)
                .select()
                .single()

            appointment = retry.data
            error = retry.error
        }

        if (error) {
            console.error('Error checking in:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            appointment
        })
    } catch (error) {
        console.error('Error in check-in API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
