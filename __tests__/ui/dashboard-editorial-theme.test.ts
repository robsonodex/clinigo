import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

describe('Sistema Interno CliniGo — Tema Claro Editorial, Menu Claro/Escuro, Tipografia Inter, Help e Onboarding', () => {
    it('deve configurar useSidebarTheme exclusivamente para o menu lateral mantendo o sistema sempre claro', () => {
        const hook = read('lib/hooks/use-app-theme.ts')
        expect(hook).toContain("export type SidebarThemeMode = 'light' | 'dark'")
        expect(hook).toContain("useState<SidebarThemeMode>('light')")
        expect(hook).toContain("root.classList.remove('dark')")
        expect(hook).not.toContain("root.classList.add('dark')")
        expect(hook).toContain('clinigo-sidebar-theme')
    })

    it('deve carregar fonte Inter limpa no layout raiz e garantir sistema sempre claro sem dark global', () => {
        const layout = read('app/layout.tsx')
        const tw = read('tailwind.config.ts')
        expect(layout).toContain("import { Inter } from 'next/font/google'")
        expect(layout).toContain("variable: '--font-inter'")
        expect(layout).toContain("document.documentElement.classList.remove('dark')")
        expect(layout).not.toContain("document.documentElement.classList.add('dark')")
        expect(tw).toContain("'var(--font-inter)'")
    })

    it('deve definir tokens Editorial Light, fonte Inter, arredondamento 8px e contraste de toasts no globals.css', () => {
        const css = read('app/globals.css')
        expect(css).toContain('--background: 60 14% 98%')
        expect(css).toContain('--primary: 164 63% 23%')
        expect(css).toContain("font-family: var(--font-inter)")
        expect(css).toContain('border-radius: 8px !important;')
        expect(css).toContain('[data-sonner-toaster] [data-sonner-toast][data-type="success"]')
        expect(css).toContain('background-color: #155E4B !important;')
    })

    it('deve aplicar arredondamento 8px nos botões/inputs e rolagem segura em todos os modais', () => {
        const button = read('components/ui/button.tsx')
        const card = read('components/ui/card.tsx')
        const dialog = read('components/ui/dialog.tsx')
        const input = read('components/ui/input.tsx')

        expect(button).toContain('rounded-md')
        expect(button).toContain('active:scale-[0.985]')
        expect(card).toContain('rounded-xl')
        expect(dialog).toContain('max-h-[90vh]')
        expect(dialog).toContain('overflow-y-auto')
        expect(input).toContain('rounded-md')
    })

    it('deve manter o sistema sempre claro em DashboardLayout/Header e alternância Claro/Escuro somente na Sidebar', () => {
        const layout = read('components/layout/dashboard-layout.tsx')
        const header = read('components/layout/header.tsx')
        const sidebar = read('components/layout/sidebar.tsx')

        expect(layout).toContain("document.documentElement.classList.remove('dark')")
        expect(header).toContain('href="/dashboard/help"')
        expect(header).not.toContain('toggleTheme')
        expect(sidebar).toContain('useSidebarTheme()')
        expect(sidebar).toContain('Menu Claro')
        expect(sidebar).toContain('Menu Escuro')
        expect(sidebar).toContain('href="/dashboard/help"')
        expect(sidebar).not.toContain('rounded-sm')
        expect(sidebar).not.toContain("@/components/ui/tooltip")
        expect(sidebar).not.toContain('<TooltipProvider')
        expect(sidebar).not.toContain("title: 'BI e Indicadores'")
        expect(sidebar).toContain('role="tooltip"')
        expect(sidebar).toContain("pointerEvents: 'none'")
        expect(sidebar).toContain('clinigo-desktop-sidebar')
        expect(sidebar).toContain('clinigo-sidebar-nav')
        expect(sidebar).toContain('lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:z-30')
        expect(sidebar).not.toContain('lg:fixed')
        expect(sidebar).toContain('/logo_white.svg')
        expect(sidebar).toContain('/logo_black.svg')
        expect(sidebar).toContain('Sua Logo')
        expect(sidebar).toContain('ClinicLogoModal')
        const logoModal = read('components/sidebar/clinic-logo-modal.tsx')
        expect(logoModal).toContain('uploadClinicLogo')
        expect(logoModal).toContain('AlertDialog')
        expect(logoModal).toContain('Salvar Logotipo')
        const whiteLabelAction = read('app/actions/white-label.ts')
        expect(whiteLabelAction).toContain('isOwnClinicAdmin')
        expect(whiteLabelAction).toContain('ALLOWED_IMAGE_EXTENSIONS')
        expect(sidebar).toContain('clinigo-help-btn')
        expect(layout).toContain('clinigo-main-column')
        expect(layout).toContain('height: 100vh !important')
        expect(layout).toContain('overscroll-behavior: contain')
        expect(layout).not.toContain('lg:pl-[272px]')
        const tooltip = read('components/ui/tooltip.tsx')
        expect(tooltip).not.toContain('TooltipPrimitive.Portal')
        const visualLock = read('components/sidebar/visual-lock.tsx')
        expect(visualLock).toContain('/dashboard/configuracoes/assinatura')
        expect(visualLock).not.toContain('/dashboard/configuracoes/plano')
    })

    it('deve garantir segurança contra null em SMTPSettings, rota /api/clinics/smtp e dados de PlanAndBilling em Configurações', () => {
        const smtpUi = read('app/dashboard/(clinic)/configuracoes/components/SMTPSettings.tsx')
        const smtpApi = read('app/api/clinics/smtp/route.ts')
        const planBilling = read('app/dashboard/(clinic)/configuracoes/components/PlanAndBilling.tsx')
        const rooms = read('app/dashboard/(clinic)/configuracoes/components/ConsultingRoomsSettings.tsx')
        const usersPage = read('app/dashboard/(clinic)/configuracoes/usuarios/page.tsx')

        expect(smtpUi).toContain('function normalizeSmtpConfig')
        expect(smtpUi).toContain("const smtpHost = config.smtp_host || ''")
        expect(smtpUi).toContain('hasStoredPassword')
        expect(smtpApi).toContain("typeof rawClinic.smtp_host === 'string' ? rawClinic.smtp_host : ''")
        expect(planBilling).toContain('price: 149')
        expect(planBilling).toContain('migrateLegacyPlan')
        expect(planBilling).not.toContain('from-green-50 to-emerald-50')
        expect(rooms).toContain("const lang = v?.lang || ''")
        expect(usersPage).toContain("(u.name || '').toLowerCase()")
    })

    it('deve manter a Home do Dashboard sem gradientes pastéis pesados e com CTA Ver Planos funcional', () => {
        const home = read('app/dashboard/page.tsx')
        expect(home).not.toContain('from-indigo-50')
        expect(home).not.toContain('from-cyan-50')
        expect(home).not.toContain('from-blue-50')
        expect(home).toContain('href="/dashboard/configuracoes/assinatura"')
    })

    it('deve aplicar visual Editorial na Central de Ajuda (/dashboard/help) preservando RBAC', () => {
        const help = read('app/dashboard/(clinic)/help/page.tsx')
        expect(help).toContain('getAccessibleHelpArticles')
        expect(help).toContain('canAccessHelpRoute')
        expect(help).toContain('resolveHelpHashToAnchor')
        expect(help).toContain('border-primary bg-primary text-primary-foreground')
        expect(help).not.toContain('border-slate-900 bg-slate-900 text-white')
        expect(help).toContain('accessibleArticlesKey')
        expect(help).toContain('if (next.length === prev.length && next.every((id, idx) => id === prev[idx]))')
    })

    it('deve padronizar todo o fluxo de Onboarding sem ícones banidos, sem Enterprise e com acesso direto ao Help', () => {
        const onboardingFiles = [
            'app/dashboard/(clinic)/onboarding/page.tsx',
            'components/dashboard/InitialSetup.tsx',
            'components/onboarding/OnboardingChecklist.tsx',
            'components/plans/NewFeaturesOnboarding.tsx',
        ]
        const bannedIcons = /\b(Sparkles|Crown|PartyPopper|Rocket|Wand2)\b/

        for (const rel of onboardingFiles) {
            const content = read(rel)
            expect({ file: rel, hasBannedIcon: bannedIcons.test(content) }).toEqual({
                file: rel,
                hasBannedIcon: false,
            })
            expect({ file: rel, linksToHelp: content.includes('/dashboard/help') }).toEqual({
                file: rel,
                linksToHelp: true,
            })
            expect({ file: rel, hasEnterprise: content.includes('ENTERPRISE') }).toEqual({
                file: rel,
                hasEnterprise: false,
            })
        }
    })

    it('deve garantir contraste AAA nos toasts Sonner sem conflito branco-sobre-branco', () => {
        const providers = read('lib/providers.tsx')
        expect(providers).toContain('!bg-[#155E4B] !text-white')
        expect(providers).not.toContain('bg-card text-card-foreground shadow-md')
    })

    it('deve garantir zero ícones banidos em todas as páginas de app/dashboard/', () => {
        const bannedIcons = /\b(Sparkles|Crown|PartyPopper|Rocket|Wand2)\b/
        const violations: string[] = []

        const walk = (dir: string) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name)
                if (entry.isDirectory()) walk(full)
                else if (/\.(tsx|ts)$/.test(entry.name)) {
                    const content = fs.readFileSync(full, 'utf8')
                    if (bannedIcons.test(content)) {
                        violations.push(path.relative(ROOT, full).replace(/\\/g, '/'))
                    }
                }
            }
        }

        walk(path.join(ROOT, 'app/dashboard'))
        expect(violations).toEqual([])
    })
})
