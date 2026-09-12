import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params
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

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()
        let query = serviceRole
            .from('contract_templates')
            .select('*')
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: template, error } = await query.maybeSingle()

        if (error || !template) {
            return NextResponse.json({ error: 'Modelo não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ template })
    } catch (err: any) {
        console.error('[CONTRACT-TEMPLATE-GET] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params
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

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        if (userData?.role !== 'CLINIC_ADMIN' && userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Apenas administradores podem alterar modelos' }, { status: 403 })
        }

        const body = await request.json()
        const { title, category, description, content, required_variables, default_signers, allowed_target_types, is_active } = body

        const serviceRole = createServiceRoleClient()
        const updateData: any = { updated_at: new Date().toISOString() }

        if (title !== undefined) updateData.title = title.trim()
        if (category !== undefined) updateData.category = category
        if (description !== undefined) updateData.description = description?.trim() || null
        if (content !== undefined) updateData.content = content.trim()
        if (required_variables !== undefined) updateData.required_variables = required_variables
        if (default_signers !== undefined) updateData.default_signers = default_signers
        if (allowed_target_types !== undefined) updateData.allowed_target_types = allowed_target_types
        if (is_active !== undefined) updateData.is_active = is_active

        let query = serviceRole
            .from('contract_templates')
            .update(updateData)
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: updatedTemplate, error } = await query.select().single()

        if (error) {
            console.error('[CONTRACT-TEMPLATE-PUT] Erro:', error)
            return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 })
        }

        return NextResponse.json({ template: updatedTemplate })
    } catch (err: any) {
        console.error('[CONTRACT-TEMPLATE-PUT] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: Props) {
    try {
        const { id } = await params
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

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        if (userData?.role !== 'CLINIC_ADMIN' && userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Apenas administradores podem excluir modelos' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()

        // Soft delete para não quebrar integridade de contratos já emitidos
        let query = serviceRole
            .from('contract_templates')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { error } = await query

        if (error) {
            console.error('[CONTRACT-TEMPLATE-DELETE] Erro:', error)
            return NextResponse.json({ error: 'Erro ao desativar modelo' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[CONTRACT-TEMPLATE-DELETE] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
