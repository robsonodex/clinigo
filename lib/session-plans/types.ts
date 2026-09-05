/**
 * Tipos e interfaces estruturais do Motor Genérico de Planos de Sessão
 * World Sensory & CliniGo
 */

export interface ObjectiveParamField {
    id: string
    label: string
    type: 'text' | 'number' | 'select' | 'radio' | 'checkbox'
    placeholder?: string
    options?: { label: string; value: string }[]
    defaultValue?: string | number | boolean
}

export interface ObjectiveTemplate {
    code: string // ex: 'MOB01'
    title: string // ex: 'Realizar rotação de decúbito de forma funcional'
    category: string // ex: 'MOB'
    categoryLabel: string // ex: 'Mobilidade e Transferências'
    templateText: string // ex: 'realizar p/ {lado} em {oportunidades_realizadas} de {oportunidades_totais} oport. com {assistencia} assistência'
    fields: ObjectiveParamField[]
    helpText?: string
}

export interface SpecialtyCategory {
    id: string
    label: string
    description?: string
    objectives: ObjectiveTemplate[]
}

export interface SpecialtyTemplateConfig {
    id: string // 'fisioterapia', 'fonoaudiologia', etc.
    name: string
    professionalRole: string // 'Fisioterapeuta', 'Fonoaudiólogo(a)', etc.
    councilName: string // 'CREFITO', 'CRFa', 'CFP', etc.
    minObjectives: number
    maxObjectives: number
    categories: SpecialtyCategory[]
    initialConditions: {
        generalStates: string[]
        recentChanges: string[]
    }
    assistanceLevels: {
        id: string
        label: string
        description: string
    }[]
    strategies: {
        category: string
        items: string[]
    }[]
    sessionStages: {
        id: number
        name: string
        defaultMinutes?: number
    }[]
    movementQualityOptions?: string[]
    clinicalLimiters?: string[]
    nextSessionDecisions: string[]
    generalizationContexts: string[]
}
