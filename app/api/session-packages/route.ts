import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
        if (!userData?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patient_id')
        const status = searchParams.get('status')

        let query = supabase
            .from('session_packages')
            .select(`
                *,
                patients(id, full_name),
                doctors(id, specialty, users(full_name))
            `)
            .eq('clinic_id', userData.clinic_id)
            .order('created_at', { ascending: false })

        if (patientId) query = query.eq('patient_id', patientId)
        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) throw error
        return NextResponse.json({ data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase.from('users').select('clinic_id').eq('id', user.id).single()
        if (!userData?.clinic_id) return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })

        const body = await request.json()
        const { data, error } = await supabase
            .from('session_packages')
            .insert({ ...body, clinic_id: userData.clinic_id })
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ data }, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const body = await request.json()
        const { id, ...updateData } = body

        const { data, error } = await supabase
            .from('session_packages')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return NextResponse.json({ data })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
