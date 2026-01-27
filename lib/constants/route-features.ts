/**
 * Route to Feature Mapping - 4-Tier System
 * Maps routes to minimum required plan level
 * Plans: BASICO (R$149), AVANCADO (R$299), PROFESSIONAL (R$549), ENTERPRISE (R$799)
 */

import { type PlanType } from './plans'

// Route to minimum required plan mapping
// Using 4-Tier Plan System: BASICO, AVANCADO, PROFESSIONAL, ENTERPRISE
export const ROUTE_MIN_PLAN: Record<string, PlanType> = {
    // === BASICO Routes (R$149) - Core features ===
    // Dashboard, Agenda, Prontuários básico, Financeiro básico, Relatórios básicos
    // These are NOT restricted by default (no entry needed = all plans have access)

    // === AVANÇADO Routes (R$299) - Advanced features ===
    '/dashboard/financial/payroll': 'AVANCADO',
    '/dashboard/financial/dre': 'AVANCADO',
    '/dashboard/financial/audit': 'AVANCADO',
    '/dashboard/crm': 'AVANCADO',
    '/dashboard/whatsapp': 'AVANCADO',
    '/dashboard/automacao': 'AVANCADO',
    '/dashboard/importacao': 'AVANCADO',
    '/dashboard/integracoes': 'AVANCADO',
    '/api/payroll': 'AVANCADO',
    '/api/crm': 'AVANCADO',
    '/api/whatsapp': 'AVANCADO',

    // === PROFESSIONAL Routes (R$549) - Enterprise-lite features ===
    '/dashboard/tiss': 'PROFESSIONAL',
    '/dashboard/marketplace': 'PROFESSIONAL',
    '/dashboard/grupos': 'PROFESSIONAL',
    '/api/tiss': 'PROFESSIONAL',
    '/api/marketplace': 'PROFESSIONAL',
    '/api/aia': 'PROFESSIONAL',

    // === ENTERPRISE Routes (R$799) - Full enterprise ===
    '/dashboard/relatorios-globais': 'ENTERPRISE',
    '/api/groups': 'ENTERPRISE',
    '/api/integrations': 'ENTERPRISE',
    '/api/datasus': 'ENTERPRISE',
    '/api/labs-rj': 'ENTERPRISE',

    // === NETWORK Routes (legacy - maps to ENTERPRISE) ===
    '/dashboard/api-keys': 'ENTERPRISE',
    '/dashboard/white-label': 'ENTERPRISE',
    '/api/api-keys': 'ENTERPRISE',
    '/api/white-label': 'ENTERPRISE',
}

// Feature labels for UI display
export const FEATURE_LABELS: Record<string, string> = {
    // AVANÇADO Features
    '/dashboard/financial/payroll': 'Repasse Médico',
    '/dashboard/financial/dre': 'DRE Gerencial',
    '/dashboard/financial/audit': 'Auditoria Financeira',
    '/dashboard/automacao': 'Automação',
    '/dashboard/crm': 'CRM',
    '/dashboard/whatsapp': 'WhatsApp Automação',
    '/dashboard/importacao': 'Importação de Dados',
    '/dashboard/integracoes': 'Integrações',
    // PROFESSIONAL Features
    '/dashboard/tiss': 'TISS',
    '/dashboard/marketplace': 'Marketplace',
    '/dashboard/grupos': 'Multi-Unidade',
    // ENTERPRISE Features
    '/dashboard/relatorios-globais': 'BI Multi-Filiais',
    '/dashboard/api-keys': 'API Dedicada',
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
