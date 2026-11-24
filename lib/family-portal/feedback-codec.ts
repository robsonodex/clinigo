/**
 * Codec retrocompatível para o retorno estruturado do CliniGo Família 2.0:
 * - Preserva 100% de compatibilidade com feedbacks legados em texto simples.
 * - Suporta: contexto semanal da família, termômetro de confiança (1 a 5),
 *   e micro-retorno estruturado da escola/professora (sem chat aberto).
 */

export const WEEKLY_CONTEXT_OPTIONS = [
    'Semana tranquila',
    'Dormiu bem',
    'Sono agitado / cansaço',
    'Mudança de rotina',
    'Ajuste de medicação',
    'Episódio na escola',
] as const

export interface SchoolMicroReturn {
    participation: 'alta' | 'moderada' | 'baixa'
    regulation: 'regulado' | 'oscilante' | 'desregulado'
    observation: string
    respondentName: string
    submittedAt: string
}

export interface FamilyFeedbackV2 {
    note: string
    confidenceScore: number | null // 1 a 5
    weeklyContextTags: string[]
    schoolReturn: SchoolMicroReturn | null
}

const PREFIX = 'CLINIGO_V2::'

export function encodeFamilyFeedbackV2(input: Partial<FamilyFeedbackV2>): string {
    const cleanScore =
        typeof input.confidenceScore === 'number' &&
        input.confidenceScore >= 1 &&
        input.confidenceScore <= 5
            ? Math.round(input.confidenceScore)
            : null

    const cleanTags = Array.isArray(input.weeklyContextTags)
        ? input.weeklyContextTags
              .map((t) => String(t || '').trim())
              .filter(Boolean)
              .slice(0, 6)
        : []

    const payload: FamilyFeedbackV2 = {
        note: String(input.note || '').trim().slice(0, 600),
        confidenceScore: cleanScore,
        weeklyContextTags: cleanTags,
        schoolReturn: input.schoolReturn
            ? {
                  participation: (['alta', 'moderada', 'baixa'].includes(
                      input.schoolReturn.participation
                  )
                      ? input.schoolReturn.participation
                      : 'moderada') as SchoolMicroReturn['participation'],
                  regulation: (['regulado', 'oscilante', 'desregulado'].includes(
                      input.schoolReturn.regulation
                  )
                      ? input.schoolReturn.regulation
                      : 'regulado') as SchoolMicroReturn['regulation'],
                  observation: String(input.schoolReturn.observation || '')
                      .trim()
                      .slice(0, 500),
                  respondentName: String(input.schoolReturn.respondentName || '')
                      .trim()
                      .slice(0, 100),
                  submittedAt: input.schoolReturn.submittedAt || new Date().toISOString(),
              }
            : null,
    }

    return `${PREFIX}${JSON.stringify(payload)}`
}

export function decodeFamilyFeedback(raw?: string | null): FamilyFeedbackV2 {
    if (!raw || typeof raw !== 'string') {
        return {
            note: '',
            confidenceScore: null,
            weeklyContextTags: [],
            schoolReturn: null,
        }
    }

    if (raw.startsWith(PREFIX)) {
        try {
            const parsed = JSON.parse(raw.slice(PREFIX.length))
            return {
                note: typeof parsed?.note === 'string' ? parsed.note : '',
                confidenceScore:
                    typeof parsed?.confidenceScore === 'number' &&
                    parsed.confidenceScore >= 1 &&
                    parsed.confidenceScore <= 5
                        ? Math.round(parsed.confidenceScore)
                        : null,
                weeklyContextTags: Array.isArray(parsed?.weeklyContextTags)
                    ? parsed.weeklyContextTags.map(String).filter(Boolean)
                    : [],
                schoolReturn:
                    parsed?.schoolReturn && typeof parsed.schoolReturn === 'object'
                        ? {
                              participation: parsed.schoolReturn.participation || 'moderada',
                              regulation: parsed.schoolReturn.regulation || 'regulado',
                              observation: String(parsed.schoolReturn.observation || ''),
                              respondentName: String(parsed.schoolReturn.respondentName || ''),
                              submittedAt: String(parsed.schoolReturn.submittedAt || ''),
                          }
                        : null,
            }
        } catch {
            // fallback para texto bruto se corrompido
        }
    }

    return {
        note: raw.trim(),
        confidenceScore: null,
        weeklyContextTags: [],
        schoolReturn: null,
    }
}

