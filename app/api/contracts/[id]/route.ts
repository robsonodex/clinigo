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

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca o documento
        let query = serviceRole
            .from('contract_documents')
            .select('*')
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: document, error: docError } = await query.maybeSingle()

        if (docError || !document) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        // 2. Busca signatários
        const { data: signers } = await serviceRole
            .from('contract_signers')
            .select('*')
            .eq('contract_document_id', document.id)
            .order('signing_order', { ascending: true })

        // 3. Busca eventos de auditoria
        const { data: events } = await serviceRole
            .from('contract_audit_events')
            .select('*')
            .eq('contract_document_id', document.id)
            .order('created_at', { ascending: false })

        return NextResponse.json({
            document,
            signers: signers || [],
            events: events || []
        })
    } catch (err: any) {
        console.error('[CONTRACTS-ID-GET] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
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

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()

        // Verifica existência e status
        let query = serviceRole
            .from('contract_documents')
            .select('id, status, title, document_number')
            .eq('id', id)

        if (userData?.role !== 'SUPER_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: doc } = await query.maybeSingle()

        if (!doc) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        if (doc.status === 'assinado') {
            return NextResponse.json({ error: 'Documentos totalmente assinados não podem ser cancelados' }, { status: 400 })
        }

        // Atualiza status para cancelado
        await serviceRole
            .from('contract_documents')
            .update({ status: 'cancelado', updated_at: new Date().toISOString() })
            .eq('id', id)

        // Registra evento na trilha de auditoria
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
        const userAgent = request.headers.get('user-agent') || 'Clinigo Web Admin'

        await serviceRole
            .from('contract_audit_events')
            .insert({
                clinic_id: clinicId,
                contract_document_id: id,
                event_type: 'CANCELADO',
                ip_address: clientIp,
                user_agent: userAgent,
                details: {
                    cancelled_by_user_id: user.id,
                    previous_status: doc.status
                }
            })

        return NextResponse.json({ success: true, message: 'Documento cancelado com sucesso' })
    } catch (err: any) {
        console.error('[CONTRACTS-ID-DELETE] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
