import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
    }

    try {
        const supabase = createServiceRoleClient()

        // Check Doctor table
        const { data: doctor, error: docError } = await supabase
            .from('doctors')
            .select('id, clinic_id, user_id')
            .eq('id', id)
            .single()

        // Check Schedules
        const { data: schedules, error: schedError } = await supabase
            .from('schedules')
            .select('*')
            .eq('doctor_id', id)

        return NextResponse.json({
            status: 'ok',
            checked_id: id,
            doctor_found: !!doctor,
            doctor_data: doctor,
            doctor_error: docError?.message,
            schedules_count: schedules?.length || 0,
            schedules_error: schedError?.message
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
