/**
 * CLINIGO PREMIUM - TISS Glosa Predictor (IA)
 * Squad B: TISS Pré-Auditoria (Day 3-4)
 * 
 * AI-powered glosa prediction and prevention
 * Combines rule-based validation + ML predictions
 */

import OpenAI from 'openai'
import { validateTISSGuide, type TISSValidationError } from './tiss-validator'

export interface GlosaRisk {
    probability: number // 0-1
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    predicted_issues: GlosaPrediction[]
    can_auto_fix: boolean
    estimated_loss: number
}

export interface GlosaPrediction {
    issue_type: string
    description: string
    glosa_code: string
    probability: number
    suggested_fix?: string
    auto_fixable: boolean
}

/**
 * Operator-specific glosa rules
 */
const OPERATOR_RULES: Record<string, Array<{
    code: string
    description: string
    check: (guide: any) => boolean
    severity: 'critical' | 'high' | 'medium'
}>> = {
    'UNIMED': [
        {
            code: 'UNI_001',
            description: 'Valor acima da tabela Unimed',
            check: (g) => {
                // Check if procedure value exceeds Unimed table
                // Simplified: flag if > R$ 500 for consultation
                return g.codigoProcedimento === '10101012' && parseFloat(g.valorProcedimento) > 500
            },
            severity: 'high'
        },
        {
            code: 'UNI_002',
            description: 'CID-10 incompatível com procedimento',
            check: (g) => {
                // Example: Cannot bill orthopedic procedure with respiratory CID
                const isOrthoProcedure = g.codigoProcedimento?.startsWith('407')
                const isRespiratoryCID = g.codigoCID?.startsWith('J')
                return isOrthoProcedure && isRespiratoryCID
            },
            severity: 'critical'
        },
        {
            code: 'UNI_003',
            description: 'Guia sem número de carteirinha válido',
            check: (g) => {
                const card = g.numeroCarteira?.replace(/\D/g, '')
                return !card || card.length < 16
            },
            severity: 'critical'
        },
    ],
    'BRADESCO': [
        {
            code: 'BRA_001',
            description: 'Falta guia de solicitação (SADT)',
            check: (g) => {
                return g.tipo === 'SADT' && !g.numeroGuiaSolicitacao
            },
            severity: 'critical'
        },
        {
            code: 'BRA_002',
            description: 'Procedimento não autorizado previamente',
            check: (g) => {
                // Procedures requiring prior authorization
                const requiresAuth = ['40813010', '40815013'] // Example codes
                return requiresAuth.includes(g.codigoProcedimento) && !g.numeroAutorizacao
            },
            severity: 'critical'
        },
    ],
    'SULAMERICA': [
        {
            code: 'SUL_001',
            description: 'CRM do executante inválido',
            check: (g) => {
                const crm = g.numeroConselhoExecutante
                return !crm || !/^\d{4,7}[A-Z]{2}$/.test(crm)
            },
            severity: 'high'
        },
        {
            code: 'SUL_002',
            description: 'Data de atendimento futura',
            check: (g) => {
                const date = new Date(g.dataAtendimento)
                return date > new Date()
            },
            severity: 'critical'
        },
    ]
}

/**
 * Analyze glosa risk using rules + AI
 */
export async function analyzeGlosaRisk(
    guide: any,
    operatorName: string = 'UNIMED'
): Promise<GlosaRisk> {

    // Step 1: Run rule-based checks
    const ruleViolations = checkOperatorRules(guide, operatorName)

    // Step 2: Run TISS schema validation
    const validation = validateTISSGuide(guide, guide.tipo || 'CONSULTA')

    // Step 3:  Combine issues
    const allIssues: GlosaPrediction[] = []

    // Add rule violations
    ruleViolations.forEach(rule => {
        allIssues.push({
            issue_type: 'rule_violation',
            description: rule.description,
            glosa_code: rule.code,
            probability: rule.severity === 'critical' ? 0.95 : rule.severity === 'high' ? 0.75 : 0.50,
            auto_fixable: false, // Most rule violations require manual fix
        })
    })

    // Add validation errors
    validation.errors.forEach(err => {
        allIssues.push({
            issue_type: 'validation_error',
            description: err.message,
            glosa_code: err.code,
            probability: 0.85, // Validation errors have high glosa probability
            auto_fixable: canAutoFix(err),
            suggested_fix: getSuggestedFix(err, guide)
        })
    })

    // Step 4: AI prediction (if configured)
    try {
        const aiPredictions = await getAIPredictions(guide, operatorName, allIssues)
        allIssues.push(...aiPredictions)
    } catch (error) {
        console.error('[Glosa AI] AI prediction failed, using rules only:', error)
    }

    // Step 5: Calculate overall risk
    const maxProbability = allIssues.length > 0
        ? Math.max(...allIssues.map(i => i.probability))
        : 0

    const riskLevel =
        maxProbability >= 0.90 ? 'critical' :
            maxProbability >= 0.70 ? 'high' :
                maxProbability >= 0.40 ? 'medium' : 'low'

    const isAutoFixable = allIssues.some(i => i.auto_fixable)

    // Estimate financial loss
    const guideValue = parseFloat(guide.valorProcedimento || guide.valorTotal || 0)
    const estimatedLoss = guideValue * maxProbability

    return {
        probability: maxProbability,
        risk_level: riskLevel,
        predicted_issues: allIssues,
        can_auto_fix: isAutoFixable,
        estimated_loss: estimatedLoss
    }
}

/**
 * Check operator-specific rules
 */
function checkOperatorRules(guide: any, operator: string): Array<{
    code: string
    description: string
    severity: 'critical' | 'high' | 'medium'
}> {
    const rules = OPERATOR_RULES[operator] || []
    const violations: Array<{
        code: string
        description: string
        severity: 'critical' | 'high' | 'medium'
    }> = []

    rules.forEach(rule => {
        if (rule.check(guide)) {
            violations.push({
                code: rule.code,
                description: rule.description,
                severity: rule.severity
            })
        }
    })

    return violations
}

/**
 * Get AI-powered predictions using OpenAI
 */
async function getAIPredictions(
    guide: any,
    operator: string,
    existingIssues: GlosaPrediction[]
): Promise<GlosaPrediction[]> {

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        return []
    }

    try {
        const openai = new OpenAI({ apiKey })

        const prompt = `Você é um especialista em auditoria TISS e prevenção de glosas para operadoras de saúde brasileiras.

Analise a seguinte guia TISS para ${operator}:

${JSON.stringify(guide, null, 2)}

Problemas já identificados:
${existingIssues.map(i => `- ${i.description}`).join('\n')}

Identifique OUTROS problemas potenciais que podem causar glosa, considerando:
1. Regras específicas da operadora ${operator}
2. Histórico de glosas comuns
3. Incompatibilidades entre campos

Para cada problema adicional, forneça:
- issue_type: tipo do problema
- description: descrição clara
- glosa_code: código do motivo de glosa
- probability: probabilidade (0-100%)

Retorne apenas JSON array:
[{"issue_type": "...", "description": "...", "glosa_code": "...", "probability": 85}]`

        const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um auditor TISS especializado em prevenção de glosas. Responda sempre em JSON válido.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2,
            max_tokens: 800,
        })

        const content = response.choices[0]?.message?.content
        if (!content) return []

        const predictions = JSON.parse(content) as Array<{
            issue_type: string
            description: string
            glosa_code: string
            probability: number
        }>

        return predictions.map(p => ({
            issue_type: p.issue_type,
            description: p.description,
            glosa_code: p.glosa_code,
            probability: p.probability / 100,
            auto_fixable: false // AI predictions typically not auto-fixable
        }))

    } catch (error) {
        console.error('[Glosa AI] OpenAI failed:', error)
        return []
    }
}

/**
 * Check if validation error can be auto-fixed
 */
function canAutoFix(error: TISSValidationError): boolean {
    const autoFixableCodes = [
        'INVALID_FORMAT', // Can normalize formats
        'INVALID_CID_FORMAT', // Can add missing dot
        'HIGH_VALUE', // Can flag for review (not auto-fix)
    ]

    return autoFixableCodes.includes(error.code)
}

/**
 * Get suggested fix for validation error
 */
function getSuggestedFix(error: TISSValidationError, guide: any): string | undefined {
    switch (error.code) {
        case 'INVALID_CID_FORMAT':
            // Add missing dot (e.g., J069 → J06.9)
            const cid = guide.codigoCID
            if (cid && cid.length === 4 && !cid.includes('.')) {
                return `${cid.substring(0, 3)}.${cid.substring(3)}`
            }
            return undefined

        case 'MISSING_REQUIRED_FIELD':
            return `Preencher campo obrigatório: ${error.field}`

        default:
            return undefined
    }
}

/**
 * Auto-fix common issues
 */
export function autoFixGuide(guide: any): { fixed: any; changes: string[] } {
    const fixed = { ...guide }
    const changes: string[] = []

    // Fix 1: Normalize CID-10 format
    if (fixed.codigoCID && !fixed.codigoCID.includes('.') && fixed.codigoCID.length === 4) {
        const original = fixed.codigoCID
        fixed.codigoCID = `${original.substring(0, 3)}.${original.substring(3)}`
        changes.push(`CID-10 formatado: ${original} → ${fixed.codigoCID}`)
    }

    // Fix 2: Remove non-numeric from card number
    if (fixed.numeroCarteira) {
        const original = fixed.numeroCarteira
        fixed.numeroCarteira = original.replace(/\D/g, '')
        if (original !== fixed.numeroCarteira) {
            changes.push(`Carteirinha normalizada: ${original} → ${fixed.numeroCarteira}`)
        }
    }

    // Fix 3: Trim whitespace from all string fields
    Object.keys(fixed).forEach(key => {
        if (typeof fixed[key] === 'string') {
            const trimmed = fixed[key].trim()
            if (trimmed !== fixed[key]) {
                fixed[key] = trimmed
                changes.push(`Removidos espaços em branco: ${key}`)
            }
        }
    })

    return { fixed, changes }
}
