/**
 * CLINIGO PREMIUM - NLP CID-10 Suggester
 * Squad A: Prontuário Premium (Day 3-4)
 * 
 * AI-powered CID-10 suggestions based on symptoms/diagnosis
 * Uses OpenAI GPT-4 for intelligent medical coding
 */

import OpenAI from 'openai'

// CID-10 Database (top 500 most common codes)
const COMMON_CID10_CODES = {
    // Respiratory
    'J00': 'Nasofaringite aguda (resfriado comum)',
    'J06.9': 'Infecção aguda das vias aéreas superiores não especificada',
    'J18.9': 'Pneumonia não especificada',
    'J20.9': 'Bronquite aguda não especificada',
    'J45.0': 'Asma predominantemente alérgica',

    // Gastrointestinal
    'K29.7': 'Gastrite não especificada',
    'K30': 'Dispepsia funcional',
    'A09': 'Diarreia e gastroenterite de origem infecciosa presumível',
    'K21.9': 'Doença de refluxo gastroesofágico sem esofagite',

    // Cardiovascular
    'I10': 'Hipertensão essencial (primária)',
    'I25.1': 'Doença aterosclerótica do coração',
    'I48': 'Flutter e fibrilação atrial',

    // Endocrine
    'E11.9': 'Diabetes mellitus não-insulino-dependente - sem complicações',
    'E78.5': 'Hiperlipidemia não especificada',
    'E66.9': 'Obesidade não especificada',

    // Mental/Behavioral
    'F41.1': 'Ansiedade generalizada',
    'F32.9': 'Episódio depressivo não especificado',
    'F51.0': 'Insônia não-orgânica',

    // Musculoskeletal
    'M54.5': 'Dor lombar baixa',
    'M25.56': 'Dor articular do joelho',
    'M79.1': 'Mialgia',

    // Dermatological
    'L30.9': 'Dermatite não especificada',
    'L20.9': 'Dermatite atópica não especificada',
    'B35.3': 'Tinha dos pés',

    // Infectious
    'B34.9': 'Infecção viral não especificada',
    'A08.1': 'Gastroenterite aguda devida ao agente de Norwalk',
    'B37.9': 'Candidíase não especificada',
}

interface CID10Suggestion {
    code: string
    name: string
    confidence: number // 0-1
    reasoning: string
}

/**
 * Get CID-10 suggestions using OpenAI GPT-4
 */
export async function suggestCID10(symptoms: string, diagnosis?: string): Promise<CID10Suggestion[]> {
    try {
        // Fallback: Rule-based matching if OpenAI fails
        const ruleBased = getRuleBasedSuggestions(symptoms, diagnosis)

        // Check if OpenAI is configured
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
            console.warn('[CID-10] OpenAI not configured, using rule-based fallback')
            return ruleBased
        }

        const openai = new OpenAI({ apiKey })

        const prompt = `Você é um especialista em codificação médica CID-10 brasileiro.

Baseado nos seguintes dados clínicos, sugira os 3 códigos CID-10 mais apropriados:

Sintomas/Queixa: ${symptoms}
${diagnosis ? `Diagnóstico preliminar: ${diagnosis}` : ''}

Para cada sugestão, forneça:
1. Código CID-10 completo (ex: J06.9)
2. Nome da doença em português
3. Confiança (0-100%)
4. Justificativa breve

Formato de resposta (JSON):
[
  {
    "code": "J06.9",
    "name": "Infecção aguda das vias aéreas superiores",
    "confidence": 95,
    "reasoning": "Sintomas clássicos de IVAS"
  }
]

IMPORTANTE: Retorne apenas o array JSON, sem texto adicional.`

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente de codificação médica especializado em CID-10 brasileiro. Sempre responda em JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3, // Lower for more consistent medical suggestions
            max_tokens: 500,
        })

        const content = response.choices[0]?.message?.content
        if (!content) {
            return ruleBased
        }

        // Parse AI response
        const suggestions = JSON.parse(content) as Array<{
            code: string
            name: string
            confidence: number
            reasoning: string
        }>

        return suggestions.map(s => ({
            code: s.code,
            name: s.name,
            confidence: s.confidence / 100, // Convert to 0-1
            reasoning: s.reasoning
        }))

    } catch (error) {
        console.error('[CID-10] OpenAI error:', error)
        // Fallback to rule-based
        return getRuleBasedSuggestions(symptoms, diagnosis)
    }
}

/**
 * Rule-based CID-10 suggestions (fallback)
 * Simple keyword matching
 */
function getRuleBasedSuggestions(symptoms: string, diagnosis?: string): CID10Suggestion[] {
    const text = `${symptoms} ${diagnosis || ''}`.toLowerCase()
    const suggestions: CID10Suggestion[] = []

    // Keyword matching
    const rules: Record<string, { codes: string[], keywords: string[] }> = {
        'respiratory': {
            codes: ['J00', 'J06.9', 'J20.9'],
            keywords: ['tosse', 'coriza', 'nariz', 'garganta', 'resfriado', 'gripe', 'congestion']
        },
        'gastrointestinal': {
            codes: ['A09', 'K29.7', 'K30'],
            keywords: ['diarreia', 'vômito', 'náusea', 'dor abdominal', 'estômago', 'gastrite']
        },
        'pain_general': {
            codes: ['M54.5', 'M79.1', 'M25.56'],
            keywords: ['dor', 'lombar', 'costas', 'joelho', 'articular', 'muscular']
        },
        'skin': {
            codes: ['L30.9', 'L20.9'],
            keywords: ['coceira', 'vermelhidão', 'pele', 'rash', 'dermatite', 'eczema']
        },
        'mental': {
            codes: ['F41.1', 'F32.9', 'F51.0'],
            keywords: ['ansiedade', 'depressão', 'insônia', 'sono', 'tristeza', 'nervoso']
        },
        'hypertension': {
            codes: ['I10'],
            keywords: ['pressão alta', 'hipertensão', 'hipertenso']
        },
        'diabetes': {
            codes: ['E11.9'],
            keywords: ['diabetes', 'açúcar', 'glicemia', 'diabético']
        }
    }

    for (const [category, rule] of Object.entries(rules)) {
        const matches = rule.keywords.filter(kw => text.includes(kw)).length

        if (matches > 0) {
            rule.codes.forEach(code => {
                suggestions.push({
                    code,
                    name: COMMON_CID10_CODES[code] || 'Descrição não disponível',
                    confidence: Math.min(0.5 + (matches * 0.15), 0.9), // Max 90% for rule-based
                    reasoning: `Correspondência por palavra-chave (${matches} termos)`
                })
            })
        }
    }

    // Sort by confidence, return top 3
    return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
}

/**
 * Validate CID-10 code format
 */
export function isValidCID10(code: string): boolean {
    // CID-10 pattern: Letter + 2 digits + optional dot + optional 1-2 digits
    const pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/
    return pattern.test(code)
}

/**
 * Search CID-10 by code or name
 */
export function searchCID10(query: string): Array<{ code: string; name: string }> {
    const q = query.toLowerCase()

    return Object.entries(COMMON_CID10_CODES)
        .filter(([code, name]) =>
            code.toLowerCase().includes(q) ||
            name.toLowerCase().includes(q)
        )
        .map(([code, name]) => ({ code, name }))
        .slice(0, 10)
}
