import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// Template padrão para funis novos sem etapas definidas
export const DEFAULT_STAGE_TEMPLATES = {
    vendas: [
        { name: 'Novo Contato', color: '#94a3b8', position: 0, is_won_stage: false, is_lost_stage: false },
        { name: 'Qualificação', color: '#38bdf8', position: 1, is_won_stage: false, is_lost_stage: false },
        { name: 'Proposta / Avaliação', color: '#818cf8', position: 2, is_won_stage: false, is_lost_stage: false },
        { name: 'Em Negociação', color: '#fbbf24', position: 3, is_won_stage: false, is_lost_stage: false },
        { name: 'Fechado (Ganho)', color: '#10b981', position: 4, is_won_stage: true, is_lost_stage: false },
        { name: 'Perdido', color: '#ef4444', position: 5, is_won_stage: false, is_lost_stage: true },
    ],
    recuperacao: [
        { name: 'Inativo 30+ Dias', color: '#94a3b8', position: 0, is_won_stage: false, is_lost_stage: false },
        { name: 'Tentativa de Contato', color: '#38bdf8', position: 1, is_won_stage: false, is_lost_stage: false },
        { name: 'Agendou Retorno', color: '#10b981', position: 2, is_won_stage: true, is_lost_stage: false },
        { name: 'Não Teve Interesse', color: '#ef4444', position: 3, is_won_stage: false, is_lost_stage: true },
    ],
    pos_atendimento: [
        { name: 'Consulta Concluída', color: '#94a3b8', position: 0, is_won_stage: false, is_lost_stage: false },
        { name: 'Pesquisa NPS Enviada', color: '#38bdf8', position: 1, is_won_stage: false, is_lost_stage: false },
        { name: 'Retorno Previsto', color: '#fbbf24', position: 2, is_won_stage: false, is_lost_stage: false },
        { name: 'Fidelizado', color: '#10b981', position: 3, is_won_stage: true, is_lost_stage: false },
    ],
    padrao: [
        { name: 'Leads', color: '#94a3b8', position: 0, is_won_stage: false, is_lost_stage: false },
        { name: 'Agendou', color: '#38bdf8', position: 1, is_won_stage: false, is_lost_stage: false },
        { name: 'Compareceu', color: '#34d399', position: 2, is_won_stage: false, is_lost_stage: false },
        { name: 'Retornou', color: '#818cf8', position: 3, is_won_stage: false, is_lost_stage: false },
        { name: 'Recorrente', color: '#10b981', position: 4, is_won_stage: true, is_lost_stage: false },
    ]
}

// Helper para obter dados do usuário autenticado e verificar clínica
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
 * GET /api/crm/pipelines
 * Lista todos os funis da clínica (não arquivados), com contagem de cards por etapa
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, supabase } = auth

        // RBAC: Apenas ADMINs
        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const serviceClient = createServiceRoleClient()

        // 1. Tenta buscar funis da tabela crm_pipelines
        const { data: pipelines, error: pError } = await serviceClient
            .from('crm_pipelines')
            .select(`
                id,
                clinic_id,
                name,
                description,
                color,
                is_default,
                position,
                created_at,
                updated_at,
                stages:crm_pipeline_stages(
                    id,
                    pipeline_id,
                    name,
                    position,
                    color,
                    is_won_stage,
                    is_lost_stage
                )
            `)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .order('position', { ascending: true })

        // Se a tabela crm_pipelines ainda não foi migrada ou está vazia, retornar o funil padrão
        if (pError || !pipelines || pipelines.length === 0) {
            const fallbackDefaultPipeline = {
                id: 'default-pipeline',
                clinic_id: clinicId,
                name: 'Funil Padrão',
                description: 'Funil padrão do CRM médico integrado',
                color: '#0284c7',
                is_default: true,
                position: 0,
                stages: DEFAULT_STAGE_TEMPLATES.padrao.map((st, idx) => ({
                    id: `default-stage-${idx}`,
                    pipeline_id: 'default-pipeline',
                    name: st.name,
                    position: st.position,
                    color: st.color,
                    is_won_stage: st.is_won_stage,
                    is_lost_stage: st.is_lost_stage,
                    cards_count: 0
                })),
                total_cards: 0
            }

            return NextResponse.json({
                pipelines: [fallbackDefaultPipeline],
                active_pipeline_id: 'default-pipeline'
            })
        }

        // 2. Buscar contagem de cards por etapa para cada funil
        const pipelineIds = pipelines.map(p => p.id)
        const { data: cards } = await serviceClient
            .from('crm_pipeline_cards')
            .select('id, pipeline_id, stage_id')
            .in('pipeline_id', pipelineIds)
            .eq('clinic_id', clinicId)

        const cardsCountMap = new Map<string, number>()
        cards?.forEach(c => {
            const current = cardsCountMap.get(c.stage_id) || 0
            cardsCountMap.set(c.stage_id, current + 1)
        })

        const formattedPipelines = pipelines.map(pipe => {
            const sortedStages = (pipe.stages || []).sort((a: any, b: any) => a.position - b.position)
            let pipeTotalCards = 0

            const stagesWithCount = sortedStages.map((st: any) => {
                const count = cardsCountMap.get(st.id) || 0
                pipeTotalCards += count
                return {
                    ...st,
                    cards_count: count
                }
            })

            return {
                ...pipe,
                stages: stagesWithCount,
                total_cards: pipeTotalCards
            }
        })

        const defaultPipe = formattedPipelines.find(p => p.is_default) || formattedPipelines[0]

        return NextResponse.json({
            pipelines: formattedPipelines,
            active_pipeline_id: defaultPipe?.id || null
        })

    } catch (error: any) {
        console.error('[GET /api/crm/pipelines] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * POST /api/crm/pipelines
 * Cria novo funil com etapas customizadas ou a partir de template
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, user } = auth

        // RBAC: Apenas ADMINs
        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const body = await request.json()
        const { name, description, color, stages, template_key } = body

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'O nome do funil é obrigatório' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient()

        // Determinar etapas: ou fornecidas pelo usuário, ou pelo template, ou padrão
        let stagesToCreate = Array.isArray(stages) && stages.length > 0 ? stages : null

        if (!stagesToCreate && template_key && DEFAULT_STAGE_TEMPLATES[template_key as keyof typeof DEFAULT_STAGE_TEMPLATES]) {
            stagesToCreate = DEFAULT_STAGE_TEMPLATES[template_key as keyof typeof DEFAULT_STAGE_TEMPLATES]
        }

        if (!stagesToCreate) {
            stagesToCreate = DEFAULT_STAGE_TEMPLATES.vendas
        }

        // Determinar a posição do novo funil
        const { data: existingPipes } = await serviceClient
            .from('crm_pipelines')
            .select('position')
            .eq('clinic_id', clinicId)
            .order('position', { ascending: false })
            .limit(1)

        const nextPosition = (existingPipes && existingPipes.length > 0) ? (existingPipes[0].position + 1) : 0

        // 1. Criar funil
        const { data: newPipeline, error: pipeError } = await serviceClient
            .from('crm_pipelines')
            .insert({
                clinic_id: clinicId,
                name: name.trim(),
                description: description ? description.trim() : null,
                color: color || '#0284c7',
                is_default: false,
                position: nextPosition,
                created_by: user.id
            })
            .select()
            .single()

        if (pipeError || !newPipeline) {
            console.error('[POST /api/crm/pipelines] Erro ao inserir funil:', pipeError)
            return NextResponse.json({ error: pipeError?.message || 'Falha ao criar funil' }, { status: 500 })
        }

        // 2. Inserir etapas
        const stagesPayload = stagesToCreate.map((st: any, idx: number) => ({
            pipeline_id: newPipeline.id,
            name: (st.name || `Etapa ${idx + 1}`).trim(),
            position: typeof st.position === 'number' ? st.position : idx,
            color: st.color || '#64748b',
            is_won_stage: Boolean(st.is_won_stage),
            is_lost_stage: Boolean(st.is_lost_stage)
        }))

        const { data: createdStages, error: stagesError } = await serviceClient
            .from('crm_pipeline_stages')
            .insert(stagesPayload)
            .select()
            .order('position', { ascending: true })

        if (stagesError) {
            console.error('[POST /api/crm/pipelines] Erro ao inserir etapas:', stagesError)
        }

        return NextResponse.json({
            pipeline: {
                ...newPipeline,
                stages: createdStages || [],
                total_cards: 0
            }
        }, { status: 201 })

    } catch (error: any) {
        console.error('[POST /api/crm/pipelines] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
