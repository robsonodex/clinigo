import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_TEMPLATES } from '../route'

const ALLOWED_PATCH_FIELDS = new Set(['name', 'description', 'color', 'position', 'stages'])

interface PatientMetricRow {
    patient_id: string
    full_name: string
    phone: string | null
    email: string | null
    lead_source: string | null
    created_at: string
    completed_count: number
    total_appointments: number
    last_appointment: string | null
    doctor_name: string | null
    ltv: number
}

function resolveClinicalStageName(completedCount: number, totalAppointments: number): string {
    if (completedCount === 0 && totalAppointments === 0) return 'Leads'
    if (completedCount === 0 && totalAppointments > 0) return 'Agendou'
    if (completedCount === 1) return 'Compareceu'
    if (completedCount >= 2 && completedCount <= 4) return 'Retornou'
    return 'Recorrente'
}

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
 * Detalhe do funil com etapas, cards deduplicados e métricas analíticas agregadas via RPC
 */
export const GET = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
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

        // 1. Buscar o funil da clínica
        let pipeline: any = null

        if (pipelineId === 'default' || pipelineId === 'default-pipeline') {
            const { data: defaultPipe } = await (serviceClient as any)
                .from('crm_pipelines')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('is_default', true)
                .is('archived_at', null)
                .maybeSingle()

            pipeline = defaultPipe
        } else {
            const { data: foundPipe } = await (serviceClient as any)
                .from('crm_pipelines')
                .select('*')
                .eq('id', pipelineId)
                .eq('clinic_id', clinicId)
                .is('archived_at', null)
                .maybeSingle()

            pipeline = foundPipe
        }

        if (!pipeline) {
            return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
        }

        const doctorFilter = request.nextUrl.searchParams.get('doctor_id')

        // 2. Buscar etapas, cards persistidos e (se funil padrão) métricas agregadas em paralelo
        const [stagesRes, cardsRes, metricsRes] = await Promise.all([
            (serviceClient as any)
                .from('crm_pipeline_stages')
                .select('*')
                .eq('pipeline_id', pipeline.id)
                .order('position', { ascending: true }),
            (serviceClient as any)
                .from('crm_pipeline_cards')
                .select(`
                    *,
                    patient:patients(id, full_name, phone, email)
                `)
                .eq('pipeline_id', pipeline.id)
                .eq('clinic_id', clinicId)
                .order('position', { ascending: true }),
            pipeline.is_default
                ? (serviceClient as any).rpc('get_crm_patient_metrics', {
                    p_clinic_id: clinicId,
                    p_doctor_id: doctorFilter || null,
                })
                : Promise.resolve({ data: [], error: null }),
        ])

        const dbStages = stagesRes.data
        const stages = dbStages && dbStages.length > 0 ? dbStages : DEFAULT_STAGE_TEMPLATES.padrao.map((s, idx) => ({
            id: `stage-${idx}`,
            pipeline_id: pipeline.id,
            name: s.name,
            position: s.position,
            color: s.color,
            is_won_stage: s.is_won_stage,
            is_lost_stage: s.is_lost_stage
        }))

        const customCards = (cardsRes.data || []) as any[]
        const metricsRows = (metricsRes.data || []) as PatientMetricRow[]

        const metricsByPatientId = new Map<string, PatientMetricRow>()
        for (const row of metricsRows) {
            metricsByPatientId.set(row.patient_id, row)
        }

        // 3. Distribuir os cards em cada estágio sem duplicar pacientes já persistidos em crm_pipeline_cards
        const cardsByStage: Record<string, any[]> = {}
        stages.forEach((st: any) => {
            cardsByStage[st.id] = []
        })

        const persistedPatientIds = new Set<string>()

        for (const card of customCards) {
            if (card.patient_id) {
                persistedPatientIds.add(card.patient_id)
            }
            const metric = card.patient_id ? metricsByPatientId.get(card.patient_id) : undefined
            const targetStageId = cardsByStage[card.stage_id] ? card.stage_id : stages[0]?.id
            if (targetStageId && cardsByStage[targetStageId]) {
                const numericCardValue = Number(card.value) || 0
                const metricLtv = Number(metric?.ltv) || 0
                cardsByStage[targetStageId].push({
                    ...card,
                    title: card.title || card.patient?.full_name || card.contact_name || 'Sem título',
                    contact_name: card.contact_name || card.patient?.full_name || null,
                    contact_phone: card.contact_phone || card.patient?.phone || metric?.phone || null,
                    contact_email: card.contact_email || card.patient?.email || metric?.email || null,
                    value: numericCardValue > 0 ? numericCardValue : metricLtv,
                    completed_count: metric ? Number(metric.completed_count) : undefined,
                    total_appointments: metric ? Number(metric.total_appointments) : undefined,
                    last_appointment: metric?.last_appointment || null,
                    doctor_name: metric?.doctor_name || null,
                    is_clinical_patient: Boolean(card.patient_id),
                    is_persisted_card: true,
                })
            }
        }

        // Para o funil padrão, incluir os demais pacientes clínicos ainda sem card manual persistido
        if (pipeline.is_default && metricsRows.length > 0) {
            for (const row of metricsRows) {
                if (persistedPatientIds.has(row.patient_id)) continue

                const completedCount = Number(row.completed_count) || 0
                const totalAppointments = Number(row.total_appointments) || 0
                const stageKey = resolveClinicalStageName(completedCount, totalAppointments)
                const targetStage = stages.find((s: any) => s.name.toLowerCase() === stageKey.toLowerCase()) || stages[0]

                if (targetStage && cardsByStage[targetStage.id]) {
                    cardsByStage[targetStage.id].push({
                        id: row.patient_id,
                        patient_id: row.patient_id,
                        pipeline_id: pipeline.id,
                        stage_id: targetStage.id,
                        title: row.full_name,
                        contact_name: row.full_name,
                        contact_phone: row.phone,
                        contact_email: row.email,
                        value: Number(row.ltv) || 0,
                        completed_count: completedCount,
                        total_appointments: totalAppointments,
                        last_appointment: row.last_appointment || null,
                        doctor_name: row.doctor_name || null,
                        legacy_stage: stageKey,
                        is_clinical_patient: true,
                        is_persisted_card: false,
                    })
                }
            }
        }

        // 4. Cálculo de Métricas e Analytics do Funil
        let totalPipelineCards = 0
        const stageMetrics: any[] = []

        stages.forEach((st: any, idx: number) => {
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

        let funnelInsight = 'Fluxo de atendimento regular.'
        if (stages.length >= 2) {
            const firstStageCount = cardsByStage[stages[0].id]?.length || 0
            const secondStageCount = cardsByStage[stages[1].id]?.length || 0
            if (firstStageCount > 10 && secondStageCount < (firstStageCount * 0.2)) {
                funnelInsight = `Atenção: ${Math.round((1 - (secondStageCount / firstStageCount)) * 100)}% dos contatos permanecem estagnados na etapa inicial (${stages[0].name}).`
            } else if (totalPipelineCards > 0) {
                funnelInsight = `Funil saudável com ${totalPipelineCards} pacientes/leads distribuídos em ${stages.length} etapas.`
            } else {
                funnelInsight = 'Nenhum cartão cadastrado neste funil ainda. Use "Novo Card" para adicionar leads.'
            }
        }

        return NextResponse.json({
            pipeline: {
                ...pipeline,
                stages: stages.map((st: any) => ({
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
        request.log.error('crm/pipelines/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[GET /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

/**
 * PATCH /api/crm/pipelines/[id]
 * Edita metadados do funil e/ou reordena e edita etapas atomicamente
 */
export const PATCH = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
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

        for (const key of Object.keys(body)) {
            if (!ALLOWED_PATCH_FIELDS.has(key)) {
                return NextResponse.json({
                    error: `Campo não permitido: ${key}`,
                    code: 'FORBIDDEN_FIELD'
                }, { status: 403 })
            }
        }

        const serviceClient = createServiceRoleClient()

        const { data: existingPipe, error: findError } = await (serviceClient as any)
            .from('crm_pipelines')
            .select('id, clinic_id, is_default')
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .single()

        if (findError || !existingPipe) {
            return NextResponse.json({ error: 'Funil não encontrado ou não pertence a esta clínica' }, { status: 404 })
        }

        const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
        if (body.name !== undefined) {
            const trimmed = String(body.name).trim()
            if (!trimmed) {
                return NextResponse.json({ error: 'Nome do funil não pode ser vazio' }, { status: 400 })
            }
            updatePayload.name = trimmed
        }
        if (body.description !== undefined) updatePayload.description = body.description ? String(body.description).trim() : null
        if (body.color !== undefined) updatePayload.color = String(body.color)
        if (body.position !== undefined) updatePayload.position = Number(body.position)

        const { data: updatedPipe, error: pipeUpdateError } = await (serviceClient as any)
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

        if (Array.isArray(body.stages)) {
            const keptStageIds = new Set<string>()
            for (let idx = 0; idx < body.stages.length; idx++) {
                const stage = body.stages[idx]
                if (stage.id && !String(stage.id).startsWith('new-') && !String(stage.id).startsWith('stage-')) {
                    keptStageIds.add(stage.id)
                    await (serviceClient as any)
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
                    const { data: insertedStage } = await (serviceClient as any)
                        .from('crm_pipeline_stages')
                        .insert({
                            pipeline_id: pipelineId,
                            name: String(stage.name).trim(),
                            color: stage.color || '#64748b',
                            position: typeof stage.position === 'number' ? stage.position : idx,
                            is_won_stage: Boolean(stage.is_won_stage),
                            is_lost_stage: Boolean(stage.is_lost_stage)
                        })
                        .select('id')
                        .single()
                    if (insertedStage?.id) keptStageIds.add(insertedStage.id)
                }
            }

            // Remover apenas etapas descartadas que NÃO possuam cards vinculados
            const { data: existingStages } = await (serviceClient as any)
                .from('crm_pipeline_stages')
                .select('id')
                .eq('pipeline_id', pipelineId)

            const removedIds = ((existingStages || []) as Array<{ id: string }>)
                .map(s => s.id)
                .filter(id => !keptStageIds.has(id))

            for (const removedId of removedIds) {
                const { data: linkedCard } = await (serviceClient as any)
                    .from('crm_pipeline_cards')
                    .select('id')
                    .eq('stage_id', removedId)
                    .eq('clinic_id', clinicId)
                    .limit(1)

                if (!linkedCard || linkedCard.length === 0) {
                    await (serviceClient as any)
                        .from('crm_pipeline_stages')
                        .delete()
                        .eq('id', removedId)
                        .eq('pipeline_id', pipelineId)
                }
            }
        }

        const { data: finalStages } = await (serviceClient as any)
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
        request.log.error('crm/pipelines/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[PATCH /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

/**
 * DELETE /api/crm/pipelines/[id]
 * Arquivamento de funil (Soft delete). Nunca arquiva o default ou funil com cards ativos.
 */
export const DELETE = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
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

        const { data: pipe, error: findError } = await (serviceClient as any)
            .from('crm_pipelines')
            .select('id, name, is_default, clinic_id')
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .single()

        if (findError || !pipe) {
            return NextResponse.json({ error: 'Funil não encontrado' }, { status: 404 })
        }

        if (pipe.is_default) {
            return NextResponse.json({
                error: 'Não é permitido arquivar o Funil Padrão da clínica.',
                code: 'CANNOT_ARCHIVE_DEFAULT'
            }, { status: 409 })
        }

        // Checagem leve com limite em vez de varredura completa
        const { data: activeCards } = await (serviceClient as any)
            .from('crm_pipeline_cards')
            .select('id')
            .eq('pipeline_id', pipelineId)
            .eq('clinic_id', clinicId)
            .limit(100)

        if (activeCards && activeCards.length > 0) {
            return NextResponse.json({
                error: `Existem ${activeCards.length} cartão(ões) vinculado(s) a este funil. Remova ou mova os cartões antes de arquivá-lo.`,
                code: 'PIPELINE_HAS_ACTIVE_CARDS',
                cards_count: activeCards.length
            }, { status: 409 })
        }

        const { error: archiveError } = await (serviceClient as any)
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
        request.log.error('crm/pipelines/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[DELETE /api/crm/pipelines/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})
