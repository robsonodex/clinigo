import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH /api/reception/priority/:appointmentId
export async function PATCH(
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
        const body = await request.json()
        const { priority_level } = body

        // Update priority level (0=Normal, 1=Priority, 2=Urgent)
        const { data: appointment, error } = await supabase
            .from('appointments')
            .update({ priority_level })
            .eq('id', appointmentId)
            .select()
            .single()

        if (error) {
            console.error('Error updating priority:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            appointment
        })
    } catch (error) {
        console.error('Error in priority API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
