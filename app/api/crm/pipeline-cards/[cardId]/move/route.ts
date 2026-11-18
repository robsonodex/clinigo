import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 }
    }

    const headerClinicId = request.headers.get('x-clinic-id')
    const headerUserRole = request.headers.get('x-user-role')

    let clinicId = headerClinicId
    let userRole = headerUserRole

    if (!clinicId || !userRole) {
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        clinicId = (userData as any)?.clinic_id
        userRole = (userData as any)?.role
    }

    if (!clinicId) {
        return { error: 'Clínica não encontrada para o usuário', status: 400 }
    }

    return { user, clinicId, userRole, supabase }
}

/**
 * PATCH /api/crm/pipeline-cards/[cardId]/move
 * Move um card entre etapas e/ou entre funis, com validação multi-tenant estrita.
 */
export const PATCH = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ cardId: string }> }) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, user } = auth
        const { cardId } = await context.params

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(userRole || '')) {
            return NextResponse.json({ error: 'Permissão insuficiente para mover cards', code: 'FORBIDDEN' }, { status: 403 })
        }

        const body = await request.json()
        const { stage_id, new_position } = body

        if (!stage_id || typeof stage_id !== 'string') {
            return NextResponse.json({ error: 'Etapa de destino (stage_id) é obrigatória' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient()

        // 0. Validar que stage_id pertence a um funil ativo da clínica (isolamento multi-tenant estrito)
        const { data: targetStage, error: stageErr } = await (serviceClient as any)
            .from('crm_pipeline_stages')
            .select('id, name, pipeline_id, is_won_stage, is_lost_stage, pipeline:crm_pipelines!inner(id, clinic_id, archived_at)')
            .eq('id', stage_id)
            .eq('pipeline.clinic_id', clinicId)
            .is('pipeline.archived_at', null)
            .maybeSingle()

        if (stageErr || !targetStage) {
            return NextResponse.json({ error: 'Etapa de destino não encontrada nesta clínica' }, { status: 404 })
        }

        const resolvedPipelineId = targetStage.pipeline_id

        // 1. Verificar se o cardId já corresponde a um registro em crm_pipeline_cards
        const { data: existingCard } = await (serviceClient as any)
            .from('crm_pipeline_cards')
            .select('id, clinic_id, pipeline_id, stage_id, patient_id')
            .eq('id', cardId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (existingCard) {
            const updatePayload: Record<string, any> = {
                stage_id: targetStage.id,
                pipeline_id: resolvedPipelineId,
                is_won: Boolean(targetStage.is_won_stage),
                is_lost: Boolean(targetStage.is_lost_stage),
                updated_at: new Date().toISOString()
            }

            if (typeof new_position === 'number') {
                updatePayload.position = new_position
            }

            const { data: updatedCard, error: updateError } = await (serviceClient as any)
                .from('crm_pipeline_cards')
                .update(updatePayload)
                .eq('id', cardId)
                .eq('clinic_id', clinicId)
                .select()
                .single()

            if (updateError) {
                console.error('[PATCH /api/crm/pipeline-cards/move] Erro ao mover card:', updateError.message)
                return NextResponse.json({ error: 'Não foi possível mover o card' }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                card: updatedCard
            })
        }

        // 2. Caso contrário, verificar se cardId é um ID de paciente clínico da clínica
        const { data: patient } = await serviceClient
            .from('patients')
            .select('id, full_name, phone, email, clinic_id')
            .eq('id', cardId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (!patient) {
            return NextResponse.json({ error: 'Card ou paciente não encontrado' }, { status: 404 })
        }

        // Verificar se já existe um card persistido para este (clinic_id, pipeline_id, patient_id)
        const { data: existingPatientCard } = await (serviceClient as any)
            .from('crm_pipeline_cards')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('pipeline_id', resolvedPipelineId)
            .eq('patient_id', patient.id)
            .maybeSingle()

        let persistedCard: any = null

        if (existingPatientCard) {
            const { data: updated, error: updErr } = await (serviceClient as any)
                .from('crm_pipeline_cards')
                .update({
                    stage_id: targetStage.id,
                    is_won: Boolean(targetStage.is_won_stage),
                    is_lost: Boolean(targetStage.is_lost_stage),
                    position: typeof new_position === 'number' ? new_position : 0,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingPatientCard.id)
                .eq('clinic_id', clinicId)
                .select()
                .single()

            if (updErr) {
                console.error('[PATCH /api/crm/pipeline-cards/move] Erro ao atualizar card do paciente:', updErr.message)
                return NextResponse.json({ error: 'Erro ao atualizar estágio do paciente' }, { status: 500 })
            }
            persistedCard = updated
        } else {
            const { data: inserted, error: insErr } = await (serviceClient as any)
                .from('crm_pipeline_cards')
                .insert({
                    clinic_id: clinicId,
                    pipeline_id: resolvedPipelineId,
                    stage_id: targetStage.id,
                    patient_id: patient.id,
                    title: patient.full_name,
                    contact_name: patient.full_name,
                    contact_phone: patient.phone,
                    contact_email: patient.email,
                    position: typeof new_position === 'number' ? new_position : 0,
                    is_won: Boolean(targetStage.is_won_stage),
                    is_lost: Boolean(targetStage.is_lost_stage),
                    created_by: user.id,
                })
                .select()
                .single()

            if (insErr) {
                console.error('[PATCH /api/crm/pipeline-cards/move] Erro ao criar card do paciente:', insErr.message)
                return NextResponse.json({ error: 'Erro ao persistir estágio do paciente' }, { status: 500 })
            }
            persistedCard = inserted
        }

        return NextResponse.json({
            success: true,
            card: persistedCard
        })

    } catch (error: any) {
        request.log.error('crm/pipeline-cards/[cardId]/move', { error: error instanceof Error ? error.message : String(error) })
        console.error('[PATCH /api/crm/pipeline-cards/move] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})
