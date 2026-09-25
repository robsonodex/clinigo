import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_TEMPLATES } from '../route'

const ALLOWED_PATCH_FIELDS = new Set(['name', 'description', 'color', 'position', 'stages'])

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
 * GET /api/crm/pipelines/[id]
 * Detalhe do funil com etapas, cards e métricas analíticas
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, supabase } = auth
        const { id: pipelineId } = await context.params

        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const serviceClient = createServiceRoleClient()

        // 1. Buscar o funil
        let pipeline: any = null

        if (pipelineId === 'default' || pipelineId === 'default-pipeline') {
            const { data: defaultPipe } = await serviceClient
                .from('crm_pipelines')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('is_default', true)
                .is('archived_at', null)
                .maybeSingle()

            pipeline = defaultPipe
        } else {
            const { data: foundPipe } = await serviceClient
                .from('crm_pipelines')
                .select('*')
                .eq('id', pipelineId)
                .eq('clinic_id', clinicId)
                .is('archived_at', null)
                .maybeSingle()

            pipeline = foundPipe
        }

        // Se não encontrar no banco ou for default fallback
        if (!pipeline) {
            pipeline = {
                id: pipelineId === 'default' ? 'default-pipeline' : pipelineId,
                clinic_id: clinicId,
                name: 'Funil Padrão',
                description: 'Funil padrão do CRM médico integrado',
                color: '#0284c7',
                is_default: true,
                position: 0
            }
        }

        // 2. Buscar etapas do funil
        const { data: dbStages } = await serviceClient
            .from('crm_pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipeline.id)
            .order('position', { ascending: true })

        let stages = dbStages && dbStages.length > 0 ? dbStages : DEFAULT_STAGE_TEMPLATES.padrao.map((s, idx) => ({
            id: `stage-${idx}`,
            pipeline_id: pipeline.id,
            name: s.name,
            position: s.position,
            color: s.color,
            is_won_stage: s.is_won_stage,
            is_lost_stage: s.is_lost_stage
        }))

        // 3. Buscar cards customizados vinculados a este funil
        const { data: customCards } = await serviceClient
            .from('crm_pipeline_cards')
            .select(`
                *,
                patient:patients(id, full_name, phone, email)
            `)
            .eq('pipeline_id', pipeline.id)
            .eq('clinic_id', clinicId)
            .order('position', { ascending: true })

        // Se for o funil padrão, carregar também os pacientes clínicos (igual à rota legada)
        let clinicalPatients: any[] = []
        if (pipeline.is_default || pipeline.id === 'default-pipeline') {
            const { data: patients } = await supabase
                .from('patients')
                .select('id, full_name, phone, email, lead_source, created_at')
                .eq('clinic_id', clinicId)
                .order('full_name')

            const { data: appointments } = await supabase
                .from('appointments')
                .select('patient_id, status, appointment_date, doctor:doctors!appointments_doctor_id_fkey(user:users(full_name))')
                .eq('clinic_id', clinicId)

            const { data: financials } = await supabase
                .from('financial_entries')
                .select('patient_id, amount')
                .eq('clinic_id', clinicId)
                .eq('type', 'INCOME')

            clinicalPatients = (patients || []).map(p => {
                const pAppts = (appointments || []).filter((a: any) => a.patient_id === p.id)
                const completedCount = pAppts.filter((a: any) => a.status === 'COMPLETED').length
                const totalAppointments = pAppts.length
                const lastAppt = pAppts
                    .filter((a: any) => a.status === 'COMPLETED')
                    .sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())[0]

                const pFin = (financials || []).filter((f: any) => f.patient_id === p.id)
                const ltv = pFin.reduce((sum: number, f: any) => sum + (f.amount || 0), 0)
                const doctorName = lastAppt?.doctor?.user?.full_name || pAppts[0]?.doctor?.user?.full_name || null

                // Determinar estágio legado
                let stageKey = 'Leads'
                if (completedCount === 0 && totalAppointments === 0) stageKey = 'Leads'
                else if (completedCount === 0 && totalAppointments > 0) stageKey = 'Agendou'
                else if (completedCount === 1) stageKey = 'Compareceu'
                else if (completedCount >= 2 && completedCount <= 4) stageKey = 'Retornou'
                else stageKey = 'Recorrente'

                return {
                    id: p.id,
                    patient_id: p.id,
                    title: p.full_name,
                    contact_name: p.full_name,
                    contact_phone: p.phone,
                    contact_email: p.email,
                    value: ltv,
                    completed_count: completedCount,
                    total_appointments: totalAppointments,
                    last_appointment: lastAppt?.appointment_date || null,
                    doctor_name: doctorName,
                    legacy_stage: stageKey,
                    is_clinical_patient: true
                }
            })
        }

        // 4. Distribuir os cards em cada estágio
        const cardsByStage: Record<string, any[]> = {}
        stages.forEach(st => {
            cardsByStage[st.id] = []
        })

        // Inserir cartões customizados
        customCards?.forEach(card => {
            if (cardsByStage[card.stage_id]) {
                cardsByStage[card.stage_id].push({
                    ...card,
                    is_clinical_patient: false
                })
            }
        })

        // Se for funil padrão, associar os pacientes clínicos às etapas pelo nome
        if (clinicalPatients.length > 0) {
            clinicalPatients.forEach(p => {
                const targetStage = stages.find(s => s.name.toLowerCase() === p.legacy_stage.toLowerCase()) || stages[0]
                if (targetStage && cardsByStage[targetStage.id]) {
                    cardsByStage[targetStage.id].push({
                        ...p,
                        stage_id: targetStage.id,
                        pipeline_id: pipeline.id
                    })
                }
            })
        }

        // 5. Cálculo de Métricas e Analytics do Funil (Fase 4 - Requisito Premium)
        let totalPipelineCards = 0
        const stageMetrics: any[] = []

        stages.forEach((st, idx) => {
            const count = cardsByStage[st.id]?.length || 0
            totalPipelineCards += count
            const prevCount = idx > 0 ? (cardsByStage[stages[idx - 1].id]?.length || 0) : count
            const convRate = prevCount > 0 ? Math.min(100, Math.round((count / prevCount) * 100)) : 0

            stageMetrics.push({
                stage_id: st.id,
                stage_name: st.name,
                cards_count: count,
                conversion_from_previous: convRate
            })
        })

        // Insights automáticos
        let funnelInsight = 'Fluxo de atendimento regular.'
        if (stages.length >= 2) {
            const firstStageCount = cardsByStage[stages[0].id]?.length || 0
            const secondStageCount = cardsByStage[stages[1].id]?.length || 0
            if (firstStageCount > 10 && secondStageCount < (firstStageCount * 0.2)) {
                funnelInsight = `Atenção: ${Math.round((1 - (secondStageCount / firstStageCount)) * 100)}% dos contatos permanecem estagnados na etapa inicial (${stages[0].name}).`
            } else if (totalPipelineCards > 0) {
                funnelInsight = `Funil saudável com ${totalPipelineCards} pacientes/leads distribuídos em ${stages.length} etapas.`
            }
        }

        return NextResponse.json({
            pipeline: {
                ...pipeline,
                stages: stages.map(st => ({
                    ...st,
                    cards: cardsByStage[st.id] || [],
                    cards_count: cardsByStage[st.id]?.length || 0
                })),
                total_cards: totalPipelineCards,
                analytics: {
                    total_cards: totalPipelineCards,
                    stage_metrics: stageMetrics,
                    insight: funnelInsight
                }
            }
        })

    } catch (error: any) {
        console.error('[GET /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * PATCH /api/crm/pipelines/[id]
 * Edita metadados do funil e/ou reordena e edita etapas atomicamente
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole } = auth
        const { id: pipelineId } = await context.params

        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const body = await request.json()

        // Validação da allowlist estrita
        for (const key of Object.keys(body)) {
            if (!ALLOWED_PATCH_FIELDS.has(key)) {
                return NextResponse.json({
                    error: `Campo não permitido: ${key}`,
                    code: 'FORBIDDEN_FIELD'
                }, { status: 403 })
            }
        }

        const serviceClient = createServiceRoleClient()

        // 1. Verificar se o funil pertence à clínica
        const { data: existingPipe, error: findError } = await serviceClient
            .from('crm_pipelines')
            .select('id, clinic_id, is_default')
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .single()

        if (findError || !existingPipe) {
            return NextResponse.json({ error: 'Funil não encontrado ou não pertence a esta clínica' }, { status: 404 })
        }

        // 2. Atualizar dados principais do funil se informados
        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) updatePayload.name = String(body.name).trim()
        if (body.description !== undefined) updatePayload.description = body.description ? String(body.description).trim() : null
        if (body.color !== undefined) updatePayload.color = String(body.color)
        if (body.position !== undefined) updatePayload.position = Number(body.position)

        const { data: updatedPipe, error: pipeUpdateError } = await serviceClient
            .from('crm_pipelines')
            .update(updatePayload)
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .select()
            .single()

        if (pipeUpdateError) {
            console.error('[PATCH /api/crm/pipelines/[id]] Erro no update do funil:', pipeUpdateError)
            return NextResponse.json({ error: pipeUpdateError.message }, { status: 500 })
        }

        // 3. Atualizar etapas se enviadas (adição, edição ou reordenação)
        if (Array.isArray(body.stages)) {
            for (let idx = 0; idx < body.stages.length; idx++) {
                const stage = body.stages[idx]
                if (stage.id && !stage.id.startsWith('new-') && !stage.id.startsWith('stage-')) {
                    // Atualiza etapa existente
                    await serviceClient
                        .from('crm_pipeline_stages')
                        .update({
                            name: stage.name ? String(stage.name).trim() : undefined,
                            color: stage.color || undefined,
                            position: typeof stage.position === 'number' ? stage.position : idx,
                            is_won_stage: Boolean(stage.is_won_stage),
                            is_lost_stage: Boolean(stage.is_lost_stage),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', stage.id)
                        .eq('pipeline_id', pipelineId)
                } else if (stage.name) {
                    // Cria nova etapa
                    await serviceClient
                        .from('crm_pipeline_stages')
                        .insert({
                            pipeline_id: pipelineId,
                            name: String(stage.name).trim(),
                            color: stage.color || '#64748b',
                            position: typeof stage.position === 'number' ? stage.position : idx,
                            is_won_stage: Boolean(stage.is_won_stage),
                            is_lost_stage: Boolean(stage.is_lost_stage)
                        })
                }
            }
        }

        // 4. Retornar funil atualizado
        const { data: finalStages } = await serviceClient
            .from('crm_pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipelineId)
            .order('position', { ascending: true })

        return NextResponse.json({
            pipeline: {
                ...updatedPipe,
                stages: finalStages || []
            }
        })

    } catch (error: any) {
        console.error('[PATCH /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * DELETE /api/crm/pipelines/[id]
 * Arquivamento de funil (Soft delete). Nunca DELETE físico se for o default ou tiver cards.
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole } = auth
        const { id: pipelineId } = await context.params

        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const serviceClient = createServiceRoleClient()

        // 1. Buscar o funil e verificar se pertence à clínica
        const { data: pipe, error: findError } = await serviceClient
            .from('crm_pipelines')
            .select('id, name, is_default, clinic_id')
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .single()

        if (findError || !pipe) {
            return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
        }

        // 2. Não permitir arquivar o funil padrão
        if (pipe.is_default) {
            return NextResponse.json({
                error: 'Não é permitido arquivar o Funil Padrão da clínica.',
                code: 'CANNOT_ARCHIVE_DEFAULT'
            }, { status: 409 })
        }

        // 3. Verificar se há cards ativos vinculados
        const { count, error: countError } = await serviceClient
            .from('crm_pipeline_cards')
            .select('id', { count: 'exact', head: true })
            .eq('pipeline_id', pipelineId)
            .eq('clinic_id', clinicId)

        if (!countError && count && count > 0) {
            return NextResponse.json({
                error: `Existem ${count} cartões vinculados a este funil. Mova-os para outro funil antes de arquivá-lo.`,
                code: 'PIPELINE_HAS_ACTIVE_CARDS',
                cards_count: count
            }, { status: 409 })
        }

        // 4. Executar arquivamento (soft delete)
        const { error: archiveError } = await serviceClient
            .from('crm_pipelines')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)

        if (archiveError) {
            console.error('[DELETE /api/crm/pipelines/[id]] Erro ao arquivar:', archiveError)
            return NextResponse.json({ error: archiveError.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Funil "${pipe.name}" arquivado com sucesso.`
        })

    } catch (error: any) {
        console.error('[DELETE /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
