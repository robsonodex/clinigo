import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractJsonFromAiText, runClinigoAiTask } from '@/lib/ai/clinigo-ai-engine'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'])

export interface AntiGlosaCheckItem {
    id: string
    label: string
    status: 'ok' | 'atencao'
    hint: string
}

function computeAntiGlosaChecklist(text: string): AntiGlosaCheckItem[] {
    const lower = text.toLowerCase()
    const hasObjective =
        /objetiv|meta|queixa|demanda|foco|avaliad|plano|habilidad|trabalhad/.test(lower) &&
        text.trim().length >= 40
    const hasIntervention =
        /realizad|aplicad|interven|exerc|atividade|circuito|estrateg|estratég|conduzid|estimul|sess[aã]o/.test(
            lower
        )
    const hasResponse =
        /respost|desempenh|independ|ajuda|suport|aceit|colabor|particip|evolu|toler|regul|dificuldad|progres/.test(
            lower
        )
    const hasConduct =
        /condut|pr[oó]xim|continuid|manter|orienta|encaminh|reavaliar|plano terap|seguiment|casa/.test(
            lower
        )

    return [
        {
            id: 'objetivo',
            label: 'Objetivo / Demanda da sessão',
            status: hasObjective ? 'ok' : 'atencao',
            hint: hasObjective
                ? 'Foco clínico identificado no registro.'
                : 'Inclua o objetivo ou demanda principal trabalhada na sessão.',
        },
        {
            id: 'intervencao',
            label: 'Intervenção e procedimentos aplicados',
            status: hasIntervention ? 'ok' : 'atencao',
            hint: hasIntervention
                ? 'Intervenção terapêutica/clínica descrita.'
                : 'Descreva brevemente as técnicas ou atividades aplicadas.',
        },
        {
            id: 'resposta',
            label: 'Resposta do paciente e nível de suporte',
            status: hasResponse ? 'ok' : 'atencao',
            hint: hasResponse
                ? 'Resposta observável e nível de independência presentes.'
                : 'Informe como o paciente respondeu e qual nível de ajuda precisou.',
        },
        {
            id: 'conduta',
            label: 'Conduta / Próxima sessão (Anti-Glosa)',
            status: hasConduct ? 'ok' : 'atencao',
            hint: hasConduct
                ? 'Conduta para continuidade registrada.'
                : 'Operadoras costumam glosar evoluções sem conduta para a próxima sessão.',
        },
    ]
}

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
                { success: false, error: 'Sem permissão para IA clínica' },
                { status: 403 }
            )
        }
        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não identificada' }, { status: 403 })
        }

        const body = await request.json()
        const rawNotes = String(body.rawNotes || '').trim()
        const format = String(body.format || 'SOAP').toUpperCase()
        const specialty = String(body.specialty || 'Terapia / Clínica').trim()
        const patientName = typeof body.patientName === 'string' ? body.patientName : undefined
        const structuredContext = body.structuredContext || null

        if (rawNotes.length < 8 && !structuredContext) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Digite ao menos alguns tópicos rápidos da sessão para estruturar a evolução.',
                },
                { status: 400 }
            )
        }

        const contextLines: string[] = []
        if (structuredContext && typeof structuredContext === 'object') {
            if (Array.isArray(structuredContext.estadosGerais) && structuredContext.estadosGerais.length > 0) {
                contextLines.push(`Condição inicial: ${structuredContext.estadosGerais.join(', ')}`)
            }
            if (Array.isArray(structuredContext.objetivos) && structuredContext.objetivos.length > 0) {
                contextLines.push(`Objetivos trabalhados: ${structuredContext.objetivos.join('; ')}`)
            }
            if (structuredContext.limitador) {
                contextLines.push(`Limitador principal: ${structuredContext.limitador}`)
            }
            if (structuredContext.proximaMeta) {
                contextLines.push(`Conduta / próxima meta: ${structuredContext.proximaMeta}`)
            }
            if (structuredContext.orientacaoFamilia) {
                contextLines.push(`Orientação à família: ${structuredContext.orientacaoFamilia}`)
            }
        }

        const formatInstructions: Record<string, string> = {
            SOAP: 'Estruture em 4 blocos curtos e claros: S (Subjetivo), O (Objetivo), A (Avaliação), P (Plano/Conduta).',
            PSICOLOGICA:
                'Estruture em linguagem técnica de Psicologia (conforme CRP): Demanda trabalhada, Intervenções e observações comportamentais, Elaborações/Resposta clínica e Conduta para continuidade.',
            TERAPEUTICA:
                'Estruture em linguagem técnica multidisciplinar (ABA/TO/Fono/Fisio/Psicomotricidade): Condição inicial, Atividades/Intervenções realizadas, Desempenho e nível de suporte, e Conduta para próxima sessão.',
            CIF: 'Estruture nos eixos da CIF: Funções/Estruturas, Atividades e Participação, Fatores Ambientais/Suporte e Conduta Terapêutica.',
        }

        const systemPrompt = [
            'Você é um assistente redacional clínico do sistema CliniGo, operando sob sigilo LGPD e normas CFM/CFP/CFFa/COFFITO.',
            'REGRAS INVIOLÁVEIS:',
            '1. Use EXCLUSIVAMENTE os fatos informados pelo profissional. NUNCA invente exames, sinais vitais, diagnósticos, CIDs ou comportamentos não citados.',
            '2. Escreva em Português do Brasil formal, técnico, auditável por convênios e SEM nenhum emoji.',
            '3. Se algum tópico de conduta não foi informado, finalize com uma frase neutra indicando "A definir pelo profissional responsável na continuidade do plano terapêutico."',
            '4. Responda EXCLUSIVAMENTE um JSON válido no formato: {"structuredText": "...", "suggestedConduct": "..."}',
        ].join('\n')

        const userPrompt = [
            `Especialidade: ${specialty}`,
            `Formato desejado: ${format} (${formatInstructions[format] || formatInstructions.TERAPEUTICA})`,
            contextLines.length > 0 ? `Dados estruturados da sessão:\n${contextLines.join('\n')}` : '',
            rawNotes ? `Tópicos rápidos informados pelo profissional:\n${rawNotes}` : '',
            'Transforme esses dados em uma evolução clínica estruturada e auditável sem inventar fatos.',
        ]
            .filter(Boolean)
            .join('\n\n')

        const buildLocalFallback = () => {
            const parts: string[] = []
            if (format === 'SOAP') {
                parts.push(`S (Subjetivo): ${rawNotes || 'Compareceu à sessão conforme agenda.'}`)
                parts.push(
                    `O (Objetivo): ${contextLines.join(' | ') || 'Atendimento realizado conforme planejamento terapêutico da especialidade ' + specialty + '.'}`
                )
                parts.push(
                    'A (Avaliação): Registro estruturado a partir dos tópicos clínicos observados na sessão, sujeito à validação do profissional.'
                )
                parts.push(
                    `P (Plano/Conduta): ${structuredContext?.proximaMeta || 'Manter acompanhamento conforme plano terapêutico individual e reavaliar na próxima sessão.'}`
                )
            } else {
                parts.push(`EVOLUÇÃO CLÍNICA (${specialty})`)
                if (contextLines.length > 0) {
                    parts.push(`Dados da sessão: ${contextLines.join(' · ')}.`)
                }
                if (rawNotes) {
                    parts.push(`Registro observado: ${rawNotes}.`)
                }
                parts.push(
                    `Conduta para próxima sessão: ${structuredContext?.proximaMeta || 'Dar continuidade às metas terapêuticas vigentes e registrar progressos na sessão seguinte.'}`
                )
            }
            return JSON.stringify({
                structuredText: parts.join('\n\n'),
                suggestedConduct:
                    structuredContext?.proximaMeta ||
                    'Dar continuidade ao plano terapêutico e reavaliar resposta na próxima sessão.',
            })
        }

        const aiRes = await runClinigoAiTask({
            clinicId: profile.clinic_id,
            userId: user.id,
            patientId: typeof body.patientId === 'string' ? body.patientId : undefined,
            taskKey: 'structure-evolution',
            interactionType: 'CLINICAL_NOTES',
            tier: 'fast',
            systemPrompt,
            userPrompt,
            entities: { patientName },
            maxTokens: 700,
            temperature: 0.25,
            expectJson: true,
            buildLocalFallback,
        })

        const parsed = extractJsonFromAiText<{ structuredText?: string; suggestedConduct?: string }>(
            aiRes.text
        )
        const structuredText = (parsed?.structuredText || aiRes.text).trim()
        const suggestedConduct = (parsed?.suggestedConduct || '').trim()
        const antiGlosaChecklist = computeAntiGlosaChecklist(
            `${structuredText}\n${suggestedConduct}`
        )
        const passedChecks = antiGlosaChecklist.filter((c) => c.status === 'ok').length

        return NextResponse.json({
            success: true,
            data: {
                structuredText,
                suggestedConduct,
                antiGlosaChecklist,
                antiGlosaScorePct: Math.round((passedChecks / antiGlosaChecklist.length) * 100),
                provider: aiRes.provider,
                model: aiRes.model,
                fromCache: aiRes.fromCache,
                lgpdShielded: aiRes.lgpdShielded,
                latencyMs: aiRes.latencyMs,
                disclaimer: aiRes.disclaimer,
            },
        })
    } catch (error) {
        console.error('[AI-STRUCTURE-EVOLUTION] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Não foi possível estruturar a evolução agora.' },
            { status: 500 }
        )
    }
}

