import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get notification settings
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('notification_settings')
            .eq('id', clinicId)
            .single()

        if (error) {
            console.error('Error fetching settings:', error)
            return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 })
        }

        return NextResponse.json(clinic?.notification_settings || {})
    } catch (error) {
        console.error('Settings error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PUT: Update notification settings
export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()

        const { error } = await supabase
            .from('clinics')
            .update({ notification_settings: body })
            .eq('id', clinicId)

        if (error) {
            console.error('Error updating settings:', error)
            return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Configurações atualizadas com sucesso' })
    } catch (error) {
        console.error('Settings UPDATE error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
