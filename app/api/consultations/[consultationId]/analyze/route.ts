import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/services/rate-limiter'
import { z } from 'zod'
import { Database } from '@/types/supabase'

const analyzeSchema = z.object({
    prompt: z.string().min(10).max(2000),
    include_reasoning: z.boolean().default(false),
    analysis_type: z.enum(['summary', 'diagnosis_suggestions', 'prescription_review']).default('summary'),
})

interface RouteContext {
    params: Promise<{
        consultationId: string
    }>
}

interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string
        }
    }>
    usage: {
        total_tokens: number
    }
}

interface ConsultationWithRelations {
    id: string
    notes: string | null
    diagnosis: string | null
    prescriptions: string | null
    clinic: {
        id: string
        plan_type: 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'
    } | null
    doctor: {
        id: string
        user_id: string
    } | null
    patient: {
        full_name: string
    } | null
}

export const POST = withAxiom(async (request: AxiomRequest, context: RouteContext) => {
    try {
        const { consultationId } = await context.params
        const body = await request.json()
        const { prompt, include_reasoning, analysis_type } = analyzeSchema.parse(body)

        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // 🔥 STEP 1: Get consultation and clinic plan
        const { data: consultation, error: consultationError } = await supabase
            .from('consultations')
            .select(`
                *,
                clinic:clinics(id, plan_type),
                doctor:doctors(id, user_id),
                patient:patients(full_name)
            `)
            .eq('id', consultationId)
            .single()

        const consultationData = consultation as unknown as ConsultationWithRelations

        if (consultationError || !consultation) {
            return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
        }

        // 🔥 STEP 1.5: RATE LIMITING - Prevent abuse and unlimited costs
        const clinic = consultationData.clinic
        const clinicId = clinic?.id

        if (clinicId) {
            const rateLimit = await checkRateLimit(`ai_analysis:${clinicId}`)

            if (!rateLimit.success) {
                return NextResponse.json({
                    error: 'Limite de requisições excedido',
                    message: 'Você atingiu o limite de 5 análises por minuto. Tente novamente em breve.',
                    retry_after: Math.ceil((rateLimit.reset - Date.now()) / 1000),
                }, {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': rateLimit.limit.toString(),
                        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                        'X-RateLimit-Reset': rateLimit.reset.toString(),
                    }
                })
            }

            console.log(`[RATE LIMIT] Clinic ${clinicId}: ${rateLimit.remaining}/${rateLimit.limit} remaining`)
        }

        // Verify doctor owns this consultation
        const doctor = consultationData.doctor
        if (doctor?.user_id !== userId) {
            return NextResponse.json({ error: 'Sem permissão para esta consulta' }, { status: 403 })
        }

        const planType = clinic?.plan_type || 'BASIC'

        // 🔥 STEP 2: COST PROTECTION - Select model based on plan
        let model: string
        let systemPrompt: string
        let allowReasoning: boolean
        let isLimited: boolean

        if (planType === 'BASIC') {
            // BASIC: Free tier model, NO reasoning
            model = 'meta-llama/llama-3-8b-instruct:free'
            allowReasoning = false  // Force OFF regardless of request
            isLimited = true
            systemPrompt = 'Você é um assistente médico. Forneça um resumo simples e direto.'

            console.log('[AI COST PROTECTION] BASIC plan using free model:', model)
        } else {
            // PRO/ENTERPRISE: Premium models, WITH reasoning
            model = planType === 'ENTERPRISE'
                ? 'anthropic/claude-3.5-sonnet'  // Enterprise gets best
                : 'anthropic/claude-3-sonnet'     // Pro gets good
            allowReasoning = include_reasoning
            isLimited = false
            systemPrompt = allowReasoning
                ? 'Você é um médico especialista. Analise o caso com raciocínio clínico detalhado, considerando diagnósticos diferenciais e fundamentação.'
                : 'Você é um médico assistente. Forneça uma análise médica clara e fundamentada.'

            console.log(`[AI ANALYSIS] ${planType} plan using model:`, model, 'Reasoning:', allowReasoning)
        }

        // 🔥 STEP 3: Build context from consultation
        const contextData = {
            notes: consultationData.notes || '',
            diagnosis: consultationData.diagnosis || '',
            prescriptions: consultationData.prescriptions || '',
            patient_name: consultationData.patient?.full_name || 'Paciente',
        }

        const contextPrompt = `
Dados da Consulta:
- Anotações: ${contextData.notes}
- Diagnóstico: ${contextData.diagnosis}
- Prescrições: ${contextData.prescriptions}

Solicitação: ${prompt}

${analysis_type === 'summary' ? 'Forneça um resumo estruturado da consulta.' : ''}
${analysis_type === 'diagnosis_suggestions' ? 'Sugira possíveis diagnósticos baseados nos sintomas descritos.' : ''}
${analysis_type === 'prescription_review' ? 'Revise as prescrições indicadas.' : ''}
`

        // 🔥 STEP 4: Call OpenRouter with appropriate model
        if (!process.env.OPENROUTER_API_KEY) {
            return NextResponse.json({
                error: 'Serviço de IA não configurado'
            }, { status: 500 })
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.com.br',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: contextPrompt }
                ],
                temperature: allowReasoning ? 0.7 : 0.5,
                max_tokens: isLimited ? 500 : 2000,  // Limit tokens for BASIC
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[AI API ERROR]', response.status, errorText)
            return NextResponse.json({
                error: 'Erro ao processar análise'
            }, { status: 500 })
        }

        const aiResponse = await response.json() as OpenRouterResponse
        const analysisText = aiResponse.choices?.[0]?.message?.content || ''
        const tokensUsed = aiResponse.usage?.total_tokens || 0

        // 🔥 STEP 5: Save analysis to database
        const { error: saveError } = await supabase
            .from('consultation_ai_analyses')
            .insert({
                consultation_id: consultationId,
                clinic_id: clinic?.id || null,
                doctor_id: doctor?.id || null,
                analysis_type,
                prompt,
                result: analysisText,
                model_used: model,
                plan_type: planType,
                reasoning_enabled: allowReasoning,
                tokens_used: tokensUsed,
            } as any)

        if (saveError) {
            console.error('[SAVE ERROR]', saveError)
            // Continue even if save fails
        }

        // 🔥 STEP 6: Return response with plan info
        return NextResponse.json({
            success: true,
            analysis: analysisText,
            metadata: {
                model: model,
                plan_type: planType,
                is_limited: isLimited,  // Frontend can show upgrade message
                reasoning_enabled: allowReasoning,
                tokens_used: tokensUsed,
            },
            upgrade_message: isLimited
                ? 'Você está usando a versão simplificada de IA. Faça upgrade para o Plano Profissional para análises avançadas com raciocínio clínico.'
                : null
        })

    } catch (error) {
        request.log.error('consultations/[consultationId]/analyze', { error: error instanceof Error ? error.message : String(error) })
        console.error('[AI ANALYZE ERROR]', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: error.errors
            }, { status: 400 })
        }

        return NextResponse.json({
            error: 'Erro ao processar análise'
        }, { status: 500 })
    }
})