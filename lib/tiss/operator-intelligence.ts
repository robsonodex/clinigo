/**
 * Motor de Inteligência de Operadoras & Memória Anti-Glosa (TISS 2.0).
 * 100% puro e testável em Jest — cruza lotes, guias e histórico de glosas da clínica.
 */

export interface TissBatchInput {
    id: string
    insurance_company_id?: string | null
    insurance_company_name?: string | null
    total_value?: number | string | null
    approved_value?: number | string | null
    glosa_value?: number | string | null
    submission_date?: string | null
    submitted_at?: string | null
    return_processed_at?: string | null
}

export interface TissGlosaInput {
    id: string
    batch_id?: string | null
    guide_id?: string | null
    glosa_code?: string | null
    glosa_description?: string | null
    glosa_value?: number | string | null
    is_irrecoverable?: boolean | null
    irrecoverable_value?: number | string | null
    contest_status?: string | null
    status?: string | null
}

export interface OperatorTopReason {
    code: string
    description: string
    count: number
    totalValue: number
}

export interface OperatorAntiGlosaRule {
    operatorName: string
    operatorId: string | null
    glosaCode: string
    description: string
    occurrences: number
    totalGlosedValue: number
    recommendation: string
}

export interface OperatorIntelligenceRow {
    operatorId: string | null
    operatorName: string
    batchesCount: number
    billedValue: number
    approvedValue: number
    glosaValue: number
    irrecoverableValue: number
    appealableValue: number
    glosaRatePct: number
    avgReturnDays: number | null
    netMarginEstimatePct: number
    topReasons: OperatorTopReason[]
    riskLevel: 'baixo' | 'moderado' | 'alto'
}

export interface OperatorIntelligenceReport {
    totalOperators: number
    totalBilled: number
    totalGlosa: number
    overallGlosaRatePct: number
    operators: OperatorIntelligenceRow[]
    antiGlosaMemory: OperatorAntiGlosaRule[]
}

function toNum(v: unknown): number {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
}

function computeDaysBetween(startIso?: string | null, endIso?: string | null): number | null {
    if (!startIso || !endIso) return null
    const startMs = new Date(startIso).getTime()
    const endMs = new Date(endIso).getTime()
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) return null
    const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24))
    return diffDays <= 365 ? diffDays : null
}

function buildRecommendationForCode(code: string, description: string): string {
    const desc = `${code} ${description}`.toLowerCase()
    if (desc.includes('carteir') || desc.includes('benefici') || desc.includes('elegib')) {
        return 'Conferir validade e número da carteirinha na recepção antes de fechar o lote.'
    }
    if (desc.includes('senha') || desc.includes('autoriz')) {
        return 'Validar código de autorização/senha vigente para todas as guias desta operadora.'
    }
    if (desc.includes('cid') || desc.includes('diagn')) {
        return 'Confirmar preenchimento do código CID-10 compatível com o procedimento TUSS.'
    }
    if (desc.includes('evolu') || desc.includes('comprov') || desc.includes('presen') || desc.includes('execu')) {
        return 'Garantir evolução assinada e check-in biométrico vinculados antes do envio XML.'
    }
    if (desc.includes('duplic') || desc.includes('prazo') || desc.includes('interval')) {
        return 'Verificar intervalo entre sessões e ausência de guias duplicadas na mesma data.'
    }
    return `Revisar previamente o motivo ANS ${code} nas guias desta operadora antes da geração do XML.`
}

export function computeOperatorIntelligence(
    batches: TissBatchInput[],
    glosas: TissGlosaInput[]
): OperatorIntelligenceReport {
    const batchOperatorMap = new Map<string, { key: string; id: string | null; name: string }>()

    const opBuckets = new Map<
        string,
        {
            operatorId: string | null
            operatorName: string
            batchesCount: number
            billedValue: number
            approvedValue: number
            glosaValue: number
            irrecoverableValue: number
            returnDaysList: number[]
            reasons: Map<string, OperatorTopReason>
        }
    >()

    const ensureBucket = (id: string | null, name: string) => {
        const cleanName = (name || 'Operadora não identificada').trim()
        const key = id || cleanName.toLowerCase()
        if (!opBuckets.has(key)) {
            opBuckets.set(key, {
                operatorId: id,
                operatorName: cleanName,
                batchesCount: 0,
                billedValue: 0,
                approvedValue: 0,
                glosaValue: 0,
                irrecoverableValue: 0,
                returnDaysList: [],
                reasons: new Map(),
            })
        }
        return { key, bucket: opBuckets.get(key)! }
    }

    for (const batch of batches || []) {
        const { key, bucket } = ensureBucket(
            batch.insurance_company_id || null,
            batch.insurance_company_name || 'Operadora não identificada'
        )
        batchOperatorMap.set(batch.id, {
            key,
            id: bucket.operatorId,
            name: bucket.operatorName,
        })

        bucket.batchesCount += 1
        bucket.billedValue += Math.max(0, toNum(batch.total_value))
        bucket.approvedValue += Math.max(0, toNum(batch.approved_value))
        bucket.glosaValue += Math.max(0, toNum(batch.glosa_value))

        const dso = computeDaysBetween(
            batch.submitted_at || batch.submission_date,
            batch.return_processed_at
        )
        if (dso !== null) {
            bucket.returnDaysList.push(dso)
        }
    }

    // Agrega motivos reais de glosa por operadora
    const glosaTotalsByOp = new Map<string, number>()

    for (const g of glosas || []) {
        const linkedOp = g.batch_id ? batchOperatorMap.get(g.batch_id) : null
        const { key, bucket } = linkedOp
            ? { key: linkedOp.key, bucket: opBuckets.get(linkedOp.key)! }
            : ensureBucket(null, 'Operadora não identificada')

        const val = Math.max(0, toNum(g.glosa_value))
        glosaTotalsByOp.set(key, (glosaTotalsByOp.get(key) || 0) + val)

        const irrec = g.is_irrecoverable
            ? Math.max(val, toNum(g.irrecoverable_value))
            : Math.max(0, toNum(g.irrecoverable_value))
        bucket.irrecoverableValue += irrec

        const code = String(g.glosa_code || 'SEM_COD').trim()
        const desc = String(g.glosa_description || 'Motivo não especificado').trim()
        const existingReason = bucket.reasons.get(code)
        if (existingReason) {
            existingReason.count += 1
            existingReason.totalValue = Number((existingReason.totalValue + val).toFixed(2))
        } else {
            bucket.reasons.set(code, {
                code,
                description: desc,
                count: 1,
                totalValue: Number(val.toFixed(2)),
            })
        }
    }

    const operators: OperatorIntelligenceRow[] = []
    const antiGlosaMemory: OperatorAntiGlosaRule[] = []

    for (const [key, bucket] of opBuckets.entries()) {
        // Caso o lote não tenha preenchido glosa_value mas existam linhas em tiss_glosas
        const effectiveGlosa = Math.max(bucket.glosaValue, glosaTotalsByOp.get(key) || 0)
        const billed = Number(bucket.billedValue.toFixed(2))
        const glosa = Number(effectiveGlosa.toFixed(2))
        const irrecoverable = Number(Math.min(glosa, bucket.irrecoverableValue).toFixed(2))
        const appealable = Number(Math.max(0, glosa - irrecoverable).toFixed(2))
        const approved =
            bucket.approvedValue > 0
                ? Number(bucket.approvedValue.toFixed(2))
                : Number(Math.max(0, billed - glosa).toFixed(2))

        const glosaRatePct = billed > 0 ? Number(((glosa / billed) * 100).toFixed(1)) : 0
        const avgReturnDays =
            bucket.returnDaysList.length > 0
                ? Math.round(
                      bucket.returnDaysList.reduce((acc, d) => acc + d, 0) /
                          bucket.returnDaysList.length
                  )
                : null

        const netMarginEstimatePct =
            billed > 0 ? Number((((billed - irrecoverable) / billed) * 100).toFixed(1)) : 100

        const topReasons = Array.from(bucket.reasons.values())
            .sort((a, b) => b.totalValue - a.totalValue || b.count - a.count)
            .slice(0, 3)

        const riskLevel: 'baixo' | 'moderado' | 'alto' =
            glosaRatePct >= 10 ? 'alto' : glosaRatePct >= 4 ? 'moderado' : 'baixo'

        operators.push({
            operatorId: bucket.operatorId,
            operatorName: bucket.operatorName,
            batchesCount: bucket.batchesCount,
            billedValue: billed,
            approvedValue: approved,
            glosaValue: glosa,
            irrecoverableValue: irrecoverable,
            appealableValue: appealable,
            glosaRatePct,
            avgReturnDays,
            netMarginEstimatePct,
            topReasons,
            riskLevel,
        })

        // Memória Anti-Glosa: motivos recorrentes (>= 2 ocorrências ou >= R$ 300)
        for (const reason of topReasons) {
            if (reason.count >= 2 || reason.totalValue >= 300) {
                antiGlosaMemory.push({
                    operatorName: bucket.operatorName,
                    operatorId: bucket.operatorId,
                    glosaCode: reason.code,
                    description: reason.description,
                    occurrences: reason.count,
                    totalGlosedValue: reason.totalValue,
                    recommendation: buildRecommendationForCode(reason.code, reason.description),
                })
            }
        }
    }

    operators.sort((a, b) => b.glosaValue - a.glosaValue || b.billedValue - a.billedValue)
    antiGlosaMemory.sort((a, b) => b.totalGlosedValue - a.totalGlosedValue || b.occurrences - a.occurrences)

    const totalBilled = Number(operators.reduce((acc, o) => acc + o.billedValue, 0).toFixed(2))
    const totalGlosa = Number(operators.reduce((acc, o) => acc + o.glosaValue, 0).toFixed(2))
    const overallGlosaRatePct =
        totalBilled > 0 ? Number(((totalGlosa / totalBilled) * 100).toFixed(1)) : 0

    return {
        totalOperators: operators.length,
        totalBilled,
        totalGlosa,
        overallGlosaRatePct,
        operators,
        antiGlosaMemory: antiGlosaMemory.slice(0, 12),
    }
}

