import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const putAppealSchema = z.object({
    action: z.enum(['MARK_SENT', 'MARK_APPROVED', 'MARK_DENIED']),
    appeal_response_value: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
})

export const PUT = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ glosaId: string }> }) => {
    try {
        const { glosaId } = await context.params
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN', 'FINANCIAL'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado para gerenciar recursos' }, { status: 403 })
        }

        const body = await request.json()
        const validated = putAppealSchema.parse(body)

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (validated.notes) {
            updatePayload.notes = validated.notes
        }

        // Colunas REAIS de public.tiss_glosas (contest_status / status / approved_value)
        if (validated.action === 'MARK_SENT') {
            updatePayload.contest_status = 'IN_REVIEW'
            updatePayload.status = 'CONTESTED'
        } else if (validated.action === 'MARK_APPROVED') {
            updatePayload.contest_status = 'ACCEPTED'
            updatePayload.status = 'RESOLVED'
            if (validated.appeal_response_value !== undefined && validated.appeal_response_value !== null) {
                updatePayload.approved_value = validated.appeal_response_value
            }
        } else if (validated.action === 'MARK_DENIED') {
            updatePayload.contest_status = 'CLOSED'
            updatePayload.status = 'DENIED'
        }

        const { data, error } = await (supabase as any)
            .from('tiss_glosas')
            .update(updatePayload)
            .eq('id', glosaId)
            .eq('clinic_id', profile.clinic_id)
            .select()
            .single()

        if (error) {
            console.error('[FINANCIAL GLOSAS] Update appeal error:', error)
            return NextResponse.json({ success: false, error: 'Falha ao atualizar status do recurso' }, { status: 500 })
        }

        // FIN-01: Acato/Deferimento da operadora NÃO equivale a dinheiro depositado em caixa (PAID).
        // Marca a guia como APPEAL_ACCEPTED até a conciliação do crédito bancário efetivo.
        if (validated.action === 'MARK_APPROVED' && data?.guide_id) {
            await (supabase as any)
                .from('tiss_guides')
                .update({
                    status: 'APPEAL_ACCEPTED',
                    appeal_status: 'ACCEPTED',
                    appeal_response_value: validated.appeal_response_value ?? data.approved_value ?? null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', data.guide_id)
                .eq('clinic_id', profile.clinic_id)
        }

        return NextResponse.json({ success: true, data })
    } catch (error: any) {
        request.log.error('financial/glosas/[glosaId]/appeal', { error: error instanceof Error ? error.message : String(error) })
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 })
        }
        console.error('[FINANCIAL GLOSAS] Erro Interno PUT:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
})
