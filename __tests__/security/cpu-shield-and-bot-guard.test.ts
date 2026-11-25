import fs from 'fs'
import path from 'path'
import { isBlockedScannerProbe, isValidPublicClinicSlug } from '@/lib/public/clinic-slug-guard'

const ROOT = process.cwd()

describe('Blindagem de Fluid Active CPU Vercel, Bot Guard e Remoção da Página Pública', () => {
    describe('isValidPublicClinicSlug', () => {
        it('aceita slugs válidos de clínicas reais em produção', () => {
            expect(isValidPublicClinicSlug('espaco-incluir')).toBe(true)
            expect(isValidPublicClinicSlug('worldsensory')).toBe(true)
            expect(isValidPublicClinicSlug('demo-teste')).toBe(true)
            expect(isValidPublicClinicSlug('clinica-vida-2026')).toBe(true)
        })

        it('rejeita extensões de arquivo, pontos, underscores, rotas reservadas e scanners', () => {
            const invalidSlugs = [
                '',
                null,
                undefined,
                'a',
                'nuclei.svg',
                'xmlrpc.php',
                '.env',
                '.env.local',
                'backup.sql',
                'const.DB.php.3',
                'phpinfo.php',
                'wp-login.php',
                'wp-admin',
                '_session',
                'miscadmin',
                'cgi-bin',
                'dashboard',
                'api',
                'login',
                'system-master-hub',
                'etc.json',
                'etc.children.json',
                'slug_com_underscore',
                '-hifen-inicio',
                'hifen-fim-',
            ]

            for (const slug of invalidSlugs) {
                expect(isValidPublicClinicSlug(slug)).toBe(false)
            }
        })
    })

    describe('isBlockedScannerProbe', () => {
        it('bloqueia todas as sondas reais registradas nos logs de produção da Vercel', () => {
            const realScannerProbes = [
                '/nuclei.svg',
                '/xmlrpc.php',
                '/_session',
                '/.env',
                '/.env.local',
                '/.env.production',
                '/.git/config',
                '/miscadmin',
                '/backup.sql',
                '/database.sql',
                '/dump.sql',
                '/phpinfo.php',
                '/const.DB.php.3',
                '/wp-login.php',
                '/wp-admin/setup-config.php',
                '/wp-includes/wlwmanifest.xml',
                '/phpmyadmin/index.php',
                '/cgi-bin/luci',
                '/etc.json',
                '/etc.children.json',
                '/.htaccess',
                '/config.php.bak',
                '/shell.phtml',
                '/test.aspx',
                '/admin.jsp',
            ]

            for (const probe of realScannerProbes) {
                expect(isBlockedScannerProbe(probe)).toBe(true)
            }
        })

        it('nunca bloqueia rotas legítimas do sistema nem /.well-known/', () => {
            const legitimatePaths = [
                '/',
                '/dashboard',
                '/dashboard/pacientes',
                '/dashboard/agenda',
                '/api/patients',
                '/api/appointments',
                '/api/family-portal',
                '/system-master-hub/prospeccao',
                '/paciente/meu-painel',
                '/familia/token-abc',
                '/espaco-incluir/agendar',
                '/.well-known/ai-summary.json',
                '/.well-known/apple-app-site-association',
            ]

            for (const p of legitimatePaths) {
                expect(isBlockedScannerProbe(p)).toBe(false)
            }
        })
    })

    describe('config.matcher do middleware.ts', () => {
        const middlewareSource = fs.readFileSync(path.join(ROOT, 'middleware.ts'), 'utf8')
        const matcherMatch = middlewareSource.match(/export const config = \{[\s\S]*?matcher:\s*\[[\s\S]*?'([^']+)'/)

        const buildMatcherRegex = () => {
            const rawPattern = matcherMatch![1].replace(/\\\\/g, '\\')
            return new RegExp(`^${rawPattern}$`)
        }

        it('declara matcher regex válido e importa isBlockedScannerProbe', () => {
            expect(middlewareSource).toContain('isBlockedScannerProbe')
            expect(matcherMatch).not.toBeNull()
        })

        it('mantém proteção ativa em rotas privadas, APIs, raiz e sondas de exploit', () => {
            const regex = buildMatcherRegex()

            const mustMatch = [
                '/',
                '/dashboard',
                '/dashboard/pacientes',
                '/dashboard/financeiro',
                '/api/patients',
                '/api/appointments',
                '/api/super-admin/prospeccao/prospects',
                '/system-master-hub',
                '/system-master-hub/prospeccao',
                '/paciente/meu-painel',
                '/paciente/historico',
                '/xmlrpc.php',
                '/.env',
                '/backup.sql',
                '/const.DB.php.3',
                '/_session',
                '/miscadmin',
                '/phpinfo.php',
            ]

            for (const route of mustMatch) {
                expect(regex.test(route)).toBe(true)
            }
        })

        it('dispensa rotas 100% públicas/estáticas do Middleware para poupar Fluid Active CPU', () => {
            const regex = buildMatcherRegex()

            const mustSkip = [
                '/login',
                '/entrar',
                '/cadastro',
                '/planos',
                '/trial',
                '/solucoes',
                '/solucoes/clinica-tea-aba',
                '/blog',
                '/blog/artigo-exemplo',
                '/sobre',
                '/contato',
                '/termos',
                '/privacidade',
                '/lgpd',
                '/recuperar-senha',
                '/redefinir-senha',
                '/ativar-conta',
                '/clinica',
                '/medico',
                '/robots.txt',
                '/sitemap.xml',
                '/llms.txt',
                '/llms-full.txt',
                '/api/health',
                '/api/auth/session/validate',
                '/nuclei.svg',
                '/etc.json',
            ]

            for (const route of mustSkip) {
                expect(regex.test(route)).toBe(false)
            }
        })
    })

    describe('Remoção definitiva da Página Pública e blindagem anti-loop', () => {
        it('remove completamente o catch-all raiz /[clinic_slug]/page.tsx e ClinicPublicPageClient.tsx', () => {
            expect(fs.existsSync(path.join(ROOT, 'app', '(public)', '[clinic_slug]', 'page.tsx'))).toBe(false)
            expect(fs.existsSync(path.join(ROOT, 'app', '(public)', '[clinic_slug]', 'ClinicPublicPageClient.tsx'))).toBe(false)
            expect(
                fs.existsSync(
                    path.join(ROOT, 'app', 'dashboard', '(clinic)', 'configuracoes', 'pagina-publica', 'components')
                )
            ).toBe(false)
        })

        it('remove o item Página Pública da Sidebar e redireciona a rota legada', () => {
            const sidebar = fs.readFileSync(path.join(ROOT, 'components', 'layout', 'sidebar.tsx'), 'utf8')
            expect(sidebar).not.toContain('/dashboard/configuracoes/pagina-publica')
            expect(sidebar).not.toContain("title: 'Página Pública'")

            const legacyPage = fs.readFileSync(
                path.join(ROOT, 'app', 'dashboard', '(clinic)', 'configuracoes', 'pagina-publica', 'page.tsx'),
                'utf8'
            )
            expect(legacyPage).toContain("redirect('/dashboard/configuracoes')")
        })

        it('protege FamilyPortalManager contra prop array instável e FamilyCorrelationStrip contra refetch em foco', () => {
            const manager = fs.readFileSync(
                path.join(ROOT, 'components', 'family-portal', 'FamilyPortalManager.tsx'),
                'utf8'
            )
            expect(manager).toContain('EMPTY_SESSIONS')

            const strip = fs.readFileSync(
                path.join(ROOT, 'components', 'session-plans', 'FamilyCorrelationStrip.tsx'),
                'utf8'
            )
            expect(strip).toContain('refetchOnWindowFocus: false')
            expect(strip).toContain('refetchOnReconnect: false')
            expect(strip).toContain('retry: false')
        })
    })
})
