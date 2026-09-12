import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Props) {
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

        const body = await request.json()
        const { signer_id, channel } = body // channel: 'EMAIL' | 'WHATSAPP' | 'COPY_LINK'

        const serviceRole = createServiceRoleClient()

        // 1. Busca signatário
        const { data: signer, error: signerErr } = await serviceRole
            .from('contract_signers')
            .select('*')
            .eq('id', signer_id)
            .eq('contract_document_id', id)
            .single()

        if (signerErr || !signer) {
            return NextResponse.json({ error: 'Signatário não encontrado' }, { status: 404 })
        }

        // 2. Registra evento de auditoria
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
        const userAgent = request.headers.get('user-agent') || 'Clinigo Web Admin'

        await serviceRole
            .from('contract_audit_events')
            .insert({
                clinic_id: clinicId,
                contract_document_id: id,
                signer_id: signer.id,
                event_type: channel === 'WHATSAPP' ? 'ENVIO_WHATSAPP' : 'ENVIO_EMAIL',
                ip_address: clientIp,
                user_agent: userAgent,
                details: {
                    channel: channel || 'EMAIL',
                    sent_to: channel === 'WHATSAPP' ? signer.phone : signer.email,
                    requested_by_user_id: user.id
                }
            })

        return NextResponse.json({
            success: true,
            signing_url: `/assinar/${signer.signing_token}`,
            message: `Link de assinatura enviado via ${channel || 'E-mail'} com sucesso`
        })
    } catch (err: any) {
        console.error('[CONTRACTS-RESEND] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 })
    }
}
