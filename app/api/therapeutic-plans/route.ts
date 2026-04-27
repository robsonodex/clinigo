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
            .from('therapeutic_plans')
            .select(`
                *,
                patients(id, full_name),
                doctors(id, specialty, users(full_name)),
                therapeutic_plan_goals(*)
            `)
            .eq('clinic_id', userData.clinic_id)
            .order('created_at', { ascending: false })

        if (patientId) query = query.eq('patient_id', patientId)
        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error('GET therapeutic-plans error:', error)
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
        const { goals, ...planData } = body

        const { data: plan, error } = await supabase
            .from('therapeutic_plans')
            .insert({ ...planData, clinic_id: userData.clinic_id })
            .select()
            .single()

        if (error) throw error

        if (goals && goals.length > 0) {
            const goalsData = goals.map((g: any) => ({ ...g, plan_id: plan.id }))
            await supabase.from('therapeutic_plan_goals').insert(goalsData)
        }

        return NextResponse.json({ data: plan }, { status: 201 })
    } catch (error: any) {
        console.error('POST therapeutic-plans error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
