/**
 * Motor de Supervisão Clínica ABA/PEI 2.0:
 * - Semáforo de Estagnação e Regressão
 * - Metas Prontas para Promoção (Domínio >= 80% x 3 sessões)
 * - Detector de Descalibração entre Aplicadores (>= 25 p.p. de divergência)
 * - Comparativo de Níveis de Suporte (Prompt Fading) e Período (30/60/90 dias)
 * - Síntese Técnica Assistida para Revisão do Supervisor (nunca substitui decisão clínica)
 */

import {
    computeSessionPlansAnalytics,
    extractPerformancePct,
    getPromptLevelMeta,
} from './learning-curve'

export interface RawClinicSessionPlan {
    id: string
    paciente_id: string
    patient_name?: string | null
    profissional_id?: string | null
    professional_name?: string | null
    especialidade: string
    data_sessao: string
    registro_desempenho?: any[]
    grafico_indicadores?: any
    status?: string | null
}

export interface PromotionCandidate {
    patientId: string
    patientName: string
    especialidade: string
    code: string
    title: string
    latestPct: number
    consecutiveMasterySessions: number
    latestSupportLabel: string
    lastSessionDate: string
}

export interface StagnationAlert {
    patientId: string
    patientName: string
    especialidade: string
    code: string
    title: string
    reason: 'stagnant' | 'regression' | 'high_prompt_dependency'
    reasonLabel: string
    latestPct: number
    deltaPct: number
    sessionsAnalyzed: number
    latestSupportLabel: string
    lastSessionDate: string
}

export interface ApplicatorCalibrationGap {
    patientId: string
    patientName: string
    especialidade: string
    code: string
    title: string
    highApplicatorName: string
    highAvgPct: number
    lowApplicatorName: string
    lowAvgPct: number
    gapPct: number
    sessionsCount: number
}

export interface SupervisionPeriodComparison {
    recentDays: number
    recentAvgIndependencePct: number
    previousAvgIndependencePct: number | null
    deltaIndependencePct: number | null
    recentAvgHelpScore: number
    previousAvgHelpScore: number | null
    promptFadingImproved: boolean
    sessionsRecent: number
    sessionsPrevious: number
}

export interface SupervisionRadarReport {
    totalSessionsAnalyzed: number
    totalPatientsAnalyzed: number
    promotionsReady: PromotionCandidate[]
    stagnationAlerts: StagnationAlert[]
    calibrationGaps: ApplicatorCalibrationGap[]
    periodComparison: SupervisionPeriodComparison
    clinicalDraftSummary: string
}

function getHelpLabelFromScore(score: number): string {
    if (score <= 1.5) return 'Independente'
    if (score <= 2.5) return 'Dica Gestual'
    if (score <= 3.5) return 'Dica Verbal'
    if (score <= 4.5) return 'Modelação'
    if (score <= 5.5) return 'Física Parcial'
    return 'Física Total'
}

export function computeSupervisionRadar(
    sessions: RawClinicSessionPlan[],
    windowDays = 60,
    nowMs = Date.now()
): SupervisionRadarReport {
    const safeSessions = Array.isArray(sessions) ? sessions : []
    const byPatientSpecialty = new Map<string, RawClinicSessionPlan[]>()

    for (const s of safeSessions) {
        if (!s?.paciente_id) continue
        const key = `${s.paciente_id}::${s.especialidade || 'geral'}`
        if (!byPatientSpecialty.has(key)) byPatientSpecialty.set(key, [])
        byPatientSpecialty.get(key)!.push(s)
    }

    const promotionsReady: PromotionCandidate[] = []
    const stagnationAlerts: StagnationAlert[] = []
    const calibrationGaps: ApplicatorCalibrationGap[] = []

    const uniquePatients = new Set<string>()

    for (const group of byPatientSpecialty.values()) {
        const first = group[0]
        uniquePatients.add(first.paciente_id)
        const patientName = first.patient_name || 'Paciente'
        const especialidade = first.especialidade || 'intervencao_precoce_aba'

        const analytics = computeSessionPlansAnalytics(group)

        for (const obj of analytics.objectives) {
            if (obj.points.length === 0) continue
            const lastPt = obj.points[obj.points.length - 1]
            const latestSupportLabel = getHelpLabelFromScore(lastPt.helpScore)

            // 1. Prontos para promoção (domínio >= 80% x 3 sessões consecutivas)
            if (obj.status === 'dominada') {
                promotionsReady.push({
                    patientId: first.paciente_id,
                    patientName,
                    especialidade,
                    code: obj.code,
                    title: obj.title,
                    latestPct: obj.latestPct,
                    consecutiveMasterySessions: obj.consecutiveMasterySessions,
                    latestSupportLabel,
                    lastSessionDate: lastPt.isoDate,
                })
                continue
            }

            // 2. Estagnação / Regressão / Alta dependência de dica
            if (obj.points.length >= 3) {
                const lastThree = obj.points.slice(-3)
                const min3 = Math.min(...lastThree.map((p) => p.pctIndependent))
                const max3 = Math.max(...lastThree.map((p) => p.pctIndependent))
                const delta = lastThree[2].pctIndependent - lastThree[0].pctIndependent
                const avgHelpLast3 =
                    lastThree.reduce((acc, p) => acc + p.helpScore, 0) / lastThree.length

                if (delta <= -15) {
                    stagnationAlerts.push({
                        patientId: first.paciente_id,
                        patientName,
                        especialidade,
                        code: obj.code,
                        title: obj.title,
                        reason: 'regression',
                        reasonLabel: `Queda de ${Math.abs(delta)} p.p. nas últimas 3 sessões`,
                        latestPct: obj.latestPct,
                        deltaPct: delta,
                        sessionsAnalyzed: obj.points.length,
                        latestSupportLabel,
                        lastSessionDate: lastPt.isoDate,
                    })
                } else if (avgHelpLast3 >= 4.7 && obj.latestPct < 75) {
                    stagnationAlerts.push({
                        patientId: first.paciente_id,
                        patientName,
                        especialidade,
                        code: obj.code,
                        title: obj.title,
                        reason: 'high_prompt_dependency',
                        reasonLabel: 'Dependência persistente de ajuda física/modelação',
                        latestPct: obj.latestPct,
                        deltaPct: delta,
                        sessionsAnalyzed: obj.points.length,
                        latestSupportLabel,
                        lastSessionDate: lastPt.isoDate,
                    })
                } else if (max3 - min3 <= 5 && obj.latestPct < 75) {
                    stagnationAlerts.push({
                        patientId: first.paciente_id,
                        patientName,
                        especialidade,
                        code: obj.code,
                        title: obj.title,
                        reason: 'stagnant',
                        reasonLabel: 'Sem ganho mensurável nas últimas 3 sessões (platô)',
                        latestPct: obj.latestPct,
                        deltaPct: delta,
                        sessionsAnalyzed: obj.points.length,
                        latestSupportLabel,
                        lastSessionDate: lastPt.isoDate,
                    })
                }
            }
        }

        // 3. Detector de Descalibração entre Aplicadores (mesmo paciente + mesmo objetivo)
        const objByApplicator = new Map<
            string,
            {
                title: string
                applicators: Map<string, { name: string; pcts: number[] }>
            }
        >()

        for (const s of group) {
            const profId = s.profissional_id || s.professional_name || ''
            if (!profId) continue
            const profName = s.professional_name || 'Profissional'
            const rows = Array.isArray(s.registro_desempenho) ? s.registro_desempenho : []

            for (const row of rows) {
                const code = String(row?.code || '').trim()
                if (!code) continue
                const extracted = extractPerformancePct(row)
                if (extracted.pct === null) continue

                if (!objByApplicator.has(code)) {
                    objByApplicator.set(code, {
                        title: String(row.title || code),
                        applicators: new Map(),
                    })
                }
                const entry = objByApplicator.get(code)!
                if (!entry.applicators.has(profId)) {
                    entry.applicators.set(profId, { name: profName, pcts: [] })
                }
                entry.applicators.get(profId)!.pcts.push(extracted.pct)
            }
        }

        for (const [code, data] of objByApplicator.entries()) {
            if (data.applicators.size < 2) continue
            const summaries = Array.from(data.applicators.values()).map((a) => ({
                name: a.name,
                avg: Math.round(a.pcts.reduce((acc, v) => acc + v, 0) / a.pcts.length),
                count: a.pcts.length,
            }))
            summaries.sort((a, b) => b.avg - a.avg)
            const highest = summaries[0]
            const lowest = summaries[summaries.length - 1]
            const gap = highest.avg - lowest.avg

            if (gap >= 25) {
                calibrationGaps.push({
                    patientId: first.paciente_id,
                    patientName,
                    especialidade,
                    code,
                    title: data.title,
                    highApplicatorName: highest.name,
                    highAvgPct: highest.avg,
                    lowApplicatorName: lowest.name,
                    lowAvgPct: lowest.avg,
                    gapPct: gap,
                    sessionsCount: summaries.reduce((acc, s) => acc + s.count, 0),
                })
            }
        }
    }

    // 4. Comparativo de Período (Últimos N dias vs N dias anteriores) + Prompt Fading
    const halfWindowMs = Math.max(15, Math.round(windowDays / 2)) * 24 * 60 * 60 * 1000
    const recentCutoff = nowMs - halfWindowMs
    const prevCutoff = nowMs - halfWindowMs * 2

    const recentPcts: number[] = []
    const prevPcts: number[] = []
    const recentHelp: number[] = []
    const prevHelp: number[] = []
    let sessionsRecent = 0
    let sessionsPrevious = 0

    for (const s of safeSessions) {
        const dtMs = new Date(`${String(s.data_sessao || '').slice(0, 10)}T12:00:00Z`).getTime()
        if (Number.isNaN(dtMs)) continue

        const rows = Array.isArray(s.registro_desempenho) ? s.registro_desempenho : []
        const isRecent = dtMs >= recentCutoff
        const isPrev = !isRecent && dtMs >= prevCutoff
        if (!isRecent && !isPrev) continue

        if (isRecent) sessionsRecent += 1
        else sessionsPrevious += 1

        for (const row of rows) {
            const perf = extractPerformancePct(row)
            if (perf.pct !== null) {
                if (isRecent) recentPcts.push(perf.pct)
                else prevPcts.push(perf.pct)
            }
            const helpScore = perf.helpScore || getPromptLevelMeta(row?.assistencia).score
            if (isRecent) recentHelp.push(helpScore)
            else prevHelp.push(helpScore)
        }
    }

    const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    const avgDec = (arr: number[]) =>
        arr.length > 0
            ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
            : 0

    const recentAvgInd = avg(recentPcts)
    const prevAvgInd = prevPcts.length > 0 ? avg(prevPcts) : null
    const recentAvgHelp = avgDec(recentHelp)
    const prevAvgHelp = prevHelp.length > 0 ? avgDec(prevHelp) : null

    const periodComparison: SupervisionPeriodComparison = {
        recentDays: Math.max(15, Math.round(windowDays / 2)),
        recentAvgIndependencePct: recentAvgInd,
        previousAvgIndependencePct: prevAvgInd,
        deltaIndependencePct: prevAvgInd !== null ? recentAvgInd - prevAvgInd : null,
        recentAvgHelpScore: recentAvgHelp,
        previousAvgHelpScore: prevAvgHelp,
        promptFadingImproved: prevAvgHelp !== null && recentAvgHelp < prevAvgHelp,
        sessionsRecent,
        sessionsPrevious,
    }

    promotionsReady.sort((a, b) => b.latestPct - a.latestPct)
    stagnationAlerts.sort((a, b) => a.deltaPct - b.deltaPct)
    calibrationGaps.sort((a, b) => b.gapPct - a.gapPct)

    // 5. Rascunho Técnico Assistido (baseado apenas nos indicadores reais, para revisão do supervisor)
    const draftParts: string[] = [
        `Síntese técnica do período (${safeSessions.length} sessões em ${uniquePatients.size} paciente(s)): independência média recente de ${recentAvgInd}%` +
            (periodComparison.deltaIndependencePct !== null
                ? ` (${periodComparison.deltaIndependencePct >= 0 ? '+' : ''}${periodComparison.deltaIndependencePct} p.p. frente ao período anterior).`
                : '.'),
    ]
    if (promotionsReady.length > 0) {
        draftParts.push(
            `${promotionsReady.length} meta(s) atingiram critério de domínio (>=80% em 3 sessões consecutivas) e estão sugeridas para revisão de promoção para manutenção ou generalização.`
        )
    }
    if (stagnationAlerts.length > 0) {
        draftParts.push(
            `${stagnationAlerts.length} meta(s) apresentaram platô, regressão ou dependência persistente de suporte — sugere-se revisar fracionamento de tarefa, reforçadores ou hierarquia de dicas.`
        )
    }
    if (calibrationGaps.length > 0) {
        draftParts.push(
            `${calibrationGaps.length} divergência(s) acima de 25 p.p. entre aplicadores no mesmo objetivo — recomenda-se sessão breve de calibração de procedimento e critério de registro.`
        )
    }
    draftParts.push(
        'Nota: síntese automatizada de apoio; toda alteração de programa e conduta permanece sob decisão exclusiva do profissional supervisor.'
    )

    return {
        totalSessionsAnalyzed: safeSessions.length,
        totalPatientsAnalyzed: uniquePatients.size,
        promotionsReady: promotionsReady.slice(0, 20),
        stagnationAlerts: stagnationAlerts.slice(0, 20),
        calibrationGaps: calibrationGaps.slice(0, 15),
        periodComparison,
        clinicalDraftSummary: draftParts.join(' '),
    }
}
