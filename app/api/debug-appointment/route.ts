/**
 * GET /api/debug-appointment?id=[appointmentId]
 * Debug endpoint to check appointment with full relations
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

        // Query 1: Basic appointment data (same as debug)
        const { data: basicAppointment, error: basicError } = await supabase
            .from('appointments')
            .select('id, status, appointment_date, appointment_time, patient_id, doctor_id, clinic_id, created_at')
            .eq('id', appointmentId)
            .single()

        // Query 2: Full appointment with relations (same as checkin page)
        const { data: fullAppointment, error: fullError } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                clinic_id,
                patient_id,
                patients (
                    id,
                    full_name,
                    phone,
                    email
                ),
                doctors (
                    id,
                    full_name
                ),
                clinics (
                    id,
                    name,
                    logo_url
                )
            `)
            .eq('id', appointmentId)
            .single()

        return NextResponse.json({
            appointmentId,
            basicQuery: {
                success: !basicError,
                data: basicAppointment,
                error: basicError?.message,
                errorDetails: basicError
            },
            fullQueryWithRelations: {
                success: !fullError,
                data: fullAppointment,
                error: fullError?.message,
                errorDetails: fullError
            }
        }, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Debug error:', error)
        return NextResponse.json({ error: String(error) }, { status: 500 })
    }
}
