import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const ALLOWED_ROLES = new Set(['CLINIC_ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR'])

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 as const }
    }

    let clinicId = request.headers.get('x-clinic-id')
    let userRole = request.headers.get('x-user-role')

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
        return { error: 'Clínica não encontrada para o usuário', status: 400 as const }
    }

    if (!ALLOWED_ROLES.has(userRole || '')) {
        return { error: 'Permissão insuficiente para gerenciar cards', status: 403 as const }
    }

    return { user, clinicId, userRole }
}

/**
 * POST /api/crm/pipeline-cards
 * Cria um novo card/lead em um funil e etapa da clínica
 */
export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { user, clinicId } = auth
        const body = await request.json()
        const {
            pipeline_id,
            stage_id,
            patient_id,
            title,
            contact_name,
            contact_phone,
            contact_email,
            value,
            notes,
        } = body

        const trimmedTitle = typeof title === 'string' ? title.trim() : ''
        if (!pipeline_id || !stage_id || !trimmedTitle) {
            return NextResponse.json({
                error: 'Campos obrigatórios: pipeline_id, stage_id e title'
            }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient()

        // Verificar se a etapa pertence ao funil e à clínica
        const { data: stage } = await (serviceClient as any)
            .from('crm_pipeline_stages')
            .select('id, pipeline_id, is_won_stage, is_lost_stage, pipeline:crm_pipelines!inner(id, clinic_id, archived_at)')
            .eq('id', stage_id)
            .eq('pipeline_id', pipeline_id)
            .eq('pipeline.clinic_id', clinicId)
            .is('pipeline.archived_at', null)
            .maybeSingle()

        if (!stage) {
            return NextResponse.json({ error: 'Funil ou etapa não encontrada nesta clínica' }, { status: 404 })
        }

        const resolvedPatientId = typeof patient_id === 'string' && patient_id.trim() ? patient_id.trim() : null
        if (resolvedPatientId) {
            const { data: patient } = await serviceClient
                .from('patients')
                .select('id')
                .eq('id', resolvedPatientId)
                .eq('clinic_id', clinicId)
                .maybeSingle()

            if (!patient) {
                return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 404 })
            }
        }

        const numericValue = value !== undefined && value !== '' && value !== null ? Number(value) : 0
        const safeValue = Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0

        const { data: card, error } = await (serviceClient as any)
            .from('crm_pipeline_cards')
            .insert({
                clinic_id: clinicId,
                pipeline_id,
                stage_id,
                patient_id: resolvedPatientId,
                title: trimmedTitle,
                contact_name: typeof contact_name === 'string' && contact_name.trim() ? contact_name.trim() : trimmedTitle,
                contact_phone: typeof contact_phone === 'string' && contact_phone.trim() ? contact_phone.trim() : null,
                contact_email: typeof contact_email === 'string' && contact_email.trim() ? contact_email.trim() : null,
                value: safeValue,
                notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
                is_won: Boolean(stage.is_won_stage),
                is_lost: Boolean(stage.is_lost_stage),
                created_by: user.id,
            })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Este paciente já possui um cartão neste funil' }, { status: 409 })
            }
            console.error('[POST /api/crm/pipeline-cards] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao criar cartão no funil' }, { status: 500 })
        }

        return NextResponse.json({ card }, { status: 201 })
    } catch (error: any) {
        request.log.error('crm/pipeline-cards', { error: error instanceof Error ? error.message : String(error) })
        console.error('[POST /api/crm/pipeline-cards] Erro interno:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

/**
 * DELETE /api/crm/pipeline-cards
 * Exclui um cartão customizado da clínica
 */
export const DELETE = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { clinicId } = auth
        let cardId = request.nextUrl.searchParams.get('id')
        if (!cardId) {
            try {
                const body = await request.json()
                cardId = body?.id
            } catch {
                // empty body allowed
            }
        }

        if (!cardId || typeof cardId !== 'string') {
            return NextResponse.json({ error: 'ID do cartão é obrigatório' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient()

        const { data: deleted, error } = await (serviceClient as any)
            .from('crm_pipeline_cards')
            .delete()
            .eq('id', cardId)
            .eq('clinic_id', clinicId)
            .select('id')
            .maybeSingle()

        if (error) {
            console.error('[DELETE /api/crm/pipeline-cards] Erro:', error.message)
            return NextResponse.json({ error: 'Erro ao excluir cartão' }, { status: 500 })
        }

        if (!deleted) {
            return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        request.log.error('crm/pipeline-cards', { error: error instanceof Error ? error.message : String(error) })
        console.error('[DELETE /api/crm/pipeline-cards] Erro interno:', error)
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
    }
})

