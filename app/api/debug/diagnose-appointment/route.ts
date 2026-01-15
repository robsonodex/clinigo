import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = createServiceRoleClient()

        // 1. Get Demo User Info
        const { data: user } = await supabase
            .from('users')
            .select('id, email, clinic_id')
            .eq('email', 'admin@demo.clinigo.app')
            .single()

        // 2. Get Last 5 Appointments created (ignoring RLS)
        const { data: lastAppointments } = await supabase
            .from('appointments')
            .select('id, created_at, clinic_id, doctor_id, patient_id')
            .order('created_at', { ascending: false })
            .limit(5)

        return NextResponse.json({
            user_info: user,
            last_appointments: lastAppointments,
            diagnosis: {
                mismatches: lastAppointments?.map(appt => ({
                    appointment_id: appt.id,
                    is_visible_to_user: appt.clinic_id === user?.clinic_id,
                    appt_clinic: appt.clinic_id,
                    user_clinic: user?.clinic_id
                }))
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
