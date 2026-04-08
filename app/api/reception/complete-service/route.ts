import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/complete-service
 * Body: { appointmentId: string }
 * Changes appointment status from IN_PROGRESS → COMPLETED
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { appointmentId } = body

        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: currentUser } = await (supabase as any)
            .from('users').select('clinic_id').eq('id', user.id).single()
        if (!currentUser?.clinic_id) return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })

        const { data: appointment, error } = await (supabase as any)
            .from('appointments')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString(),
            })
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .in('status', ['IN_PROGRESS', 'WAITING', 'CONFIRMED'])
            .select(`id, status, patient:patients(full_name)`)
            .single()

        if (error) {
            console.error('[Complete Service] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            appointment,
            message: `Atendimento de ${appointment?.patient?.full_name || ''} concluído`,
        })
    } catch (error) {
        console.error('[Complete Service] Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
