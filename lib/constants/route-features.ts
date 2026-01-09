/**
 * Route to Feature Mapping - 5-Tier System
 * Maps routes to minimum required plan level
 */

import { type PlanType } from './plans'

// Route to minimum required plan mapping
export const ROUTE_MIN_PLAN: Record<string, PlanType> = {
    // === STARTER Routes (R$47) - Basic scheduling only ===
    // All public and basic auth routes

    // === BASIC Routes (R$87) - Includes financeiro básico ===
    '/dashboard/financeiro': 'BASIC',
    '/dashboard/relatorios': 'BASIC',
    '/api/financial/entries': 'BASIC',
    '/api/reports': 'BASIC',

    // === PROFESSIONAL Routes (R$247) - Full features ===
    '/dashboard/tiss': 'PROFESSIONAL',
    '/dashboard/crm': 'PROFESSIONAL',
    '/dashboard/estoque': 'PROFESSIONAL',
    '/dashboard/whatsapp': 'PROFESSIONAL',
    '/dashboard/prontuarios': 'PROFESSIONAL',
    '/dashboard/marketplace': 'PROFESSIONAL',
    '/dashboard/triagem': 'PROFESSIONAL',
    '/api/tiss': 'PROFESSIONAL',
    '/api/crm': 'PROFESSIONAL',
    '/api/inventory': 'PROFESSIONAL',
    '/api/whatsapp': 'PROFESSIONAL',
    '/api/medical-records': 'PROFESSIONAL',
    '/api/marketplace': 'PROFESSIONAL',
    '/api/aia': 'PROFESSIONAL',

    // === ENTERPRISE Routes (R$497) - Multi-unit + Labs ===
    '/dashboard/grupos': 'ENTERPRISE',
    '/dashboard/integracoes': 'ENTERPRISE',
    '/dashboard/relatorios-globais': 'ENTERPRISE',
    '/api/groups': 'ENTERPRISE',
    '/api/integrations': 'ENTERPRISE',
    '/api/datasus': 'ENTERPRISE',
    '/api/labs-rj': 'ENTERPRISE',

    // === NETWORK Routes (R$997) - White-label + API ===
    '/dashboard/api-keys': 'NETWORK',
    '/dashboard/white-label': 'NETWORK',
    '/api/api-keys': 'NETWORK',
    '/api/white-label': 'NETWORK',
}

// Feature labels for UI display
export const FEATURE_LABELS: Record<string, string> = {
    '/dashboard/tiss': 'TISS',
    '/dashboard/crm': 'CRM',
    '/dashboard/estoque': 'Estoque',
    '/dashboard/financeiro': 'Financeiro',
    '/dashboard/whatsapp': 'WhatsApp Automação',
    '/dashboard/prontuarios': 'Prontuário Avançado',
    '/dashboard/grupos': 'Multi-Unidade',
    '/dashboard/integracoes': 'Integrações',
    '/dashboard/relatorios-globais': 'BI Multi-Filiais',
    '/dashboard/api-keys': 'API Dedicada',
    '/dashboard/marketplace': 'Marketplace',
    '/dashboard/white-label': 'White-Label',
}

// Get minimum required plan for a route
export function getRouteMinPlan(pathname: string): PlanType | null {
    // Check for exact match first
    if (ROUTE_MIN_PLAN[pathname]) {
        return ROUTE_MIN_PLAN[pathname]
    }

    // Check for prefix match
    for (const [route, plan] of Object.entries(ROUTE_MIN_PLAN)) {
        if (pathname.startsWith(route)) {
            return plan
        }
    }

    return null // Route has no plan requirement
}

// Get feature label for a route
export function getRouteFeatureLabel(pathname: string): string {
    for (const [route, label] of Object.entries(FEATURE_LABELS)) {
        if (pathname.startsWith(route)) {
            return label
        }
    }
    return 'Recurso Premium'
}
