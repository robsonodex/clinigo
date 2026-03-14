/**
 * GET /api/schedule-price-ranges?doctor_id=xxx
 * POST /api/schedule-price-ranges
 * DELETE /api/schedule-price-ranges?id=xxx
 * 
 * Gerencia preços por faixa horária dos profissionais
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        let query = (supabase as any)
            .from('schedule_price_ranges')
            .select('*, schedule:schedules(day_of_week, start_time, end_time)')
            .eq('clinic_id', (profile as any).clinic_id)
            .order('start_time')

        if (doctorId) {
            query = query.eq('doctor_id', doctorId)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data: data || [] })
    } catch (error) {
        console.error('Schedule price ranges GET error:', error)
        return NextResponse.json({ error: 'Erro ao buscar preços' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        const body = await request.json()
        const { schedule_id, doctor_id, start_time, end_time, price, label } = body

        if (!schedule_id || !doctor_id || !start_time || !end_time || price === undefined) {
            return NextResponse.json({ error: 'Campos obrigatórios: schedule_id, doctor_id, start_time, end_time, price' }, { status: 400 })
        }

        const { data, error } = await (supabase as any)
            .from('schedule_price_ranges')
            .insert({
                schedule_id,
                doctor_id,
                clinic_id: (profile as any).clinic_id,
                start_time,
                end_time,
                price,
                label: label || null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Preço por faixa horária criado' })
    } catch (error) {
        console.error('Schedule price ranges POST error:', error)
        return NextResponse.json({ error: 'Erro ao criar preço' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const { error } = await (supabase as any)
            .from('schedule_price_ranges')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ message: 'Preço removido' })
    } catch (error) {
        console.error('Schedule price ranges DELETE error:', error)
        return NextResponse.json({ error: 'Erro ao remover preço' }, { status: 500 })
    }
}
