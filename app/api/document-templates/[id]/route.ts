import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
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

        const body = await request.json()
        const { title, category, description, content, is_active } = body

        const serviceRole = createServiceRoleClient()

        // Garante que o template pertence à clínica
        let query = serviceRole
            .from('clinic_document_templates')
            .update({
                title: title?.trim(),
                category,
                description: description?.trim(),
                content: content?.trim(),
                is_active: is_active !== undefined ? is_active : true,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: updated, error } = await query.select().single()

        if (error) {
            console.error('[DOCUMENT-TEMPLATES] Erro ao atualizar:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ template: updated })
    } catch (err: any) {
        console.error('[DOCUMENT-TEMPLATES] Erro fatal PUT:', err)
        return NextResponse.json({ error: 'Erro ao atualizar modelo' }, { status: 500 })
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

        const serviceRole = createServiceRoleClient()

        let query = serviceRole
            .from('clinic_document_templates')
            .delete()
            .eq('id', id)

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { error } = await query

        if (error) {
            console.error('[DOCUMENT-TEMPLATES] Erro ao excluir:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[DOCUMENT-TEMPLATES] Erro fatal DELETE:', err)
        return NextResponse.json({ error: 'Erro ao excluir modelo' }, { status: 500 })
    }
}
