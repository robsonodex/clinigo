import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { extractJsonFromAiText, runClinigoAiTask } from '@/lib/ai/clinigo-ai-engine'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null; role: string | null } | null }

        const role = (profile?.role || '').toUpperCase()
        if (!ALLOWED_ROLES.has(role)) {
            return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
        }
        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não identificada' }, { status: 403 })
        }

        const body = await request.json()
        const patientId = String(body.patientId || '')
        const mode: 'family' | 'school_doctor' =
            body.mode === 'school_doctor' ? 'school_doctor' : 'family'
        const specialtyLabel = String(body.specialtyLabel || 'Terapia').trim()
        const extraNotes = String(body.extraNotes || '').trim()

        if (!UUID_REGEX.test(patientId)) {
            return NextResponse.json({ success: false, error: 'Paciente inválido' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient() as any
        const cutoff = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const [{ data: patient }, { data: clinic }, { data: plans }] = await Promise.all([
            serviceClient
                .from('patients')
                .select('id, full_name, date_of_birth')
                .eq('id', patientId)
                .eq('clinic_id', profile.clinic_id)
                .maybeSingle(),
            serviceClient
                .from('clinics')
                .select('name')
                .eq('id', profile.clinic_id)
                .maybeSingle(),
            serviceClient
                .from('planos_sessao')
                .select(
                    'especialidade, data_sessao, condicao_inicial, objetivos_selecionados, registro_desempenho, analise_clinica, orientacao_familia'
                )
                .eq('clinica_id', profile.clinic_id)
                .eq('paciente_id', patientId)
                .gte('data_sessao', cutoff)
                .order('data_sessao', { ascending: false })
                .limit(6),
        ])

        if (!patient) {
            return NextResponse.json({ success: false, error: 'Paciente não encontrado' }, { status: 404 })
        }

        const sessionSummaries = (Array.isArray(plans) ? plans : []).map((p: any) => {
            const goals = Array.isArray(p.objetivos_selecionados)
                ? p.objetivos_selecionados.map((g: any) => g.title || g.descricao || g.code).filter(Boolean).slice(0, 3)
                : []
            const perf = Array.isArray(p.registro_desempenho)
                ? p.registro_desempenho
                      .map((r: any) => {
                          const pct = r.pct_independent ?? r.percentual_independencia
                          return `${r.title || r.code || 'Meta'}${pct !== undefined ? ` (${pct}% independência)` : ''}`
                      })
                      .slice(0, 3)
                : []
            const orientation = p.orientacao_familia?.orientacao || ''
            return [
                `Data ${String(p.data_sessao || '').slice(0, 10)} (${p.especialidade})`,
                goals.length ? `Metas: ${goals.join(', ')}` : '',
                perf.length ? `Desempenho: ${perf.join(', ')}` : '',
                orientation ? `Orientação registrada: ${orientation}` : '',
            ]
                .filter(Boolean)
                .join(' | ')
        })

        const systemPrompt = [
            'Você é o redator empático do CliniGo Família (comunicação ética em saúde infantil/terapêutica, LGPD).',
            'REGRAS INVIOLÁVEIS:',
            '1. Traduza termos técnicos (ex.: "prompt", "latência", "DTT") para linguagem humana, clara e acolhedora para pais ou escola.',
            '2. NUNCA prometa cura, NUNCA exponha diagnóstico sensível não citado, NUNCA invente avanços inexistentes e NUNCA use emojis.',
            '3. Use o placeholder [PACIENTE] se precisar referenciar o paciente.',
            '4. Responda EXCLUSIVAMENTE um JSON válido com as chaves:',
            '{"title": "...", "introMessage": "...", "highlights": ["...", "...", "..."], "homeActivityTitle": "...", "homeActivityInstructions": "..."}',
        ].join('\n')

        const userPrompt = [
            `Modo: ${mode === 'school_doctor' ? 'Relatório curto de alinhamento para Escola / Neuropediatra (tom objetivo e colaborativo)' : 'Boletim Semanal para a Família (tom acolhedor, claro e motivador)'}`,
            `Área principal: ${specialtyLabel}`,
            sessionSummaries.length > 0
                ? `Resumo estruturado das sessões recentes:\n${sessionSummaries.join('\n')}`
                : 'Ainda não há sessões estruturadas nos últimos 21 dias; produza um boletim inicial acolhedor de engajamento.',
            extraNotes ? `Observações adicionais do profissional: ${extraNotes}` : '',
        ]
            .filter(Boolean)
            .join('\n\n')

        const buildLocalFallback = () =>
            JSON.stringify({
                title:
                    mode === 'school_doctor'
                        ? `Alinhamento Clínico-Escolar — ${specialtyLabel}`
                        : `Boletim da Semana — ${specialtyLabel}`,
                introMessage:
                    mode === 'school_doctor'
                        ? 'Compartilhamos os principais pontos de evolução recentes de [PACIENTE] para alinhamento entre clínica, escola e equipe de apoio.'
                        : 'Preparamos com cuidado os principais avanços de [PACIENTE] nas sessões recentes e uma prática simples de 5 minutos para fazer em casa.',
                highlights:
                    sessionSummaries.length > 0
                        ? [
                              `Participação ativa nas atividades propostas em ${specialtyLabel}, fortalecendo autonomia no dia a dia.`,
                              'Boa resposta às mediações estruturadas durante a rotina terapêutica.',
                              'Continuidade das metas prioritárias com foco em generalização para casa e escola.',
                          ]
                        : [
                              `Acompanhamento de ${specialtyLabel} em andamento com foco no desenvolvimento funcional e autonomia.`,
                              'Construção de vínculo terapêutico e adaptação positiva à rotina de sessões.',
                          ],
                homeActivityTitle: 'Rotina de 5 minutos com escolha guiada',
                homeActivityInstructions:
                    'Escolha um momento tranquilo do dia, ofereça duas opções simples de brincadeira ou tarefa e celebre cada tentativa independente com elogio específico.',
            })

        const aiRes = await runClinigoAiTask({
            clinicId: profile.clinic_id,
            userId: user.id,
            patientId,
            taskKey: 'family-bulletin',
            interactionType: 'PATIENT_HISTORY_SUMMARY',
            tier: 'fast',
            systemPrompt,
            userPrompt,
            entities: {
                patientName: patient.full_name,
                clinicName: clinic?.name,
            },
            maxTokens: 650,
            temperature: 0.4,
            expectJson: true,
            buildLocalFallback,
        })

        const parsed = extractJsonFromAiText<{
            title?: string
            introMessage?: string
            highlights?: string[]
            homeActivityTitle?: string
            homeActivityInstructions?: string
        }>(aiRes.text)

        const highlights = Array.isArray(parsed?.highlights)
            ? parsed.highlights.map((h) => String(h || '').trim()).filter(Boolean).slice(0, 4)
            : []

        return NextResponse.json({
            success: true,
            data: {
                title:
                    parsed?.title?.trim() ||
                    (mode === 'school_doctor'
                        ? `Relatório de Alinhamento — ${specialtyLabel}`
                        : `Boletim da Semana — ${specialtyLabel}`),
                introMessage: parsed?.introMessage?.trim() || '',
                highlights:
                    highlights.length > 0
                        ? highlights
                        : ['Evolução contínua nas atividades propostas em sessão com foco em autonomia.'],
                homeActivityTitle:
                    mode === 'family'
                        ? parsed?.homeActivityTitle?.trim() || 'Prática guiada de 5 minutos em casa'
                        : '',
                homeActivityInstructions:
                    mode === 'family' ? parsed?.homeActivityInstructions?.trim() || '' : '',
                provider: aiRes.provider,
                model: aiRes.model,
                fromCache: aiRes.fromCache,
                lgpdShielded: aiRes.lgpdShielded,
                latencyMs: aiRes.latencyMs,
                disclaimer: aiRes.disclaimer,
            },
        })
    } catch (error) {
        console.error('[AI-FAMILY-BULLETIN] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Não foi possível gerar o boletim acolhedor agora.' },
            { status: 500 }
        )
    }
}

