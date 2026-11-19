/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { decodeBase64Url, extractAccessToken } from '@/lib/auth/verify-token'

const PUBLIC_SUBPAGES = [
    'components/marketing/EditorialShell.tsx',
    'app/trial/page.tsx',
    'app/(public)/planos/page.tsx',
    'app/blog/page.tsx',
    'app/sobre/page.tsx',
    'app/contato/page.tsx',
    'app/partners/page.tsx',
    'app/partners/register/page.tsx',
    'app/partners/login/page.tsx',
    'app/help/page.tsx',
    'app/help/smtp/page.tsx',
    'app/termos/page.tsx',
    'app/site/page.tsx',
    'app/not-found.tsx',
    'app/conta-bloqueada/page.tsx',
    'app/manutencao/page.tsx',
    'app/(auth)/login/page.tsx',
    'app/(auth)/cadastro/page.tsx',
    'app/(auth)/sign-up/page.tsx',
    'app/(auth)/aguardando-aprovacao/page.tsx',
    'app/(auth)/pagamento-expirado/page.tsx',
    'app/(auth)/pagamento-pendente/page.tsx',
    'app/(auth)/ativar-conta/[token]/page.tsx',
    'app/pagamento/sucesso/page.tsx',
    'app/paciente/page.tsx',
    'app/clinica/page.tsx',
    'app/medico/page.tsx',
    'app/m/login/page.tsx',
    'components/plans/plan-card.tsx',
]

describe('Subpáginas Públicas e Branding 2027 — Integridade Fim a Fim', () => {
    it('deve garantir zero emojis, zero links 404 /privacidade, zero ícones proibidos, zero logo-clinigo.png e zero clichês de IA', () => {
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
        const oldLogoPngRegex = /logo-clinigo\.png/
        const brokenPrivacidadeRegex = /\/privacidade\b/
        const bannedIconRegex = /\b(Sparkles|PartyPopper|Crown|Rocket|Wand2)\b/
        const forbiddenClicheRegex =
            /(revolucione sua cl[ií]nica|tudo em um s[oó] lugar|o sistema definitivo|transforme sua gest[aã]o|transformar sua cl[ií]nica)/i
        const forbiddenMedicalBrandRegex =
            /(cl[ií]nicas?\s+m[eé]dicas?|consult[oó]rios?\s+m[eé]dicos?|plataforma\s+m[eé]dica|gest[aã]o\s+m[eé]dica)/i

        for (const relPath of PUBLIC_SUBPAGES) {
            const fullPath = path.join(process.cwd(), relPath)
            const content = fs.readFileSync(fullPath, 'utf8')

            expect({ file: relPath, hasEmoji: emojiRegex.test(content) }).toEqual({ file: relPath, hasEmoji: false })
            expect({ file: relPath, hasOldLogo: oldLogoPngRegex.test(content) }).toEqual({ file: relPath, hasOldLogo: false })
            expect({ file: relPath, hasPrivacidade404: brokenPrivacidadeRegex.test(content) }).toEqual({ file: relPath, hasPrivacidade404: false })
            expect({ file: relPath, hasBannedIcon: bannedIconRegex.test(content) }).toEqual({ file: relPath, hasBannedIcon: false })
            expect({ file: relPath, hasCliche: forbiddenClicheRegex.test(content) }).toEqual({ file: relPath, hasCliche: false })
            expect({ file: relPath, hasMedicalBrand: forbiddenMedicalBrandRegex.test(content) }).toEqual({ file: relPath, hasMedicalBrand: false })
        }
    })

    it('deve manter preços comerciais oficiais (R$ 149 / R$ 249 / R$ 449) e ausência de promessas comerciais proibidas nas páginas comerciais', () => {
        const commercialPages = [
            'app/(public)/planos/page.tsx',
            'app/partners/page.tsx',
            'app/help/page.tsx',
            'app/site/page.tsx',
            'app/trial/page.tsx',
        ]
        const forbiddenCommercial =
            /\b(enterprise|implanta[cç][aã]o gratuita|implanta[cç][aã]o gr[aá]tis|treinamento ao vivo|n[aã]o cobramos taxa de setup)\b/i

        for (const relPath of commercialPages) {
            const content = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')
            expect({ file: relPath, forbidden: forbiddenCommercial.test(content) }).toEqual({
                file: relPath,
                forbidden: false,
            })
        }

        const partnersContent = fs.readFileSync(path.join(process.cwd(), 'app/partners/page.tsx'), 'utf8')
        expect(partnersContent).toContain('price: 149')
        expect(partnersContent).toContain('price: 249')
        expect(partnersContent).toContain('price: 449')
        expect(partnersContent).not.toContain('R$299')
        expect(partnersContent).not.toContain('R$549')
    })

    it('deve preservar contratos de API críticos nos formulários públicos e de login', () => {
        expect(fs.readFileSync(path.join(process.cwd(), 'app/trial/page.tsx'), 'utf8')).toContain("fetch('/api/auth/register'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/contato/page.tsx'), 'utf8')).toContain("fetch('/api/contact'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/blog/page.tsx'), 'utf8')).toContain("fetch('/api/contact'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/partners/register/page.tsx'), 'utf8')).toContain("fetch('/api/partners/register'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/(auth)/cadastro/page.tsx'), 'utf8')).toContain("fetch('/api/auth/pre-register'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/clinica/page.tsx'), 'utf8')).toContain("fetch('/api/auth/login'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/medico/page.tsx'), 'utf8')).toContain("fetch('/api/auth/login'")
        expect(fs.readFileSync(path.join(process.cwd(), 'app/paciente/page.tsx'), 'utf8')).toContain("fetch('/api/patient/auth/login'")
    })

    it('deve alinhar metadados globais e manifests PWA ao posicionamento de clínicas de terapias', () => {
        for (const relPath of ['app/layout.tsx', 'public/manifest.json', 'public/site.webmanifest']) {
            const content = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')
            expect(content).toContain('terapias')
            expect(content).not.toMatch(/consult[oó]rios?\s+m[eé]dicos?/i)
        }
    })
})

describe('Otimizações Seguras de Login e Dashboard Boot', () => {
    it('decodeBase64Url decodifica Base64URL com - e _ sem padding e sem corrupção', () => {
        // String escolhida para gerar caracteres `-` e `_` em Base64URL
        const original = JSON.stringify({
            access_token: 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig-part_with_url_chars',
            note: 'clínica-terapia?>?>??',
        })
        const b64url = Buffer.from(original, 'utf8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')

        expect(b64url).toMatch(/[-_]/)
        expect(decodeBase64Url(b64url)).toBe(original)
    })

    it('extractAccessToken extrai cookie base64- Base64URL chunked e ignora code-verifier PKCE', () => {
        const expectedJwt = 'eyJhbGciOiJFUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc-def_ghi'
        const payload = JSON.stringify({ access_token: expectedJwt, note: '?>?>??' })
        const b64url = Buffer.from(payload, 'utf8')
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        const encoded = `base64-${b64url}`
        const mid = Math.floor(encoded.length / 2)

        const cookieStore = {
            getAll: () => [
                { name: 'sb-dlxakeejmyzhzdxzjgne-auth-token-code-verifier', value: 'SHOULD_BE_IGNORED' },
                { name: 'sb-dlxakeejmyzhzdxzjgne-auth-token.1', value: encoded.slice(mid) },
                { name: 'sb-dlxakeejmyzhzdxzjgne-auth-token.0', value: encoded.slice(0, mid) },
            ],
        }

        expect(extractAccessToken(cookieStore)).toBe(expectedJwt)
    })

    it('GET /api/setup/status executa as 6 consultas em paralelo com Promise.all', () => {
        const routeSource = fs.readFileSync(
            path.join(process.cwd(), 'app/api/setup/status/route.ts'),
            'utf8'
        )
        expect(routeSource).toContain('await Promise.all([')
        expect(routeSource).toContain('hasDoctor:')
        expect(routeSource).toContain('chamadaPainelTvHabilitada,')
    })
})
