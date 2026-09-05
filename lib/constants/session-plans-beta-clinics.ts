/**
 * ALLOWLIST FIXA (CAMADA A - AUTORIDADE MÁXIMA)
 * Central de Planos de Sessão (Fisioterapia, Fonoaudiologia, Intervenção Precoce/ABA, Psicologia, Terapia Ocupacional, Psicopedagogia)
 * e Manual de Evolução Terapêutica.
 *
 * REQUISITO INVIOLÁVEL: Nenhuma clínica fora desta lista pode acessar, visualizar ou habilitar estes módulos,
 * mesmo que possua permissões no banco ou tente acesso direto via URL.
 */

export const SESSION_PLANS_BETA_CLINIC_IDS: readonly string[] = Object.freeze([
    // 1. World Sensory (clínica cliente real)
    '4c13e586-5390-4393-a180-2c9dd7ed81c7',
    // 2. Clínica Demo Teste (conta de testes interna do dono do sistema)
    '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30',
])

/**
 * Especialidades suportadas na Central de Planos de Sessão
 */
export const SESSION_PLAN_SPECIALTIES = {
    PSICOMOTRICIDADE: 'psicomotricidade',
    FISIOTERAPIA: 'fisioterapia',
    FONOAUDIOLOGIA: 'fonoaudiologia',
    INTERVENCAO_PRECOCE_ABA: 'intervencao_precoce_aba',
    PSICOLOGIA: 'psicologia',
    TERAPIA_OCUPACIONAL: 'terapia_ocupacional',
    PSICOPEDAGOGIA: 'psicopedagogia',
} as const

export type SessionPlanSpecialty =
    (typeof SESSION_PLAN_SPECIALTIES)[keyof typeof SESSION_PLAN_SPECIALTIES]

export interface SessionPlanSpecialtyMeta {
    id: SessionPlanSpecialty
    label: string
    shortLabel: string
    icon: string // Lucide icon name
    color: string // Tailwind color class
    description: string
}

export const SESSION_PLAN_SPECIALTIES_META: Record<
    SessionPlanSpecialty,
    SessionPlanSpecialtyMeta
> = {
    [SESSION_PLAN_SPECIALTIES.PSICOMOTRICIDADE]: {
        id: 'psicomotricidade',
        label: 'Psicomotricidade',
        shortLabel: 'Psicomotricidade',
        icon: 'Brain',
        color: 'text-purple-600',
        description: 'Ficha Capa, Biblioteca dos 55 Objetivos e Planos de Sessão',
    },
    [SESSION_PLAN_SPECIALTIES.FISIOTERAPIA]: {
        id: 'fisioterapia',
        label: 'Fisioterapia',
        shortLabel: 'Fisio',
        icon: 'Activity',
        color: 'text-emerald-600',
        description: 'Ficha de Acompanhamento, 14 Categorias Motoras (MOB, POS, EQU, MAR...) e Gráficos',
    },
    [SESSION_PLAN_SPECIALTIES.FONOAUDIOLOGIA]: {
        id: 'fonoaudiologia',
        label: 'Fonoaudiologia',
        shortLabel: 'Fono',
        icon: 'Mic',
        color: 'text-blue-600',
        description: 'Linguagem Receptiva/Expressiva, Pragmática, Fala, MO e CAA',
    },
    [SESSION_PLAN_SPECIALTIES.INTERVENCAO_PRECOCE_ABA]: {
        id: 'intervencao_precoce_aba',
        label: 'Intervenção Precoce (ABA)',
        shortLabel: 'ABA',
        icon: 'Shapes',
        color: 'text-amber-600',
        description: 'DTT, NET, Pareamento, Comunicação Funcional e Comportamentos Interferentes',
    },
    [SESSION_PLAN_SPECIALTIES.PSICOLOGIA]: {
        id: 'psicologia',
        label: 'Psicologia',
        shortLabel: 'Psicologia',
        icon: 'HeartHandshake',
        color: 'text-rose-600',
        description: 'Regulação Emocional, Habilidades Sociais, Tolerância à Frustração e Análise Funcional',
    },
    [SESSION_PLAN_SPECIALTIES.TERAPIA_OCUPACIONAL]: {
        id: 'terapia_ocupacional',
        label: 'Terapia Ocupacional',
        shortLabel: 'T.O.',
        icon: 'Sparkles',
        color: 'text-teal-600',
        description: 'Processamento Sensorial, AVDs, AIVDs, Coordenação Motora Fina e Rotinas',
    },
    [SESSION_PLAN_SPECIALTIES.PSICOPEDAGOGIA]: {
        id: 'psicopedagogia',
        label: 'Psicopedagogia',
        shortLabel: 'Psicopedagogia',
        icon: 'GraduationCap',
        color: 'text-indigo-600',
        description: 'Habilidades Pré-Acadêmicas, Consciência Fonológica, Alfabetização e Matemática',
    },
}

/**
 * Validação de Camada A: Verifica se a clínica pertence estritamente à Allowlist
 */
export function isClinicInSessionPlansAllowlist(
    clinicId: string | null | undefined
): boolean {
    if (!clinicId) return false
    return SESSION_PLANS_BETA_CLINIC_IDS.includes(clinicId)
}
