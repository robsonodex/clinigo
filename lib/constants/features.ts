/**
 * Feature Keys - CliniGo Custom Permissions System
 * 28 feature keys that can be enabled/disabled per clinic by SUPER_ADMIN
 */

export const FEATURE_KEYS = {
    // Principal - Dashboard NUNCA pode ser desativado
    DASHBOARD: 'dashboard',

    // Agendamento
    AGENDA: 'agenda',
    CONSULTAS: 'consultas',
    RECEPCAO: 'recepcao',
    HORARIOS: 'horarios',

    // Equipe
    MEDICOS: 'medicos',
    PACIENTES: 'pacientes',

    // Prontuário
    PRONTUARIOS: 'prontuarios',
    PRESCRICOES: 'prescricoes',
    DOCUMENTOS: 'documentos',

    // Financeiro
    PAGAMENTOS: 'pagamentos',
    FINANCEIRO: 'financeiro',
    REPASSE_MEDICO: 'repasse_medico',
    DRE: 'dre',
    AUDITORIA: 'auditoria',
    FATURAMENTO_TISS: 'faturamento_tiss',
    CONVENIOS: 'convenios',

    // Comunicação
    WHATSAPP: 'whatsapp',
    NOTIFICACOES: 'notificacoes',
    FLUXOMED: 'fluxomed',

    // Gestão
    ESTOQUE: 'estoque',
    RELATORIOS: 'relatorios',
    TERMOS_LEGAIS: 'termos_legais',
    IMPORTACAO: 'importacao',
    AUTOMACAO: 'automacao',

    // Configurações
    MINHA_CLINICA: 'minha_clinica',
    PAGINA_PUBLICA: 'pagina_publica',
    TELECONSULTA: 'teleconsulta',
    USUARIOS: 'usuarios',
    ASSINATURA: 'assinatura',
    SEGURANCA: 'seguranca',
    INTEGRACOES: 'integracoes',

    // Terapias & Especialidades
    PSICOMOTRICIDADE: 'psicomotricidade',
} as const

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS]

// All feature keys as array
export const ALL_FEATURE_KEYS = Object.values(FEATURE_KEYS)

// Features that can NEVER be disabled (core functionality)
export const PROTECTED_FEATURES: FeatureKey[] = ['dashboard']

// Feature categories for UI grouping
export type FeatureCategory =
    | 'PRINCIPAL'
    | 'AGENDAMENTO'
    | 'EQUIPE'
    | 'PRONTUARIO'
    | 'FINANCEIRO'
    | 'COMUNICACAO'
    | 'GESTAO'
    | 'CONFIGURACOES'
    | 'TERAPIA'

export interface FeatureMetadata {
    label: string
    category: FeatureCategory
    defaultPlans: ('BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE')[]
    description?: string
}

export const FEATURE_METADATA: Record<FeatureKey, FeatureMetadata> = {
    // Principal
    [FEATURE_KEYS.DASHBOARD]: {
        label: 'Dashboard',
        category: 'PRINCIPAL',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
        description: 'Painel principal (não pode ser desativado)',
    },

    // Agendamento
    [FEATURE_KEYS.AGENDA]: {
        label: 'Agenda',
        category: 'AGENDAMENTO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.CONSULTAS]: {
        label: 'Consultas',
        category: 'AGENDAMENTO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.RECEPCAO]: {
        label: 'Recepção',
        category: 'AGENDAMENTO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.HORARIOS]: {
        label: 'Horários',
        category: 'AGENDAMENTO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Equipe
    [FEATURE_KEYS.MEDICOS]: {
        label: 'Médicos',
        category: 'EQUIPE',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.PACIENTES]: {
        label: 'Pacientes',
        category: 'EQUIPE',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Prontuário
    [FEATURE_KEYS.PRONTUARIOS]: {
        label: 'Prontuários',
        category: 'PRONTUARIO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.PRESCRICOES]: {
        label: 'Prescrições',
        category: 'PRONTUARIO',
        defaultPlans: ['PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.DOCUMENTOS]: {
        label: 'Documentos',
        category: 'PRONTUARIO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Financeiro
    [FEATURE_KEYS.PAGAMENTOS]: {
        label: 'Pagamentos',
        category: 'FINANCEIRO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.FINANCEIRO]: {
        label: 'Financeiro',
        category: 'FINANCEIRO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.REPASSE_MEDICO]: {
        label: 'Repasse Médico',
        category: 'FINANCEIRO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.DRE]: {
        label: 'DRE',
        category: 'FINANCEIRO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.AUDITORIA]: {
        label: 'Auditoria',
        category: 'FINANCEIRO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.FATURAMENTO_TISS]: {
        label: 'Faturamento TISS',
        category: 'FINANCEIRO',
        defaultPlans: ['PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.CONVENIOS]: {
        label: 'Convênios',
        category: 'FINANCEIRO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Comunicação
    [FEATURE_KEYS.WHATSAPP]: {
        label: 'WhatsApp',
        category: 'COMUNICACAO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.NOTIFICACOES]: {
        label: 'Notificações',
        category: 'COMUNICACAO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.FLUXOMED]: {
        label: 'FluxoMed (CRM)',
        category: 'COMUNICACAO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Gestão
    [FEATURE_KEYS.ESTOQUE]: {
        label: 'Estoque',
        category: 'GESTAO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.RELATORIOS]: {
        label: 'Relatórios',
        category: 'GESTAO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.TERMOS_LEGAIS]: {
        label: 'Termos Legais',
        category: 'GESTAO',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.IMPORTACAO]: {
        label: 'Importação',
        category: 'GESTAO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.AUTOMACAO]: {
        label: 'Automação',
        category: 'GESTAO',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Configurações
    [FEATURE_KEYS.MINHA_CLINICA]: {
        label: 'Minha Clínica',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.PAGINA_PUBLICA]: {
        label: 'Página Pública',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.TELECONSULTA]: {
        label: 'Teleconsulta',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.USUARIOS]: {
        label: 'Usuários',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.ASSINATURA]: {
        label: 'Assinatura',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.SEGURANCA]: {
        label: 'Segurança',
        category: 'CONFIGURACOES',
        defaultPlans: ['BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },
    [FEATURE_KEYS.INTEGRACOES]: {
        label: 'Integrações',
        category: 'CONFIGURACOES',
        defaultPlans: ['AVANCADO', 'PROFESSIONAL', 'ENTERPRISE'],
    },

    // Terapias & Especialidades
    [FEATURE_KEYS.PSICOMOTRICIDADE]: {
        label: 'Psicomotricidade (World Sensory)',
        category: 'TERAPIA',
        defaultPlans: [],
        description: 'Módulo de Ficha Capa, Biblioteca dos 55 Objetivos e Planos de Sessão de Psicomotricidade',
    },
}

// Category labels for UI
export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
    PRINCIPAL: 'Principal',
    AGENDAMENTO: 'Agendamento',
    EQUIPE: 'Equipe',
    PRONTUARIO: 'Prontuário',
    TERAPIA: 'Terapia & Desenvolvimento',
    FINANCEIRO: 'Financeiro',
    COMUNICACAO: 'Comunicação',
    GESTAO: 'Gestão',
    CONFIGURACOES: 'Configurações',
}

// Get features grouped by category
export function getFeaturesByCategory(): Record<FeatureCategory, { key: FeatureKey; metadata: FeatureMetadata }[]> {
    const grouped = {} as Record<FeatureCategory, { key: FeatureKey; metadata: FeatureMetadata }[]>

    for (const [key, metadata] of Object.entries(FEATURE_METADATA)) {
        const category = metadata.category
        if (!grouped[category]) {
            grouped[category] = []
        }
        grouped[category].push({ key: key as FeatureKey, metadata })
    }

    return grouped
}

// Check if feature is in default plans for a given plan
export function isFeatureInDefaultPlan(featureKey: FeatureKey, planType: string): boolean {
    const metadata = FEATURE_METADATA[featureKey]
    if (!metadata) return false
    return metadata.defaultPlans.includes(planType as any)
}

// Get badge text for plans
export function getPlanBadge(plans: string[]): string {
    if (plans.includes('BASICO')) return 'BÁS'
    if (plans.includes('AVANCADO')) return 'AVÇ'
    if (plans.includes('PROFESSIONAL')) return 'PRO'
    if (plans.includes('ENTERPRISE')) return 'ENT'
    return ''
}
