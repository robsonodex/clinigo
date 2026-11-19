import type { PlanType } from '@/lib/constants/plans'
import { getRouteMinPlan } from '@/lib/constants/route-features'
import {
    ESPACO_INCLUIR_CLINIC_ID,
    WORLD_SENSORY_CLINIC_ID,
    evaluateDashboardPageAccess,
} from '@/lib/constants/dashboard-rbac'
import {
    isClinicAuthorizedForContracts,
    isClinicAuthorizedForTeleconsulta,
} from '@/lib/constants/contracts-allowlist'
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
    clinicSlug?: string | null
    clinicName?: string | null
    isDemo?: boolean
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

/**
 * Mapeamento determinístico 100% por rota (href) -> anchor exato no /dashboard/help.
 * Elimina colisões de título visual na Sidebar (ex.: Teleconsulta em Agendamento vs Configurações,
 * Notas & Demonstrativos em Repasses vs Meu Financeiro, Auditoria em Gestão vs Administração).
 */
export const HELP_ROUTE_TO_ANCHOR: Record<string, string> = {
    // Principal
    '/dashboard': 'painel-principal-dashboard',
    '/dashboard/tarefas': 'tarefas-projetos-equipe',
    '/dashboard/onboarding': 'checklist-inicial-onboarding',

    // Agendamento
    '/dashboard/agenda': 'agenda-agendamento-atendimento',
    '/dashboard/minha-agenda': 'minha-agenda-profissional',
    '/dashboard/teleconsulta': 'teleconsulta',
    '/dashboard/recepcao': 'recepcao-checkin-painel-tv',
    '/dashboard/horarios': 'fila-espera-horarios',

    // Equipe
    '/dashboard/medicos': 'equipe-profissionais-medicos',
    '/dashboard/pacientes': 'diretorio-pacientes-cadastro',
    '/dashboard/pre-cadastros': 'pre-cadastro-remoto-pacientes',

    // Prontuário
    '/dashboard/prontuarios': 'prontuarios-consulta-historico',
    '/dashboard/prescricoes': 'prescricoes-consulta-medica',
    '/dashboard/documentos': 'documentos-clinica-upload',
    '/dashboard/contratos': 'contratos-assinaturas-modelos',
    '/dashboard/contratos/modelos': 'contratos-assinaturas-modelos',
    '/dashboard/configuracoes/templates-prontuario': 'templates-prontuario-clinico',
    '/dashboard/planos-terapeuticos': 'planos-terapeuticos',
    '/dashboard/evolucoes': 'prontuario-eletronico-evolucao',
    '/dashboard/controle-faltas': 'controle-faltas-pacotes',

    // Terapia
    '/dashboard/terapia/fila-espera': 'terapia-fila-espera',
    '/dashboard/terapia/encaminhamentos': 'terapia-encaminhamentos',
    '/dashboard/terapia/supervisao': 'terapia-supervisao-clinica',
    '/dashboard/terapia/retencao': 'terapia-bi-indicadores',
    '/dashboard/terapia/risco-evasao': 'terapia-bi-indicadores',
    '/dashboard/terapia/aderencia': 'terapia-bi-indicadores',
    '/dashboard/terapia/conformidade-evolucao': 'terapia-bi-indicadores',
    '/dashboard/terapia/desfechos': 'terapia-bi-indicadores',
    '/dashboard/terapia/carga-trabalho': 'terapia-bi-indicadores',
    '/dashboard/terapia/demografico': 'terapia-bi-indicadores',
    '/dashboard/terapia/receita-modalidade': 'terapia-bi-indicadores',
    '/dashboard/terapia/sazonalidade': 'terapia-bi-indicadores',
    '/dashboard/terapia/nps': 'terapia-nps-satisfacao',

    // Financeiro
    '/dashboard/financeiro': 'financeiro-lancamentos-caixa',
    '/dashboard/pagamentos': 'financeiro-pagamentos',
    '/dashboard/financeiro/fechamento': 'financeiro-fechamentos',
    '/dashboard/financial/credits': 'financeiro-creditos-pacientes',
    '/dashboard/financial/payroll': 'financeiro-repasses-medicos',
    '/dashboard/financial/payroll/historico': 'financeiro-repasses-medicos',
    '/dashboard/financial/producao': 'financeiro-repasses-medicos',
    '/dashboard/financial/notas-demonstrativos': 'financeiro-repasses-medicos',
    '/dashboard/financial/dre': 'financeiro-dre-consolidada',
    '/dashboard/financial/goals': 'financeiro-metas-projecao',
    '/dashboard/tiss': 'tiss-elaboracao-contas',
    '/dashboard/tiss/batches': 'tiss-remessas-xml',
    '/dashboard/tiss/glosas': 'tiss-controle-glosas',
    '/dashboard/tiss/reports/loss-analysis': 'tiss-perdas-bi',
    '/dashboard/meu-financeiro': 'meu-financeiro-profissional',
    '/dashboard/meu-financeiro/historico': 'meu-financeiro-profissional',
    '/dashboard/meu-financeiro/producao': 'meu-financeiro-profissional',
    '/dashboard/meu-financeiro/notas-demonstrativos': 'meu-financeiro-profissional',
    '/dashboard/convenios': 'tiss-configuracao-convenios',
    '/dashboard/configuracoes/reembolso': 'financeiro-regras-reembolso',
    '/dashboard/configuracoes/reembolso-paciente': 'financeiro-regras-reembolso',

    // Comunicação
    '/dashboard/chat': 'comunicacao-chat-interno',
    '/dashboard/whatsapp': 'crm-whatsapp-automacoes',
    '/dashboard/notificacoes': 'comunicacao-notificacoes',
    '/dashboard/crm': 'fluxomed-crm-pipeline',
    '/dashboard/crm/pipeline': 'fluxomed-crm-pipeline',

    // Gestão
    '/dashboard/estoque': 'gestao-estoque',
    '/dashboard/relatorios': 'gestao-relatorios-analytics',
    '/dashboard/termos': 'gestao-termos-legais',
    '/dashboard/importacao': 'gestao-importacao-dados',
    '/dashboard/automacao': 'gestao-automacao',
    '/dashboard/automacao/configuracoes': 'gestao-automacao',
    '/dashboard/logs-auditoria': 'gestao-logs-auditoria',

    // Configurações
    '/dashboard/configuracoes': 'configuracoes-minha-clinica',
    '/dashboard/configuracoes/pagina-publica': 'configuracoes-pagina-publica',
    '/dashboard/configuracoes/teleconsulta': 'configuracoes-teleconsulta',
    '/dashboard/configuracoes/usuarios': 'configuracoes-rbac-lgpd',
    '/dashboard/configuracoes/terapias': 'configuracoes-terapias',
    '/dashboard/configuracoes/assinatura': 'configuracoes-assinatura',
    '/dashboard/seguranca': 'configuracoes-seguranca',
    '/dashboard/integracoes': 'configuracoes-integracoes',
    '/dashboard/configuracoes/dispositivos': 'configuracoes-dispositivos-pareados',

    // Administração da Plataforma (Super Admin)
    '/system-master-hub': 'admin-plataforma-super-admin',
    '/dashboard/clinicas': 'admin-plataforma-super-admin',
    '/dashboard/planos': 'admin-plataforma-super-admin',
    '/dashboard/cobranca': 'admin-plataforma-super-admin',
    '/dashboard/grupos': 'admin-plataforma-super-admin',
    '/dashboard/relatorios-globais': 'admin-plataforma-super-admin',
    '/dashboard/api-keys': 'admin-plataforma-super-admin',
    '/dashboard/auditoria': 'admin-plataforma-super-admin',
    '/dashboard/health': 'admin-plataforma-super-admin',
    '/dashboard/super/admins': 'admin-plataforma-super-admin',
}

/**
 * Aliases legados por título/slug para garantir retrocompatibilidade caso alguém abra
 * links diretos como /dashboard/help#teleconsulta ou /dashboard/help#planos-terapeuticos.
 */
export const HELP_LEGACY_HASH_ALIASES: Record<string, string> = {
    dashboard: 'painel-principal-dashboard',
    tarefas: 'tarefas-projetos-equipe',
    'checklist-inicial': 'checklist-inicial-onboarding',
    agenda: 'agenda-agendamento-atendimento',
    'minha-agenda': 'minha-agenda-profissional',
    teleconsulta: 'teleconsulta',
    recepcao: 'recepcao-checkin-painel-tv',
    horarios: 'fila-espera-horarios',
    medicos: 'equipe-profissionais-medicos',
    terapeutas: 'equipe-profissionais-medicos',
    profissionais: 'equipe-profissionais-medicos',
    pacientes: 'diretorio-pacientes-cadastro',
    'pre-cadastros': 'pre-cadastro-remoto-pacientes',
    prontuarios: 'prontuarios-consulta-historico',
    'prontuario-eletronico': 'prontuario-eletronico-evolucao',
    evolucoes: 'prontuario-eletronico-evolucao',
    'evolucao-por-sessao': 'prontuario-eletronico-evolucao',
    prescricoes: 'prescricoes-consulta-medica',
    documentos: 'documentos-clinica-upload',
    'contratos-assinaturas': 'contratos-assinaturas-modelos',
    'modelos-de-contratos': 'contratos-assinaturas-modelos',
    contratos: 'contratos-assinaturas-modelos',
    'templates-prontuario': 'templates-prontuario-clinico',
    'planos-terapeuticos': 'planos-terapeuticos',
    'controle-de-faltas': 'controle-faltas-pacotes',
    'fluxo-e-clinico': 'terapia-fila-espera',
    'fila-de-espera': 'terapia-fila-espera',
    encaminhamentos: 'terapia-encaminhamentos',
    supervisao: 'terapia-supervisao-clinica',
    'bi-e-indicadores': 'terapia-bi-indicadores',
    retencao: 'terapia-bi-indicadores',
    'risco-de-evasao': 'terapia-bi-indicadores',
    aderencia: 'terapia-bi-indicadores',
    'conformidade-evolucoes': 'terapia-bi-indicadores',
    desfechos: 'terapia-bi-indicadores',
    'carga-de-trabalho': 'terapia-bi-indicadores',
    demografico: 'terapia-bi-indicadores',
    'receita-por-modalidade': 'terapia-bi-indicadores',
    sazonalidade: 'terapia-bi-indicadores',
    'nps-satisfacao': 'terapia-nps-satisfacao',
    'transacoes-e-caixa': 'financeiro-lancamentos-caixa',
    lancamentos: 'financeiro-lancamentos-caixa',
    financeiro: 'financeiro-lancamentos-caixa',
    pagamentos: 'financeiro-pagamentos',
    'fechamentos-de-caixa': 'financeiro-fechamentos',
    'creditos-de-pacientes': 'financeiro-creditos-pacientes',
    'repasses-producao': 'financeiro-repasses-medicos',
    'folha-de-repasse': 'financeiro-repasses-medicos',
    'historico-de-repasses': 'financeiro-repasses-medicos',
    'producao-por-profissional': 'financeiro-repasses-medicos',
    'notas-demonstrativos': 'financeiro-repasses-medicos',
    repasses: 'financeiro-repasses-medicos',
    'controladoria-bi': 'financeiro-dre-consolidada',
    'dre-consolidada': 'financeiro-dre-consolidada',
    'metas-e-projecao': 'financeiro-metas-projecao',
    'faturamento-tiss': 'tiss-elaboracao-contas',
    tiss: 'tiss-elaboracao-contas',
    'guias-e-lotes': 'tiss-elaboracao-contas',
    'lotes-tiss': 'tiss-remessas-xml',
    lotes: 'tiss-remessas-xml',
    remessas: 'tiss-remessas-xml',
    glosas: 'tiss-controle-glosas',
    'gestao-de-glosas': 'tiss-controle-glosas',
    'glosas-e-recursos': 'tiss-controle-glosas',
    'perdas-bi': 'tiss-perdas-bi',
    'meu-financeiro': 'meu-financeiro-profissional',
    'meu-painel': 'meu-financeiro-profissional',
    'meu-historico': 'meu-financeiro-profissional',
    'minha-producao': 'meu-financeiro-profissional',
    'convenios-e-reembolsos': 'tiss-configuracao-convenios',
    convenios: 'tiss-configuracao-convenios',
    'regras-de-reembolso': 'financeiro-regras-reembolso',
    'reembolso-por-paciente': 'financeiro-regras-reembolso',
    'chat-interno': 'comunicacao-chat-interno',
    whatsapp: 'crm-whatsapp-automacoes',
    notificacoes: 'comunicacao-notificacoes',
    fluxomed: 'fluxomed-crm-pipeline',
    automacoes: 'fluxomed-crm-pipeline',
    pipeline: 'fluxomed-crm-pipeline',
    crm: 'fluxomed-crm-pipeline',
    estoque: 'gestao-estoque',
    relatorios: 'gestao-relatorios-analytics',
    'termos-legais': 'gestao-termos-legais',
    importacao: 'gestao-importacao-dados',
    automacao: 'gestao-automacao',
    painel: 'gestao-automacao',
    auditoria: 'gestao-logs-auditoria',
    'minha-clinica': 'configuracoes-minha-clinica',
    configuracoes: 'configuracoes-minha-clinica',
    'pagina-publica': 'configuracoes-pagina-publica',
    'configuracoes-teleconsulta': 'configuracoes-teleconsulta',
    usuarios: 'configuracoes-rbac-lgpd',
    terapias: 'configuracoes-terapias',
    assinatura: 'configuracoes-assinatura',
    seguranca: 'configuracoes-seguranca',
    integracoes: 'configuracoes-integracoes',
    'dispositivos-pareados': 'configuracoes-dispositivos-pareados',
    'master-hub': 'admin-plataforma-super-admin',
    clinicas: 'admin-plataforma-super-admin',
    planos: 'admin-plataforma-super-admin',
    cobranca: 'admin-plataforma-super-admin',
    grupos: 'admin-plataforma-super-admin',
    'relatorios-globais': 'admin-plataforma-super-admin',
    'api-keys': 'admin-plataforma-super-admin',
    'health-check': 'admin-plataforma-super-admin',
    'super-admins': 'admin-plataforma-super-admin',
}

/**
 * Retorna o anchor exato da Central de Ajuda para qualquer item/subitem da Sidebar pelo seu href.
 */
export function getHelpAnchorForMenuHref(href: string, fallbackTitle?: string): string {
    if (HELP_ROUTE_TO_ANCHOR[href]) {
        return HELP_ROUTE_TO_ANCHOR[href]
    }
    const sorted = Object.entries(HELP_ROUTE_TO_ANCHOR).sort(([a], [b]) => b.length - a.length)
    for (const [route, anchor] of sorted) {
        if (href === route || href.startsWith(`${route}/`)) {
            return anchor
        }
    }
    if (fallbackTitle) {
        const slug = fallbackTitle
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '')
        return HELP_LEGACY_HASH_ALIASES[slug] || slug
    }
    return 'painel-principal-dashboard'
}

/**
 * Normaliza qualquer #hash da URL para o anchor canônico do artigo correspondente.
 */
export function resolveHelpHashToAnchor(rawHash: string): string {
    const clean = rawHash.replace(/^#/, '').trim().toLowerCase()
    if (!clean) return ''
    return HELP_LEGACY_HASH_ALIASES[clean] || clean
}

const ROUTE_TO_FEATURE_KEY: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/dashboard/agenda': 'agenda',
    '/dashboard/minha-agenda': 'agenda',
    '/dashboard/horarios': 'horarios',
    '/dashboard/recepcao': 'recepcao',
    '/dashboard/medicos': 'medicos',
    '/dashboard/pre-cadastros': 'pre_cadastros',
    '/dashboard/pacientes': 'pacientes',
    '/dashboard/prontuarios': 'prontuarios',
    '/dashboard/prescricoes': 'prescricoes',
    '/dashboard/documentos': 'documentos',
    '/dashboard/configuracoes/templates-prontuario': 'templates_prontuario',
    '/dashboard/planos-terapeuticos': 'planos_terapeuticos',
    '/dashboard/evolucoes': 'evolucoes',
    '/dashboard/controle-faltas': 'controle_faltas',
    '/dashboard/terapia/fila-espera': 'fila_espera',
    '/dashboard/terapia/encaminhamentos': 'encaminhamentos',
    '/dashboard/terapia/supervisao': 'supervisao',
    '/dashboard/terapia': 'bi_terapia',
    '/dashboard/convenios': 'convenios',
    '/dashboard/tiss': 'faturamento_tiss',
    '/dashboard/financeiro/fechamento': 'fechamento_caixa',
    '/dashboard/financeiro': 'financeiro',
    '/dashboard/pagamentos': 'pagamentos',
    '/dashboard/financial/credits': 'creditos_pacientes',
    '/dashboard/financial/payroll': 'repasse_medico',
    '/dashboard/financial/dre': 'dre',
    '/dashboard/financial/goals': 'dre',
    '/dashboard/meu-financeiro': 'meu_financeiro',
    '/dashboard/chat': 'chat',
    '/dashboard/whatsapp': 'whatsapp',
    '/dashboard/notificacoes': 'notificacoes',
    '/dashboard/crm': 'fluxomed',
    '/dashboard/estoque': 'estoque',
    '/dashboard/relatorios': 'relatorios',
    '/dashboard/termos': 'termos_legais',
    '/dashboard/importacao': 'importacao',
    '/dashboard/automacao': 'automacao',
    '/dashboard/logs-auditoria': 'logs_auditoria',
    '/dashboard/configuracoes/pagina-publica': 'pagina_publica',
    '/dashboard/configuracoes/teleconsulta': 'teleconsulta',
    '/dashboard/configuracoes/usuarios': 'usuarios',
    '/dashboard/configuracoes/terapias': 'terapias_config',
    '/dashboard/configuracoes/assinatura': 'assinatura',
    '/dashboard/seguranca': 'seguranca',
    '/dashboard/integracoes': 'integracoes',
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
 * Verifica se o usuário tem permissão REAL (Role + Allowlist de Clínica + Plano + Override Master Hub)
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

    // Super Admin (fora de impersonação) tem bypass de allowlists, plano e overrides
    if (ctx.role === 'SUPER_ADMIN') {
        return true
    }

    // 2. Allowlists exclusivas de clínica (alinhadas 100% com sidebar.tsx)
    if (route === '/dashboard/contratos' || route.startsWith('/dashboard/contratos/')) {
        if (!isClinicAuthorizedForContracts(ctx.clinicId)) {
            return false
        }
    }

    if (route === '/dashboard/teleconsulta' || route.startsWith('/dashboard/teleconsulta/')) {
        const teleconsultaAuthorized = isClinicAuthorizedForTeleconsulta(ctx.clinicId, {
            isDemo: ctx.isDemo === true,
            slug: ctx.clinicSlug,
            clinicName: ctx.clinicName,
            isSuperAdmin: false,
        })
        if (!teleconsultaAuthorized) {
            return false
        }
    }

    // 3. Camada de overrides customizados do Master Hub
    const featureKey = resolveFeatureKey(route, options?.featureKey)
    const customPerm = featureKey ? ctx.permissions?.[featureKey] : undefined

    if (customPerm && customPerm.enabled === false) {
        return false
    }

    // 4. Camada de Plano mínimo (ROUTE_MIN_PLAN + minPlan explícito)
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
        if (customPerm && customPerm.enabled === true) {
            return true
        }
        return planMeetsRequirement(ctx.planType, effectiveMinPlan)
    }

    return true
}

/**
 * Verifica se o usuário tem permissão para VISUALIZAR um artigo na Central de Ajuda.
 */
export function canViewHelpArticle(article: KnowledgeArticle, ctx: HelpAccessContext): boolean {
    if (!ctx.role) return false

    if (ctx.role === 'SUPER_ADMIN') {
        return true
    }

    // Artigos exclusivos de SUPER_ADMIN nunca aparecem para nenhum usuário de clínica
    if (article.roles.length === 1 && article.roles[0] === 'SUPER_ADMIN') {
        return false
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
    const isReceptionMedicosException =
        ctx.role === 'RECEPTIONIST' &&
        article.id === 'equipe-profissionais-medicos' &&
        (ctx.clinicId === ESPACO_INCLUIR_CLINIC_ID || ctx.clinicId === WORLD_SENSORY_CLINIC_ID)

    if (!isRoleDirectlyListed && !isCoordinatorAgendaException && !isReceptionMedicosException) {
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
 * Retorna true se o usuário pode usar o seletor para filtrar guias de outros perfis da equipe.
 */
export function canFilterOtherRolesInHelp(role: string | null | undefined): boolean {
    return role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN'
}

/**
 * Retorna os botões de atalho do cabeçalho de /dashboard/help estritamente filtrados
 * pelas permissões reais do usuário (perfil + allowlist + plano + overrides).
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
        label: 'Planos Terapêuticos e ABA',
        query: 'planos terapeuticos aba',
        requiredArticleIds: ['planos-terapeuticos'],
    },
    {
        label: 'Teleconsulta e Sala Instantânea',
        query: 'teleconsulta sala',
        requiredArticleIds: ['teleconsulta'],
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
