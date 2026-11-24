import fs from 'fs'
import path from 'path'
import {
    extractJsonFromAiText,
    getCascadePlan,
    restoreShieldedPii,
    runClinigoAiTask,
    shieldPiiForAi,
} from '@/lib/ai/clinigo-ai-engine'

// Mock do serviço de auditoria para testes unitários isolados
jest.mock('@/lib/services/aia-audit', () => ({
    logAiAInteraction: jest.fn().mockResolvedValue(undefined),
}))

describe('CliniGo IA — Escudo LGPD, Motor Custo Zero em Cascata e Trio de Ouro', () => {
    const savedEnv = {
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    }

    afterEach(() => {
        process.env.GROQ_API_KEY = savedEnv.GROQ_API_KEY
        process.env.OPENROUTER_API_KEY = savedEnv.OPENROUTER_API_KEY
        process.env.CLOUDFLARE_API_TOKEN = savedEnv.CLOUDFLARE_API_TOKEN
        process.env.CLOUDFLARE_ACCOUNT_ID = savedEnv.CLOUDFLARE_ACCOUNT_ID
    })

    describe('1. Escudo LGPD (Anonimização Prévia e Reidratação Segura)', () => {
        it('deve remover nome completo, primeiro nome, CPF, telefone, e-mail, carteirinha e endereço antes de sair do servidor', () => {
            const raw =
                'Paciente Lucas Ferreira Mendes (Lucas), CPF 123.456.789-01 (12345678901), ' +
                'mãe Marina Mendes, tel (11) 98765-4321, email marina.teste@exemplo.com, ' +
                'carteirinha 0045123456789012, residente na Rua das Acácias, 140, CEP 01310-100, ' +
                'atendido na Clínica Modelo Saúde.'

            const shielded = shieldPiiForAi(raw, {
                patientName: 'Lucas Ferreira Mendes',
                guardianName: 'Marina Mendes',
                clinicName: 'Clínica Modelo Saúde',
                cpf: '123.456.789-01',
                phone: '(11) 98765-4321',
                email: 'marina.teste@exemplo.com',
                cardNumber: '0045123456789012',
            })

            expect(shielded.piiRemovedCount).toBeGreaterThanOrEqual(7)
            expect(shielded.sanitizedText).not.toContain('Lucas')
            expect(shielded.sanitizedText).not.toContain('Ferreira')
            expect(shielded.sanitizedText).not.toContain('Mendes')
            expect(shielded.sanitizedText).not.toContain('Marina')
            expect(shielded.sanitizedText).not.toContain('123.456.789-01')
            expect(shielded.sanitizedText).not.toContain('12345678901')
            expect(shielded.sanitizedText).not.toContain('98765-4321')
            expect(shielded.sanitizedText).not.toContain('marina.teste@exemplo.com')
            expect(shielded.sanitizedText).not.toContain('0045123456789012')
            expect(shielded.sanitizedText).not.toContain('Rua das Acácias')
            expect(shielded.sanitizedText).not.toContain('01310-100')
            expect(shielded.sanitizedText).not.toContain('Clínica Modelo Saúde')

            expect(shielded.sanitizedText).toContain('[PACIENTE]')
            expect(shielded.sanitizedText).toContain('[CLINICA]')
            expect(shielded.sanitizedText).toContain('[CPF_PROTEGIDO]')
            expect(shielded.sanitizedText).toContain('[EMAIL_PROTEGIDO]')
            expect(shielded.sanitizedText).toContain('[CARTEIRINHA_PROTEGIDA]')

            // Reidratação segura restaura apenas nome seguro, removendo <think> e emojis
            const rawAiOutput = '<think>raciocinio interno</think>Olá! [PACIENTE] evoluiu muito bem na [CLINICA]!'
            const restoredFull = restoreShieldedPii(rawAiOutput, shielded.restoreMap)
            expect(restoredFull).not.toContain('<think>')
            expect(restoredFull).toContain('Lucas Ferreira Mendes')
            expect(restoredFull).toContain('Clínica Modelo Saúde')

            const restoredFirstOnly = restoreShieldedPii(rawAiOutput, shielded.restoreMap, {
                firstNameOnlyForPatient: true,
            })
            expect(restoredFirstOnly).toContain('Lucas evoluiu')
            expect(restoredFirstOnly).not.toContain('Ferreira Mendes')
        })
    })

    describe('2. Extrator JSON e Cascata Gratuita de Modelos', () => {
        it('deve extrair JSON mesmo envolto em bloco markdown ou tags <think>', () => {
            const sample =
                '<think>analisando</think>\n```json\n{"structuredText": "Evolução técnica", "suggestedConduct": "Manter plano"}\n```'
            const parsed = extractJsonFromAiText<{ structuredText: string; suggestedConduct: string }>(sample)
            expect(parsed).toEqual({
                structuredText: 'Evolução técnica',
                suggestedConduct: 'Manter plano',
            })
            expect(extractJsonFromAiText('texto sem json')).toBeNull()
        })

        it('deve priorizar Groq 120B para tarefas pesadas (high) e Groq 20B para tarefas rápidas (fast), com OpenRouter Gemma 4 e Cloudflare na cascata', () => {
            const highPlan = getCascadePlan('high')
            expect(highPlan[0]).toEqual({ provider: 'groq', model: 'openai/gpt-oss-120b' })
            expect(highPlan.some((p) => p.provider === 'openrouter' && p.model === 'google/gemma-4-26b-a4b-it:free')).toBe(true)
            expect(highPlan.some((p) => p.provider === 'cloudflare')).toBe(true)

            const fastPlan = getCascadePlan('fast')
            expect(fastPlan[0]).toEqual({ provider: 'groq', model: 'openai/gpt-oss-20b' })
            expect(fastPlan.some((p) => p.provider === 'cloudflare')).toBe(true)
            expect(fastPlan.some((p) => p.provider === 'openrouter' && p.model === 'google/gemma-4-26b-a4b-it:free')).toBe(true)
        })
    })

    describe('3. Resiliência 100% (Fallback Determinístico Local + Cache SHA-256)', () => {
        it('deve retornar fallback determinístico sem erro e servir segunda chamada idêntica do cache', async () => {
            delete process.env.GROQ_API_KEY
            delete process.env.OPENROUTER_API_KEY
            delete process.env.CLOUDFLARE_API_TOKEN
            delete process.env.CLOUDFLARE_ACCOUNT_ID

            const params = {
                clinicId: '11111111-1111-4111-8111-111111111111',
                userId: '22222222-2222-4222-8222-222222222222',
                taskKey: 'test-fallback-cache',
                interactionType: 'medical_summary' as const,
                tier: 'fast' as const,
                systemPrompt: 'Estruture evolução clínica.',
                userPrompt: 'Paciente Ana Clara Silva, CPF 111.222.333-44, concluiu circuito motor com apoio verbal.',
                entities: {
                    patientName: 'Ana Clara Silva',
                    cpf: '111.222.333-44',
                },
                buildLocalFallback: () => 'Evolução estruturada para [PACIENTE]: concluiu circuito motor com apoio verbal.',
            }

            const first = await runClinigoAiTask(params)
            expect(first.provider).toBe('local-fallback')
            expect(first.fromCache).toBe(false)
            expect(first.lgpdShielded).toBe(true)
            expect(first.piiRemovedCount).toBeGreaterThanOrEqual(2)
            expect(first.text).toContain('Ana Clara Silva')
            expect(first.text).not.toContain('111.222.333-44')
            expect(first.disclaimer).toContain('LGPD')

            const second = await runClinigoAiTask(params)
            expect(second.fromCache).toBe(true)
            expect(second.text).toBe(first.text)
        })
    })

    describe('4. Auditoria Estrutural de RBAC, Multi-Tenant e Padrão Premium (4 APIs + 4 Telas)', () => {
        const root = process.cwd()

        const apiFiles = [
            'app/api/ai/structure-evolution/route.ts',
            'app/api/ai/family-bulletin/route.ts',
            'app/api/ai/multidisciplinary-report/route.ts',
            'app/api/ai/tiss-glosa-appeal/route.ts',
        ]

        const uiFiles = [
            'components/ai/EvolutionAiStructurer.tsx',
            'components/family-portal/FamilyPortalManager.tsx',
            'components/patients/InsuranceRenewalReportButton.tsx',
            'components/tiss/GlosaEvidenceDossierButton.tsx',
            'app/dashboard/(clinic)/prontuarios/[id]/page.tsx',
            'components/session-plans/SessionPlanFormClient.tsx',
        ]

        it('todas as 4 rotas de IA devem existir, validar autenticação, RBAC explícito e usar runClinigoAiTask', () => {
            for (const rel of apiFiles) {
                const content = fs.readFileSync(path.join(root, rel), 'utf8')
                expect(content).toContain('runClinigoAiTask')
                expect(content).toContain('auth.getUser()')
                if (rel.includes('tiss-glosa-appeal')) {
                    expect(content).toContain("requireTissAction(request as any, 'glosa.revisar')")
                } else {
                    expect(content).toContain('ALLOWED_ROLES')
                }
            }
        })

        it('os componentes de IA devem respeitar o Padrão Premium (zero Sparkles, zero PartyPopper, zero bg-gradient-to- e zero emojis)', () => {
            const emojiRegex = /[\p{Extended_Pictographic}]/u
            for (const rel of [
                'components/ai/EvolutionAiStructurer.tsx',
                'components/patients/InsuranceRenewalReportButton.tsx',
                'components/tiss/GlosaEvidenceDossierButton.tsx',
            ]) {
                const content = fs.readFileSync(path.join(root, rel), 'utf8')
                expect(content).not.toMatch(/\bSparkles\b|\bPartyPopper\b/)
                expect(content).not.toContain('bg-gradient-to-')
                expect(emojiRegex.test(content)).toBe(false)
            }
        })

        it('EvolutionAiStructurer deve estar montado tanto em prontuarios/[id] quanto em SessionPlanFormClient', () => {
            for (const rel of [
                'app/dashboard/(clinic)/prontuarios/[id]/page.tsx',
                'components/session-plans/SessionPlanFormClient.tsx',
            ]) {
                const content = fs.readFileSync(path.join(root, rel), 'utf8')
                expect(content).toContain('EvolutionAiStructurer')
            }

            // Verificar existência de todos os arquivos UI integrados
            for (const rel of uiFiles) {
                expect(fs.existsSync(path.join(root, rel))).toBe(true)
            }
        })
    })
})

