/**
 * AI Brain Engine - Predictive Diagnosis
 * CliniGo Enterprise Feature
 * 
 * LGPD Compliant - All data is anonymized before AI processing
 */

import { createClient } from '@/lib/supabase/server'
import { anonymizePatientData, type AnonymizedPatientContext } from './anonymizer'
import { getDiagnosisPrompt } from './medical-prompts'

export interface DiagnosisHypothesis {
    rank: number
    condition: string
    probability: 'ALTA' | 'MÉDIA' | 'BAIXA'
    confidence: number
    reasoning: string
    suggestedActions: string[]
}

export interface PredictiveDiagnosisResult {
    analysisId: string
    timestamp: string
    hypotheses: DiagnosisHypothesis[]
    disclaimer: string
    modelUsed: string
    tokensUsed: number
}

interface BrainEngineOptions {
    consultationId: string
    doctorId: string
    clinicId: string
    currentSymptoms: string
    additionalContext?: string
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DISCLAIMER = 'Esta análise é suporte à decisão clínica. O diagnóstico final é responsabilidade exclusiva do médico. A IA não substitui o julgamento clínico profissional.'

/**
 * Main Brain Engine function
 * Collects patient context, anonymizes data, calls AI, parses response
 */
export async function runPredictiveDiagnosis(
    options: BrainEngineOptions
): Promise<PredictiveDiagnosisResult> {
    const { consultationId, doctorId, clinicId, currentSymptoms, additionalContext } = options

    // 1. Collect patient context from database
    const patientContext = await collectPatientContext(consultationId)

    // 2. Anonymize data (LGPD compliance)
    const anonymizedContext = anonymizePatientData(patientContext)

    // 3. Build prompt
    const systemPrompt = getDiagnosisPrompt()
    const userPrompt = buildUserPrompt(anonymizedContext, currentSymptoms, additionalContext)

    // 4. Determine model based on plan
    const { model, planType } = await getModelForClinic(clinicId)

    // 5. Call AI
    const aiResponse = await callOpenRouter(systemPrompt, userPrompt, model)

    // 6. Parse response
    const hypotheses = parseAIResponse(aiResponse.content)

    // 7. Save analysis to database
    const analysisId = await saveAnalysis({
        consultationId,
        doctorId,
        clinicId,
        hypotheses,
        modelUsed: model,
        planType,
        tokensUsed: aiResponse.tokensUsed,
    })

    return {
        analysisId,
        timestamp: new Date().toISOString(),
        hypotheses,
        disclaimer: DISCLAIMER,
        modelUsed: model,
        tokensUsed: aiResponse.tokensUsed,
    }
}

/**
 * Collect patient context from consultation
 */
async function collectPatientContext(consultationId: string) {
    const supabase = await createClient()

    // Get consultation with patient and medical records
    const { data: consultation } = await supabase
        .from('consultations')
        .select(`
            id,
            patient:patients(
                id,
                date_of_birth,
                gender
            ),
            medical_record:medical_records(
                anamnesis,
                physical_exam,
                diagnosis,
                medications
            )
        `)
        .eq('id', consultationId)
        .single()

    if (!consultation) {
        throw new Error('Consulta não encontrada')
    }

    // Get patient history (last 10 consultations)
    const patient = consultation.patient as any
    const { data: history } = await supabase
        .from('consultations')
        .select(`
            date,
            medical_record:medical_records(
                diagnosis,
                medications
            )
        `)
        .eq('patient_id', patient.id)
        .order('date', { ascending: false })
        .limit(10)

    return {
        patient,
        currentRecord: consultation.medical_record,
        history: history || [],
    }
}

/**
 * Build user prompt with anonymized context
 */
function buildUserPrompt(
    context: AnonymizedPatientContext,
    currentSymptoms: string,
    additionalContext?: string
): string {
    let prompt = `## DADOS DO PACIENTE (Anonimizados)

**Perfil:**
- Idade: ${context.age} anos
- Sexo: ${context.gender}

**Queixa Atual:**
${currentSymptoms}

**Histórico Médico:**
${context.medicalHistory || 'Não informado'}

**Medicamentos em Uso:**
${context.currentMedications || 'Nenhum informado'}

**Exame Físico:**
${context.physicalExam || 'Não realizado'}
`

    if (context.previousDiagnoses.length > 0) {
        prompt += `\n**Diagnósticos Anteriores:**\n`
        context.previousDiagnoses.forEach((d, i) => {
            prompt += `${i + 1}. ${d}\n`
        })
    }

    if (additionalContext) {
        prompt += `\n**Observações Adicionais do Médico:**\n${additionalContext}`
    }

    prompt += `\n\n## TAREFA
Baseado nos dados acima, forneça as 3 hipóteses diagnósticas mais prováveis em formato JSON.`

    return prompt
}

/**
 * Get model based on clinic plan
 */
async function getModelForClinic(clinicId: string): Promise<{ model: string; planType: string }> {
    const supabase = await createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type')
        .eq('id', clinicId)
        .single()

    const planType = (clinic as any)?.plan_type || 'BASIC'

    // Model selection based on plan
    const models: Record<string, string> = {
        BASIC: 'meta-llama/llama-3.1-8b-instruct:free', // Free model
        PRO: 'anthropic/claude-3-haiku', // Cheaper Claude
        ENTERPRISE: 'anthropic/claude-3.5-sonnet', // Best model
    }

    return {
        model: models[planType] || models.BASIC,
        planType,
    }
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    model: string
): Promise<{ content: string; tokensUsed: number }> {
    const apiKey = process.env.OPENROUTER_API_KEY

    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY não configurada')
    }

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://clinigo.com.br',
            'X-Title': 'CliniGo AI Diagnosis',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
        }),
    })

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenRouter API error: ${error}`)
    }

    const data = await response.json()

    return {
        content: data.choices[0]?.message?.content || '',
        tokensUsed: data.usage?.total_tokens || 0,
    }
}

/**
 * Parse AI response into structured hypotheses
 */
function parseAIResponse(content: string): DiagnosisHypothesis[] {
    try {
        const parsed = JSON.parse(content)
        const hypotheses = parsed.hypotheses || parsed.hipoteses || []

        return hypotheses.slice(0, 3).map((h: any, index: number) => ({
            rank: index + 1,
            condition: h.condition || h.condicao || h.diagnostico || 'Desconhecido',
            probability: normalizeProbability(h.probability || h.probabilidade),
            confidence: parseFloat(h.confidence || h.confianca || 0.5),
            reasoning: h.reasoning || h.justificativa || h.raciocinio || '',
            suggestedActions: h.suggestedActions || h.acoes || h.conduta || [],
        }))
    } catch (error) {
        console.error('Erro ao parsear resposta da IA:', error)
        return [{
            rank: 1,
            condition: 'Erro na análise',
            probability: 'BAIXA',
            confidence: 0,
            reasoning: 'Não foi possível processar a resposta da IA',
            suggestedActions: ['Tentar novamente', 'Contatar suporte'],
        }]
    }
}

function normalizeProbability(prob: string): 'ALTA' | 'MÉDIA' | 'BAIXA' {
    const upper = (prob || '').toUpperCase()
    if (upper.includes('ALTA') || upper.includes('HIGH')) return 'ALTA'
    if (upper.includes('MÉDIA') || upper.includes('MEDIA') || upper.includes('MEDIUM')) return 'MÉDIA'
    return 'BAIXA'
}

/**
 * Save analysis to database for audit
 */
async function saveAnalysis(data: {
    consultationId: string
    doctorId: string
    clinicId: string
    hypotheses: DiagnosisHypothesis[]
    modelUsed: string
    planType: string
    tokensUsed: number
}): Promise<string> {
    const supabase = await createClient()

    const { data: analysis, error } = await supabase
        .from('consultation_ai_analyses')
        .insert({
            consultation_id: data.consultationId,
            clinic_id: data.clinicId,
            doctor_id: data.doctorId,
            analysis_type: 'diagnosis_suggestions',
            prompt: 'predictive_diagnosis',
            result: { hypotheses: data.hypotheses },
            model_used: data.modelUsed,
            plan_type: data.planType,
            tokens_used: data.tokensUsed,
            reasoning_enabled: true,
        })
        .select('id')
        .single()

    if (error) {
        console.error('Erro ao salvar análise:', error)
        return 'temp-' + Date.now()
    }

    return (analysis as any).id
}

