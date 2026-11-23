/**
 * Fonte Única de Verdade — RBAC de Páginas do Dashboard (/dashboard/**)
 *
 * 100% compatível com Edge Runtime (middleware.ts) e Client Components (Help, Sidebar).
 * NENHUM import de Node.js ou browser permitido neste arquivo.
 */

export type DashboardRole =
    | 'SUPER_ADMIN'
    | 'CLINIC_ADMIN'
    | 'DOCTOR'
    | 'RECEPTIONIST'
    | 'FINANCIAL'
    | 'NURSE'
    | 'STAFF'
    | 'READONLY'

export const ESPACO_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'
export const WORLD_SENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
export const JESSICA_WORLD_SENSORY_USER_ID = 'd9c6ac75-bc7c-431a-ba76-73ecb268fef8'

/**
 * Rotas de Plataforma exclusivas de SUPER_ADMIN (ocultas — retornam 404 para outros perfis)
 */
export const SUPER_ADMIN_ONLY_ROUTES: readonly string[] = [
    '/system-master-hub',
    '/api/super-admin',
    '/dashboard/super',
    '/api/super',
    '/dashboard/clinicas',
    '/dashboard/planos',
    '/dashboard/cobranca',
    '/dashboard/grupos',
    '/dashboard/relatorios-globais',
    '/dashboard/api-keys',
    '/dashboard/auditoria',
    '/dashboard/health',
    '/dashboard/sistema',
    '/dashboard/debug-tools',
    '/dashboard/marketplace',
]

/**
 * Compara um pathname contra um prefixo de rota por segmento exato.
 * Evita colisões como '/dashboard/planos' casando com '/dashboard/planos-terapeuticos'
 * ou '/api/super' casando com '/api/supervision'.
 */
export function matchesRoutePrefix(pathname: string, route: string): boolean {
    if (route.endsWith('/')) {
        return pathname.startsWith(route)
    }
    return pathname === route || pathname.startsWith(`${route}/`)
}

/**
 * Retorna true apenas quando o pathname corresponde exatamente a uma rota de plataforma SUPER_ADMIN.
 */
export function isSuperAdminOnlyRoute(pathname: string): boolean {
    return SUPER_ADMIN_ONLY_ROUTES.some((route) => matchesRoutePrefix(pathname, route))
}

/**
 * Rotas protegidas por perfil no Dashboard (Hard Gate no Servidor para URLs diretas na barra de endereço)
 * Alinhadas integralmente com components/layout/sidebar.tsx e normas de sigilo CFM/CFP/LGPD.
 */
export const ROLE_PROTECTED_PAGES: Record<string, DashboardRole[]> = {
    // Rotas de Plataforma Super Admin
    '/dashboard/clinicas': ['SUPER_ADMIN'],
    '/dashboard/planos': ['SUPER_ADMIN'],
    '/dashboard/cobranca': ['SUPER_ADMIN'],
    '/dashboard/grupos': ['SUPER_ADMIN'],
    '/dashboard/relatorios-globais': ['SUPER_ADMIN'],
    '/dashboard/api-keys': ['SUPER_ADMIN'],
    '/dashboard/auditoria': ['SUPER_ADMIN'],
    '/dashboard/health': ['SUPER_ADMIN'],
    '/dashboard/sistema': ['SUPER_ADMIN'],
    '/dashboard/super': ['SUPER_ADMIN'],
    '/dashboard/debug-tools': ['SUPER_ADMIN'],
    '/dashboard/marketplace': ['SUPER_ADMIN'],

    // CRM / FluxoMed e Pipeline: Apenas administradores
    '/dashboard/crm': ['CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Gestão Administrativa da Clínica: Apenas administradores
    '/dashboard/medicos': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/controle-faltas': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/seguranca': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/logs-auditoria': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/automacao': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/termos': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/onboarding': ['CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Configurações críticas da clínica: Apenas administradores
    '/dashboard/configuracoes/usuarios': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/assinatura': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/plano': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/smtp': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/pagamento': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/dispositivos': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/pagina-publica': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/terapias': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/modelos-documentos': ['CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Templates de prontuário: Apenas administradores e corpo clínico
    '/dashboard/configuracoes/templates-prontuario': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],

    // Regras de reembolso: Administradores e Financeiro
    '/dashboard/configuracoes/reembolso': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/configuracoes/reembolso-paciente': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],

    // Base de configurações (aba Minha Clínica): Apenas administradores e recepção
    '/dashboard/configuracoes': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],

    // Faturamento TISS e Convênios: Administradores e Financeiro (alinhado 100% com Sidebar)
    '/dashboard/tiss': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/convenios': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],

    // Financeiro Geral da Clínica: Administradores e Financeiro (médicos, recepção, equipe e readonly bloqueados)
    '/dashboard/financeiro': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/financial': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/pagamentos': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/relatorios': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/notificacoes': ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'],

    // Meu Financeiro (Repasse individual de honorários): Apenas médico/terapeuta e administrador
    '/dashboard/meu-financeiro': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Agenda Geral e Horários da Clínica: Administradores, Recepção e Equipe (exceção: DOCTOR Coordenadora)
    '/dashboard/agenda': ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'],
    '/dashboard/horarios': ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'],
    '/dashboard/agendamentos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'],

    // Minha Agenda: Apenas Profissional/Terapeuta e Administrador
    '/dashboard/minha-agenda': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Prontuários clínicos, Evoluções, Planos Terapêuticos, Prescrições, Fila e Sala de Consulta:
    // Exclusivo corpo clínico e administradores (recepção, financeiro e readonly bloqueados por sigilo CFM/CFP)
    '/dashboard/prontuarios': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/prescricoes': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/evolucoes': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/planos-terapeuticos': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/manual-evolucao': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/fila': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/consultas': ['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'],

    // Terapia — Fluxo Clínico (Fila de espera, Encaminhamentos e Supervisão)
    '/dashboard/terapia/fila-espera': ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/terapia/encaminhamentos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'],
    '/dashboard/terapia/supervisao': ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'SUPER_ADMIN'],

    // Terapia — Indicadores de Evolução e BI (Restrito a Admin; Coordenadora DOCTOR liberada apenas em conformidade-evolucao abaixo)
    '/dashboard/terapia/retencao': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/risco-evasao': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/aderencia': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/conformidade-evolucao': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/desfechos': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/carga-trabalho': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/demografico': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/receita-modalidade': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/sazonalidade': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia/nps': ['CLINIC_ADMIN', 'SUPER_ADMIN'],
    '/dashboard/terapia': ['CLINIC_ADMIN', 'SUPER_ADMIN'],

    // Pacientes (diretório cadastral; subrotas clínicas psicomotricidade/planos-sessao restringidas abaixo)
    '/dashboard/pacientes': ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'STAFF', 'SUPER_ADMIN'],

    // Documentos, Contratos, Recepção, Pré-cadastros, WhatsApp, Estoque e Importação
    '/dashboard/documentos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/contratos': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/recepcao': ['RECEPTIONIST', 'CLINIC_ADMIN', 'STAFF', 'SUPER_ADMIN'],
    '/dashboard/pre-cadastros': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/whatsapp': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/estoque': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/importacao': ['CLINIC_ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'],

    // Teleconsulta, Triagem e Atendimentos
    '/dashboard/teleconsulta': ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/triagem': ['CLINIC_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'SUPER_ADMIN'],
    '/dashboard/atendimentos': ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'],

    // Comunicação Interna e Tarefas
    '/dashboard/chat': ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'FINANCIAL', 'SUPER_ADMIN'],
    '/dashboard/tarefas': ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'],
}

/**
 * Rotas ordenadas da mais específica para a mais genérica (garante precedência correta de prefixos)
 */
export const SORTED_ROLE_PROTECTED_PAGES: ReadonlyArray<[string, DashboardRole[]]> = Object.entries(
    ROLE_PROTECTED_PAGES
).sort(([a], [b]) => b.length - a.length)

/**
 * Subrotas clínicas sensíveis sob /dashboard/pacientes/[id]/*
 * Restritas estritamente a CLINIC_ADMIN, DOCTOR e SUPER_ADMIN (sigilo clínico).
 */
const PATIENT_CLINICAL_SUBROUTE_REGEX = /^\/dashboard\/pacientes\/[^/]+\/(psicomotricidade|planos-sessao)(\/|$)/

export interface DashboardPageAccessParams {
    pathname: string
    role: string | null | undefined
    isCoordinator?: boolean
    clinicId?: string | null
    userId?: string | null
    userEmail?: string | null
}

export interface DashboardPageAccessResult {
    allowed: boolean
    matchedRoute?: string
    reason?: 'unauthenticated' | 'super_admin_only' | 'clinical_patient_subroute' | 'unauthorized_role'
}

/**
 * Avalia de forma determinística e fail-closed se um usuário pode acessar uma página /dashboard/**.
 * Usada tanto no middleware.ts (servidor) quanto na Central de Ajuda (/dashboard/help).
 */
export function evaluateDashboardPageAccess(params: DashboardPageAccessParams): DashboardPageAccessResult {
    const { pathname, role, isCoordinator = false, clinicId, userId, userEmail } = params

    // Fail-closed: sem perfil definido não libera nenhuma página protegida
    if (!role) {
        return { allowed: false, reason: 'unauthenticated' }
    }

    // Super Admin possui bypass global
    if (role === 'SUPER_ADMIN') {
        return { allowed: true }
    }

    // Bloqueio imediato para rotas ocultas exclusivas de SUPER_ADMIN
    for (const superRoute of SUPER_ADMIN_ONLY_ROUTES) {
        if (pathname === superRoute || pathname.startsWith(`${superRoute}/`)) {
            return { allowed: false, matchedRoute: superRoute, reason: 'super_admin_only' }
        }
    }

    // Proteção específica de subrotas clínicas de pacientes (psicomotricidade e planos de sessão)
    if (PATIENT_CLINICAL_SUBROUTE_REGEX.test(pathname)) {
        if (role === 'CLINIC_ADMIN' || role === 'DOCTOR') {
            return { allowed: true, matchedRoute: pathname }
        }
        return { allowed: false, matchedRoute: pathname, reason: 'clinical_patient_subroute' }
    }

    // Checagem da tabela ROLE_PROTECTED_PAGES por especificidade decrescente
    for (const [route, allowedRoles] of SORTED_ROLE_PROTECTED_PAGES) {
        if (pathname === route || pathname.startsWith(`${route}/`)) {
            if (allowedRoles.includes(role as DashboardRole)) {
                return { allowed: true, matchedRoute: route }
            }

            // Exceções Homologadas (alinhadas 100% com sidebar.tsx):
            // 1. Coordenadora DOCTOR autorizada a acessar a Agenda Geral (/dashboard/agenda)
            //    e Indicadores de Evolução (/dashboard/terapia/conformidade-evolucao)
            if (
                role === 'DOCTOR' &&
                isCoordinator &&
                (route === '/dashboard/agenda' || route === '/dashboard/terapia/conformidade-evolucao')
            ) {
                return { allowed: true, matchedRoute: route }
            }

            // 2. Espaço Incluir e WorldSensory: Recepção autorizada a acessar /dashboard/medicos
            if (
                role === 'RECEPTIONIST' &&
                route === '/dashboard/medicos' &&
                (clinicId === ESPACO_INCLUIR_CLINIC_ID || clinicId === WORLD_SENSORY_CLINIC_ID)
            ) {
                return { allowed: true, matchedRoute: route }
            }

            // 3. WorldSensory: Recepção (ou usuária Jéssica) autorizada a acessar /dashboard/horarios e /dashboard/agenda
            const isJessicaWorldSensory =
                clinicId === WORLD_SENSORY_CLINIC_ID &&
                (userId === JESSICA_WORLD_SENSORY_USER_ID ||
                    (userEmail || '').toLowerCase() === 'wsadm.jessica@gmail.com')
            if (isJessicaWorldSensory && (route === '/dashboard/horarios' || route === '/dashboard/agenda')) {
                return { allowed: true, matchedRoute: route }
            }
            if (clinicId === WORLD_SENSORY_CLINIC_ID && role === 'RECEPTIONIST' && route === '/dashboard/horarios') {
                return { allowed: true, matchedRoute: route }
            }

            return { allowed: false, matchedRoute: route, reason: 'unauthorized_role' }
        }
    }

    // Rotas universais (/dashboard, /dashboard/perfil, /dashboard/help, /dashboard/upgrade-required)
    return { allowed: true }
}

