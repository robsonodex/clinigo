import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/reception/call-patient/:appointmentId
 * Changes appointment status to WAITING so the TV panel shows the call animation.
 */
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

        // Verify user belongs to a clinic
        const { data: currentUser } = await (supabase as any)
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 403 })
        }

        // Update appointment status to WAITING (TV panel listens for this)
        const { data: appointment, error } = await (supabase as any)
            .from('appointments')
            .update({
                status: 'WAITING',
                called_at: new Date().toISOString(),
                called_by: user.id,
            })
            .eq('id', id)
            .eq('clinic_id', currentUser.clinic_id)
            .select(`
                id,
                status,
                patient:patients(full_name),
                doctor:doctors(user:users(full_name))
            `)
            .single()

        if (error) {
            console.error('[Call Patient] Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            appointment,
            message: `Paciente ${appointment?.patient?.full_name || ''} chamado com sucesso`,
        })
    } catch (error) {
        console.error('[Call Patient] Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

/**
 * PATCH — Alias for POST (fallback for compatibility)
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return POST(request, context)
}
