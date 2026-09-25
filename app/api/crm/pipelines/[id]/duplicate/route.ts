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
 * POST /api/crm/pipelines/[id]/duplicate
 * Duplica a estrutura de um funil existente (nome, cor, descrição e etapas) sem duplicar os cards.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId, userRole, user } = auth
        const { id: pipelineId } = await context.params

        if (userRole !== 'CLINIC_ADMIN' && userRole !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito ao administrador', code: 'FORBIDDEN' }, { status: 403 })
        }

        const serviceClient = createServiceRoleClient()

        // 1. Obter o funil original
        const { data: sourcePipe, error: pipeError } = await serviceClient
            .from('crm_pipelines')
            .select('*')
            .eq('id', pipelineId)
            .eq('clinic_id', clinicId)
            .is('archived_at', null)
            .single()

        if (pipeError || !sourcePipe) {
            return NextResponse.json({ error: 'Funil original não encontrado' }, { status: 404 })
        }

        // 2. Obter as etapas do funil original
        const { data: sourceStages } = await serviceClient
            .from('crm_pipeline_stages')
            .select('*')
            .eq('pipeline_id', pipelineId)
            .order('position', { ascending: true })

        // 3. Determinar próxima posição
        const { data: existingPipes } = await serviceClient
            .from('crm_pipelines')
            .select('position')
            .eq('clinic_id', clinicId)
            .order('position', { ascending: false })
            .limit(1)

        const nextPosition = (existingPipes && existingPipes.length > 0) ? (existingPipes[0].position + 1) : 0

        // 4. Criar o novo funil duplicado
        const { data: duplicatedPipe, error: insertError } = await serviceClient
            .from('crm_pipelines')
            .insert({
                clinic_id: clinicId,
                name: `${sourcePipe.name} (Cópia)`,
                description: sourcePipe.description,
                color: sourcePipe.color,
                is_default: false,
                position: nextPosition,
                created_by: user.id
            })
            .select()
            .single()

        if (insertError || !duplicatedPipe) {
            console.error('[POST /api/crm/pipelines/[id]/duplicate] Erro ao duplicar funil:', insertError)
            return NextResponse.json({ error: insertError?.message || 'Falha ao duplicar funil' }, { status: 500 })
        }

        // 5. Inserir etapas duplicadas vinculadas ao novo funil
        let clonedStages: any[] = []
        if (sourceStages && sourceStages.length > 0) {
            const stagesPayload = sourceStages.map(st => ({
                pipeline_id: duplicatedPipe.id,
                name: st.name,
                position: st.position,
                color: st.color,
                is_won_stage: st.is_won_stage,
                is_lost_stage: st.is_lost_stage
            }))

            const { data: newStages } = await serviceClient
                .from('crm_pipeline_stages')
                .insert(stagesPayload)
                .select()
                .order('position', { ascending: true })

            clonedStages = newStages || []
        }

        return NextResponse.json({
            pipeline: {
                ...duplicatedPipe,
                stages: clonedStages,
                total_cards: 0
            }
        }, { status: 201 })

    } catch (error: any) {
        console.error('[POST /api/crm/pipelines/[id]/duplicate] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
}
