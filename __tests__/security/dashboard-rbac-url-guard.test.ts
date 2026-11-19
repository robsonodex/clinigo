import fs from 'fs'
import path from 'path'
import {
    evaluateDashboardPageAccess,
    SUPER_ADMIN_ONLY_ROUTES,
    ESPACO_INCLUIR_CLINIC_ID,
    WORLD_SENSORY_CLINIC_ID,
    type DashboardRole,
} from '@/lib/constants/dashboard-rbac'
import {
    canAccessHelpRoute,
    canFilterOtherRolesInHelp,
    canViewHelpArticle,
    getAccessibleHelpArticles,
    getAccessibleHelpModules,
    getPermittedHeaderShortcuts,
    getPermittedQuickSuggestions,
} from '@/lib/help/help-access'
import { KNOWLEDGE_BASE_ARTICLES } from '@/lib/help/knowledge-base'

describe('Blindagem RBAC Completa — Barra de Endereço (Middleware) + Central de Ajuda (/dashboard/help) + Sidebar', () => {
    describe('1. Proteção de URL direta na barra de endereço (evaluateDashboardPageAccess)', () => {
        it('deve operar em modo fail-closed quando role é null ou undefined', () => {
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/tiss', role: null }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/prontuarios', role: undefined }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/configuracoes', role: '' }).allowed).toBe(false)
        })

        it('DOCTOR (não coordenador) deve ser BLOQUEADO em todas as rotas administrativas, financeiras, TISS, recepção e Super Admin', () => {
            const blockedForDoctor = [
                '/dashboard/configuracoes',
                '/dashboard/configuracoes/usuarios',
                '/dashboard/configuracoes/assinatura',
                '/dashboard/configuracoes/reembolso',
                '/dashboard/configuracoes/reembolso-paciente',
                '/dashboard/configuracoes/modelos-documentos',
                '/dashboard/tiss',
                '/dashboard/tiss/glosas',
                '/dashboard/tiss/batches',
                '/dashboard/tiss/reports/loss-analysis',
                '/dashboard/convenios',
                '/dashboard/financeiro',
                '/dashboard/financial/payroll',
                '/dashboard/financial/dre',
                '/dashboard/pagamentos',
                '/dashboard/relatorios',
                '/dashboard/notificacoes',
                '/dashboard/crm',
                '/dashboard/crm/pipeline',
                '/dashboard/medicos',
                '/dashboard/agenda',
                '/dashboard/horarios',
                '/dashboard/agendamentos/pendentes',
                '/dashboard/recepcao',
                '/dashboard/pre-cadastros',
                '/dashboard/documentos',
                '/dashboard/contratos',
                '/dashboard/whatsapp',
                '/dashboard/estoque',
                '/dashboard/importacao',
                '/dashboard/logs-auditoria',
                '/dashboard/seguranca',
                '/dashboard/controle-faltas',
                '/dashboard/marketplace',
                '/dashboard/clinicas',
                '/dashboard/planos',
                '/dashboard/super/admins',
            ]

            for (const pathname of blockedForDoctor) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'DOCTOR', isCoordinator: false })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: false })
            }
        })

        it('DOCTOR deve ter acesso LIBERADO exclusivamente às rotas clínicas e pessoais pertinentes', () => {
            const allowedForDoctor = [
                '/dashboard/minha-agenda',
                '/dashboard/prontuarios',
                '/dashboard/prontuarios/123',
                '/dashboard/evolucoes',
                '/dashboard/planos-terapeuticos',
                '/dashboard/meu-financeiro',
                '/dashboard/meu-financeiro/historico',
                '/dashboard/pacientes',
                '/dashboard/pacientes/abc/psicomotricidade',
                '/dashboard/pacientes/abc/planos-sessao/fisio',
                '/dashboard/configuracoes/templates-prontuario',
                '/dashboard/chat',
                '/dashboard/tarefas',
                '/dashboard/terapia/fila-espera',
                '/dashboard/terapia/retencao',
            ]

            for (const pathname of allowedForDoctor) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'DOCTOR', isCoordinator: false })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: true })
            }
        })

        it('DOCTOR com isCoordinator=true pode acessar /dashboard/agenda, mas segue bloqueado em áreas administrativas e financeiras', () => {
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/agenda', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(true)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/configuracoes/usuarios', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(false)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/tiss', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(false)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/financeiro', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(false)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/crm', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(false)
        })

        it('RECEPTIONIST deve ser BLOQUEADO em prontuários, evoluções, TISS, convênios, financeiro, CRM, BI terapia e subrotas clínicas de paciente', () => {
            const blockedForReception = [
                '/dashboard/prontuarios',
                '/dashboard/evolucoes',
                '/dashboard/planos-terapeuticos',
                '/dashboard/prescricoes',
                '/dashboard/tiss',
                '/dashboard/tiss/glosas',
                '/dashboard/tiss/batches',
                '/dashboard/tiss/reports/loss-analysis',
                '/dashboard/convenios',
                '/dashboard/financeiro',
                '/dashboard/financial/payroll',
                '/dashboard/configuracoes/reembolso',
                '/dashboard/configuracoes/reembolso-paciente',
                '/dashboard/configuracoes/usuarios',
                '/dashboard/crm',
                '/dashboard/crm/pipeline',
                '/dashboard/meu-financeiro',
                '/dashboard/minha-agenda',
                '/dashboard/medicos',
                '/dashboard/terapia/receita-modalidade',
                '/dashboard/terapia/retencao',
                '/dashboard/terapia/nps',
                '/dashboard/pacientes/123/psicomotricidade',
                '/dashboard/pacientes/123/planos-sessao/terapia-ocupacional',
                '/dashboard/logs-auditoria',
                '/dashboard/marketplace',
                '/dashboard/clinicas',
            ]

            for (const pathname of blockedForReception) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'RECEPTIONIST' })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: false })
            }

            // Exceções homologadas preservadas: Espaço Incluir e WorldSensory em /dashboard/medicos
            expect(
                evaluateDashboardPageAccess({
                    pathname: '/dashboard/medicos',
                    role: 'RECEPTIONIST',
                    clinicId: ESPACO_INCLUIR_CLINIC_ID,
                }).allowed
            ).toBe(true)
            expect(
                evaluateDashboardPageAccess({
                    pathname: '/dashboard/medicos',
                    role: 'RECEPTIONIST',
                    clinicId: WORLD_SENSORY_CLINIC_ID,
                }).allowed
            ).toBe(true)
        })

        it('FINANCIAL deve ser BLOQUEADO em prontuários, evoluções, pacientes, agenda, recepção, WhatsApp, CRM e usuários', () => {
            const blockedForFinancial = [
                '/dashboard/prontuarios',
                '/dashboard/evolucoes',
                '/dashboard/planos-terapeuticos',
                '/dashboard/prescricoes',
                '/dashboard/pacientes',
                '/dashboard/agenda',
                '/dashboard/minha-agenda',
                '/dashboard/recepcao',
                '/dashboard/horarios',
                '/dashboard/pre-cadastros',
                '/dashboard/whatsapp',
                '/dashboard/crm',
                '/dashboard/configuracoes',
                '/dashboard/configuracoes/usuarios',
                '/dashboard/terapia/fila-espera',
                '/dashboard/terapia/retencao',
                '/dashboard/marketplace',
            ]

            for (const pathname of blockedForFinancial) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'FINANCIAL' })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: false })
            }

            const allowedForFinancial = [
                '/dashboard/financeiro',
                '/dashboard/financial/payroll',
                '/dashboard/financial/dre',
                '/dashboard/pagamentos',
                '/dashboard/tiss',
                '/dashboard/tiss/glosas',
                '/dashboard/tiss/batches',
                '/dashboard/convenios',
                '/dashboard/configuracoes/reembolso',
                '/dashboard/configuracoes/reembolso-paciente',
                '/dashboard/chat',
            ]

            for (const pathname of allowedForFinancial) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'FINANCIAL' })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: true })
            }
        })

        it('READONLY, NURSE e STAFF devem ser bloqueados de áreas administrativas, financeiras, TISS e prontuários', () => {
            const sensitiveRoutes = [
                '/dashboard/prontuarios',
                '/dashboard/evolucoes',
                '/dashboard/tiss',
                '/dashboard/convenios',
                '/dashboard/financeiro',
                '/dashboard/financial/payroll',
                '/dashboard/crm',
                '/dashboard/configuracoes/usuarios',
                '/dashboard/logs-auditoria',
                '/dashboard/marketplace',
            ]

            for (const role of ['READONLY', 'NURSE', 'STAFF'] as DashboardRole[]) {
                for (const pathname of sensitiveRoutes) {
                    const res = evaluateDashboardPageAccess({ pathname, role })
                    expect({ role, pathname, allowed: res.allowed }).toEqual({ role, pathname, allowed: false })
                }
            }

            // READONLY bloqueado até de pacientes, agenda, recepção e chat
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/pacientes', role: 'READONLY' }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/agenda', role: 'READONLY' }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/chat', role: 'READONLY' }).allowed).toBe(false)
        })

        it('CLINIC_ADMIN deve ser bloqueado em TODAS as rotas exclusivas de SUPER_ADMIN (inclusive /dashboard/marketplace)', () => {
            for (const route of SUPER_ADMIN_ONLY_ROUTES) {
                if (route.startsWith('/dashboard')) {
                    const res = evaluateDashboardPageAccess({ pathname: route, role: 'CLINIC_ADMIN' })
                    expect({ route, allowed: res.allowed, reason: res.reason }).toEqual({
                        route,
                        allowed: false,
                        reason: 'super_admin_only',
                    })
                }
            }
        })
    })

    describe('2. Blindagem RBAC e de Plano dentro de /dashboard/help (help-access.ts)', () => {
        it('deve ser fail-closed quando não há perfil definido', () => {
            const ctx = { role: null, planType: 'ENTERPRISE' as const }
            expect(getAccessibleHelpArticles(ctx)).toEqual([])
            expect(getPermittedHeaderShortcuts(ctx)).toEqual([])
            expect(canAccessHelpRoute('/dashboard/prontuarios', ctx)).toBe(false)
        })

        it('DOCTOR não pode ver nenhum guia, botão ou sugestão de Administração, TISS, Convênios, Financeiro da Clínica, Recepção ou Excel em lote', () => {
            const ctx = { role: 'DOCTOR', isCoordinator: false, planType: 'PROFESSIONAL' as const }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)
            const suggestions = getPermittedQuickSuggestions(articles)

            expect(canFilterOtherRolesInHelp('DOCTOR')).toBe(false)
            expect(articleIds).toContain('minha-agenda-profissional')
            expect(articleIds).toContain('prontuario-eletronico-evolucao')
            expect(articleIds).toContain('prontuarios-consulta-historico')
            expect(articleIds).toContain('meu-financeiro-profissional')
            expect(articleIds).toContain('diretorio-pacientes-cadastro')

            // Proibições absolutas para DOCTOR
            const forbiddenForDoctor = [
                'tiss-configuracao-convenios',
                'tiss-recepcao-autorizacoes',
                'tiss-elaboracao-contas',
                'tiss-remessas-xml',
                'tiss-retorno-dryrun',
                'tiss-controle-glosas',
                'tiss-recursos-dossie',
                'tiss-repasse-glosas',
                'prontuarios-relatorio-evolucao-excel',
                'agenda-agendamento-atendimento',
                'fila-espera-horarios',
                'recepcao-checkin-painel-tv',
                'pre-cadastro-remoto-pacientes',
                'financeiro-lancamentos-caixa',
                'financeiro-repasses-medicos',
                'crm-whatsapp-automacoes',
                'fluxomed-crm-pipeline',
                'configuracoes-rbac-lgpd',
            ]
            for (const id of forbiddenForDoctor) {
                expect(articleIds).not.toContain(id)
            }

            // Atalhos do topo para DOCTOR: apenas Minha Agenda e Prontuários (SEM Excel e SEM TISS)
            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/minha-agenda', '/dashboard/prontuarios'])
            expect(shortcuts.some((s) => /excel|tiss/i.test(s.label))).toBe(false)
            expect(suggestions.some((s) => /excel|ctrl\+l|glosa|dossie/i.test(s.query))).toBe(false)
        })

        it('RECEPTIONIST não pode ver prontuários, evoluções, TISS/Glosas/Remessas, convênios, financeiro, CRM ou usuários', () => {
            const ctx = { role: 'RECEPTIONIST', planType: 'PROFESSIONAL' as const }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)

            expect(canFilterOtherRolesInHelp('RECEPTIONIST')).toBe(false)
            expect(articleIds).toContain('agenda-agendamento-atendimento')
            expect(articleIds).toContain('recepcao-checkin-painel-tv')
            expect(articleIds).toContain('pre-cadastro-remoto-pacientes')
            expect(articleIds).toContain('crm-whatsapp-automacoes')

            const forbiddenForReception = [
                'tiss-configuracao-convenios',
                'tiss-elaboracao-contas',
                'tiss-remessas-xml',
                'tiss-retorno-dryrun',
                'tiss-controle-glosas',
                'tiss-recursos-dossie',
                'tiss-repasse-glosas',
                'prontuarios-relatorio-evolucao-excel',
                'prontuario-eletronico-evolucao',
                'prontuarios-consulta-historico',
                'financeiro-lancamentos-caixa',
                'financeiro-repasses-medicos',
                'fluxomed-crm-pipeline',
                'configuracoes-rbac-lgpd',
            ]
            for (const id of forbiddenForReception) {
                expect(articleIds).not.toContain(id)
            }

            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/agenda', '/dashboard/recepcao'])
        })

        it('FINANCIAL não pode ver prontuários, evoluções, agenda, recepção, pacientes, WhatsApp, CRM ou usuários', () => {
            const ctx = { role: 'FINANCIAL', planType: 'PROFESSIONAL' as const }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)

            expect(canFilterOtherRolesInHelp('FINANCIAL')).toBe(false)
            expect(articleIds).toContain('tiss-elaboracao-contas')
            expect(articleIds).toContain('tiss-controle-glosas')
            expect(articleIds).toContain('financeiro-lancamentos-caixa')
            expect(articleIds).toContain('financeiro-repasses-medicos')

            expect(articleIds).not.toContain('prontuarios-relatorio-evolucao-excel')
            expect(articleIds).not.toContain('prontuario-eletronico-evolucao')
            expect(articleIds).not.toContain('agenda-agendamento-atendimento')
            expect(articleIds).not.toContain('recepcao-checkin-painel-tv')
            expect(articleIds).not.toContain('diretorio-pacientes-cadastro')
            expect(articleIds).not.toContain('crm-whatsapp-automacoes')
            expect(articleIds).not.toContain('fluxomed-crm-pipeline')
            expect(articleIds).not.toContain('configuracoes-rbac-lgpd')

            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/tiss', '/dashboard/financeiro'])
        })

        it('READONLY não recebe nenhum guia ou botão para rotas restritas', () => {
            const ctx = { role: 'READONLY', planType: 'ENTERPRISE' as const }
            const articles = getAccessibleHelpArticles(ctx)
            expect(articles).toHaveLength(0)
            expect(getAccessibleHelpModules(articles)).toHaveLength(0)
            expect(getPermittedHeaderShortcuts(ctx)).toHaveLength(0)
        })

        it('deve respeitar plano contratado e overrides customizados do Master Hub (enabled true/false)', () => {
            // CLINIC_ADMIN no plano BASICO não vê TISS nem FluxoMed
            const basicAdmin = { role: 'CLINIC_ADMIN', planType: 'BASICO' as const }
            const basicIds = getAccessibleHelpArticles(basicAdmin).map((a) => a.id)
            expect(basicIds).not.toContain('tiss-elaboracao-contas')
            expect(basicIds).not.toContain('fluxomed-crm-pipeline')
            expect(getPermittedHeaderShortcuts(basicAdmin).some((s) => s.href === '/dashboard/tiss')).toBe(false)

            // Override enabled=true destrava Faturamento TISS mesmo no plano BASICO
            const basicAdminWithOverride = {
                role: 'CLINIC_ADMIN',
                planType: 'BASICO' as const,
                permissions: { faturamento_tiss: { enabled: true, isCustom: true } },
            }
            expect(getAccessibleHelpArticles(basicAdminWithOverride).map((a) => a.id)).toContain('tiss-elaboracao-contas')

            // Override enabled=false bloqueia Prontuários mesmo em plano ENTERPRISE
            const enterpriseDisabledPront = {
                role: 'CLINIC_ADMIN',
                planType: 'ENTERPRISE' as const,
                permissions: { prontuarios: { enabled: false, isCustom: true } },
            }
            const prontExcel = KNOWLEDGE_BASE_ARTICLES.find((a) => a.id === 'prontuarios-relatorio-evolucao-excel')!
            expect(canViewHelpArticle(prontExcel, enterpriseDisabledPront)).toBe(false)
        })
    })

    describe('3. Veracidade dos guias e posicionamento do botão Help na Sidebar', () => {
        it('todas as rotas referenciadas nos artigos do Help devem existir de verdade em app/dashboard', () => {
            const dashboardDir = path.join(process.cwd(), 'app', 'dashboard')
            const foundRoutes = new Set<string>()

            const walk = (dir: string, relParts: string[] = []) => {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.isDirectory()) {
                        const nextParts = entry.name.startsWith('(') ? relParts : [...relParts, entry.name]
                        walk(path.join(dir, entry.name), nextParts)
                    } else if (entry.name === 'page.tsx') {
                        foundRoutes.add(`/dashboard${relParts.length ? `/${relParts.join('/')}` : ''}`)
                    }
                }
            }

            walk(dashboardDir)

            for (const article of KNOWLEDGE_BASE_ARTICLES) {
                expect({ id: article.id, route: article.route, exists: foundRoutes.has(article.route) }).toEqual({
                    id: article.id,
                    route: article.route,
                    exists: true,
                })
            }
        })

        it('Sidebar deve exibir o botão Help na última posição do <nav> apontando para /dashboard/help com prefetch={false} e rounded-md', () => {
            const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'components/layout/sidebar.tsx'), 'utf8')
            const sectionsMapIdx = sidebarContent.indexOf('{filteredSections.map((section) => {')
            const helpLinkIdx = sidebarContent.indexOf('href="/dashboard/help"')
            const navCloseIdx = sidebarContent.indexOf('</nav>')

            expect(sectionsMapIdx).toBeGreaterThan(-1)
            expect(helpLinkIdx).toBeGreaterThan(sectionsMapIdx)
            expect(helpLinkIdx).toBeLessThan(navCloseIdx)

            const helpSection = sidebarContent.slice(helpLinkIdx, navCloseIdx)
            expect(helpSection).toContain('prefetch={false}')
            expect(helpSection).toContain('rounded-md')
            expect(helpSection).toContain('<span>Help</span>')
        })
    })
})

