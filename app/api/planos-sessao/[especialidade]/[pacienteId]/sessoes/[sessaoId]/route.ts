import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionPlanAccess } from '@/lib/services/session-plans-guard'

interface RouteParams {
    params: Promise<{
        especialidade: string
        pacienteId: string
        sessaoId: string
    }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { especialidade, pacienteId, sessaoId } = await params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: dbUser } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()

        let clinicId = dbUser?.clinic_id
        if (!clinicId) {
            const { data: patientData } = await supabase
                .from('patients')
                .select('clinic_id')
                .eq('id', pacienteId)
                .maybeSingle()
            clinicId = patientData?.clinic_id
        }

        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            specialty: especialidade,
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/sessoes/${sessaoId}`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const { data: sessao, error } = await supabase
            .from('planos_sessao')
            .select(`
                *,
                users:profissional_id (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('id', sessaoId)
            .eq('clinica_id', clinicId)
            .eq('paciente_id', pacienteId)
            .single()

        if (error) {
            console.error('[SESSAO-GET] Erro:', error)
            return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            sessao,
        })
    } catch (err) {
        console.error('[SESSAO-GET] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { especialidade, pacienteId, sessaoId } = await params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: dbUser } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()

        let clinicId = dbUser?.clinic_id
        if (!clinicId) {
            const { data: patientData } = await supabase
                .from('patients')
                .select('clinic_id')
                .eq('id', pacienteId)
                .maybeSingle()
            clinicId = patientData?.clinic_id
        }

        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            specialty: especialidade,
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/sessoes/${sessaoId}`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const body = await request.json()

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (body.data_sessao !== undefined) updatePayload.data_sessao = body.data_sessao
        if (body.duracao_minutos !== undefined) updatePayload.duracao_minutos = body.duracao_minutos
        if (body.contexto !== undefined) updatePayload.contexto = body.contexto
        if (body.forma_mobilidade !== undefined) updatePayload.forma_mobilidade = body.forma_mobilidade
        if (body.condicao_inicial !== undefined) updatePayload.condicao_inicial = body.condicao_inicial
        if (body.objetivos_selecionados !== undefined) updatePayload.objetivos_selecionados = body.objetivos_selecionados
        if (body.estrategias !== undefined) updatePayload.estrategias = body.estrategias
        if (body.planejamento_etapas !== undefined) updatePayload.planejamento_etapas = body.planejamento_etapas
        if (body.registro_desempenho !== undefined) updatePayload.registro_desempenho = body.registro_desempenho
        if (body.qualidade_movimento !== undefined) updatePayload.qualidade_movimento = body.qualidade_movimento
        if (body.analise_clinica !== undefined) updatePayload.analise_clinica = body.analise_clinica
        if (body.decisao_proxima_sessao !== undefined) updatePayload.decisao_proxima_sessao = body.decisao_proxima_sessao
        if (body.orientacao_familia !== undefined) updatePayload.orientacao_familia = body.orientacao_familia
        if (body.grafico_indicadores !== undefined) updatePayload.grafico_indicadores = body.grafico_indicadores
        if (body.status !== undefined) updatePayload.status = body.status
        if (body.assinatura !== undefined) updatePayload.assinatura = body.assinatura

        const { data: updated, error } = await supabase
            .from('planos_sessao')
            .update(updatePayload)
            .eq('id', sessaoId)
            .eq('clinica_id', clinicId)
            .eq('paciente_id', pacienteId)
            .select()
            .single()

        if (error) {
            console.error('[SESSAO-PUT] Erro:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            sessao: updated,
        })
    } catch (err) {
        console.error('[SESSAO-PUT] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
