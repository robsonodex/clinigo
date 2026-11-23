export type ClinicalSessionSpecialtyKey =
    | 'intervencao_precoce_aba'
    | 'psicologia'
    | 'fonoaudiologia'
    | 'terapia_ocupacional'
    | 'fisioterapia'
    | 'psicomotricidade'

export type ReceptionFlowMode = 'full_4_steps' | 'fast_2_steps'

export interface ClinicClinicalModules {
    sessionPlansEnabled: boolean
    sessionPlanSpecialties: ClinicalSessionSpecialtyKey[]
    evolutionManualEnabled: boolean
    structuredEvolutionDefault: boolean
    contractsEnabled: boolean
    teleconsultaEnabled: boolean
    staffSignatureGateEnabled: boolean
    receptionFlowMode: ReceptionFlowMode
}

export interface ClinicalSpecialtyOption {
    key: ClinicalSessionSpecialtyKey
    label: string
    summary: string
}

export const ALL_CLINICAL_SESSION_SPECIALTIES: readonly ClinicalSessionSpecialtyKey[] = [
    'intervencao_precoce_aba',
    'psicologia',
    'fonoaudiologia',
    'terapia_ocupacional',
    'fisioterapia',
    'psicomotricidade',
] as const

export const CLINICAL_SPECIALTY_OPTIONS: readonly ClinicalSpecialtyOption[] = [
    {
        key: 'intervencao_precoce_aba',
        label: 'Intervenção Precoce (ABA)',
        summary: '106 objetivos · DTT, NET, pareamento, comunicação funcional e análise comportamental',
    },
    {
        key: 'psicologia',
        label: 'Psicologia',
        summary: '92 objetivos · regulação emocional, habilidades sociais e manejo comportamental',
    },
    {
        key: 'fonoaudiologia',
        label: 'Fonoaudiologia',
        summary: '99 objetivos · linguagem receptiva/expressiva, pragmática, fala, MO e CAA',
    },
    {
        key: 'terapia_ocupacional',
        label: 'Terapia Ocupacional',
        summary: '104 objetivos · integração sensorial, AVDs, coordenação motora e rotina',
    },
    {
        key: 'fisioterapia',
        label: 'Fisioterapia',
        summary: '14 categorias motoras · mobilidade, postura, equilíbrio, marcha e gráficos',
    },
    {
        key: 'psicomotricidade',
        label: 'Psicomotricidade',
        summary: 'Ficha Capa, biblioteca com 55 objetivos e gráfico de evolução por sessão',
    },
] as const

export const DEFAULT_CLINIC_CLINICAL_MODULES: ClinicClinicalModules = {
    sessionPlansEnabled: true,
    sessionPlanSpecialties: [...ALL_CLINICAL_SESSION_SPECIALTIES],
    evolutionManualEnabled: true,
    structuredEvolutionDefault: false,
    contractsEnabled: true,
    teleconsultaEnabled: true,
    staffSignatureGateEnabled: false,
    receptionFlowMode: 'full_4_steps',
}

// IDs internos mantidos apenas para preservar comportamento legado de clínicas já em operação
// caso ainda não tenham salvo uma preferência explícita em theme.clinical_modules.
const LEGACY_STRUCTURED_EVOLUTION_CLINIC_IDS = new Set([
    '4c13e586-5390-4393-a180-2c9dd7ed81c7',
    '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30',
])

const LEGACY_FAST_RECEPTION_AND_STAFF_GATE_CLINIC_IDS = new Set([
    '5163c916-8b82-4d80-8a71-01726836ee46',
])

export function getDefaultClinicalModulesForClinic(clinicId?: string | null): ClinicClinicalModules {
    const base: ClinicClinicalModules = {
        ...DEFAULT_CLINIC_CLINICAL_MODULES,
        sessionPlanSpecialties: [...ALL_CLINICAL_SESSION_SPECIALTIES],
    }

    if (clinicId && LEGACY_STRUCTURED_EVOLUTION_CLINIC_IDS.has(clinicId)) {
        base.structuredEvolutionDefault = true
    }

    if (clinicId && LEGACY_FAST_RECEPTION_AND_STAFF_GATE_CLINIC_IDS.has(clinicId)) {
        base.staffSignatureGateEnabled = true
        base.receptionFlowMode = 'fast_2_steps'
    }

    return base
}

export function normalizeClinicClinicalModules(
    raw: unknown,
    clinicId?: string | null
): ClinicClinicalModules {
    const defaults = getDefaultClinicalModulesForClinic(clinicId)
    if (!raw || typeof raw !== 'object') {
        return defaults
    }

    const input = raw as Record<string, unknown>

    const sessionPlanSpecialties = Array.isArray(input.sessionPlanSpecialties)
        ? Array.from(
            new Set(
                input.sessionPlanSpecialties.filter((s): s is ClinicalSessionSpecialtyKey =>
                    typeof s === 'string' &&
                    (ALL_CLINICAL_SESSION_SPECIALTIES as readonly string[]).includes(s)
                )
            )
        )
        : defaults.sessionPlanSpecialties

    const receptionFlowMode: ReceptionFlowMode =
        input.receptionFlowMode === 'fast_2_steps' || input.receptionFlowMode === 'full_4_steps'
            ? input.receptionFlowMode
            : defaults.receptionFlowMode

    return {
        sessionPlansEnabled:
            typeof input.sessionPlansEnabled === 'boolean'
                ? input.sessionPlansEnabled
                : defaults.sessionPlansEnabled,
        sessionPlanSpecialties,
        evolutionManualEnabled:
            typeof input.evolutionManualEnabled === 'boolean'
                ? input.evolutionManualEnabled
                : defaults.evolutionManualEnabled,
        structuredEvolutionDefault:
            typeof input.structuredEvolutionDefault === 'boolean'
                ? input.structuredEvolutionDefault
                : defaults.structuredEvolutionDefault,
        contractsEnabled:
            typeof input.contractsEnabled === 'boolean'
                ? input.contractsEnabled
                : defaults.contractsEnabled,
        teleconsultaEnabled:
            typeof input.teleconsultaEnabled === 'boolean'
                ? input.teleconsultaEnabled
                : defaults.teleconsultaEnabled,
        staffSignatureGateEnabled:
            typeof input.staffSignatureGateEnabled === 'boolean'
                ? input.staffSignatureGateEnabled
                : defaults.staffSignatureGateEnabled,
        receptionFlowMode,
    }
}

export function extractClinicalModulesFromTheme(
    theme: Record<string, unknown> | null | undefined,
    clinicId?: string | null
): ClinicClinicalModules {
    const raw = theme && typeof theme === 'object' ? theme.clinical_modules : undefined
    return normalizeClinicClinicalModules(raw, clinicId)
}
