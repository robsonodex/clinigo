import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { computeSessionPlansAnalytics } from '@/lib/session-plans/learning-curve'
import { SESSION_PLAN_SPECIALTIES_META } from '@/lib/constants/session-plans-beta-clinics'
import { runClinigoAiTask } from '@/lib/ai/clinigo-ai-engine'

export const dynamic = 'force-dynamic'

// Sigilo clínico CFM/CFP: apenas corpo clínico e administração geram laudos multidisciplinares
const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ReportAudience = 'convenio' | 'neuropediatra' | 'escola'

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
            return NextResponse.json(
                { success: false, error: 'Sem permissão para gerar laudo multidisciplinar' },
                { status: 403 }
            )
        }
        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não identificada' }, { status: 403 })
        }

        const body = await request.json()
        const patientId = String(body.patientId || '')
        const audience: ReportAudience = ['convenio', 'neuropediatra', 'escola'].includes(body.audience)
            ? body.audience
            : 'convenio'
        const rawDays = Number(body.days || 90)
        const periodDays = [30, 60, 90, 180].includes(rawDays) ? rawDays : 90

        if (!UUID_REGEX.test(patientId)) {
            return NextResponse.json({ success: false, error: 'Paciente inválido' }, { status: 400 })
        }

        const serviceClient = createServiceRoleClient() as any
        const startIso = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]

        const [{ data: patient }, { data: clinic }, { data: appointments }, { data: sessionPlans }, { data: medicalRecords }] =
            await Promise.all([
                serviceClient
                    .from('patients')
                    .select('id, full_name, date_of_birth, health_insurances(name)')
                    .eq('id', patientId)
                    .eq('clinic_id', profile.clinic_id)
                    .maybeSingle(),
                serviceClient.from('clinics').select('name').eq('id', profile.clinic_id).maybeSingle(),
                serviceClient
                    .from('appointments')
                    .select('status, checked_in_at, checkin_method')
                    .eq('clinic_id', profile.clinic_id)
                    .eq('patient_id', patientId)
                    .gte('appointment_date', startIso),
                serviceClient
                    .from('planos_sessao')
                    .select('id, especialidade, data_sessao, registro_desempenho, grafico_indicadores, condicao_inicial, decisao_proxima_sessao, status')
                    .eq('clinica_id', profile.clinic_id)
                    .eq('paciente_id', patientId)
                    .gte('data_sessao', startIso)
                    .order('data_sessao', { ascending: true })
                    .limit(120),
                serviceClient
                    .from('medical_records')
                    .select('id, signed_at, chief_complaint, treatment_plan')
                    .eq('clinic_id', profile.clinic_id)
                    .eq('patient_id', patientId)
                    .gte('created_at', `${startIso}T00:00:00Z`)
                    .order('created_at', { ascending: false })
                    .limit(12),
            ])

        if (!patient) {
            return NextResponse.json({ success: false, error: 'Paciente não encontrado' }, { status: 404 })
        }

        const aptList = Array.isArray(appointments) ? appointments : []
        const completed = aptList.filter((a: any) => a.status === 'COMPLETED').length
        const noShows = aptList.filter((a: any) => a.status === 'NO_SHOW').length
        const attendancePct = completed + noShows > 0 ? Math.round((completed / (completed + noShows)) * 100) : 100
        const biometricCount = aptList.filter(
            (a: any) => a.checkin_method === 'face_biometrics' || a.checkin_method === 'FACIAL'
        ).length

        const recs = Array.isArray(medicalRecords) ? medicalRecords : []
        const signedRecords = recs.filter((r: any) => Boolean(r.signed_at)).length

        // Agrupar planos por especialidade usando o motor determinístico real
        const plansBySpec = new Map<string, any[]>()
        for (const p of Array.isArray(sessionPlans) ? sessionPlans : []) {
            const list = plansBySpec.get(p.especialidade) || []
            list.push(p)
            plansBySpec.set(p.especialidade, list)
        }

        const specialtyBlocks: string[] = []
        for (const [spec, rows] of plansBySpec.entries()) {
            const analytics = computeSessionPlansAnalytics(rows)
            const label =
                (SESSION_PLAN_SPECIALTIES_META as Record<string, { label?: string }>)[spec]?.label || spec
            const topGoals = analytics.objectives
                .slice(0, 4)
                .map(
                    (g) =>
                        `${g.code} (${g.title}): ${g.baselinePct}% -> ${g.latestPct}% (suporte atual: ${g.latestHelpLabel}, status: ${g.status})`
                )
                .join('; ')
            specialtyBlocks.push(
                `- ${label}: ${analytics.totalSessions} sessões, independência média ${analytics.avgIndependencePct}%, ${analytics.masteredCount} meta(s) dominada(s), ${analytics.inProgressCount} em aquisição.${topGoals ? ` Principais metas: ${topGoals}.` : ''}`
            )
        }

        const audienceDirectives: Record<ReportAudience, string> = {
            convenio:
                'Destinatário: Auditoria de Operadora de Saúde / Renovação de Convênio. Tom técnico-científico, objetivo e baseado exclusivamente nos indicadores numéricos reais fornecidos (assiduidade, presença biométrica, evoluções assinadas e evolução de metas do PEI), fundamentando a necessidade clínica de continuidade do tratamento.',
            neuropediatra:
                'Destinatário: Neuropediatra / Equipe Médica Assistente. Tom clínico interdisciplinar, integrando os achados entre especialidades, evolução dos níveis de suporte (Prompt Fading), barreiras observadas e recomendações para alinhamento médico-terapêutico.',
            escola:
                'Destinatário: Coordenação Pedagógica / Escola e Família. Tom colaborativo, claro e acessível (sem jargões médicos excessivos), destacando potencialidades, avanços funcionais e 3 estratégias práticas aplicáveis na rotina escolar.',
        }

        const systemPrompt = [
            'Você é o redator clínico multidisciplinar do CliniGo sob sigilo LGPD e normas de conselhos profissionais.',
            'REGRAS INVIOLÁVEIS:',
            '1. Baseie-se EXCLUSIVAMENTE nos números e fatos fornecidos. NUNCA invente percentuais, datas, diagnósticos ou nomes de profissionais.',
            '2. Escreva em Português do Brasil impecável, estruturado em parágrafos claros (máximo 260 palavras) e SEM emojis e SEM markdown com asteriscos.',
            '3. Use [PACIENTE] onde precisar referenciar o paciente.',
            '4. Entregue apenas o texto pronto da síntese/justificativa clínica.',
        ].join('\n')

        const userPrompt = [
            audienceDirectives[audience],
            `Período analisado: últimos ${periodDays} dias.`,
            `Assiduidade comprovada: ${completed} sessões concluídas (${attendancePct}% de frequência; ${biometricCount} validações por biometria facial; ${signedRecords}/${recs.length} evoluções assinadas).`,
            specialtyBlocks.length > 0
                ? `Evolução quantitativa por especialidade:\n${specialtyBlocks.join('\n')}`
                : 'Acompanhamento registrado em prontuário eletrônico regular com evoluções clínicas no período.',
            'Redija o texto completo pronto para revisão profissional e inclusão no documento oficial da clínica.',
        ].join('\n\n')

        const buildLocalFallback = () => {
            const base =
                audience === 'escola'
                    ? `[PACIENTE] manteve acompanhamento multidisciplinar regular nos últimos ${periodDays} dias (${completed} sessões concluídas, ${attendancePct}% de assiduidade), demonstrando engajamento consistente na rotina terapêutica.`
                    : `No período analisado (${periodDays} dias), [PACIENTE] apresentou assiduidade de ${attendancePct}% (${completed} sessões concluídas, ${signedRecords} evoluções clínicas assinadas e ${biometricCount} validações biométricas), evidenciando adesão consistente ao plano terapêutico.`
            const specPart =
                specialtyBlocks.length > 0
                    ? `\n\nSíntese por especialidade:\n${specialtyBlocks.join('\n')}`
                    : ''
            const closing =
                audience === 'convenio'
                    ? '\n\nDiante dos ganhos funcionais mensuráveis e das metas ainda em aquisição/generalização, recomenda-se a continuidade do acompanhamento multidisciplinar na frequência prescrita.'
                    : audience === 'neuropediatra'
                    ? '\n\nA equipe permanece à disposição para alinhamento interdisciplinar e revisão conjunta dos objetivos prioritários no próximo ciclo.'
                    : '\n\nRecomenda-se manter previsibilidade de rotina em sala de aula, uso de pistas visuais curtas nas transições e reforço positivo imediato diante de tentativas independentes.'
            return `${base}${specPart}${closing}`
        }

        const aiRes = await runClinigoAiTask({
            clinicId: profile.clinic_id,
            userId: user.id,
            patientId,
            taskKey: `multidisciplinary-report-${audience}-${periodDays}`,
            interactionType: 'PATIENT_HISTORY_SUMMARY',
            tier: 'high',
            systemPrompt,
            userPrompt,
            entities: {
                patientName: patient.full_name,
                clinicName: clinic?.name,
            },
            maxTokens: 900,
            temperature: 0.25,
            buildLocalFallback,
        })

        return NextResponse.json({
            success: true,
            data: {
                audience,
                periodDays,
                reportText: aiRes.text,
                metricsUsed: {
                    completedSessions: completed,
                    attendanceRatePct: attendancePct,
                    biometricSessions: biometricCount,
                    signedRecords,
                    specialtiesCount: specialtyBlocks.length,
                },
                provider: aiRes.provider,
                model: aiRes.model,
                fromCache: aiRes.fromCache,
                lgpdShielded: aiRes.lgpdShielded,
                latencyMs: aiRes.latencyMs,
                disclaimer: aiRes.disclaimer,
            },
        })
    } catch (error) {
        console.error('[AI-MULTIDISCIPLINARY-REPORT] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Não foi possível redigir o laudo multidisciplinar agora.' },
            { status: 500 }
        )
    }
}

