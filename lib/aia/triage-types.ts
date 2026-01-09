/**
 * AiA Medical Triage Types
 * CliniGo - Sistema de Triagem Médica
 */

// ============================================================================
// TRIAGE LEVELS (Based on SUS Protocol)
// ============================================================================

export type TriageLevel = 'VERMELHO' | 'LARANJA' | 'AMARELO' | 'VERDE'

export const TRIAGE_LEVEL_CONFIG: Record<TriageLevel, {
    name: string
    description: string
    timeframe: string
    color: string
    emoji: string
    priority: number
}> = {
    VERMELHO: {
        name: 'Emergência',
        description: 'Risco de vida imediato - SAMU 192',
        timeframe: 'IMEDIATO',
        color: '#EF4444',
        emoji: '🚨',
        priority: 1,
    },
    LARANJA: {
        name: 'Urgente',
        description: 'Procure pronto-socorro em até 2 horas',
        timeframe: '2 horas',
        color: '#F97316',
        emoji: '⚠️',
        priority: 2,
    },
    AMARELO: {
        name: 'Agendar em 24h',
        description: 'Necessita atendimento nas próximas 24 horas',
        timeframe: '24 horas',
        color: '#EAB308',
        emoji: '🟡',
        priority: 3,
    },
    VERDE: {
        name: 'Rotina',
        description: 'Agendamento de rotina',
        timeframe: '7 dias',
        color: '#22C55E',
        emoji: '🟢',
        priority: 4,
    },
}

// ============================================================================
// PATIENT DEMOGRAPHICS
// ============================================================================

export interface PatientDemographics {
    age: number
    gender: 'masculino' | 'feminino'
    location: string
    is_pregnant?: boolean
}

export function validateDemographics(data: Partial<PatientDemographics>): {
    valid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (!data.age || data.age < 0 || data.age > 120) {
        errors.push('Idade deve ser entre 0 e 120 anos')
    }

    if (!data.gender || !['masculino', 'feminino'].includes(data.gender)) {
        errors.push('Sexo biológico deve ser masculino ou feminino')
    }

    if (!data.location || data.location.trim().length < 2) {
        errors.push('Localização é obrigatória')
    }

    return { valid: errors.length === 0, errors }
}

// ============================================================================
// TRIAGE SESSION
// ============================================================================

export type SessionStatus = 'active' | 'collecting_demographics' | 'collecting_symptoms' | 'completed' | 'emergency'

export interface TriageSession {
    id: string
    clinic_id: string | null
    patient_id: string | null
    session_status: SessionStatus
    demographics: PatientDemographics | null
    triage_level: TriageLevel | null
    recommended_specialty: string | null
    model_used: string | null
    tokens_used: number
    created_at: string
    completed_at: string | null
}

export interface TriageMessage {
    id: string
    session_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    message_type?: 'greeting' | 'demographic' | 'symptom' | 'question' | 'recommendation' | 'emergency'
    metadata?: Record<string, unknown>
    created_at: string
}

// ============================================================================
// TRIAGE RESULT (Final Response)
// ============================================================================

export interface PossibleCondition {
    condition: string
    probability: 'alta' | 'media' | 'baixa'
    confidence?: number
}

export interface TriageRecommendation {
    specialty: string
    timeframe: string
    facility_type?: string
    tests_suggested?: string[]
    immediate_care: string[]
    avoid: string[]
}

export interface PlanRestriction {
    is_blocked: boolean
    upgrade_banner_text: string | null
    cta_link: string | null
}

export interface TriageResult {
    status: 'success' | 'error' | 'incomplete'
    session_id: string

    triage: {
        level: TriageLevel
        level_name: string
        level_description: string
        immediate_action: string
        emergency_number: string | null
    }

    medical_data: {
        possiveis_condicoes: PossibleCondition[] | null
        exames_sugeridos: string[] | null
        especialidade: string
        red_flags_present?: string[]
        red_flags_absent?: string[]
    }

    recommendations: TriageRecommendation

    plan_restriction: PlanRestriction

    disclaimers: string[]

    next_steps: {
        agendar_consulta: boolean
        especialidade: string
        tempo_maximo: string
    }
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface TriageRequest {
    session_id?: string
    message: string
    demographics?: Partial<PatientDemographics>
    clinic_id?: string
    patient_id?: string
}

export interface TriageResponse {
    session_id: string
    message: string
    message_type: TriageMessage['message_type']
    session_status: SessionStatus
    requires_demographics: boolean
    triage_result?: TriageResult
    is_emergency: boolean
}

// ============================================================================
// EMERGENCY RULES (Hardcoded for Safety)
// ============================================================================

export interface EmergencyRule {
    id: string
    name: string
    keywords: string[]
    combinations?: string[][]
    action: string
    phone: string
}

export const EMERGENCY_RULES: EmergencyRule[] = [
    {
        id: 'chest_pain_cardiac',
        name: 'Suspeita de Infarto',
        keywords: ['dor no peito', 'dor torácica', 'aperto no peito'],
        combinations: [
            ['dor', 'peito', 'braço'],
            ['dor', 'peito', 'falta de ar'],
            ['dor', 'peito', 'sudorese'],
            ['dor', 'peito', 'náusea'],
        ],
        action: 'LIGAR 192 IMEDIATAMENTE. Não dirija ao hospital.',
        phone: '192',
    },
    {
        id: 'stroke',
        name: 'Suspeita de AVC',
        keywords: ['avc', 'derrame'],
        combinations: [
            ['face', 'torta', 'fraqueza'],
            ['fala', 'arrastada', 'fraqueza'],
            ['braço', 'fraco', 'súbito'],
        ],
        action: 'LIGAR 192 IMEDIATAMENTE. Anote o horário que começou.',
        phone: '192',
    },
    {
        id: 'respiratory_distress',
        name: 'Insuficiência Respiratória',
        keywords: ['não consigo respirar', 'sufocando', 'asfixia'],
        combinations: [
            ['falta', 'ar', 'grave'],
            ['respirar', 'difícil', 'muito'],
        ],
        action: 'LIGAR 192 IMEDIATAMENTE.',
        phone: '192',
    },
    {
        id: 'convulsion',
        name: 'Convulsão Ativa',
        keywords: ['convulsão', 'convulsionando', 'ataque epiléptico'],
        action: 'LIGAR 192. Proteja a cabeça, não coloque nada na boca.',
        phone: '192',
    },
    {
        id: 'bleeding',
        name: 'Hemorragia Grave',
        keywords: ['sangramento', 'hemorragia'],
        combinations: [
            ['sangue', 'muito', 'para'],
            ['sangramento', 'abundante'],
        ],
        action: 'LIGAR 192. Pressione o local com pano limpo.',
        phone: '192',
    },
    {
        id: 'overdose',
        name: 'Intoxicação/Overdose',
        keywords: ['overdose', 'intoxicação', 'envenenamento'],
        action: 'LIGAR 192 ou CEATOX 0800-722-6001.',
        phone: '192',
    },
]

// ============================================================================
// SPECIALTY MAPPING
// ============================================================================

export const SYMPTOM_SPECIALTY_MAP: Record<string, string[]> = {
    // Neurologia
    'dor de cabeça': ['Neurologista', 'Clínico Geral'],
    'enxaqueca': ['Neurologista'],
    'tontura': ['Neurologista', 'Otorrinolaringologista'],
    'formigamento': ['Neurologista'],

    // Cardiologia
    'dor no peito': ['Cardiologista', 'Pronto-Socorro'],
    'palpitação': ['Cardiologista'],
    'pressão alta': ['Cardiologista', 'Clínico Geral'],

    // Gastroenterologia
    'dor abdominal': ['Gastroenterologista', 'Cirurgião'],
    'dor de barriga': ['Gastroenterologista', 'Clínico Geral'],
    'azia': ['Gastroenterologista'],
    'refluxo': ['Gastroenterologista'],
    'diarreia': ['Gastroenterologista', 'Clínico Geral'],
    'constipação': ['Gastroenterologista', 'Proctologista'],

    // Pneumologia
    'tosse': ['Pneumologista', 'Clínico Geral'],
    'falta de ar': ['Pneumologista', 'Cardiologista'],
    'chiado no peito': ['Pneumologista'],

    // Dermatologia
    'mancha na pele': ['Dermatologista'],
    'coceira': ['Dermatologista', 'Alergista'],
    'alergia': ['Alergista', 'Dermatologista'],

    // Ortopedia
    'dor nas costas': ['Ortopedista', 'Reumatologista'],
    'dor no joelho': ['Ortopedista'],
    'dor no ombro': ['Ortopedista'],
    'dor muscular': ['Ortopedista', 'Reumatologista'],

    // Urologia/Ginecologia
    'dor ao urinar': ['Urologista', 'Ginecologista'],
    'infecção urinária': ['Urologista', 'Ginecologista'],
    'sangue na urina': ['Urologista', 'Nefrologista'],

    // Oftalmologia
    'dor no olho': ['Oftalmologista'],
    'visão turva': ['Oftalmologista', 'Neurologista'],
    'olho vermelho': ['Oftalmologista'],

    // Otorrino
    'dor de ouvido': ['Otorrinolaringologista'],
    'dor de garganta': ['Otorrinolaringologista', 'Clínico Geral'],
    'nariz entupido': ['Otorrinolaringologista'],

    // Psiquiatria
    'ansiedade': ['Psiquiatra', 'Psicólogo'],
    'depressão': ['Psiquiatra', 'Psicólogo'],
    'insônia': ['Psiquiatra', 'Neurologista'],

    // Pediatria (menores de 18)
    'febre criança': ['Pediatra'],

    // Obstetrícia (gestantes)
    'grávida': ['Obstetra'],
    'gestante': ['Obstetra'],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSpecialtyForSymptoms(symptoms: string[], age: number, isPregnant: boolean): string[] {
    const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim())
    const specialties = new Set<string>()

    // Special cases
    if (age < 18) {
        specialties.add('Pediatra')
    }

    if (isPregnant) {
        specialties.add('Obstetra')
    }

    // Map symptoms to specialties
    for (const symptom of normalizedSymptoms) {
        for (const [key, specs] of Object.entries(SYMPTOM_SPECIALTY_MAP)) {
            if (symptom.includes(key) || key.includes(symptom)) {
                specs.forEach(s => specialties.add(s))
            }
        }
    }

    // Default to general practitioner if no match
    if (specialties.size === 0) {
        specialties.add('Clínico Geral')
    }

    return Array.from(specialties)
}

export function checkEmergencyKeywords(text: string): EmergencyRule | null {
    const normalizedText = text.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics

    for (const rule of EMERGENCY_RULES) {
        // Check direct keywords
        if (rule.keywords.some(kw => normalizedText.includes(kw.toLowerCase()))) {
            return rule
        }

        // Check combinations
        if (rule.combinations) {
            for (const combo of rule.combinations) {
                if (combo.every(word => normalizedText.includes(word.toLowerCase()))) {
                    return rule
                }
            }
        }
    }

    return null
}
