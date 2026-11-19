import fs from 'fs'
import path from 'path'
import {
    evaluateDashboardPageAccess,
    isSuperAdminOnlyRoute,
    matchesRoutePrefix,
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
    getHelpAnchorForMenuHref,
    getPermittedHeaderShortcuts,
    getPermittedQuickSuggestions,
    resolveHelpHashToAnchor,
} from '@/lib/help/help-access'
import { KNOWLEDGE_BASE_ARTICLES } from '@/lib/help/knowledge-base'

describe('Blindagem RBAC Completa — Barra de Endereço (Middleware) + Central de Ajuda (/dashboard/help) + Sidebar (?)', () => {
    describe('1. Proteção de URL direta e Segmentação Exata (sem falso 404)', () => {
        it('deve impedir colisão de prefixo entre /dashboard/planos e /dashboard/planos-terapeuticos, e /api/super e /api/supervision', () => {
            expect(isSuperAdminOnlyRoute('/dashboard/planos')).toBe(true)
            expect(isSuperAdminOnlyRoute('/dashboard/planos/editar')).toBe(true)
            expect(isSuperAdminOnlyRoute('/dashboard/planos-terapeuticos')).toBe(false)
            expect(isSuperAdminOnlyRoute('/dashboard/planos-terapeuticos/123')).toBe(false)

            expect(isSuperAdminOnlyRoute('/api/super')).toBe(true)
            expect(isSuperAdminOnlyRoute('/api/super/admins')).toBe(true)
            expect(isSuperAdminOnlyRoute('/api/supervision')).toBe(false)
            expect(isSuperAdminOnlyRoute('/api/supervision/123')).toBe(false)

            expect(matchesRoutePrefix('/dashboard/planos-terapeuticos', '/dashboard/planos')).toBe(false)
            expect(matchesRoutePrefix('/dashboard/planos/novo', '/dashboard/planos')).toBe(true)
        })

        it('/dashboard/planos-terapeuticos deve abrir para CLINIC_ADMIN, DOCTOR e SUPER_ADMIN e bloquear os demais perfis', () => {
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/planos-terapeuticos', role: 'CLINIC_ADMIN' }).allowed).toBe(true)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/planos-terapeuticos', role: 'DOCTOR' }).allowed).toBe(true)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/planos-terapeuticos', role: 'SUPER_ADMIN' }).allowed).toBe(true)

            for (const blockedRole of ['RECEPTIONIST', 'FINANCIAL', 'STAFF', 'NURSE', 'READONLY'] as DashboardRole[]) {
                expect(
                    evaluateDashboardPageAccess({ pathname: '/dashboard/planos-terapeuticos', role: blockedRole }).allowed
                ).toBe(false)
            }
        })

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
                '/dashboard/terapia/conformidade-evolucao',
                '/dashboard/terapia/retencao',
                '/dashboard/terapia/receita-modalidade',
                '/dashboard/terapia/desfechos',
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
                '/dashboard/teleconsulta',
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
            ]

            for (const pathname of allowedForDoctor) {
                const res = evaluateDashboardPageAccess({ pathname, role: 'DOCTOR', isCoordinator: false })
                expect({ pathname, allowed: res.allowed }).toEqual({ pathname, allowed: true })
            }
        })

        it('DOCTOR com isCoordinator=true pode acessar /dashboard/agenda e /dashboard/terapia/conformidade-evolucao, mas segue bloqueado em áreas administrativas, BI e financeiras', () => {
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/agenda', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(true)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/terapia/conformidade-evolucao', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(true)
            expect(
                evaluateDashboardPageAccess({ pathname: '/dashboard/terapia/retencao', role: 'DOCTOR', isCoordinator: true }).allowed
            ).toBe(false)
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

        it('RECEPTIONIST deve ser BLOQUEADO em prontuários, evoluções, planos terapêuticos, TISS, convênios, financeiro, CRM, BI terapia e subrotas clínicas', () => {
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

            // Exceções homologadas preservadas
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

        it('FINANCIAL deve ser BLOQUEADO em prontuários, evoluções, pacientes, agenda, recepção, WhatsApp, CRM, teleconsulta e usuários', () => {
            const blockedForFinancial = [
                '/dashboard/prontuarios',
                '/dashboard/evolucoes',
                '/dashboard/planos-terapeuticos',
                '/dashboard/prescricoes',
                '/dashboard/pacientes',
                '/dashboard/agenda',
                '/dashboard/minha-agenda',
                '/dashboard/teleconsulta',
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
                '/dashboard/planos-terapeuticos',
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

            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/pacientes', role: 'READONLY' }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/agenda', role: 'READONLY' }).allowed).toBe(false)
            expect(evaluateDashboardPageAccess({ pathname: '/dashboard/chat', role: 'READONLY' }).allowed).toBe(false)
        })

        it('CLINIC_ADMIN deve ser bloqueado em TODAS as rotas exclusivas de SUPER_ADMIN (inclusive /dashboard/marketplace e /dashboard/planos)', () => {
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

    describe('2. Blindagem RBAC, Allowlists e Plano dentro de /dashboard/help (help-access.ts)', () => {
        it('deve ser fail-closed quando não há perfil definido', () => {
            const ctx = { role: null, planType: 'ENTERPRISE' as const }
            expect(getAccessibleHelpArticles(ctx)).toEqual([])
            expect(getPermittedHeaderShortcuts(ctx)).toEqual([])
            expect(canAccessHelpRoute('/dashboard/prontuarios', ctx)).toBe(false)
        })

        it('DOCTOR não pode ver nenhum guia, botão ou sugestão de Administração, TISS, Convênios, Financeiro da Clínica, Recepção ou Excel em lote', () => {
            const ctx = {
                role: 'DOCTOR',
                isCoordinator: false,
                planType: 'PROFESSIONAL' as const,
                clinicId: WORLD_SENSORY_CLINIC_ID,
            }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)
            const suggestions = getPermittedQuickSuggestions(articles)

            expect(canFilterOtherRolesInHelp('DOCTOR')).toBe(false)
            expect(articleIds).toContain('minha-agenda-profissional')
            expect(articleIds).toContain('teleconsulta')
            expect(articleIds).toContain('planos-terapeuticos')
            expect(articleIds).toContain('prontuario-eletronico-evolucao')
            expect(articleIds).toContain('prontuarios-consulta-historico')
            expect(articleIds).toContain('meu-financeiro-profissional')
            expect(articleIds).toContain('diretorio-pacientes-cadastro')

            const forbiddenForDoctor = [
                'tiss-configuracao-convenios',
                'tiss-recepcao-autorizacoes',
                'tiss-elaboracao-contas',
                'tiss-remessas-xml',
                'tiss-retorno-dryrun',
                'tiss-controle-glosas',
                'tiss-recursos-dossie',
                'tiss-repasse-glosas',
                'tiss-perdas-bi',
                'prontuarios-relatorio-evolucao-excel',
                'agenda-agendamento-atendimento',
                'fila-espera-horarios',
                'recepcao-checkin-painel-tv',
                'pre-cadastro-remoto-pacientes',
                'financeiro-lancamentos-caixa',
                'financeiro-repasses-medicos',
                'financeiro-dre-consolidada',
                'crm-whatsapp-automacoes',
                'fluxomed-crm-pipeline',
                'configuracoes-rbac-lgpd',
                'configuracoes-teleconsulta',
                'admin-plataforma-super-admin',
            ]
            for (const id of forbiddenForDoctor) {
                expect(articleIds).not.toContain(id)
            }

            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/minha-agenda', '/dashboard/prontuarios'])
            expect(shortcuts.some((s) => /excel|tiss/i.test(s.label))).toBe(false)
            expect(suggestions.some((s) => /excel|ctrl\+l|glosa|dossie/i.test(s.query))).toBe(false)
        })

        it('Allowlists de clínica devem bloquear Teleconsulta e Contratos para clínicas não autorizadas no Help', () => {
            const otherClinicAdmin = {
                role: 'CLINIC_ADMIN',
                clinicId: '99999999-9999-9999-9999-999999999999',
                planType: 'PROFESSIONAL' as const,
            }
            const otherIds = getAccessibleHelpArticles(otherClinicAdmin).map((a) => a.id)
            expect(otherIds).not.toContain('teleconsulta')
            expect(otherIds).not.toContain('contratos-assinaturas-modelos')
            expect(otherIds).not.toContain('admin-plataforma-super-admin')

            const worldSensoryAdmin = {
                role: 'CLINIC_ADMIN',
                clinicId: WORLD_SENSORY_CLINIC_ID,
                planType: 'PROFESSIONAL' as const,
            }
            const wsIds = getAccessibleHelpArticles(worldSensoryAdmin).map((a) => a.id)
            expect(wsIds).toContain('teleconsulta')
            expect(wsIds).toContain('contratos-assinaturas-modelos')
            expect(wsIds).not.toContain('admin-plataforma-super-admin')
        })

        it('RECEPTIONIST não pode ver prontuários, evoluções, planos terapêuticos, TISS/Glosas/Remessas, convênios, financeiro, CRM ou usuários', () => {
            const ctx = { role: 'RECEPTIONIST', planType: 'PROFESSIONAL' as const }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)

            expect(canFilterOtherRolesInHelp('RECEPTIONIST')).toBe(false)
            expect(articleIds).toContain('agenda-agendamento-atendimento')
            expect(articleIds).toContain('recepcao-checkin-painel-tv')
            expect(articleIds).toContain('pre-cadastro-remoto-pacientes')
            expect(articleIds).toContain('crm-whatsapp-automacoes')
            expect(articleIds).toContain('gestao-estoque')

            const forbiddenForReception = [
                'tiss-configuracao-convenios',
                'tiss-elaboracao-contas',
                'tiss-remessas-xml',
                'tiss-retorno-dryrun',
                'tiss-controle-glosas',
                'tiss-recursos-dossie',
                'tiss-repasse-glosas',
                'tiss-perdas-bi',
                'prontuarios-relatorio-evolucao-excel',
                'prontuario-eletronico-evolucao',
                'prontuarios-consulta-historico',
                'planos-terapeuticos',
                'financeiro-lancamentos-caixa',
                'financeiro-repasses-medicos',
                'fluxomed-crm-pipeline',
                'configuracoes-rbac-lgpd',
                'admin-plataforma-super-admin',
            ]
            for (const id of forbiddenForReception) {
                expect(articleIds).not.toContain(id)
            }

            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/agenda', '/dashboard/recepcao'])
        })

        it('FINANCIAL não pode ver prontuários, evoluções, planos terapêuticos, agenda, teleconsulta, recepção, pacientes, WhatsApp, CRM ou usuários', () => {
            const ctx = { role: 'FINANCIAL', planType: 'PROFESSIONAL' as const, clinicId: WORLD_SENSORY_CLINIC_ID }
            const articles = getAccessibleHelpArticles(ctx)
            const articleIds = articles.map((a) => a.id)
            const shortcuts = getPermittedHeaderShortcuts(ctx)

            expect(canFilterOtherRolesInHelp('FINANCIAL')).toBe(false)
            expect(articleIds).toContain('tiss-elaboracao-contas')
            expect(articleIds).toContain('tiss-controle-glosas')
            expect(articleIds).toContain('tiss-perdas-bi')
            expect(articleIds).toContain('financeiro-lancamentos-caixa')
            expect(articleIds).toContain('financeiro-repasses-medicos')
            expect(articleIds).toContain('financeiro-dre-consolidada')

            expect(articleIds).not.toContain('prontuarios-relatorio-evolucao-excel')
            expect(articleIds).not.toContain('prontuario-eletronico-evolucao')
            expect(articleIds).not.toContain('planos-terapeuticos')
            expect(articleIds).not.toContain('teleconsulta')
            expect(articleIds).not.toContain('agenda-agendamento-atendimento')
            expect(articleIds).not.toContain('recepcao-checkin-painel-tv')
            expect(articleIds).not.toContain('diretorio-pacientes-cadastro')
            expect(articleIds).not.toContain('crm-whatsapp-automacoes')
            expect(articleIds).not.toContain('fluxomed-crm-pipeline')
            expect(articleIds).not.toContain('configuracoes-rbac-lgpd')
            expect(articleIds).not.toContain('admin-plataforma-super-admin')

            expect(shortcuts.map((s) => s.href)).toEqual(['/dashboard/tiss', '/dashboard/financeiro'])
        })

        it('READONLY vê apenas o painel inicial (/dashboard) e ZERO botões ou atalhos de áreas restritas', () => {
            const ctx = { role: 'READONLY', planType: 'ENTERPRISE' as const, clinicId: WORLD_SENSORY_CLINIC_ID }
            const articles = getAccessibleHelpArticles(ctx)
            expect(articles.map((a) => a.id)).toEqual(['painel-principal-dashboard'])
            expect(getPermittedHeaderShortcuts(ctx)).toHaveLength(0)
        })

        it('deve respeitar plano contratado e overrides customizados do Master Hub (enabled true/false)', () => {
            const basicAdmin = { role: 'CLINIC_ADMIN', planType: 'BASICO' as const }
            const basicIds = getAccessibleHelpArticles(basicAdmin).map((a) => a.id)
            expect(basicIds).not.toContain('tiss-elaboracao-contas')
            expect(basicIds).not.toContain('fluxomed-crm-pipeline')
            expect(getPermittedHeaderShortcuts(basicAdmin).some((s) => s.href === '/dashboard/tiss')).toBe(false)

            const basicAdminWithOverride = {
                role: 'CLINIC_ADMIN',
                planType: 'BASICO' as const,
                permissions: { faturamento_tiss: { enabled: true, isCustom: true } },
            }
            expect(getAccessibleHelpArticles(basicAdminWithOverride).map((a) => a.id)).toContain('tiss-elaboracao-contas')

            const enterpriseDisabledPront = {
                role: 'CLINIC_ADMIN',
                planType: 'ENTERPRISE' as const,
                permissions: { prontuarios: { enabled: false, isCustom: true } },
            }
            const prontExcel = KNOWLEDGE_BASE_ARTICLES.find((a) => a.id === 'prontuarios-relatorio-evolucao-excel')!
            expect(canViewHelpArticle(prontExcel, enterpriseDisabledPront)).toBe(false)
        })
    })

    describe('3. Veracidade dos guias, 100% dos ícones (?) da Sidebar e botão Help no final do menu', () => {
        it('todas as rotas referenciadas nos artigos do Help devem existir fisicamente em app/', () => {
            const appDir = path.join(process.cwd(), 'app')
            const foundRoutes = new Set<string>()

            const walk = (dir: string, relParts: string[] = []) => {
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.isDirectory()) {
                        const nextParts = entry.name.startsWith('(') ? relParts : [...relParts, entry.name]
                        walk(path.join(dir, entry.name), nextParts)
                    } else if (entry.name === 'page.tsx') {
                        foundRoutes.add(`/${relParts.join('/')}`)
                    }
                }
            }

            walk(appDir)

            for (const article of KNOWLEDGE_BASE_ARTICLES) {
                expect({ id: article.id, route: article.route, exists: foundRoutes.has(article.route) }).toEqual({
                    id: article.id,
                    route: article.route,
                    exists: true,
                })
            }
        })

        it('100% dos itens e subitens da Sidebar devem apontar via (?) para um anchor real em KNOWLEDGE_BASE_ARTICLES sem colisões', () => {
            const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'components/layout/sidebar.tsx'), 'utf8')
            const start = sidebarContent.indexOf('const navigationSections')
            const end = sidebarContent.indexOf('// Helper to check if plan meets requirement')
            const navBlock = sidebarContent.slice(start, end)

            const hrefMatches = [...navBlock.matchAll(/href:\s*'([^']+)'/g)].map((m) => m[1])
            expect(hrefMatches.length).toBeGreaterThanOrEqual(80)

            const validAnchors = new Set(KNOWLEDGE_BASE_ARTICLES.map((a) => a.anchor))

            for (const href of hrefMatches) {
                const anchor = getHelpAnchorForMenuHref(href)
                expect({ href, anchor, exists: validAnchors.has(anchor) }).toEqual({
                    href,
                    anchor,
                    exists: true,
                })
            }

            // Verifica desambiguação exata dos casos que antes colidiam por título
            expect(getHelpAnchorForMenuHref('/dashboard/teleconsulta')).toBe('teleconsulta')
            expect(getHelpAnchorForMenuHref('/dashboard/configuracoes/teleconsulta')).toBe('configuracoes-teleconsulta')
            expect(getHelpAnchorForMenuHref('/dashboard/financial/notas-demonstrativos')).toBe('financeiro-repasses-medicos')
            expect(getHelpAnchorForMenuHref('/dashboard/meu-financeiro/notas-demonstrativos')).toBe('meu-financeiro-profissional')
            expect(getHelpAnchorForMenuHref('/dashboard/logs-auditoria')).toBe('gestao-logs-auditoria')
            expect(getHelpAnchorForMenuHref('/dashboard/auditoria')).toBe('admin-plataforma-super-admin')
            expect(getHelpAnchorForMenuHref('/dashboard/planos-terapeuticos')).toBe('planos-terapeuticos')
            expect(getHelpAnchorForMenuHref('/dashboard/planos')).toBe('admin-plataforma-super-admin')

            // Verifica aliases legados (ex.: /dashboard/help#teleconsulta)
            expect(resolveHelpHashToAnchor('#teleconsulta')).toBe('teleconsulta')
            expect(resolveHelpHashToAnchor('#planos-terapeuticos')).toBe('planos-terapeuticos')
            expect(resolveHelpHashToAnchor('#faturamento-tiss')).toBe('tiss-elaboracao-contas')
        })

        it('Sidebar deve usar getHelpAnchorForMenuHref nos (?) e manter o botão Help na última posição do <nav>', () => {
            const sidebarContent = fs.readFileSync(path.join(process.cwd(), 'components/layout/sidebar.tsx'), 'utf8')
            expect(sidebarContent).toContain('getHelpAnchorForMenuHref(item.href')
            expect(sidebarContent).toContain('getHelpAnchorForMenuHref(child.href')

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
