/**
 * Motor Clínico de Curva de Aprendizagem, Redução de Suporte (Prompt Fading),
 * Coleta DTT/NET e Critério Automático de Domínio de Metas (PEI).
 *
 * 100% puro, testável em Jest e retrocompatível com sessões antigas em `planos_sessao`.
 */

export type PromptLevel =
    | 'independente'
    | 'gestual'
    | 'verbal'
    | 'modelacao'
    | 'fisica_parcial'
    | 'fisica_total'

export type DttTrialEvent = 'independent' | 'prompted' | 'error'

export interface InterferingBehaviorEntry {
    type: string
    count: number
    notes?: string
}

export interface DttRecord {
    independent: number
    prompted: number
    error: number
    promptLevel: PromptLevel
    history?: DttTrialEvent[]
    interfering?: InterferingBehaviorEntry[]
}

export interface PromptLevelMeta {
    value: PromptLevel
    label: string
    shortLabel: string
    /** Escala 1 (independente) a 6 (ajuda física total) — quanto menor, maior a autonomia. */
    score: number
}

export const PROMPT_LEVEL_OPTIONS: PromptLevelMeta[] = [
    { value: 'independente', label: 'Independente', shortLabel: 'Indep.', score: 1 },
    { value: 'gestual', label: 'Dica Gestual', shortLabel: 'Gestual', score: 2 },
    { value: 'verbal', label: 'Dica Verbal', shortLabel: 'Verbal', score: 3 },
    { value: 'modelacao', label: 'Modelação / Visual', shortLabel: 'Modelação', score: 4 },
    { value: 'fisica_parcial', label: 'Ajuda Física Parcial', shortLabel: 'Fís. Parcial', score: 5 },
    { value: 'fisica_total', label: 'Ajuda Física Total', shortLabel: 'Fís. Total', score: 6 },
]

export const INTERFERING_BEHAVIOR_PRESETS = [
    'Fuga / Esquiva',
    'Busca de Atenção',
    'Acesso a Tangível',
    'Autoestimulação',
    'Birra / Crise',
    'Outro',
] as const

export function getPromptLevelMeta(level?: string | null): PromptLevelMeta {
    const normalized = (level || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

    if (!normalized || normalized.includes('indep')) return PROMPT_LEVEL_OPTIONS[0]
    if (normalized.includes('gest')) return PROMPT_LEVEL_OPTIONS[1]
    if (normalized.includes('verb')) return PROMPT_LEVEL_OPTIONS[2]
    if (normalized.includes('model') || normalized.includes('visual') || normalized.includes('imit')) {
        return PROMPT_LEVEL_OPTIONS[3]
    }
    if (normalized.includes('parcial') || normalized.includes('leve') || normalized.includes('minima') || normalized.includes('moderada')) {
        return PROMPT_LEVEL_OPTIONS[4]
    }
    if (normalized.includes('total') || normalized.includes('maxima') || normalized.includes('fisic')) {
        return PROMPT_LEVEL_OPTIONS[5]
    }
    return PROMPT_LEVEL_OPTIONS[0]
}

export function computeDttMetrics(dtt?: Partial<DttRecord> | null) {
    const independent = Math.max(0, Math.round(Number(dtt?.independent) || 0))
    const prompted = Math.max(0, Math.round(Number(dtt?.prompted) || 0))
    const error = Math.max(0, Math.round(Number(dtt?.error) || 0))
    const totalTrials = independent + prompted + error
    const pctIndependent = totalTrials > 0 ? Math.round((independent / totalTrials) * 100) : 0
    const pctSuccessWithPrompt =
        totalTrials > 0 ? Math.round(((independent + prompted) / totalTrials) * 100) : 0

    const promptMeta = getPromptLevelMeta(dtt?.promptLevel)
    const interferingTotal = Array.isArray(dtt?.interfering)
        ? dtt!.interfering.reduce((acc, item) => acc + Math.max(0, Math.round(Number(item?.count) || 0)), 0)
        : 0

    let suggestedAchieved: 'sim' | 'parcial' | 'nao' = 'nao'
    if (totalTrials > 0) {
        if (pctIndependent >= 80) suggestedAchieved = 'sim'
        else if (pctIndependent >= 50 || pctSuccessWithPrompt >= 70) suggestedAchieved = 'parcial'
        else suggestedAchieved = 'nao'
    }

    const formattedResult =
        totalTrials > 0
            ? `${independent}/${totalTrials} (${pctIndependent}% indep.${prompted > 0 ? ` · ${prompted} ajuda` : ''}${error > 0 ? ` · ${error} erro` : ''})`
            : ''

    return {
        independent,
        prompted,
        error,
        totalTrials,
        pctIndependent,
        pctSuccessWithPrompt,
        interferingTotal,
        promptMeta,
        suggestedAchieved,
        formattedResult,
    }
}

/**
 * Extrai porcentagem de independência de um item de `registro_desempenho`
 * (suporta coleta DTT estruturada e registros legados de texto livre).
 */
export function extractPerformancePct(item: any): {
    pct: number | null
    trials: number
    helpScore: number
    interferingCount: number
} {
    if (!item || typeof item !== 'object') {
        return { pct: null, trials: 0, helpScore: 1, interferingCount: 0 }
    }

    if (item.dtt && typeof item.dtt === 'object') {
        const metrics = computeDttMetrics(item.dtt)
        if (metrics.totalTrials > 0) {
            return {
                pct: metrics.pctIndependent,
                trials: metrics.totalTrials,
                helpScore: metrics.promptMeta.score,
                interferingCount: metrics.interferingTotal,
            }
        }
    }

    const helpScore = getPromptLevelMeta(item.assistencia).score
    const interferingCount = Array.isArray(item.dtt?.interfering)
        ? item.dtt.interfering.reduce((acc: number, e: any) => acc + Math.max(0, Number(e?.count) || 0), 0)
        : 0

    const rawResult = String(item.resultado || '').trim()
    // 1. Tenta ler percentual explícito (ex: "85%", "80 %")
    const pctMatch = rawResult.match(/(\d{1,3})\s*%/)
    if (pctMatch) {
        const val = Math.min(100, Math.max(0, Number(pctMatch[1])))
        return { pct: val, trials: 0, helpScore, interferingCount }
    }

    // 2. Tenta ler razão (ex: "8/10")
    const ratioMatch = rawResult.match(/(\d+)\s*\/\s*(\d+)/)
    if (ratioMatch) {
        const num = Number(ratioMatch[1])
        const den = Number(ratioMatch[2])
        if (den > 0 && num <= den) {
            return {
                pct: Math.round((num / den) * 100),
                trials: den,
                helpScore,
                interferingCount,
            }
        }
    }

    // 3. Fallback determinístico por status qualitativo `atingida`
    if (item.atingida === 'sim') return { pct: 85, trials: 0, helpScore, interferingCount }
    if (item.atingida === 'parcial') return { pct: 55, trials: 0, helpScore, interferingCount }
    if (item.atingida === 'nao') return { pct: 20, trials: 0, helpScore, interferingCount }

    return { pct: null, trials: 0, helpScore, interferingCount }
}

/**
 * Resume indicadores quantitativos de uma sessão para persistir em `planos_sessao.grafico_indicadores`.
 */
export function buildSessionIndicatorSummary(
    registroDesempenho: any[],
    sessionInterfering?: InterferingBehaviorEntry[]
) {
    const items = Array.isArray(registroDesempenho) ? registroDesempenho : []
    const pcts: number[] = []
    const helpScores: number[] = []
    let totalTrials = 0
    let interferingTotal = Array.isArray(sessionInterfering)
        ? sessionInterfering.reduce((acc, item) => acc + Math.max(0, Math.round(Number(item?.count) || 0)), 0)
        : 0

    const byObjective: Record<string, { pct: number; trials: number; helpScore: number }> = {}

    for (const item of items) {
        const extracted = extractPerformancePct(item)
        totalTrials += extracted.trials
        interferingTotal += extracted.interferingCount
        if (extracted.pct !== null) {
            pcts.push(extracted.pct)
            helpScores.push(extracted.helpScore)
            if (item.code) {
                byObjective[String(item.code)] = {
                    pct: extracted.pct,
                    trials: extracted.trials,
                    helpScore: extracted.helpScore,
                }
            }
        }
    }

    return {
        avgIndependencePct:
            pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
        avgHelpScore:
            helpScores.length > 0
                ? Number((helpScores.reduce((a, b) => a + b, 0) / helpScores.length).toFixed(2))
                : null,
        totalTrials,
        interferingTotal,
        sessionInterfering: Array.isArray(sessionInterfering) ? sessionInterfering : [],
        byObjective,
        updatedAt: new Date().toISOString(),
    }
}

export interface ObjectiveCurvePoint {
    sessionId: string
    dateLabel: string
    isoDate: string
    pctIndependent: number
    helpScore: number
    totalTrials: number
    interferingCount: number
    achieved: 'sim' | 'parcial' | 'nao'
}

export type ObjectiveMasteryStatus = 'dominada' | 'em_aquisicao' | 'atencao' | 'sem_dados'

export interface ObjectiveAnalyticsSummary {
    code: string
    title: string
    latestPct: number
    baselinePct: number
    deltaPct: number
    totalTrials: number
    sessionsCount: number
    consecutiveMasterySessions: number
    status: ObjectiveMasteryStatus
    latestHelpLabel: string
    points: ObjectiveCurvePoint[]
}

export interface HelpAndInterferingPoint {
    sessionId: string
    dateLabel: string
    isoDate: string
    avgIndependencePct: number
    avgHelpScore: number
    interferingTotal: number
    totalTrials: number
}

export interface SessionPlansAnalyticsResult {
    totalSessions: number
    totalTrials: number
    avgIndependencePct: number
    masteredCount: number
    inProgressCount: number
    attentionCount: number
    avgInterferingPerSession: number
    timeline: Array<Record<string, string | number>>
    helpAndInterferingSeries: HelpAndInterferingPoint[]
    objectives: ObjectiveAnalyticsSummary[]
}

function formatShortBrDate(isoOrDate?: string | null): string {
    if (!isoOrDate) return '-'
    const datePart = String(isoOrDate).split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}`
    }
    const parsed = new Date(isoOrDate)
    if (Number.isNaN(parsed.getTime())) return '-'
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/**
 * Calcula curva longitudinal de aprendizagem, redução de suporte e domínio automático de metas (PEI).
 * Regra padrão clínica ABA/PEI: meta dominada ao atingir >= masteryThreshold (80%) em consecutiveTarget (3) sessões consecutivas.
 */
export function computeSessionPlansAnalytics(
    sessoes: any[],
    masteryThreshold = 80,
    consecutiveTarget = 3
): SessionPlansAnalyticsResult {
    const validSessions = (Array.isArray(sessoes) ? sessoes : [])
        .filter((s) => s && typeof s === 'object')
        .sort((a, b) => {
            const da = new Date(a.data_sessao || a.created_at || 0).getTime()
            const db = new Date(b.data_sessao || b.created_at || 0).getTime()
            if (da !== db) return da - db
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        })

    const objectivesMap = new Map<
        string,
        { code: string; title: string; points: ObjectiveCurvePoint[] }
    >()

    const timeline: Array<Record<string, string | number>> = []
    const helpAndInterferingSeries: HelpAndInterferingPoint[] = []

    let grandTotalTrials = 0
    let grandInterfering = 0
    const allSessionAvgPcts: number[] = []

    for (const sessao of validSessions) {
        const isoDate = String(sessao.data_sessao || sessao.created_at || '')
        const dateLabel = formatShortBrDate(isoDate)
        const registros = Array.isArray(sessao.registro_desempenho) ? sessao.registro_desempenho : []

        const timelineRow: Record<string, string | number> = {
            sessionId: String(sessao.id || isoDate),
            dateLabel,
            isoDate,
        }

        const sessionPcts: number[] = []
        const sessionHelps: number[] = []
        let sessionTrials = 0
        let sessionInterfering = Array.isArray(sessao.grafico_indicadores?.sessionInterfering)
            ? sessao.grafico_indicadores.sessionInterfering.reduce(
                  (acc: number, e: any) => acc + Math.max(0, Number(e?.count) || 0),
                  0
              )
            : 0

        for (const reg of registros) {
            const code = String(reg?.code || '').trim()
            if (!code) continue
            const title = String(reg?.title || code).trim()
            const extracted = extractPerformancePct(reg)
            if (extracted.pct === null) continue

            const achieved: 'sim' | 'parcial' | 'nao' =
                reg.atingida === 'sim' || reg.atingida === 'parcial' || reg.atingida === 'nao'
                    ? reg.atingida
                    : extracted.pct >= masteryThreshold
                      ? 'sim'
                      : extracted.pct >= 50
                        ? 'parcial'
                        : 'nao'

            const point: ObjectiveCurvePoint = {
                sessionId: String(sessao.id || ''),
                dateLabel,
                isoDate,
                pctIndependent: extracted.pct,
                helpScore: extracted.helpScore,
                totalTrials: extracted.trials,
                interferingCount: extracted.interferingCount,
                achieved,
            }

            if (!objectivesMap.has(code)) {
                objectivesMap.set(code, { code, title, points: [] })
            }
            objectivesMap.get(code)!.points.push(point)

            timelineRow[code] = extracted.pct
            sessionPcts.push(extracted.pct)
            sessionHelps.push(extracted.helpScore)
            sessionTrials += extracted.trials
            sessionInterfering += extracted.interferingCount
        }

        if (sessionPcts.length > 0) {
            const avgPct = Math.round(sessionPcts.reduce((a, b) => a + b, 0) / sessionPcts.length)
            const avgHelp = Number(
                (sessionHelps.reduce((a, b) => a + b, 0) / sessionHelps.length).toFixed(2)
            )
            timelineRow.__media = avgPct
            timeline.push(timelineRow)
            helpAndInterferingSeries.push({
                sessionId: String(sessao.id || ''),
                dateLabel,
                isoDate,
                avgIndependencePct: avgPct,
                avgHelpScore: avgHelp,
                interferingTotal: sessionInterfering,
                totalTrials: sessionTrials,
            })
            allSessionAvgPcts.push(avgPct)
        }

        grandTotalTrials += sessionTrials
        grandInterfering += sessionInterfering
    }

    const objectives: ObjectiveAnalyticsSummary[] = []
    let masteredCount = 0
    let inProgressCount = 0
    let attentionCount = 0

    for (const entry of objectivesMap.values()) {
        const pts = entry.points
        if (pts.length === 0) continue

        const baselinePct = pts[0].pctIndependent
        const latestPoint = pts[pts.length - 1]
        const latestPct = latestPoint.pctIndependent
        const deltaPct = latestPct - baselinePct
        const totalTrials = pts.reduce((acc, p) => acc + p.totalTrials, 0)

        // Conta sessões consecutivas recentes com >= masteryThreshold
        let consecutiveMasterySessions = 0
        for (let i = pts.length - 1; i >= 0; i--) {
            if (pts[i].pctIndependent >= masteryThreshold) {
                consecutiveMasterySessions++
            } else {
                break
            }
        }

        const previousPct = pts.length >= 2 ? pts[pts.length - 2].pctIndependent : latestPct
        const droppedSignificantly = pts.length >= 2 && previousPct - latestPct >= 15

        let status: ObjectiveMasteryStatus = 'em_aquisicao'
        if (consecutiveMasterySessions >= consecutiveTarget) {
            status = 'dominada'
            masteredCount++
        } else if ((pts.length >= 2 && latestPct < 50) || droppedSignificantly) {
            status = 'atencao'
            attentionCount++
        } else {
            status = 'em_aquisicao'
            inProgressCount++
        }

        const latestHelpMeta =
            PROMPT_LEVEL_OPTIONS.find((opt) => opt.score === latestPoint.helpScore) ||
            PROMPT_LEVEL_OPTIONS[0]

        objectives.push({
            code: entry.code,
            title: entry.title,
            latestPct,
            baselinePct,
            deltaPct,
            totalTrials,
            sessionsCount: pts.length,
            consecutiveMasterySessions,
            status,
            latestHelpLabel: latestHelpMeta.label,
            points: pts,
        })
    }

    // Ordenar: Dominadas primeiro, depois maior progresso
    objectives.sort((a, b) => {
        const order: Record<ObjectiveMasteryStatus, number> = {
            dominada: 0,
            em_aquisicao: 1,
            atencao: 2,
            sem_dados: 3,
        }
        if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
        return b.latestPct - a.latestPct
    })

    const avgIndependencePct =
        allSessionAvgPcts.length > 0
            ? Math.round(allSessionAvgPcts.reduce((a, b) => a + b, 0) / allSessionAvgPcts.length)
            : 0

    const avgInterferingPerSession =
        helpAndInterferingSeries.length > 0
            ? Number((grandInterfering / helpAndInterferingSeries.length).toFixed(1))
            : 0

    return {
        totalSessions: validSessions.length,
        totalTrials: grandTotalTrials,
        avgIndependencePct,
        masteredCount,
        inProgressCount,
        attentionCount,
        avgInterferingPerSession,
        timeline,
        helpAndInterferingSeries,
        objectives,
    }
}

/**
 * Gera sugestões de conquistas em linguagem humana + snapshot de progresso + atividade de casa
 * a partir das sessões recentes — minimizando dados clínicos sensíveis (LGPD).
 */
export function buildFamilyHighlightsFromSessions(
    sessoes: any[],
    specialtyLabel: string
): {
    highlights: string[]
    progressSnapshot: Array<{ label: string; pct: number; status: ObjectiveMasteryStatus }>
    homeActivityTitle: string
    homeActivityInstructions: string
} {
    const analytics = computeSessionPlansAnalytics(sessoes)
    const highlights: string[] = []

    const mastered = analytics.objectives.filter((o) => o.status === 'dominada')
    for (const obj of mastered.slice(0, 2)) {
        highlights.push(
            `Meta conquistada em ${specialtyLabel}: ${obj.title} atingiu ${obj.latestPct}% de autonomia em ${obj.consecutiveMasterySessions} sessões seguidas.`
        )
    }

    const improved = analytics.objectives
        .filter((o) => o.status !== 'dominada' && o.deltaPct > 0)
        .sort((a, b) => b.deltaPct - a.deltaPct)

    for (const obj of improved.slice(0, 3 - highlights.length)) {
        highlights.push(
            `Avanço de +${obj.deltaPct}% em ${obj.title}, alcançando ${obj.latestPct}% de respostas independentes (${obj.latestHelpLabel}).`
        )
    }

    if (highlights.length === 0 && analytics.objectives.length > 0) {
        for (const obj of analytics.objectives.slice(0, 2)) {
            highlights.push(
                `Em evolução em ${obj.title}: ${obj.latestPct}% de autonomia na sessão mais recente (${obj.latestHelpLabel}).`
            )
        }
    }

    if (highlights.length === 0) {
        highlights.push(
            `Acompanhamento de ${specialtyLabel} em andamento com foco no desenvolvimento funcional e autonomia no dia a dia.`
        )
    }

    const progressSnapshot = analytics.objectives.slice(0, 5).map((o) => ({
        label: o.title,
        pct: o.latestPct,
        status: o.status,
    }))

    // Puxa orientação da sessão mais recente
    const sortedDesc = [...(Array.isArray(sessoes) ? sessoes : [])].sort(
        (a, b) =>
            new Date(b.data_sessao || b.created_at || 0).getTime() -
            new Date(a.data_sessao || a.created_at || 0).getTime()
    )
    const latestOrientation = sortedDesc.find((s) => s?.orientacao_familia?.orientacao)?.orientacao_familia

    const homeActivityTitle = latestOrientation?.habilidade_priorizada
        ? `Prática de 5 minutos: ${latestOrientation.habilidade_priorizada}`
        : `Atividade de casa (5 min) — ${specialtyLabel}`

    const homeActivityInstructions = latestOrientation?.orientacao
        ? String(latestOrientation.orientacao)
        : 'Separe 5 minutos em um momento tranquilo do dia para praticar a habilidade trabalhada na sessão, celebrando cada tentativa positiva.'

    return {
        highlights: highlights.slice(0, 3),
        progressSnapshot,
        homeActivityTitle,
        homeActivityInstructions,
    }
}
