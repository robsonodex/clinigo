import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifySessionPlanAccess } from '@/lib/services/session-plans-guard'

interface RouteParams {
    params: Promise<{ especialidade: string; pacienteId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { especialidade, pacienteId } = await params
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
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/sessoes`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const { data: sessoes, error } = await supabase
            .from('planos_sessao')
            .select(`
                id,
                data_sessao,
                duracao_minutos,
                status,
                contexto,
                forma_mobilidade,
                created_at,
                updated_at,
                profissional_id,
                users:profissional_id (
                    full_name
                )
            `)
            .eq('clinica_id', clinicId)
            .eq('paciente_id', pacienteId)
            .eq('especialidade', especialidade)
            .order('data_sessao', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[SESSOES-GET] Erro:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            sessoes: sessoes || [],
        })
    } catch (err) {
        console.error('[SESSOES-GET] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { especialidade, pacienteId } = await params
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
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/sessoes`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const body = await request.json().catch(() => ({}))

        const newSession = {
            clinica_id: clinicId,
            paciente_id: pacienteId,
            profissional_id: user.id,
            especialidade,
            data_sessao: body.data_sessao || new Date().toISOString().split('T')[0],
            duracao_minutos: body.duracao_minutos || 50,
            contexto: body.contexto || 'Clínica',
            forma_mobilidade: body.forma_mobilidade || 'Marcha independente',
            condicao_inicial: body.condicao_inicial || {},
            objetivos_selecionados: body.objetivos_selecionados || [],
            estrategias: body.estrategias || {},
            planejamento_etapas: body.planejamento_etapas || [],
            registro_desempenho: body.registro_desempenho || [],
            qualidade_movimento: body.qualidade_movimento || {},
            analise_clinica: body.analise_clinica || {},
            decisao_proxima_sessao: body.decisao_proxima_sessao || {},
            orientacao_familia: body.orientacao_familia || {},
            grafico_indicadores: body.grafico_indicadores || {},
            status: 'rascunho',
        }

        const { data: created, error } = await supabase
            .from('planos_sessao')
            .insert(newSession)
            .select()
            .single()

        if (error) {
            console.error('[SESSOES-POST] Erro ao criar sessão:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            sessao: created,
        })
    } catch (err) {
        console.error('[SESSOES-POST] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
