/**
 * GET /api/debug-appointment?id=[appointmentId]
 * Temporary debug endpoint to check if appointment exists
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const appointmentId = searchParams.get('id')

        if (!appointmentId) {
            return NextResponse.json({ error: 'Missing appointment ID' }, { status: 400 })
        }

        const supabase = createServiceRoleClient()

        // Check in appointments table
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, status, appointment_date, appointment_time, patient_id, doctor_id, clinic_id, created_at')
            .eq('id', appointmentId)
            .single()

        // Check in walk_in_registrations table
        const { data: walkIn, error: walkInError } = await supabase
            .from('walk_in_registrations')
            .select('id, status, patient_id, doctor_id, created_at')
            .eq('id', appointmentId)
            .single()

        return NextResponse.json({
            appointmentId,
            appointments: {
                found: !!appointment,
                data: appointment,
                error: appointmentError?.message
            },
            walkIn: {
                found: !!walkIn,
                data: walkIn,
                error: walkInError?.message
            }
        })

    } catch (error) {
        console.error('Debug error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
