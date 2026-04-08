import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reception/no-show
 * Marks an appointment as NO_SHOW
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

        const { appointmentId, notes } = await request.json()
        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 })
        }

        // Verify appointment belongs to user's clinic
        const { data: appointment, error: fetchError } = await (supabase as any)
            .from('appointments')
            .select('id, status, clinic_id')
            .eq('id', appointmentId)
            .eq('clinic_id', currentUser.clinic_id)
            .single()

        if (fetchError || !appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
        }

        const updateData: any = {
            status: 'NO_SHOW',
            updated_at: new Date().toISOString()
        }
        
        if (notes) {
            updateData.waiting_room_notes = notes
        }

        // Update to NO_SHOW
        const { error: updateError } = await (supabase as any)
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId)

        if (updateError) {
            throw updateError
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[No-Show] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
