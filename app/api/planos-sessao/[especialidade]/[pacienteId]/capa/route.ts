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

        const clinicId = dbUser?.clinic_id

        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            specialty: especialidade,
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/capa`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const { data: capa, error } = await supabase
            .from('planos_sessao_capa')
            .select('*')
            .eq('clinica_id', clinicId)
            .eq('paciente_id', pacienteId)
            .eq('especialidade', especialidade)
            .maybeSingle()

        if (error && error.code !== 'PGRST116') {
            console.error('[CAPA-GET] Erro ao buscar capa:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            capa: capa || null,
        })
    } catch (err) {
        console.error('[CAPA-GET] Erro:', err)
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

        const clinicId = dbUser?.clinic_id

        const access = await verifySessionPlanAccess({
            clinicId,
            userId: user.id,
            specialty: especialidade,
            route: `/api/planos-sessao/${especialidade}/${pacienteId}/capa`,
        })

        if (!access.isAllowed) {
            return NextResponse.json({ error: 'Not Found' }, { status: 404 })
        }

        const body = await request.json()

        const payload = {
            clinica_id: clinicId,
            paciente_id: pacienteId,
            especialidade,
            profissional_referencia: body.profissional_referencia || null,
            inicio_acompanhamento: body.inicio_acompanhamento || null,
            frequencia_sessoes: body.frequencia_sessoes || null,
            duracao_padrao_sessao: body.duracao_padrao_sessao || null,
            resumo_clinico: body.resumo_clinico || '',
            objetivos_longo_prazo: body.objetivos_longo_prazo || '',
            historico_revisoes: Array.isArray(body.historico_revisoes) ? body.historico_revisoes : [],
            grafico_pontos: Array.isArray(body.grafico_pontos) ? body.grafico_pontos : [],
            criterios_progressao: body.criterios_progressao || null,
            updated_at: new Date().toISOString(),
        }

        const { data: saved, error } = await supabase
            .from('planos_sessao_capa')
            .upsert(payload, { onConflict: 'clinica_id,paciente_id,especialidade' })
            .select()
            .single()

        if (error) {
            console.error('[CAPA-POST] Erro ao salvar capa:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            capa: saved,
        })
    } catch (err) {
        console.error('[CAPA-POST] Erro:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
