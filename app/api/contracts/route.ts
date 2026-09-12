import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

function replaceVariables(content: string, vars: Record<string, string>): string {
    let result = content
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        result = result.replace(regex, value ?? '')
    }
    return result
}

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

        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const category = searchParams.get('category')
        const targetType = searchParams.get('target_type')

        const serviceRole = createServiceRoleClient()
        let query = serviceRole
            .from('contract_documents')
            .select(`
                id,
                clinic_id,
                template_id,
                document_number,
                title,
                category,
                status,
                target_type,
                target_id,
                created_by,
                is_sequential,
                current_step,
                expires_at,
                final_document_hash,
                created_at,
                updated_at,
                contract_signers (
                    id,
                    role,
                    name,
                    email,
                    phone,
                    document_tax_id,
                    signing_token,
                    status,
                    signing_order,
                    signed_at,
                    viewed_at
                )
            `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (category && category !== 'all') {
            query = query.eq('category', category)
        }

        if (targetType && targetType !== 'all') {
            query = query.eq('target_type', targetType)
        }

        if (search) {
            query = query.or(`title.ilike.%${search}%,document_number.ilike.%${search}%`)
        }

        const { data: documents, error } = await query

        if (error) {
            console.error('[CONTRACTS-GET] Erro ao listar contratos:', error)
            return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
        }

        return NextResponse.json({ documents: documents || [] })
    } catch (err: any) {
        console.error('[CONTRACTS-GET] Erro fatal:', err)
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

        const body = await request.json()
        const {
            template_id,
            title,
            category,
            raw_content,
            variables_payload,
            target_type,
            target_id,
            signers,
            is_sequential,
            expires_days
        } = body

        if (!title?.trim()) {
            return NextResponse.json({ error: 'Título do documento é obrigatório' }, { status: 400 })
        }

        if (!Array.isArray(signers) || signers.length === 0) {
            return NextResponse.json({ error: 'Ao menos um signatário é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Obter ou validar o conteúdo base do template
        let baseContent = raw_content || ''
        let resolvedCategory = category || 'prestacao_servicos_pj'

        if (template_id) {
            const { data: template } = await serviceRole
                .from('contract_templates')
                .select('content, category, title')
                .eq('id', template_id)
                .single()

            if (template) {
                if (!baseContent) baseContent = template.content
                if (!resolvedCategory) resolvedCategory = template.category
            }
        }

        if (!baseContent.trim()) {
            return NextResponse.json({ error: 'Conteúdo do documento não pode ser vazio' }, { status: 400 })
        }

        // 2. Renderizar o conteúdo final com variáveis preenchidas
        const renderedContent = replaceVariables(baseContent, variables_payload || {})

        // 3. Gerar número de documento sequencial único da clínica
        const year = new Date().getFullYear()
        const { count } = await serviceRole
            .from('contract_documents')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        const seqNum = String((count || 0) + 1).padStart(3, '0')
        const documentNumber = `CTR-${year}/${seqNum}`

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + (Number(expires_days) || 30))

        // 4. Criar o registro imutável do documento
        const { data: document, error: docError } = await serviceRole
            .from('contract_documents')
            .insert({
                clinic_id: clinicId,
                template_id: template_id || null,
                document_number: documentNumber,
                title: title.trim(),
                category: resolvedCategory,
                status: 'enviado',
                rendered_content: renderedContent,
                variables_payload: variables_payload || {},
                target_type: target_type || 'CUSTOM',
                target_id: target_id || null,
                created_by: user.id,
                is_sequential: Boolean(is_sequential),
                current_step: 1,
                expires_at: expiresAt.toISOString(),
            })
            .select()
            .single()

        if (docError || !document) {
            console.error('[CONTRACTS-POST] Erro ao criar documento:', docError)
            return NextResponse.json({ error: 'Erro ao gerar documento de contrato' }, { status: 500 })
        }

        // 5. Inserir signatários com tokens únicos
        const signersToInsert = signers.map((s: any, idx: number) => ({
            clinic_id: clinicId,
            contract_document_id: document.id,
            role: s.role || 'CONTRATADA',
            name: s.name.trim(),
            email: s.email?.trim() || null,
            phone: s.phone?.trim() || null,
            document_tax_id: s.document_tax_id?.trim() || null,
            status: 'PENDING',
            signing_order: Number(s.signing_order) || (idx + 1),
        }))

        const { data: insertedSigners, error: signersError } = await serviceRole
            .from('contract_signers')
            .insert(signersToInsert)
            .select()

        if (signersError) {
            console.error('[CONTRACTS-POST] Erro ao criar signatários:', signersError)
            return NextResponse.json({ error: 'Erro ao registrar signatários' }, { status: 500 })
        }

        // 6. Registrar evento inicial na trilha probatória de auditoria
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
        const userAgent = request.headers.get('user-agent') || 'Clinigo Web Admin'

        await serviceRole
            .from('contract_audit_events')
            .insert({
                clinic_id: clinicId,
                contract_document_id: document.id,
                event_type: 'CRIADO',
                ip_address: clientIp,
                user_agent: userAgent,
                details: {
                    created_by_user_id: user.id,
                    document_number: documentNumber,
                    signers_count: insertedSigners?.length || 0,
                }
            })

        return NextResponse.json({
            document,
            signers: insertedSigners || [],
            message: 'Contrato gerado e disponibilizado para assinatura com sucesso'
        }, { status: 201 })
    } catch (err: any) {
        console.error('[CONTRACTS-POST] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
