/** @jest-environment node */
import fs from 'fs'
import path from 'path'
import jsPDF from 'jspdf'
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
    generateCommercialProposalPdf,
    generateContinuityReportPdf,
    generateExecutivePresentationPdf,
} from '@/lib/sales/prospect-pdf-generator'

describe('HQ de Prospecção B2B — Segurança, Templates e Conformidade', () => {
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

        const body = interpolateSalesTemplate(
            'Olá {{responsavel}}, para {{especialidades}} da {{clinica}} recomendamos {{plano_recomendado}}.',
            {
                clinicName: 'Clínica Você',
                programFocus: 'Você TEA',
                specialties: ['Fonoaudiologia', 'Terapia Ocupacional'],
                contactName: 'Dra. Carla',
                estimatedProfessionals: 8,
            }
        )
        expect(body).toContain('Dra. Carla')
        expect(body).toContain('Fonoaudiologia e Terapia Ocupacional')
        expect(body).toContain('Clínica Você')
        expect(body).toContain('CliniGO Professional')
    })

    it('recomenda exclusivamente os 3 planos oficiais vigentes (Básico, Avançado, Professional)', () => {
        expect(OFFICIAL_COMMERCIAL_PLANS.map((p) => p.id)).toEqual([
            'BASICO',
            'AVANCADO',
            'PROFESSIONAL',
        ])
        expect(OFFICIAL_COMMERCIAL_PLANS.map((p) => p.priceMonthly)).toEqual([149, 249, 449])

        expect(recommendOfficialPlan(1, false).plan.id).toBe('BASICO')
        expect(recommendOfficialPlan(4, false).plan.id).toBe('AVANCADO')
        expect(recommendOfficialPlan(8, true).plan.id).toBe('PROFESSIONAL')
        expect(recommendOfficialPlan(8, true).monthlyTotal).toBe(449)

        const overLimit = recommendOfficialPlan(32, true)
        expect(overLimit.plan.id).toBe('PROFESSIONAL')
        expect(overLimit.extraLicenses).toBe(2)
        expect(overLimit.monthlyTotal).toBeCloseTo(449 + 2 * 49.9, 2)
    })

    it('monta links WhatsApp, mailto e calcula urgência de follow-up corretamente', () => {
        expect(buildWhatsappUrl('(21) 96553-2247', 'Olá')).toBe('https://wa.me/5521965532247?text=Ol%C3%A1')
        expect(buildMailtoUrl('contatovocepsicologia@gmail.com', 'Teste', 'Corpo')).toContain(
            'mailto:contatovocepsicologia%40gmail.com'
        )
        expect(
            getFollowupUrgency({ next_followup_at: '2020-01-01', funnel_status: 'RESPONDEU' })
        ).toBe('overdue')
        expect(
            getFollowupUrgency({ next_followup_at: '2020-01-01', funnel_status: 'FECHADO' })
        ).toBe('none')
    })

    it('garante higiene anti-IA, ausência de termos comerciais proibidos e logo oficial redondo presente', () => {
        const root = process.cwd()
        expect(fs.existsSync(path.join(root, 'public', 'logo-clinigo-round.jpg'))).toBe(true)

        const filesToAudit = [
            'lib/sales/prospect-templates.ts',
            'lib/sales/prospect-pdf-generator.ts',
            'components/sales-hq/SalesHqShell.tsx',
            'components/sales-hq/ProspectCrmTab.tsx',
            'components/sales-hq/PdfGeneratorTab.tsx',
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

    it('gera os 3 PDFs com TODAS as 8 especialidades e nome longo sem cortar texto fora da margem A4', async () => {
        const overflowViolations: Array<{ text: string; endX: number; maxX: number }> = []
        const originalText = jsPDF.prototype.text
        const originalSave = jsPDF.prototype.save

        jsPDF.prototype.save = jest.fn() as any
        jsPDF.prototype.text = function (this: any, text: any, x: number, y: number, options?: any) {
            const pageWidth = this.internal.pageSize.getWidth()
            const maxX = pageWidth - 12.5 // tolerância de 1.5mm sobre margem de 14mm
            const align = options?.align || 'left'
            const lines = Array.isArray(text) ? text : [String(text)]

            if (align === 'left') {
                for (const line of lines) {
                    const width = this.getTextWidth(String(line))
                    if (x + width > maxX) {
                        overflowViolations.push({
                            text: String(line).slice(0, 60),
                            endX: Number((x + width).toFixed(1)),
                            maxX,
                        })
                    }
                }
            }
            return originalText.call(this, text, x, y, options)
        } as any

        try {
            const extremeInput = {
                clinicName: 'Clínica Multidisciplinar Espaço Desenvolvimento Infantil Integrado',
                programFocus: 'Programa Intensivo TEA / ABA / Integração Sensorial',
                specialties: [...COMMON_SPECIALTIES],
                contactName: 'Dra. Carolina Fernandes (Coordenação Clínica)',
                estimatedProfessionals: 18,
                needsTiss: true,
                setupFeeBrl: 450,
                setupFeeNote: 'Parcelável em até 2x sem juros na implantação',
                proposalValidityDays: 15,
                customProposalNote: 'Condição especial válida para ativação do período de 7 dias gratuitos nesta semana.',
            }

            await generateContinuityReportPdf(extremeInput)
            await generateExecutivePresentationPdf(extremeInput)
            await generateCommercialProposalPdf(extremeInput)

            expect(overflowViolations).toEqual([])
        } finally {
            jsPDF.prototype.text = originalText
            jsPDF.prototype.save = originalSave
        }
    })
})

