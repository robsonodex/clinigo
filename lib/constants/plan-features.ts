/**
 * Plan Features Matrix - 5-Tier System
 * Defines which features are available in each plan
 */

import { type PlanType, PLAN_LEVEL } from './plans'

// Feature keys for checking
export type FeatureKey =
    // AI Features
    | 'ai_simple'
    | 'ai_reasoning'
    | 'ai_predictive'
    | 'ai_custom_training'
    // Video Features
    | 'video_google_meet'
    | 'video_daily'
    | 'video_whitelabel'
    // WhatsApp Features
    | 'whatsapp_manual'
    | 'whatsapp_automation'
    | 'whatsapp_chatbot'
    // Core Features
    | 'prontuario_basic'
    | 'prontuario_advanced'
    | 'prontuario_multi_unit'
    | 'financeiro_basic'
    | 'financeiro_advanced'
    | 'relatorios_basic'
    | 'relatorios_advanced'
    | 'relatorios_bi'
    // Premium Features
    | 'crm'
    | 'tiss'
    | 'marketplace'
    | 'estoque'
    // Enterprise Features
    | 'multi_units'
    | 'datasus'
    | 'labs_rj'
    | 'api_dedicated'
    // Network Features
    | 'whitelabel'
    | 'custom_integrations'
    | 'unlimited_units'

// Feature matrix: which plan level unlocks each feature
const FEATURE_PLAN_LEVEL: Record<FeatureKey, number> = {
    // AI Features
    ai_simple: 1,           // STARTER+
    ai_reasoning: 3,        // PROFESSIONAL+
    ai_predictive: 4,       // ENTERPRISE+
    ai_custom_training: 5,  // NETWORK only

    // Video Features
    video_google_meet: 2,   // BASIC+
    video_daily: 3,         // PROFESSIONAL+
    video_whitelabel: 5,    // NETWORK only

    // WhatsApp Features
    whatsapp_manual: 2,     // BASIC+
    whatsapp_automation: 3, // PROFESSIONAL+
    whatsapp_chatbot: 4,    // ENTERPRISE+

    // Core Features
    prontuario_basic: 1,    // STARTER+
    prontuario_advanced: 3, // PROFESSIONAL+
    prontuario_multi_unit: 4, // ENTERPRISE+
    financeiro_basic: 2,    // BASIC+
    financeiro_advanced: 3, // PROFESSIONAL+
    relatorios_basic: 2,    // BASIC+
    relatorios_advanced: 3, // PROFESSIONAL+
    relatorios_bi: 4,       // ENTERPRISE+

    // Premium Features
    crm: 3,                 // PROFESSIONAL+
    tiss: 3,                // PROFESSIONAL+
    marketplace: 3,         // PROFESSIONAL+
    estoque: 3,             // PROFESSIONAL+

    // Enterprise Features
    multi_units: 4,         // ENTERPRISE+
    datasus: 4,             // ENTERPRISE+
    labs_rj: 4,             // ENTERPRISE+
    api_dedicated: 4,       // ENTERPRISE+

    // Network Features
    whitelabel: 5,          // NETWORK only
    custom_integrations: 5, // NETWORK only
    unlimited_units: 5,     // NETWORK only
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
        1: 'STARTER',
        2: 'BASIC',
        3: 'PROFESSIONAL',
        4: 'ENTERPRISE',
        5: 'NETWORK',
    }
    return planMap[requiredLevel] || 'NETWORK'
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
