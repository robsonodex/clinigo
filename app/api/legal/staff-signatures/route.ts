/**
 * GET: List staff signature status for a clinic
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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

        // Get all staff acceptances for this clinic
        const { data: acceptances, error } = await (supabase as any)
            .from('staff_legal_acceptances')
            .select('id, full_name, cpf, accepted_at, document_version, user_id')
            .eq('clinic_id', clinicId)
            .order('accepted_at', { ascending: false })

        if (error) {
            console.error('Staff signatures list error:', error)
            return NextResponse.json({ error: 'Erro ao buscar assinaturas' }, { status: 500 })
        }

        return NextResponse.json({ acceptances: acceptances || [] })
    } catch (error) {
        console.error('Staff signatures error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
