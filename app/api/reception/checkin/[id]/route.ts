import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

        const updateData: any = {
            checked_in_at: new Date().toISOString(),
            checked_in_by: user.id,
            status: 'CONFIRMED'
        }
        
        if (notes) {
            updateData.waiting_room_notes = notes
        }

        // Update appointment with check-in timestamp
        const { data: appointment, error } = await (supabase
            .from('appointments') as any)
            .update(updateData)
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
