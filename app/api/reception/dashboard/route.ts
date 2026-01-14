import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic_id from user metadata or profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = profile?.clinic_id

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // Call the database function we created in the migration
        const { data: stats, error } = await supabase.rpc('get_reception_stats', {
            clinic_id_param: clinicId,
            date_param: new Date().toISOString().split('T')[0]
        })

        if (error) {
            console.error('Error fetching stats:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ stats: stats[0] })
    } catch (error) {
        console.error('Error in reception dashboard API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
