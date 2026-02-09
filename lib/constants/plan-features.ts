/**
 * Plan Features Matrix - 4-Tier System (REAL FEATURES ONLY)
 * Defines which features are available in each plan
 * 
 * ATUALIZADO: 2026-02-09 - Apenas funcionalidades REALMENTE implementadas
 * Planos: BASICO (1), AVANCADO (2), PROFESSIONAL (3), ENTERPRISE (4)
 */

import { type PlanType, PLAN_LEVEL } from './plans'

// Feature keys for checking - APENAS FUNCIONALIDADES REAIS
export type FeatureKey =
    // ============================================
    // CHECK-IN & RECEPÇÃO (✅ IMPLEMENTADO)
    // ============================================
    | 'check_in_qr'              // QR Code check-in
    | 'check_in_facial'          // Reconhecimento facial
    | 'pre_registration'         // Pré-cadastro pelo paciente
    | 'triagem'                  // Fluxo de triagem

    // ============================================
    // TELECONSULTA (✅ IMPLEMENTADO)
    // ============================================
    | 'teleconsulta_webrtc'      // Vídeo nativo WebRTC

    // ============================================
    // PRONTUÁRIO (✅ IMPLEMENTADO)
    // ============================================
    | 'prontuario'               // Prontuário eletrônico
    | 'documentos'               // Upload de documentos
    | 'termos_legais'            // Termos e consentimentos

    // ============================================
    // FINANCEIRO (✅ IMPLEMENTADO)
    // ============================================
    | 'financeiro'               // Controle financeiro
    | 'pagamentos'               // Recebimento de pagamentos
    | 'convenios'                // Gestão de convênios
    | 'dre'                      // Demonstrativo de resultados
    | 'auditoria'                // Auditoria financeira
    | 'repasse_medico'           // Cálculo de repasse

    // ============================================
    // TISS (✅ IMPLEMENTADO)
    // ============================================
    | 'tiss'                     // Faturamento TISS completo

    // ============================================
    // CRM & COMUNICAÇÃO (✅ IMPLEMENTADO)
    // ============================================
    | 'crm'                      // CRM completo (automações, campanhas)
    | 'notificacoes_email'       // Notificações por e-mail
    | 'whatsapp_evolution'       // Integração WhatsApp Evolution

    // ============================================
    // RELATÓRIOS (✅ IMPLEMENTADO)
    // ============================================
    | 'relatorios'               // Relatórios (mesma funcionalidade para todos)

    // ============================================
    // GESTÃO (✅ IMPLEMENTADO)
    // ============================================
    | 'estoque'                  // Controle de estoque
    | 'importacao'               // Importação de dados CSV
    | 'agenda'                   // Gestão de agenda
    | 'horarios'                 // Configuração de horários
    | 'medicos'                  // Gestão de médicos
    | 'pacientes'                // Gestão de pacientes
    | 'usuarios'                 // Gestão de usuários

    // ============================================
    // PLATAFORMA (✅ IMPLEMENTADO)
    // ============================================
    | 'pagina_publica'           // Página pública de agendamento
    | 'multi_units'              // Múltiplas unidades

// Feature matrix: which plan level unlocks each feature
// 1 = BASICO, 2 = AVANCADO, 3 = PROFESSIONAL, 4 = ENTERPRISE
const FEATURE_PLAN_LEVEL: Record<FeatureKey, number> = {
    // ============================================
    // CHECK-IN & RECEPÇÃO
    // ============================================
    check_in_qr: 1,              // Todos os planos
    check_in_facial: 2,          // AVANCADO+
    pre_registration: 1,         // Todos os planos
    triagem: 1,                  // Todos os planos

    // ============================================
    // TELECONSULTA
    // ============================================
    teleconsulta_webrtc: 1,      // Todos os planos (não existe "básica" separada)

    // ============================================
    // PRONTUÁRIO
    // ============================================
    prontuario: 1,               // Todos os planos
    documentos: 1,               // Todos os planos
    termos_legais: 1,            // Todos os planos

    // ============================================
    // FINANCEIRO
    // ============================================
    financeiro: 1,               // Todos os planos
    pagamentos: 1,               // Todos os planos
    convenios: 1,                // Todos os planos
    dre: 2,                      // AVANCADO+
    auditoria: 2,                // AVANCADO+
    repasse_medico: 2,           // AVANCADO+

    // ============================================
    // TISS
    // ============================================
    tiss: 3,                     // PROFESSIONAL+

    // ============================================
    // CRM & COMUNICAÇÃO
    // ============================================
    crm: 2,                      // AVANCADO+
    notificacoes_email: 1,       // Todos os planos
    whatsapp_evolution: 2,       // AVANCADO+

    // ============================================
    // RELATÓRIOS
    // ============================================
    relatorios: 1,               // Todos os planos (mesma funcionalidade)

    // ============================================
    // GESTÃO
    // ============================================
    estoque: 1,                  // Todos os planos
    importacao: 2,               // AVANCADO+
    agenda: 1,                   // Todos os planos
    horarios: 1,                 // Todos os planos
    medicos: 1,                  // Todos os planos
    pacientes: 1,                // Todos os planos
    usuarios: 1,                 // Todos os planos

    // ============================================
    // PLATAFORMA
    // ============================================
    pagina_publica: 1,           // Todos os planos
    multi_units: 3,              // PROFESSIONAL+
}

/**
 * Check if a plan has access to a feature
 */
export function hasFeature(planType: PlanType, feature: FeatureKey): boolean {
    const planLevel = PLAN_LEVEL[planType] || 1
    const requiredLevel = FEATURE_PLAN_LEVEL[feature]
    return planLevel >= requiredLevel
}

/**
 * Get minimum plan required for a feature
 */
export function getMinPlanForFeature(feature: FeatureKey): PlanType {
    const requiredLevel = FEATURE_PLAN_LEVEL[feature]
    const planMap: Record<number, PlanType> = {
        1: 'BASICO',
        2: 'AVANCADO',
        3: 'PROFESSIONAL',
        4: 'ENTERPRISE',
    }
    return planMap[requiredLevel] || 'ENTERPRISE'
}

/**
 * Get all features available for a plan
 */
export function getPlanFeatures(planType: PlanType): FeatureKey[] {
    const planLevel = PLAN_LEVEL[planType] || 1
    return Object.entries(FEATURE_PLAN_LEVEL)
        .filter(([, level]) => planLevel >= level)
        .map(([feature]) => feature as FeatureKey)
}

/**
 * Get features locked for a plan (requires upgrade)
 */
export function getLockedFeatures(planType: PlanType): FeatureKey[] {
    const planLevel = PLAN_LEVEL[planType] || 1
    return Object.entries(FEATURE_PLAN_LEVEL)
        .filter(([, level]) => planLevel < level)
        .map(([feature]) => feature as FeatureKey)
}

/**
 * Human-readable feature names for UI
 */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
    // Check-in
    check_in_qr: 'Check-in QR Code',
    check_in_facial: 'Check-in Facial',
    pre_registration: 'Pré-Cadastro',
    triagem: 'Triagem',

    // Teleconsulta
    teleconsulta_webrtc: 'Teleconsulta',

    // Prontuário
    prontuario: 'Prontuário Eletrônico',
    documentos: 'Documentos',
    termos_legais: 'Termos Legais',

    // Financeiro
    financeiro: 'Financeiro',
    pagamentos: 'Pagamentos',
    convenios: 'Convênios',
    dre: 'DRE',
    auditoria: 'Auditoria',
    repasse_medico: 'Repasse Médico',

    // TISS
    tiss: 'Faturamento TISS',

    // CRM
    crm: 'CRM',
    notificacoes_email: 'Notificações E-mail',
    whatsapp_evolution: 'WhatsApp',

    // Relatórios
    relatorios: 'Relatórios',

    // Gestão
    estoque: 'Estoque',
    importacao: 'Importação de Dados',
    agenda: 'Agenda',
    horarios: 'Horários',
    medicos: 'Médicos',
    pacientes: 'Pacientes',
    usuarios: 'Usuários',

    // Plataforma
    pagina_publica: 'Página Pública',
    multi_units: 'Múltiplas Unidades',
}
