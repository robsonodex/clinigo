/**
 * AiA - Inteligência Preditiva do CliniGo
 * Configuration and Constants
 */

export const AIA_CONFIG = {
    // Identity
    name: 'AiA',
    fullName: 'AiA - Inteligência Preditiva',
    tagline: 'Seu braço direito na decisão clínica',

    // Branding
    brand: {
        primary: '#10b981', // Emerald 500
        secondary: '#14b8a6', // Teal 500
        gradient: 'from-emerald-500 to-teal-600',
    },

    // Signatures for different contexts
    signatures: {
        diagnosis: 'AiA - Inteligência Preditiva CliniGo',
        scheduling: 'AiA, assistente do CliniGo',
        notification: 'AiA - CliniGo',
        email: 'AiA, sua assistente inteligente CliniGo',
    },

    // Uncertainty response
    uncertaintyMessage: 'Como AiA, analisei os dados mas recomendo revisão humana adicional para este ponto específico.',

    // Portal-specific labels
    labels: {
        doctorPortal: {
            diagnosisButton: 'Consultar AiA',
            analysisTitle: 'Análise AiA',
            historyTitle: 'Histórico de Consultas AiA',
        },
        patientPortal: {
            scheduling: 'AiA, assistente do CliniGo',
            notifications: 'AiA - CliniGo',
        },
        clinicPortal: {
            aiDashboard: 'Métricas de Processamento AiA',
            aiCosts: 'Custos de Operação AiA',
            aiUsage: 'Uso de Recursos AiA',
        },
        superAdmin: {
            aiLogs: 'Histórico de Decisões AiA',
            aiAnalytics: 'Analytics AiA',
            aiMonitor: 'Monitor de Performance AiA',
        },
    },

    // Disclaimers
    disclaimers: {
        short: 'AiA é suporte à decisão. Diagnóstico final: responsabilidade do médico.',
        medium: 'AiA - Suporte à decisão clínica. O diagnóstico final é responsabilidade exclusiva do médico.',
        full: 'AiA é um sistema de suporte à decisão clínica do CliniGo. Suas análises são baseadas em padrões probabilísticos e NÃO substituem o julgamento clínico profissional. O diagnóstico final é responsabilidade exclusiva do médico responsável.',
    },
}

export type AiAPortalType = 'doctor' | 'patient' | 'clinic' | 'superAdmin'

/**
 * Get AiA label for specific portal and context
 */
export function getAiALabel(portal: AiAPortalType, context: string): string {
    const portalKey = `${portal}Portal` as keyof typeof AIA_CONFIG.labels
    const labels = AIA_CONFIG.labels[portalKey]
    return (labels as any)?.[context] || 'AiA'
}

/**
 * Get AiA signature for specific context
 */
export function getAiASignature(context: keyof typeof AIA_CONFIG.signatures): string {
    return AIA_CONFIG.signatures[context]
}

