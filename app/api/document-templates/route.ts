import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'

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

        const serviceRole = createServiceRoleClient()
        const { data: templates, error } = await serviceRole
            .from('clinic_document_templates')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('[DOCUMENT-TEMPLATES] Erro ao buscar:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ templates: templates || [] })
    } catch (err: any) {
        console.error('[DOCUMENT-TEMPLATES] Erro fatal GET:', err)
        return NextResponse.json({ error: 'Erro interno ao buscar modelos' }, { status: 500 })
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

        const body = await request.json()
        const { title, category, description, content } = body

        if (!title?.trim() || !content?.trim()) {
            return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()
        const { data: template, error } = await serviceRole
            .from('clinic_document_templates')
            .insert({
                clinic_id: clinicId,
                title: title.trim(),
                category: category || 'termo_aceite',
                description: description?.trim() || null,
                content: content.trim(),
                is_active: true,
            })
            .select()
            .single()

        if (error) {
            console.error('[DOCUMENT-TEMPLATES] Erro ao criar:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ template }, { status: 201 })
    } catch (err: any) {
        console.error('[DOCUMENT-TEMPLATES] Erro fatal POST:', err)
        return NextResponse.json({ error: 'Erro interno ao salvar modelo' }, { status: 500 })
    }
}
