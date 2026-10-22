import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH /api/reception/priority/:appointmentId
export const PATCH = withAxiom(async (request: AxiomRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await params
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const appointmentId = id
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
        request.log.error('reception/priority/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error in priority API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
})
