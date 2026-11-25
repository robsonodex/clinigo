/** @jest-environment node */
import fs from 'fs'
import path from 'path'
import {
    evaluateDashboardPageAccess,
    isSuperAdminOnlyRoute,
} from '@/lib/constants/dashboard-rbac'
import {
    OFFICIAL_COMMERCIAL_PLANS,
    interpolateSalesTemplate,
    recommendOfficialPlan,
} from '@/lib/sales/prospect-templates'
import {
    COMMON_SPECIALTIES,
    buildMailtoUrl,
    buildWhatsappUrl,
    getFollowupUrgency,
} from '@/lib/sales/prospect-types'
import {
    buildCommercialProposalHtml,
    buildContinuityReportHtml,
    buildExecutivePresentationHtml,
} from '@/lib/sales/prospect-pdf-templates'

describe('Central Comercial CliniGO — Segurança, Templates HTML/SVG e Regras Invioláveis', () => {
    it('classifica /system-master-hub/prospeccao e /api/super-admin/prospeccao como rotas exclusivas SUPER_ADMIN', () => {
        expect(isSuperAdminOnlyRoute('/system-master-hub/prospeccao')).toBe(true)
        expect(isSuperAdminOnlyRoute('/api/super-admin/prospeccao/prospects')).toBe(true)
        expect(isSuperAdminOnlyRoute('/api/super-admin/prospeccao/vault')).toBe(true)
        expect(isSuperAdminOnlyRoute('/api/super-admin/prospeccao/scripts')).toBe(true)
    })

    it('bloqueia todos os perfis não-SUPER_ADMIN no evaluateDashboardPageAccess', () => {
        for (const role of ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'FINANCIAL', 'STAFF', 'READONLY', null]) {
            const res = evaluateDashboardPageAccess({
                pathname: '/system-master-hub/prospeccao',
                role,
            })
            expect(res.allowed).toBe(false)
        }

        expect(
            evaluateDashboardPageAccess({
                pathname: '/system-master-hub/prospeccao',
                role: 'SUPER_ADMIN',
            }).allowed
        ).toBe(true)
    })

    it('interpola corretamente variáveis comerciais para a Clínica Você', () => {
        const subject = interpolateSalesTemplate(
            'Exemplo prático — {{clinica}} ({{programa}})',
            {
                clinicName: 'Clínica Você',
                programFocus: 'Você TEA',
                specialties: ['Fonoaudiologia', 'Terapia Ocupacional'],
                contactName: 'Equipe Clínica Você',
                estimatedProfessionals: 8,
            }
        )
        expect(subject).toBe('Exemplo prático — Clínica Você (Você TEA)')
    })

    it('recomenda exclusivamente os 3 planos oficiais vigentes (Básico, Avançado, Professional)', () => {
        expect(OFFICIAL_COMMERCIAL_PLANS.map((p) => p.id)).toEqual([
            'BASICO',
            'AVANCADO',
            'PROFESSIONAL',
        ])
        expect(OFFICIAL_COMMERCIAL_PLANS.map((p) => p.priceMonthly)).toEqual([149, 249, 449])
        expect(recommendOfficialPlan(8, true).monthlyTotal).toBe(449)

        const overLimit = recommendOfficialPlan(32, true)
        expect(overLimit.extraLicenses).toBe(2)
        expect(overLimit.monthlyTotal).toBeCloseTo(449 + 2 * 49.9, 2)
    })

    it('monta links WhatsApp, mailto e urgência de follow-up corretamente', () => {
        expect(buildWhatsappUrl('(21) 96553-2247', 'Olá')).toBe('https://wa.me/5521965532247?text=Ol%C3%A1')
        expect(buildMailtoUrl('contatovocepsicologia@gmail.com', 'Teste', 'Corpo')).toContain(
            'mailto:contatovocepsicologia%40gmail.com'
        )
        expect(
            getFollowupUrgency({ next_followup_at: '2020-01-01', funnel_status: 'RESPONDEU' })
        ).toBe('overdue')
    })

    it('renderiza os 3 PDFs HTML/SVG com logo redondo, todas as 8 especialidades, ZERO "&", ZERO "ao vivo/vídeo" e ZERO seta quebrada', () => {
        const assets = { logoSrc: '/logo-clinigo-round.jpg', qrDataUrl: 'data:image/png;base64,abc' }
        const extremeInput = {
            clinicName: 'Clínica Você',
            programFocus: 'Você TEA',
            specialties: [...COMMON_SPECIALTIES],
            contactName: 'Equipe Clínica Você',
            estimatedProfessionals: 8,
            needsTiss: true,
            setupFeeBrl: 0,
            setupFeeNote: 'Isenta na condição comercial desta proposta',
            proposalValidityDays: 15,
        }

        const htmls = [
            buildContinuityReportHtml(extremeInput, assets),
            buildExecutivePresentationHtml(extremeInput, assets),
            buildCommercialProposalHtml(extremeInput, assets),
        ]

        for (const html of htmls) {
            expect(html).toContain('/logo-clinigo-round.jpg')
            expect(html).toContain('Clínica Você')
            expect(html).toContain('data-pdf-page="1"')
            // Remove tags/entities para auditar o texto visível renderizado
            const visibleText = html
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&#9656;/g, ' ')
            expect(visibleText).not.toMatch(/&/)
            expect(visibleText).not.toMatch(/ao\s+vivo/i)
            expect(visibleText).not.toMatch(/v[ií]deo/i)
            expect(visibleText).not.toMatch(/15\s+minutos/i)
            expect(visibleText).not.toMatch(/\bEnterprise\b/i)
            expect(visibleText).not.toMatch(/nota\s+fiscal|caixa\s+f[ií]sico/i)
        }

        // Relatório de Continuidade possui 2 páginas, curva SVG e todas as especialidades
        expect(htmls[0]).toContain('data-pdf-page="2"')
        expect(htmls[0]).toContain('<svg')
        for (const spec of COMMON_SPECIALTIES) {
            expect(htmls[0]).toContain(spec)
        }
    })

    it('garante higiene anti-IA, ausência de termos proibidos e logo oficial redondo presente no disco', () => {
        const root = process.cwd()
        expect(fs.existsSync(path.join(root, 'public', 'logo-clinigo-round.jpg'))).toBe(true)

        const filesToAudit = [
            'lib/sales/prospect-types.ts',
            'lib/sales/prospect-templates.ts',
            'lib/sales/prospect-pdf-templates.ts',
            'lib/sales/prospect-pdf-generator.ts',
            'components/sales-hq/SalesHqShell.tsx',
            'components/sales-hq/DailySendWorkspace.tsx',
            'components/sales-hq/ProspectCrmTab.tsx',
            'components/sales-hq/ScriptsLibraryTab.tsx',
            'components/sales-hq/DocumentVaultTab.tsx',
            'app/system-master-hub/prospeccao/layout.tsx',
        ]

        const forbiddenPatterns = [
            /bg-gradient-to-/i,
            /Sparkles/,
            /PartyPopper/,
            /window\.confirm\(/,
            /window\.alert\(/,
            /\bEnterprise\b/i,
            /caixa\s+f[ií]sico/i,
            /nota\s+fiscal|nfs-e|nf-e/i,
            /evolu[cç][aã]o\s+por\s+voz/i,
            /treinamento\s+ao\s+vivo/i,
            /ao\s+vivo\s+em\s+15/i,
            />\s*[^<]*\s&\s[^<]*</,
        ]

        for (const rel of filesToAudit) {
            const content = fs.readFileSync(path.join(root, rel), 'utf8')
            for (const pattern of forbiddenPatterns) {
                expect({ file: rel, matched: pattern.test(content), pattern: pattern.source }).toEqual({
                    file: rel,
                    matched: false,
                    pattern: pattern.source,
                })
            }
        }
    })
})
