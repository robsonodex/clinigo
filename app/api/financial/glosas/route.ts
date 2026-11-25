import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const postGlosaSchema = z.object({
    guide_id: z.string().uuid(),
    glosa_type: z.enum(['TOTAL', 'PARTIAL']),
    glosa_code: z.string().optional(),
    glosa_description: z.string().min(3),
    glosa_value: z.number().min(0.01),
    original_value: z.number().min(0.01),
    approved_value: z.number().min(0),
})

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
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

        if (!profile?.clinic_id || !['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'].includes(profile.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
        }

        // Consulta corrigida com as colunas REAIS de tiss_guides, tiss_batches e tiss_glosas no Postgres
        const { data: guides, error } = await (supabase as any)
            .from('tiss_guides')
            .select(`
                id,
                guide_number,
                patient_name,
                execution_date,
                total_value,
                paid_value,
                glosa_value,
                glosa_code,
                glosa_description,
                status,
                tiss_batches ( batch_number, insurance_company_name ),
                tiss_glosas (
                    id,
                    contest_status,
                    status,
                    glosa_type,
                    contest_deadline,
                    glosa_value
                )
            `)
            .in('status', ['DENIED', 'PARTIAL', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED', 'PARTIALLY_APPROVED', 'APPEALING'])
            .eq('clinic_id', profile.clinic_id)
            .is('deleted_at', null)
            .order('execution_date', { ascending: false })

        if (error) {
            console.error('[FINANCIAL GLOSAS] Erro GET:', error)
            return NextResponse.json({ success: false, error: 'Erro ao listar guias para contestação' }, { status: 500 })
        }

        // Mantém compatibilidade retroativa com campos legados esperados pela UI antiga
        const normalized = (guides || []).map((g: any) => ({
            ...g,
            total_amount: Number(g.total_value || 0),
            paid_amount: Number(g.paid_value || 0),
            glosa_amount: Number(g.glosa_value || 0),
            glosa_reason: g.glosa_description || null,
            tiss_batches: g.tiss_batches
                ? {
                      batch_number: g.tiss_batches.batch_number,
                      operator: { name: g.tiss_batches.insurance_company_name || 'Operadora' },
                  }
                : null,
            tiss_glosas: (g.tiss_glosas || []).map((gl: any) => ({
                ...gl,
                appeal_status:
                    gl.contest_status === 'ACCEPTED' || gl.contest_status === 'REVERSED'
                        ? 'APPEAL_APPROVED'
                        : gl.contest_status === 'DENIED' || gl.contest_status === 'CLOSED'
                          ? 'APPEAL_DENIED'
                          : gl.contest_status === 'IN_REVIEW' || gl.contest_status === 'SENT'
                            ? 'APPEAL_SENT'
                            : 'PENDING_APPEAL',
                appeal_deadline: gl.contest_deadline || null,
            })),
        }))

        return NextResponse.json({ success: true, data: normalized })
    } catch (error: any) {
        request.log.error('financial/glosas', { error: error instanceof Error ? error.message : String(error) })
        console.error('[FINANCIAL GLOSAS] Erro Interno GET:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
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
            return NextResponse.json({ success: false, error: 'Acesso negado para gerenciar glosas' }, { status: 403 })
        }

        const body = await request.json()
        const validated = postGlosaSchema.parse(body)

        const { data: existingGlosa } = await (supabase as any)
            .from('tiss_glosas')
            .select('id')
            .eq('guide_id', validated.guide_id)
            .eq('clinic_id', profile.clinic_id)
            .is('deleted_at', null)
            .maybeSingle()

        if (existingGlosa) {
            return NextResponse.json(
                { success: false, error: 'Esta guia já possui um registro ativo em TISS Glosas.' },
                { status: 400 }
            )
        }

        const { data: guideInsurance } = await (supabase as any)
            .from('tiss_guides')
            .select('health_insurance_id, health_insurance:health_insurances(appeal_deadline_days)')
            .eq('id', validated.guide_id)
            .eq('clinic_id', profile.clinic_id)
            .maybeSingle()

        const appealDays = Number(guideInsurance?.health_insurance?.appeal_deadline_days) || 30
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + appealDays)

        // Grava exclusivamente colunas reais existentes em public.tiss_glosas
        const { data: newGlosa, error: insertError } = await (supabase as any)
            .from('tiss_glosas')
            .insert({
                guide_id: validated.guide_id,
                clinic_id: profile.clinic_id,
                glosa_type: validated.glosa_type,
                glosa_code: validated.glosa_code || null,
                glosa_description: validated.glosa_description,
                glosa_value: validated.glosa_value,
                original_value: validated.original_value,
                approved_value: validated.approved_value,
                can_appeal: true,
                contest_deadline: deadline.toISOString().split('T')[0],
                contest_status: 'PENDING',
                status: 'OPEN',
            })
            .select()
            .single()

        if (insertError) {
            console.error('[FINANCIAL GLOSAS] Insert error:', insertError)
            return NextResponse.json(
                { success: false, error: 'Falha ao registrar a contestação na base', details: insertError },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, data: newGlosa })
    } catch (error: any) {
        request.log.error('financial/glosas', { error: error instanceof Error ? error.message : String(error) })
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: 'Validation Error', details: error.errors }, { status: 400 })
        }
        console.error('[FINANCIAL GLOSAS] Erro Interno POST:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
})
