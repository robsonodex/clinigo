import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/reception/checkin/:appointmentId
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const appointmentId = params.id

        // Update appointment with check-in timestamp
        const { data: appointment, error } = await supabase
            .from('appointments')
            .update({
                checked_in_at: new Date().toISOString(),
                checked_in_by: user.id,
                status: 'CONFIRMED' // Ensure status is confirmed
            })
            .eq('id', appointmentId)
            .select()
            .single()

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
