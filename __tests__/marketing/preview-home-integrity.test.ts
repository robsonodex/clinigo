import fs from 'fs'
import path from 'path'
import {
    DAY_IN_LIFE_CONTENT,
    FAQ_CONTENT,
    MOCKUP_DISCLAIMER,
    NAV_CONTENT,
    OPERATIONAL_CONTRAST,
    PLANS_CONTENT,
    SPECIALTIES_XRAY_CONTENT,
} from '@/components/preview-home/content'

const LANDING_FILES = [
    'app/(marketing)/preview-home/layout.tsx',
    'app/(marketing)/preview-home/page.tsx',
    'app/(marketing)/preview/home/layout.tsx',
    'app/(marketing)/preview/home/page.tsx',
    'components/preview-home/preview-home.css',
    'components/preview-home/content.ts',
    'components/preview-home/NavbarSection.tsx',
    'components/preview-home/HeroStageSection.tsx',
    'components/preview-home/OperationalContrastSection.tsx',
    'components/preview-home/DayInLifeSection.tsx',
    'components/preview-home/SpecialtyXRaySection.tsx',
    'components/preview-home/GovernanceSection.tsx',
    'components/preview-home/OperationalSimulator.tsx',
    'components/preview-home/PlansSection.tsx',
    'components/preview-home/FaqSection.tsx',
    'components/preview-home/FinalCtaSection.tsx',
    'components/preview-home/FooterSection.tsx',
    'components/preview-home/PreviewLandingPage.tsx',
]

describe('Landing Editorial Clinical Precision (/preview-home e /preview/home) — Integridade', () => {
    it('deve ter zero ocorrências de termos comerciais proibidos, clichês de IA, menções médicas, emojis, & ou ícones proibidos', () => {
        const singleAmpersand = /(?<!&)&(?!&)/
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
        const forbiddenIconRegex = /\b(Sparkles|PartyPopper|Crown|Rocket|Wand2)\b/
        const forbiddenMedicalRegex = /cl[ií]nicas?\s+m[eé]dicas?/i
        const forbiddenCommercialRegex =
            /\b(caixa|dinheiro|nota fiscal|notas fiscais|emiss[aã]o de nf|recebimento em esp[eé]cie|enterprise|treinamento ao vivo|aulas ao vivo|implanta[cç][aã]o gratuita)\b/i
        const forbiddenClichesRegex =
            /(revolucione sua cl[ií]nica|tudo em um s[oó] lugar|o sistema definitivo|transforme sua gest[aã]o|potencialize seus resultados)/i

        for (const relPath of LANDING_FILES) {
            const fullPath = path.join(process.cwd(), relPath)
            const content = fs.readFileSync(fullPath, 'utf8')

            expect(singleAmpersand.test(content)).toBe(false)
            expect(emojiRegex.test(content)).toBe(false)
            expect(forbiddenIconRegex.test(content)).toBe(false)
            expect(forbiddenMedicalRegex.test(content)).toBe(false)
            expect(forbiddenCommercialRegex.test(content)).toBe(false)
            expect(forbiddenClichesRegex.test(content)).toBe(false)
        }
    })

    it('deve garantir ausência de & e emojis em components/preview-home/content.ts e presença das regras comerciais obrigatórias', () => {
        const contentSource = fs.readFileSync(
            path.join(process.cwd(), 'components/preview-home/content.ts'),
            'utf8'
        )
        expect(contentSource).not.toContain('&')
        expect(PLANS_CONTENT.plans.map((p) => p.price)).toEqual(['149', '249', '449'])
        expect(PLANS_CONTENT.commercialNote).toContain('49,90')
        expect(PLANS_CONTENT.commercialNote).toContain('1 unidade')
        expect(PLANS_CONTENT.commercialNote).toContain('taxa única de implantação')
        expect(PLANS_CONTENT.commercialNote).toContain('Guia de Uso')
        expect(MOCKUP_DISCLAIMER).toBe('Prévia ilustrativa com dados fictícios')
    })

    it('deve manter botão Entrar direto para /login sem dropdown e robots noindex/nofollow', () => {
        const navSource = fs.readFileSync(
            path.join(process.cwd(), 'components/preview-home/NavbarSection.tsx'),
            'utf8'
        )
        const layoutSource = fs.readFileSync(
            path.join(process.cwd(), 'app/(marketing)/preview-home/layout.tsx'),
            'utf8'
        )
        const fontsSource = fs.readFileSync(
            path.join(process.cwd(), 'components/preview-home/fonts.ts'),
            'utf8'
        )
        expect(NAV_CONTENT.loginHref).toBe('/login')
        expect(navSource).toContain('NAV_CONTENT.loginHref')
        expect(navSource).not.toContain('Portal da clínica')
        expect(navSource).toContain('href="/"')
        expect(navSource).not.toContain('href="#topo"')
        expect(fontsSource).toContain('Plus_Jakarta_Sans')
        expect(fontsSource).toContain('Instrument_Serif')
        expect(fontsSource).toContain('JetBrains_Mono')
        expect(layoutSource).toContain('landingFontVariables')
        expect(layoutSource).toContain('index: false')
        expect(layoutSource).toContain('follow: false')
    })

    it('deve expor todas as estruturas modulares esperadas (4 contrastes, 5 etapas do dia, 6 especialidades, 3 planos e 6 FAQs)', () => {
        expect(OPERATIONAL_CONTRAST.items).toHaveLength(4)
        expect(DAY_IN_LIFE_CONTENT.steps).toHaveLength(5)
        expect(SPECIALTIES_XRAY_CONTENT.specialties).toHaveLength(6)
        expect(PLANS_CONTENT.plans).toHaveLength(3)
        expect(FAQ_CONTENT.items).toHaveLength(6)
    })

    it('home oficial (/) deve renderizar a nova landing, indexavel, com canonical e sem links para rotas desativadas', () => {
        const homeSource = fs.readFileSync(path.join(process.cwd(), 'app/page.tsx'), 'utf8')
        expect(homeSource).toContain('PreviewLandingPage')
        expect(homeSource).toContain('landingFontVariables')
        expect(homeSource).toContain('index: true')
        expect(homeSource).toContain("canonical: 'https://clinigo.app'")
        expect(homeSource).not.toContain('LandingPremium')

        const contentSource = fs.readFileSync(
            path.join(process.cwd(), 'components/preview-home/content.ts'),
            'utf8'
        )
        expect(contentSource).not.toContain("'/privacidade'")
        expect(contentSource).not.toContain("'/lgpd'")
    })
})
