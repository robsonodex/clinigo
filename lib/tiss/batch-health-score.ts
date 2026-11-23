/**
 * Motor de Score de Saúde do Lote TISS (0–100%) pré-fechamento.
 * 100% puro e determinístico para validação antes de gerar XML ANS.
 */

export interface TissGuideHealthInput {
    id: string
    guide_number?: string | null
    patient_name?: string | null
    patient_card_number?: string | null
    patient_card_validity?: string | null
    procedure_code?: string | null
    procedure_name?: string | null
    total_value?: number | string | null
    execution_date?: string | null
    authorization_code?: string | null
    status?: string | null
}

export interface GuideImpedimentoItem {
    guide_id: string
    guide_number: string
    patient_name?: string
    issues: string[]
    warnings: string[]
}

export interface BatchHealthScoreResult {
    health_score: number
    health_level: 'excelente' | 'atencao' | 'critico'
    can_close: boolean
    total_guides: number
    healthy_guides: number
    guides_with_blockers: number
    guides_with_warnings: number
    checks_summary: {
        valid_tuss: number
        valid_card: number
        valid_card_expiry: number
        valid_value: number
        valid_execution_date: number
        with_authorization_code: number
    }
    impedimentos: GuideImpedimentoItem[]
    warnings: GuideImpedimentoItem[]
}

export function evaluateTissBatchHealth(
    guides: TissGuideHealthInput[],
    batchNumber = 'Lote'
): BatchHealthScoreResult {
    const list = Array.isArray(guides) ? guides : []

    if (list.length === 0) {
        return {
            health_score: 0,
            health_level: 'critico',
            can_close: false,
            total_guides: 0,
            healthy_guides: 0,
            guides_with_blockers: 0,
            guides_with_warnings: 0,
            checks_summary: {
                valid_tuss: 0,
                valid_card: 0,
                valid_card_expiry: 0,
                valid_value: 0,
                valid_execution_date: 0,
                with_authorization_code: 0,
            },
            impedimentos: [
                {
                    guide_id: 'batch',
                    guide_number: batchNumber,
                    issues: ['O lote não possui nenhuma guia vinculada para fechamento.'],
                    warnings: [],
                },
            ],
            warnings: [],
        }
    }

    const checksSummary = {
        valid_tuss: 0,
        valid_card: 0,
        valid_card_expiry: 0,
        valid_value: 0,
        valid_execution_date: 0,
        with_authorization_code: 0,
    }

    const impedimentos: GuideImpedimentoItem[] = []
    const warningsList: GuideImpedimentoItem[] = []
    let totalGuideScore = 0
    let healthyGuides = 0

    for (const guide of list) {
        const issues: string[] = []
        const warnings: string[] = []
        let guideScore = 100

        // 1. Código TUSS (peso 25)
        const procCode = (guide.procedure_code || '').trim()
        if (!procCode || procCode === '00000000' || procCode.length < 6) {
            issues.push('Código de procedimento TUSS ausente ou inválido.')
            guideScore -= 25
        } else {
            checksSummary.valid_tuss++
        }

        // 2. Número da carteira (peso 25)
        const cardNum = (guide.patient_card_number || '').trim()
        if (!cardNum || cardNum.length < 3) {
            issues.push('Número da carteira do beneficiário ausente ou inválido.')
            guideScore -= 25
        } else {
            checksSummary.valid_card++
        }

        // 3. Valor total > 0 (peso 20)
        const totalVal = Number(guide.total_value) || 0
        if (totalVal <= 0) {
            issues.push('Valor total da guia menor ou igual a zero.')
            guideScore -= 20
        } else {
            checksSummary.valid_value++
        }

        // 4. Data de execução (peso 15)
        if (!guide.execution_date) {
            issues.push('Data de execução do atendimento não informada.')
            guideScore -= 15
        } else {
            checksSummary.valid_execution_date++
        }

        // 5. Validade da carteirinha na data de execução (alerta de risco - peso 10)
        if (guide.patient_card_validity && guide.execution_date) {
            const valDate = new Date(`${String(guide.patient_card_validity).split('T')[0]}T23:59:59Z`)
            const execDate = new Date(`${String(guide.execution_date).split('T')[0]}T00:00:00Z`)
            if (!Number.isNaN(valDate.getTime()) && !Number.isNaN(execDate.getTime()) && valDate < execDate) {
                warnings.push('Carteirinha vencida na data de execução do atendimento.')
                guideScore -= 10
            } else {
                checksSummary.valid_card_expiry++
            }
        } else {
            checksSummary.valid_card_expiry++
        }

        // 6. Código de autorização (alerta consultivo - peso 5)
        const authCode = (guide.authorization_code || '').trim()
        if (!authCode) {
            warnings.push('Número de autorização/senha da operadora não preenchido.')
            guideScore -= 5
        } else {
            checksSummary.with_authorization_code++
        }

        const clamped = Math.max(0, guideScore)
        totalGuideScore += clamped

        if (issues.length === 0 && warnings.length === 0) {
            healthyGuides++
        }

        if (issues.length > 0) {
            impedimentos.push({
                guide_id: guide.id,
                guide_number: guide.guide_number || 'Sem número',
                patient_name: guide.patient_name || 'Paciente',
                issues,
                warnings,
            })
        } else if (warnings.length > 0) {
            warningsList.push({
                guide_id: guide.id,
                guide_number: guide.guide_number || 'Sem número',
                patient_name: guide.patient_name || 'Paciente',
                issues: [],
                warnings,
            })
        }
    }

    const healthScore = Math.round(totalGuideScore / list.length)
    const healthLevel: 'excelente' | 'atencao' | 'critico' =
        impedimentos.length === 0 && healthScore >= 90
            ? 'excelente'
            : healthScore >= 70
              ? 'atencao'
              : 'critico'

    return {
        health_score: healthScore,
        health_level: healthLevel,
        can_close: impedimentos.length === 0,
        total_guides: list.length,
        healthy_guides: healthyGuides,
        guides_with_blockers: impedimentos.length,
        guides_with_warnings: warningsList.length,
        checks_summary: checksSummary,
        impedimentos,
        warnings: warningsList,
    }
}
