import type { PlanType } from '@/lib/constants/plans'
import { getRouteMinPlan } from '@/lib/constants/route-features'
import { evaluateDashboardPageAccess } from '@/lib/constants/dashboard-rbac'
import {
    HELP_MODULES,
    KNOWLEDGE_BASE_ARTICLES,
    type HelpModuleMeta,
    type HelpRole,
    type KnowledgeArticle,
} from '@/lib/help/knowledge-base'

export type ClinicPermissionsMap = Record<string, { enabled: boolean; isCustom: boolean }>

export interface HelpAccessContext {
    role: string | null | undefined
    isCoordinator?: boolean
    clinicId?: string | null
    planType?: PlanType | null
    permissions?: ClinicPermissionsMap
    userId?: string | null
    userEmail?: string | null
}

export interface HelpHeaderShortcut {
    id: string
    label: string
    href: string
    icon: 'layers' | 'spreadsheet' | 'calendar' | 'users' | 'wallet' | 'stethoscope'
}

export interface HelpQuickSuggestion {
    label: string
    query: string
}

const PLAN_ORDER: Record<PlanType, number> = {
    BASICO: 1,
    AVANCADO: 2,
    PROFESSIONAL: 3,
    ENTERPRISE: 4,
    NETWORK: 5,
}

const HELP_MIN_PLAN_MAP: Record<KnowledgeArticle['minPlan'], PlanType> = {
    'Básico': 'BASICO',
    'Avançado': 'AVANCADO',
    'Profissional': 'PROFESSIONAL',
    'Enterprise': 'ENTERPRISE',
}

const ROUTE_TO_FEATURE_KEY: Record<string, string> = {
    '/dashboard/agenda': 'agenda',
    '/dashboard/minha-agenda': 'agenda',
    '/dashboard/horarios': 'horarios',
    '/dashboard/recepcao': 'recepcao',
    '/dashboard/pre-cadastros': 'pre_cadastros',
    '/dashboard/pacientes': 'pacientes',
    '/dashboard/prontuarios': 'prontuarios',
    '/dashboard/evolucoes': 'evolucoes',
    '/dashboard/convenios': 'convenios',
    '/dashboard/tiss': 'faturamento_tiss',
    '/dashboard/financeiro': 'financeiro',
    '/dashboard/financial/payroll': 'repasse_medico',
    '/dashboard/meu-financeiro': 'meu_financeiro',
    '/dashboard/whatsapp': 'whatsapp',
    '/dashboard/crm': 'fluxomed',
    '/dashboard/configuracoes/usuarios': 'usuarios',
    '/dashboard/configuracoes': 'minha_clinica',
}

function resolveFeatureKey(route: string, explicitFeatureKey?: string): string | undefined {
    if (explicitFeatureKey) return explicitFeatureKey
    const sorted = Object.entries(ROUTE_TO_FEATURE_KEY).sort(([a], [b]) => b.length - a.length)
    for (const [prefix, key] of sorted) {
        if (route === prefix || route.startsWith(`${prefix}/`)) {
            return key
        }
    }
    return undefined
}

function planMeetsRequirement(currentPlan: PlanType | null | undefined, requiredPlan: PlanType): boolean {
    const currentLevel = PLAN_ORDER[currentPlan || 'BASICO'] || 1
    const requiredLevel = PLAN_ORDER[requiredPlan] || 1
    return currentLevel >= requiredLevel
}

/**
 * Verifica se o usuário tem permissão REAL (Role + Plano + Override Master Hub)
 * para acessar uma rota referenciada no Help.
 * FAIL-CLOSED: retorna false quando não há perfil definido.
 */
export function canAccessHelpRoute(
    route: string,
    ctx: HelpAccessContext,
    options?: {
        featureKey?: string
        minPlan?: PlanType
    }
): boolean {
    if (!ctx.role) return false

    // 1. Camada de RBAC de página (fonte única sincronizada com middleware.ts)
    const rbacCheck = evaluateDashboardPageAccess({
        pathname: route,
        role: ctx.role,
        isCoordinator: ctx.isCoordinator,
        clinicId: ctx.clinicId,
        userId: ctx.userId,
        userEmail: ctx.userEmail,
    })

    if (!rbacCheck.allowed) {
        return false
    }

    // Super Admin (fora de impersonação) tem bypass de plano e overrides
    if (ctx.role === 'SUPER_ADMIN') {
        return true
    }

    // 2. Camada de overrides customizados do Master Hub
    const featureKey = resolveFeatureKey(route, options?.featureKey)
    const customPerm = featureKey ? ctx.permissions?.[featureKey] : undefined

    if (customPerm && customPerm.enabled === false) {
        return false
    }

    // 3. Camada de Plano mínimo (ROUTE_MIN_PLAN + minPlan explícito)
    const routePlan = getRouteMinPlan(route)
    const explicitPlan = options?.minPlan || null

    let effectiveMinPlan: PlanType = 'BASICO'
    if (routePlan && PLAN_ORDER[routePlan] > PLAN_ORDER[effectiveMinPlan]) {
        effectiveMinPlan = routePlan
    }
    if (explicitPlan && PLAN_ORDER[explicitPlan] > PLAN_ORDER[effectiveMinPlan]) {
        effectiveMinPlan = explicitPlan
    }

    if (effectiveMinPlan !== 'BASICO') {
        // Override explícito habilitado no Master Hub destrava o módulo mesmo em plano inferior
        if (customPerm && customPerm.enabled === true) {
            return true
        }
        return planMeetsRequirement(ctx.planType, effectiveMinPlan)
    }

    return true
}

/**
 * Verifica se o usuário tem permissão para VISUALIZAR um artigo na Central de Ajuda.
 * - FAIL-CLOSED quando role é null/undefined.
 * - SUPER_ADMIN visualiza todos os guias.
 * - CLINIC_ADMIN visualiza os guias da clínica habilitados no plano/overrides (para treinar a equipe),
 *   garantindo que a rota do guia está acessível.
 * - Perfis operacionais (DOCTOR, RECEPTIONIST, FINANCIAL, NURSE, STAFF, READONLY) visualizam
 *   ESTRITAMENTE guias pertencentes ao seu próprio perfil e cuja rota/plano esteja liberada.
 */
export function canViewHelpArticle(article: KnowledgeArticle, ctx: HelpAccessContext): boolean {
    if (!ctx.role) return false

    if (ctx.role === 'SUPER_ADMIN') {
        return true
    }

    const requiredPlan = HELP_MIN_PLAN_MAP[article.minPlan] || 'BASICO'

    // CLINIC_ADMIN pode visualizar guias da clínica cujos módulos estão ativos para sua clínica
    if (ctx.role === 'CLINIC_ADMIN') {
        return canAccessHelpRoute(article.route, ctx, {
            featureKey: article.featureKey,
            minPlan: requiredPlan,
        })
    }

    // Perfis não-administradores: checagem dupla estrita (papel no artigo + acesso real à rota/plano)
    const isRoleDirectlyListed = article.roles.includes(ctx.role as HelpRole)
    const isCoordinatorAgendaException =
        ctx.role === 'DOCTOR' &&
        Boolean(ctx.isCoordinator) &&
        article.id === 'agenda-agendamento-atendimento'

    if (!isRoleDirectlyListed && !isCoordinatorAgendaException) {
        return false
    }

    return canAccessHelpRoute(article.route, ctx, {
        featureKey: article.featureKey,
        minPlan: requiredPlan,
    })
}

/**
 * Retorna somente os artigos permitidos ao usuário atual.
 */
export function getAccessibleHelpArticles(
    ctx: HelpAccessContext,
    articles: KnowledgeArticle[] = KNOWLEDGE_BASE_ARTICLES
): KnowledgeArticle[] {
    if (!ctx.role) return []
    return articles.filter((article) => canViewHelpArticle(article, ctx))
}

/**
 * Retorna somente os módulos que possuem ao menos 1 artigo permitido para o usuário.
 */
export function getAccessibleHelpModules(
    accessibleArticles: KnowledgeArticle[],
    modules: HelpModuleMeta[] = HELP_MODULES
): HelpModuleMeta[] {
    const allowedModuleIds = new Set(accessibleArticles.map((a) => a.module))
    return modules.filter((m) => allowedModuleIds.has(m.id))
}

/**
 * Retorna true se o usuário pode usar o seletor para filtrar guias de outros perfis da equipe
 * (apenas Administradores da Clínica e Super Admin).
 */
export function canFilterOtherRolesInHelp(role: string | null | undefined): boolean {
    return role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN'
}

/**
 * Retorna os botões de atalho do cabeçalho de /dashboard/help estritamente filtrados
 * pelas permissões reais do usuário (perfil + plano + overrides).
 */
export function getPermittedHeaderShortcuts(ctx: HelpAccessContext): HelpHeaderShortcut[] {
    if (!ctx.role) return []

    const candidates: Array<
        HelpHeaderShortcut & {
            roles: string[]
            featureKey?: string
            minPlan?: PlanType
        }
    > = [
        {
            id: 'tiss',
            label: 'Ir para Faturamento TISS',
            href: '/dashboard/tiss',
            icon: 'layers',
            roles: ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
            featureKey: 'faturamento_tiss',
            minPlan: 'PROFESSIONAL',
        },
        {
            id: 'prontuarios-excel',
            label: 'Ir para Prontuários (Excel)',
            href: '/dashboard/prontuarios',
            icon: 'spreadsheet',
            roles: ['SUPER_ADMIN', 'CLINIC_ADMIN'],
            featureKey: 'prontuarios',
            minPlan: 'BASICO',
        },
        {
            id: 'financeiro',
            label: 'Ir para Financeiro',
            href: '/dashboard/financeiro',
            icon: 'wallet',
            roles: ['FINANCIAL'],
            featureKey: 'financeiro',
            minPlan: 'BASICO',
        },
        {
            id: 'minha-agenda',
            label: 'Ir para Minha Agenda',
            href: '/dashboard/minha-agenda',
            icon: 'calendar',
            roles: ['DOCTOR'],
            featureKey: 'agenda',
            minPlan: 'BASICO',
        },
        {
            id: 'prontuarios-clinico',
            label: 'Ir para Prontuários',
            href: '/dashboard/prontuarios',
            icon: 'stethoscope',
            roles: ['DOCTOR'],
            featureKey: 'prontuarios',
            minPlan: 'BASICO',
        },
        {
            id: 'agenda-geral',
            label: 'Ir para Agenda',
            href: '/dashboard/agenda',
            icon: 'calendar',
            roles: ['RECEPTIONIST', 'STAFF'],
            featureKey: 'agenda',
            minPlan: 'BASICO',
        },
        {
            id: 'recepcao',
            label: 'Ir para Recepção',
            href: '/dashboard/recepcao',
            icon: 'users',
            roles: ['RECEPTIONIST', 'STAFF'],
            featureKey: 'recepcao',
            minPlan: 'BASICO',
        },
        {
            id: 'pacientes',
            label: 'Ir para Pacientes',
            href: '/dashboard/pacientes',
            icon: 'users',
            roles: ['NURSE'],
            featureKey: 'pacientes',
            minPlan: 'BASICO',
        },
    ]

    const result = candidates
        .filter((item) => item.roles.includes(ctx.role as string))
        .filter((item) =>
            canAccessHelpRoute(item.href, ctx, {
                featureKey: item.featureKey,
                minPlan: item.minPlan,
            })
        )
        .map(({ id, label, href, icon }) => ({ id, label, href, icon }))

    // Fallback útil para CLINIC_ADMIN em plano BASICO/AVANCADO (sem TISS): mostrar também Agenda
    if (
        ctx.role === 'CLINIC_ADMIN' &&
        result.length < 2 &&
        !result.some((r) => r.href === '/dashboard/agenda') &&
        canAccessHelpRoute('/dashboard/agenda', ctx, { featureKey: 'agenda', minPlan: 'BASICO' })
    ) {
        result.unshift({
            id: 'agenda-admin',
            label: 'Ir para Agenda',
            href: '/dashboard/agenda',
            icon: 'calendar',
        })
    }

    return result
}

const ALL_QUICK_SUGGESTIONS: Array<HelpQuickSuggestion & { requiredArticleIds: string[] }> = [
    {
        label: 'Relatório de Evolução em Excel',
        query: 'excel evolucao',
        requiredArticleIds: ['prontuarios-relatorio-evolucao-excel'],
    },
    {
        label: 'Elaboração de Contas (Ctrl+L)',
        query: 'ctrl+l elaboracao',
        requiredArticleIds: ['tiss-elaboracao-contas'],
    },
    {
        label: 'Controle de Glosas 3 Níveis',
        query: '3 niveis glosa',
        requiredArticleIds: ['tiss-controle-glosas'],
    },
    {
        label: 'Dossiê Probatório e Recurso',
        query: 'dossie recurso',
        requiredArticleIds: ['tiss-recursos-dossie'],
    },
    {
        label: 'Folha de Repasses Médicos',
        query: 'repasse folha',
        requiredArticleIds: ['financeiro-repasses-medicos'],
    },
    {
        label: 'Lançamentos Financeiros',
        query: 'lancamentos receita',
        requiredArticleIds: ['financeiro-lancamentos-caixa'],
    },
    {
        label: 'Alternar Particular / Convênio',
        query: 'particular convenio',
        requiredArticleIds: ['tiss-recepcao-autorizacoes', 'agenda-agendamento-atendimento'],
    },
    {
        label: 'Evolução SOAP e ICP-Brasil',
        query: 'soap icp-brasil',
        requiredArticleIds: ['prontuario-eletronico-evolucao'],
    },
    {
        label: 'Minha Agenda do Dia',
        query: 'minha agenda',
        requiredArticleIds: ['minha-agenda-profissional'],
    },
    {
        label: 'Meu Financeiro (Excel)',
        query: 'meu financeiro',
        requiredArticleIds: ['meu-financeiro-profissional'],
    },
    {
        label: 'Check-in e Painel de TV',
        query: 'painel tv check-in',
        requiredArticleIds: ['recepcao-checkin-painel-tv'],
    },
    {
        label: 'Pré-Cadastro por QR Code',
        query: 'pre-cadastro qr code',
        requiredArticleIds: ['pre-cadastro-remoto-pacientes'],
    },
    {
        label: 'Conectar WhatsApp por Setor',
        query: 'whatsapp qr code',
        requiredArticleIds: ['crm-whatsapp-automacoes'],
    },
    {
        label: 'Diretório de Pacientes',
        query: 'pacientes diretorio',
        requiredArticleIds: ['diretorio-pacientes-cadastro'],
    },
]

/**
 * Retorna até 5 buscas rápidas estritamente compatíveis com os guias que o usuário pode ver.
 */
export function getPermittedQuickSuggestions(
    accessibleArticles: KnowledgeArticle[]
): HelpQuickSuggestion[] {
    const allowedIds = new Set(accessibleArticles.map((a) => a.id))
    return ALL_QUICK_SUGGESTIONS
        .filter((s) => s.requiredArticleIds.some((id) => allowedIds.has(id)))
        .slice(0, 5)
        .map(({ label, query }) => ({ label, query }))
}

