import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/reception/patient/quick
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get clinic_id from user
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = profile?.clinic_id

        if (!clinicId) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        const body = await request.json()
        const { full_name, cpf, phone, birth_date } = body

        if (!full_name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Quick patient registration
        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                clinic_id: clinicId,
                full_name,
                cpf,
                phone,
                birth_date,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating patient:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            patient
        })
    } catch (error) {
        console.error('Error in quick patient API:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
