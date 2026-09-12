import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()
        const { data: templates, error } = await serviceRole
            .from('contract_templates')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('title', { ascending: true })

        if (error) {
            console.error('[CONTRACTS-TEMPLATES] Erro ao listar:', error)
            return NextResponse.json({ error: 'Erro ao listar modelos de contratos' }, { status: 500 })
        }

        return NextResponse.json({ templates: templates || [] })
    } catch (err: any) {
        console.error('[CONTRACTS-TEMPLATES] Erro fatal GET:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        if (userData?.role !== 'CLINIC_ADMIN' && userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Apenas administradores podem criar modelos de contrato' }, { status: 403 })
        }

        const body = await request.json()
        const { title, category, description, content, required_variables, default_signers, allowed_target_types } = body

        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: 'Título e conteúdo do modelo são obrigatórios' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()
        const { data: newTemplate, error } = await serviceRole
            .from('contract_templates')
            .insert({
                clinic_id: clinicId,
                title: title.trim(),
                category: category || 'prestacao_servicos_pj',
                description: description?.trim() || null,
                content: content.trim(),
                required_variables: Array.isArray(required_variables) ? required_variables : [],
                default_signers: Array.isArray(default_signers) ? default_signers : [],
                allowed_target_types: Array.isArray(allowed_target_types) ? allowed_target_types : ['PROFESSIONAL', 'CUSTOM'],
                is_active: true
            })
            .select()
            .single()

        if (error) {
            console.error('[CONTRACTS-TEMPLATES] Erro ao salvar:', error)
            return NextResponse.json({ error: 'Erro ao cadastrar modelo de contrato' }, { status: 500 })
        }

        return NextResponse.json({ template: newTemplate }, { status: 201 })
    } catch (err: any) {
        console.error('[CONTRACTS-TEMPLATES] Erro fatal POST:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
