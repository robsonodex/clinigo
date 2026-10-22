import { withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const headerClinicId = request.headers.get('x-clinic-id')
        let clinicId = headerClinicId

        if (!clinicId) {
            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()
            clinicId = (userData as any)?.clinic_id
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const adminSupabase = createServiceRoleClient()
        const { data: clinicUsers, error } = await adminSupabase
            .from('users')
            .select('id, full_name, role, email, avatar_url')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('full_name', { ascending: true })

        if (error) {
            console.error('[API Tasks Team] Erro ao buscar usuários:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ data: clinicUsers || [] })
    } catch (error: any) {
        request.log.error('tasks/team', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Tasks Team] Erro interno:', error)
        return NextResponse.json({ error: 'Erro interno ao listar colaboradores' }, { status: 500 })
    }
})
