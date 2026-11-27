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
import {
    buildSmartGreeting,
    interpolateOutreachTemplate,
} from '@/lib/sales/outreach-types'
import {
    inferClinicNameFromEmail,
    parseContactListInput,
} from '@/lib/sales/outreach-parser'
import {
    buildOutreachEmailHtml,
    normalizeHostingerTls,
} from '@/lib/sales/outreach-mailer'

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
            'components/sales-hq/OutreachCampaignsTab.tsx',
            'components/sales-hq/PublicPresentationViewer.tsx',
            'lib/sales/outreach-types.ts',
            'lib/sales/outreach-parser.ts',
            'lib/sales/outreach-mailer.ts',
            'lib/sales/outreach-worker.ts',
            'app/apresentacao/[token]/page.tsx',
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

    it('processa listas CSV e TXT mistas, deduplica, formata telefone e infere clínica pelo domínio', () => {
        const raw = [
            'nome;clinica;email;telefone',
            'Dra. Camila Souza;Clínica Espaço Crescer;camila@espacocrescer.com.br;21999887766',
            'contato@nucleoterapeutico.com.br',
            'Dra. Camila Duplicada;Clínica Espaço Crescer;CAMILA@espacocrescer.com.br;21999887766',
            'linha sem email aqui',
        ].join('\n')

        const parsed = parseContactListInput(raw)
        expect(parsed.contacts).toHaveLength(2)
        expect(parsed.duplicatesRemoved).toBe(1)
        expect(parsed.invalidLines).toHaveLength(1)
        expect(parsed.contacts[0].phone).toBe('(21) 99988-7766')
        expect(parsed.contacts[1].clinic_name).toBe('Nucleoterapeutico')
        expect(inferClinicNameFromEmail('teste@gmail.com')).toBe('')

        // TXT livre com separador por hífen
        const freeTxt = 'Clínica Vida TEA - Marcos - marcos@vidatea.com.br - (11) 98888-7777'
        const parsedTxt = parseContactListInput(freeTxt)
        expect(parsedTxt.contacts).toHaveLength(1)
        expect(parsedTxt.contacts[0].email).toBe('marcos@vidatea.com.br')
        expect(parsedTxt.contacts[0].clinic_name).toBe('Clínica Vida TEA')
        expect(parsedTxt.contacts[0].phone).toBe('(11) 98888-7777')
    })

    it('gera saudação segura, normaliza TLS Hostinger (587 vs 465) e renderiza assinatura do Diretor', () => {
        expect(buildSmartGreeting('Dra. Camila Souza', 'Clínica A')).toBe('Olá, Dra. Camila')
        expect(buildSmartGreeting('', 'Espaço Incluir')).toBe('Olá, equipe da Espaço Incluir')
        expect(buildSmartGreeting('', '')).toBe('Olá')

        const interpolated = interpolateOutreachTemplate('{{saudacao}}, sobre a {{clinica}}.', {
            contact_name: '',
            clinic_name: 'Clínica Crescer',
        })
        expect(interpolated).toBe('Olá, equipe da Clínica Crescer, sobre a Clínica Crescer.')

        // Correção automática do bug de porta 587 com secure=true na Hostinger
        expect(normalizeHostingerTls(587, true)).toEqual({ secure: false, requireTLS: true })
        expect(normalizeHostingerTls(465, false)).toEqual({ secure: true, requireTLS: false })

        const emailRendered = buildOutreachEmailHtml({
            bodyText: 'Olá, segue o material executivo da CliniGO.',
            deliveryMode: 'BOTH',
            attachmentFileName: 'apresentacao-clinigo.pdf',
            presentationUrl: 'https://clinigo.app/apresentacao/abcdef1234567890',
            unsubscribeUrl: 'https://clinigo.app/api/public/outreach/unsubscribe/abcdef1234567890',
        })

        expect(emailRendered.html).toContain('Robson Oliveira')
        expect(emailRendered.html).toContain('Diretor · CliniGO')
        expect(emailRendered.html).toContain('(21) 96696-0684')
        expect(emailRendered.html).toContain('contato@clinigo.app')
        expect(emailRendered.html).toContain('Abrir Apresentação Executiva')
        expect(emailRendered.html).toContain('clique aqui para sair da lista')
        expect(isSuperAdminOnlyRoute('/api/super-admin/prospeccao/campaigns')).toBe(true)
    })
})
