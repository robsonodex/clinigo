import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/financial/professional-documents/[id]
 * Ações administrativas: Aprovar NF, Rejeitar com motivo, Confirmar Pagamento (Baixa)
 */
export async function PATCH(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        const authClient = await createClient()
        if (!userId) {
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId || !userClinicId) {
            return NextResponse.json({ error: 'Não autorizado ou clínica não identificada' }, { status: 401 })
        }

        const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole || '')
        if (!isAdmin) {
            return NextResponse.json({ error: 'Apenas administradores podem alterar o status do documento' }, { status: 403 })
        }

        const supabase: any = createServiceRoleClient()
        const body = await request.json()
        const { action, rejection_reason, statement_amount, statement_notes } = body

        // Verifica documento existente e pertencente à mesma clínica
        const { data: currentDoc, error: findError } = await supabase
            .from('professional_financial_documents')
            .select('*')
            .eq('id', id)
            .eq('clinic_id', userClinicId)
            .single()

        if (findError || !currentDoc) {
            return NextResponse.json({ error: 'Documento financeiro não encontrado' }, { status: 404 })
        }

        const updatePayload: any = {
            updated_at: new Date().toISOString()
        }

        if (action === 'APPROVE') {
            updatePayload.status = 'INVOICE_APPROVED'
            updatePayload.rejection_reason = null
        } else if (action === 'REJECT') {
            if (!rejection_reason || !rejection_reason.trim()) {
                return NextResponse.json({ error: 'Por favor, informe o motivo da rejeição/solicitação de correção' }, { status: 400 })
            }
            updatePayload.status = 'INVOICE_REJECTED'
            updatePayload.rejection_reason = rejection_reason.trim()
        } else if (action === 'MARK_PAID') {
            updatePayload.status = 'PAID'
            updatePayload.paid_at = new Date().toISOString()
            updatePayload.paid_by = userId
        } else if (action === 'UPDATE_DETAILS') {
            if (statement_amount !== undefined) updatePayload.statement_amount = Number(statement_amount)
            if (statement_notes !== undefined) updatePayload.statement_notes = statement_notes
        } else {
            return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
        }

        const { data: updated, error: updateErr } = await supabase
            .from('professional_financial_documents')
            .update(updatePayload)
            .eq('id', id)
            .select(`
                *,
                doctor:doctors (
                    id,
                    specialty,
                    crm,
                    user:users (
                        id,
                        full_name,
                        email,
                        avatar_url,
                        phone
                    )
                )
            `)
            .single()

        if (updateErr) {
            console.error('Erro ao atualizar documento financeiro:', updateErr)
            return NextResponse.json({ error: updateErr.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: action === 'APPROVE' ? 'Nota Fiscal aprovada com sucesso!'
                : action === 'REJECT' ? 'Correção solicitada ao profissional!'
                : action === 'MARK_PAID' ? 'Repasse marcado como pago!'
                : 'Documento atualizado com sucesso!',
            document: updated
        })
    } catch (err: any) {
        console.error('Erro no PATCH professional-documents/[id]:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * DELETE /api/financial/professional-documents/[id]
 * Exclusão de registro financeiro (apenas admin)
 */
export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await props.params
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        const authClient = await createClient()
        if (!userId) {
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId || !userClinicId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(userRole || '')
        if (!isAdmin) {
            return NextResponse.json({ error: 'Apenas administradores podem excluir registros' }, { status: 403 })
        }

        const supabase: any = createServiceRoleClient()

        const { data: doc } = await supabase
            .from('professional_financial_documents')
            .select('*')
            .eq('id', id)
            .eq('clinic_id', userClinicId)
            .single()

        if (!doc) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        const { error: delErr } = await supabase
            .from('professional_financial_documents')
            .delete()
            .eq('id', id)

        if (delErr) {
            return NextResponse.json({ error: delErr.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Registro financeiro removido com sucesso!'
        })
    } catch (err: any) {
        console.error('Erro no DELETE professional-documents/[id]:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}
