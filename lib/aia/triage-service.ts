/**
 * AiA Medical Triage Service
 * CliniGo - Sistema de Triagem Médica
 * 
 * Serviço principal de triagem com integração OpenRouter
 */

import { createClient } from '@/lib/supabase/server'
import {
    TriageRequest,
    TriageResponse,
    TriageResult,
    TriageSession,
    TriageMessage,
    PatientDemographics,
    TriageLevel,
    SessionStatus,
    TRIAGE_LEVEL_CONFIG,
    checkEmergencyKeywords,
    getSpecialtyForSymptoms,
    validateDemographics,
    PossibleCondition,
} from './triage-types'
import {
    getTriageSystemPrompt,
    buildTriageUserPrompt,
    getEmergencyResponsePrompt,
    getDemographicPrompt,
} from './triage-prompts'
import { PlanType, PLAN_DEFINITIONS } from '@/types/core'

// ============================================================================
// CONSTANTS
// ============================================================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Model selection based on plan tier
// Using meta-llama/llama-3.3-70b-instruct:free for all plans (free tier)
const TRIAGE_MODELS: Record<string, string> = {
    STARTER: 'meta-llama/llama-3.3-70b-instruct:free',
    BASIC: 'meta-llama/llama-3.3-70b-instruct:free',
    PROFESSIONAL: 'meta-llama/llama-3.3-70b-instruct:free',
    ENTERPRISE: 'meta-llama/llama-3.3-70b-instruct:free',
    NETWORK: 'meta-llama/llama-3.3-70b-instruct:free',
}

const UPGRADE_BANNER_TEXT = `🔒 **Acesso Limitado**

A AiA identificou padrões que exigem análise profunda. Para visualizar as possíveis condições e exames sugeridos, atualize para o Plano **PROFISSIONAL+** e libere a inteligência médica completa.`

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class TriageService {
    // Note: getSupabase creates fresh client per request (required for server-side cookie handling)
    private async getSupabase() {
        return await createClient()
    }

    // ============================================================================
    // SESSION MANAGEMENT
    // ============================================================================

    async createSession(clinicId?: string, patientId?: string): Promise<TriageSession> {
        const supabase = await this.getSupabase()

        const { data, error } = await supabase
            .from('aia_triage_sessions' as any)
            .insert({
                clinic_id: clinicId || null,
                patient_id: patientId || null,
                session_status: 'collecting_demographics',
                tokens_used: 0,
            } as any)
            .select()
            .single()

        if (error) {
            console.error('Error creating triage session:', error)
            throw new Error('Erro ao criar sessão de triagem')
        }

        return data as TriageSession
    }

    async getSession(sessionId: string): Promise<TriageSession | null> {
        const supabase = await this.getSupabase()

        const { data, error } = await supabase
            .from('aia_triage_sessions' as any)
            .select('*')
            .eq('id', sessionId)
            .single()

        if (error) {
            console.error('Error fetching session:', error)
            return null
        }

        return data as TriageSession
    }

    async updateSession(sessionId: string, updates: Partial<TriageSession>): Promise<void> {
        const supabase = await this.getSupabase()

        const { error } = await supabase
            .from('aia_triage_sessions' as any)
            .update(updates as any)
            .eq('id', sessionId)

        if (error) {
            console.error('Error updating session:', error)
        }
    }

    // ============================================================================
    // MESSAGE MANAGEMENT
    // ============================================================================

    async saveMessage(message: Omit<TriageMessage, 'id' | 'created_at'>): Promise<TriageMessage> {
        const supabase = await this.getSupabase()

        const { data, error } = await supabase
            .from('aia_triage_messages' as any)
            .insert(message as any)
            .select()
            .single()

        if (error) {
            console.error('Error saving message:', error)
            throw new Error('Erro ao salvar mensagem')
        }

        return data as TriageMessage
    }

    async getConversationHistory(sessionId: string): Promise<TriageMessage[]> {
        const supabase = await this.getSupabase()

        const { data, error } = await supabase
            .from('aia_triage_messages' as any)
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })

        if (error) {
            console.error('Error fetching messages:', error)
            return []
        }

        return data as TriageMessage[]
    }

    // ============================================================================
    // MAIN TRIAGE FLOW
    // ============================================================================

    async processMessage(request: TriageRequest): Promise<TriageResponse> {
        // Get or create session
        let session: TriageSession
        let isNewSession = false

        if (request.session_id) {
            const existingSession = await this.getSession(request.session_id)
            if (!existingSession) {
                throw new Error('Sessão não encontrada')
            }
            session = existingSession
        } else {
            session = await this.createSession(request.clinic_id, request.patient_id)
            isNewSession = true
        }

        // Check for emergency keywords in message
        const emergencyRule = checkEmergencyKeywords(request.message)
        if (emergencyRule) {
            return this.handleEmergency(session, emergencyRule.name, emergencyRule.action)
        }

        // Save user message
        await this.saveMessage({
            session_id: session.id,
            role: 'user',
            content: request.message,
            message_type: session.session_status === 'collecting_demographics' ? 'demographic' : 'symptom',
        })

        // Handle demographics if provided
        if (request.demographics) {
            const validation = validateDemographics(request.demographics)
            if (validation.valid) {
                await this.updateSession(session.id, {
                    demographics: request.demographics as PatientDemographics,
                    session_status: 'collecting_symptoms',
                })
                session.demographics = request.demographics as PatientDemographics
                session.session_status = 'collecting_symptoms'
            }
        }

        // Check if we need demographics
        if (!session.demographics && session.session_status === 'collecting_demographics') {
            // Try to parse demographics from message
            const parsedDemographics = this.parseDemographicsFromMessage(request.message)
            if (parsedDemographics) {
                await this.updateSession(session.id, {
                    demographics: parsedDemographics,
                    session_status: 'collecting_symptoms',
                })
                session.demographics = parsedDemographics
                session.session_status = 'collecting_symptoms'
            } else {
                return this.requestDemographics(session, isNewSession)
            }
        }

        // Get conversation history
        const history = await this.getConversationHistory(session.id)

        // Get clinic plan for model selection and feature gating
        const planInfo = await this.getClinicPlan(session.clinic_id)

        // Call AI
        const aiResponse = await this.callOpenRouter(
            session,
            history,
            request.message,
            planInfo.model
        )

        // Update token usage
        await this.updateSession(session.id, {
            tokens_used: session.tokens_used + aiResponse.tokensUsed,
            model_used: planInfo.model,
        })

        // Parse AI response
        const { message: responseMessage, triageResult, isComplete } = this.parseAIResponse(
            aiResponse.content,
            session,
            planInfo.planType
        )

        // Save assistant message
        await this.saveMessage({
            session_id: session.id,
            role: 'assistant',
            content: responseMessage,
            message_type: isComplete ? 'recommendation' : 'question',
            metadata: triageResult ? { triage_result: triageResult } : undefined,
        })

        // Update session if complete
        if (isComplete && triageResult) {
            await this.updateSession(session.id, {
                session_status: 'completed',
                triage_level: triageResult.triage.level,
                recommended_specialty: triageResult.medical_data.especialidade,
                completed_at: new Date().toISOString(),
            })
        }

        return {
            session_id: session.id,
            message: responseMessage,
            message_type: isComplete ? 'recommendation' : 'question',
            session_status: isComplete ? 'completed' : session.session_status,
            requires_demographics: false,
            triage_result: triageResult || undefined,
            is_emergency: false,
        }
    }

    // ============================================================================
    // EMERGENCY HANDLING
    // ============================================================================

    private async handleEmergency(
        session: TriageSession,
        emergencyType: string,
        action: string
    ): Promise<TriageResponse> {
        const emergencyMessage = getEmergencyResponsePrompt(`**${emergencyType}**\n\n${action}`)

        await this.saveMessage({
            session_id: session.id,
            role: 'assistant',
            content: emergencyMessage,
            message_type: 'emergency',
        })

        await this.updateSession(session.id, {
            session_status: 'emergency',
            triage_level: 'VERMELHO',
            completed_at: new Date().toISOString(),
        })

        const triageResult: TriageResult = {
            status: 'success',
            session_id: session.id,
            triage: {
                level: 'VERMELHO',
                level_name: 'Emergência',
                level_description: 'Risco de vida imediato',
                immediate_action: action,
                emergency_number: '192',
            },
            medical_data: {
                possiveis_condicoes: null,
                exames_sugeridos: null,
                especialidade: 'Pronto-Socorro',
            },
            recommendations: {
                specialty: 'Pronto-Socorro',
                timeframe: 'Imediato',
                immediate_care: ['Ligar 192', 'Não se deslocar sozinho'],
                avoid: ['Dirigir', 'Automedicar-se'],
            },
            plan_restriction: {
                is_blocked: false, // Never block emergency info
                upgrade_banner_text: null,
                cta_link: null,
            },
            disclaimers: [
                'Ligue 192 imediatamente',
                'Não dirija, peça ajuda',
            ],
            next_steps: {
                agendar_consulta: false,
                especialidade: 'Pronto-Socorro',
                tempo_maximo: 'Imediato',
            },
        }

        return {
            session_id: session.id,
            message: emergencyMessage,
            message_type: 'emergency',
            session_status: 'emergency',
            requires_demographics: false,
            triage_result: triageResult,
            is_emergency: true,
        }
    }

    // ============================================================================
    // DEMOGRAPHICS HANDLING
    // ============================================================================

    private async requestDemographics(
        session: TriageSession,
        isFirstMessage: boolean
    ): Promise<TriageResponse> {
        let message = ''

        if (isFirstMessage) {
            message = `Olá! 👋 Sou a **AiA**, assistente virtual do CliniGo.

Vou te ajudar a entender seus sintomas e direcionar para o cuidado adequado.

⚠️ **IMPORTANTE:** Eu sou um assistente virtual e NÃO substituo uma consulta médica.
Em casos de emergência, ligue **192 (SAMU)**.

---

${getDemographicPrompt()}`
        } else {
            message = getDemographicPrompt()
        }

        await this.saveMessage({
            session_id: session.id,
            role: 'assistant',
            content: message,
            message_type: 'greeting',
        })

        return {
            session_id: session.id,
            message,
            message_type: 'greeting',
            session_status: 'collecting_demographics',
            requires_demographics: true,
            is_emergency: false,
        }
    }

    private parseDemographicsFromMessage(message: string): PatientDemographics | null {
        // Simple regex-based parsing
        const ageMatch = message.match(/(\d{1,3})\s*(anos?)?/i)
        const genderMatch = message.match(/\b(masculino|feminino|homem|mulher)\b/i)
        const cityMatch = message.match(/(?:em\s+)?([A-Z][a-záéíóúãõç]+(?:\s+[A-Z][a-záéíóúãõç]+)*)/g)

        if (!ageMatch || !genderMatch) {
            return null
        }

        const age = parseInt(ageMatch[1])
        if (age < 0 || age > 120) {
            return null
        }

        const genderInput = genderMatch[1].toLowerCase()
        const gender: 'masculino' | 'feminino' =
            genderInput === 'mulher' ? 'feminino' :
                genderInput === 'homem' ? 'masculino' :
                    genderInput as 'masculino' | 'feminino'

        // Default to "Não informado" if no city found
        const location = cityMatch ? cityMatch[cityMatch.length - 1].replace(/^em\s+/i, '') : 'Não informado'

        return {
            age,
            gender,
            location,
        }
    }

    // ============================================================================
    // OPENROUTER API
    // ============================================================================

    private async callOpenRouter(
        session: TriageSession,
        history: TriageMessage[],
        currentMessage: string,
        model: string
    ): Promise<{ content: string; tokensUsed: number }> {
        const apiKey = process.env.OPENROUTER_API_KEY

        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY não configurada')
        }

        const systemPrompt = getTriageSystemPrompt()
        const userPrompt = buildTriageUserPrompt(
            session.demographics,
            history.map(m => ({ role: m.role, content: m.content })),
            currentMessage
        )

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://clinigo.com.br',
                'X-Title': 'CliniGo AiA Triage',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.2, // Low temperature for medical accuracy
                max_tokens: 1500,
            }),
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('OpenRouter API error:', error)
            throw new Error('Erro ao processar sua mensagem')
        }

        const data = await response.json()

        return {
            content: data.choices[0]?.message?.content || '',
            tokensUsed: data.usage?.total_tokens || 0,
        }
    }

    // ============================================================================
    // RESPONSE PARSING
    // ============================================================================

    private parseAIResponse(
        content: string,
        session: TriageSession,
        planType: PlanType
    ): { message: string; triageResult: TriageResult | null; isComplete: boolean } {
        // Try to extract JSON from response
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*"triage_complete"[\s\S]*\}/)

        if (!jsonMatch) {
            // No JSON found, return as-is (continuing conversation)
            return {
                message: content,
                triageResult: null,
                isComplete: false,
            }
        }

        try {
            const jsonStr = jsonMatch[1] || jsonMatch[0]
            const parsed = JSON.parse(jsonStr)

            if (!parsed.triage_complete) {
                return {
                    message: content.replace(/```json[\s\S]*```/g, '').trim() || content,
                    triageResult: null,
                    isComplete: false,
                }
            }

            // Build triage result with plan-based gating
            const level = parsed.level as TriageLevel
            const levelConfig = TRIAGE_LEVEL_CONFIG[level]
            const isPlanBlocked = ['STARTER', 'BASIC'].includes(planType)

            const triageResult: TriageResult = {
                status: 'success',
                session_id: session.id,
                triage: {
                    level,
                    level_name: levelConfig.name,
                    level_description: levelConfig.description,
                    immediate_action: parsed.immediate_action || levelConfig.description,
                    emergency_number: level === 'VERMELHO' ? '192' : null,
                },
                medical_data: {
                    possiveis_condicoes: isPlanBlocked ? null : (parsed.possiveis_condicoes || []).map((c: any) => ({
                        condition: c.condition || c.condicao,
                        probability: c.probability || c.probabilidade,
                    })),
                    exames_sugeridos: isPlanBlocked ? null : (parsed.exames_sugeridos || []),
                    especialidade: parsed.especialidade || 'Clínico Geral',
                    red_flags_present: parsed.red_flags || [],
                },
                recommendations: {
                    specialty: parsed.especialidade || 'Clínico Geral',
                    timeframe: parsed.tempo_maximo || levelConfig.timeframe,
                    immediate_care: parsed.cuidados_imediatos || [],
                    avoid: parsed.evitar || [],
                },
                plan_restriction: {
                    is_blocked: isPlanBlocked,
                    upgrade_banner_text: isPlanBlocked ? UPGRADE_BANNER_TEXT : null,
                    cta_link: isPlanBlocked ? '/dashboard/billing/upgrade' : null,
                },
                disclaimers: [
                    'Esta avaliação é preliminar e não substitui consulta médica',
                    'Em caso de piora, procure atendimento imediato',
                ],
                next_steps: {
                    agendar_consulta: level !== 'VERMELHO',
                    especialidade: parsed.especialidade || 'Clínico Geral',
                    tempo_maximo: parsed.tempo_maximo || levelConfig.timeframe,
                },
            }

            // Build user-friendly message
            let message = `${levelConfig.emoji} **${levelConfig.name.toUpperCase()}**\n\n`
            message += `${parsed.immediate_action || levelConfig.description}\n\n`
            message += `**Especialidade recomendada:** ${parsed.especialidade || 'Clínico Geral'}\n`
            message += `**Prazo para atendimento:** ${parsed.tempo_maximo || levelConfig.timeframe}\n\n`

            if (!isPlanBlocked && parsed.possiveis_condicoes?.length > 0) {
                message += `**Possíveis condições a investigar:**\n`
                for (const c of parsed.possiveis_condicoes) {
                    message += `• ${c.condition || c.condicao} (${c.probability || c.probabilidade})\n`
                }
                message += '\n'
            }

            if (isPlanBlocked) {
                message += `\n---\n${UPGRADE_BANNER_TEXT}\n`
            }

            message += `\n---\n⚠️ *Esta avaliação é preliminar e não substitui consulta médica.*\n*AiA - CliniGo*`

            return {
                message,
                triageResult,
                isComplete: true,
            }
        } catch (error) {
            console.error('Error parsing AI response:', error)
            return {
                message: content,
                triageResult: null,
                isComplete: false,
            }
        }
    }

    // ============================================================================
    // PLAN MANAGEMENT
    // ============================================================================

    private async getClinicPlan(clinicId: string | null): Promise<{ planType: PlanType; model: string }> {
        if (!clinicId) {
            return {
                planType: 'STARTER',
                model: TRIAGE_MODELS.STARTER,
            }
        }

        const supabase = await this.getSupabase()

        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        const planType = ((clinic as any)?.plan_type as PlanType) || 'STARTER'
        const model = TRIAGE_MODELS[planType] || TRIAGE_MODELS.STARTER

        return { planType, model }
    }

    // ============================================================================
    // HISTORY
    // ============================================================================

    async getTriageHistory(clinicId: string, limit = 50): Promise<TriageSession[]> {
        const supabase = await this.getSupabase()

        const { data, error } = await supabase
            .from('aia_triage_sessions' as any)
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching triage history:', error)
            return []
        }

        return data as TriageSession[]
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let triageServiceInstance: TriageService | null = null

export function getTriageService(): TriageService {
    if (!triageServiceInstance) {
        triageServiceInstance = new TriageService()
    }
    return triageServiceInstance
}
