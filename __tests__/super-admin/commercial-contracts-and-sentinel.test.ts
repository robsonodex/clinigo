import fs from 'fs'
import path from 'path'
import {
    COMMERCIAL_PLAN_PRESETS,
    createDefaultContractFormData,
    generateCommercialContractText,
    calculateFidelityEndDate,
    formatCnpjDisplay,
} from '@/lib/contracts/commercial-contract-template'
import { buildEditableWordHtml } from '@/lib/contracts/commercial-contract-export'
import { diagnoseRailwayFailure } from '@/lib/whatsapp/clin-sentinel'

describe('Central Privada de Contratos Comerciais e Sentinela 24/7 do Bot Clin', () => {
    it('expõe exatamente os 3 planos oficiais (Básico R$ 149, Avançado R$ 249, Professional R$ 449)', () => {
        expect(Object.keys(COMMERCIAL_PLAN_PRESETS)).toEqual(['BASICO', 'AVANCADO', 'PROFESSIONAL'])
        expect(COMMERCIAL_PLAN_PRESETS.BASICO.monthlyPriceReais).toBe(149)
        expect(COMMERCIAL_PLAN_PRESETS.BASICO.includedLicenses).toBe(1)
        expect(COMMERCIAL_PLAN_PRESETS.AVANCADO.monthlyPriceReais).toBe(249)
        expect(COMMERCIAL_PLAN_PRESETS.AVANCADO.includedLicenses).toBe(5)
        expect(COMMERCIAL_PLAN_PRESETS.PROFESSIONAL.monthlyPriceReais).toBe(449)
        expect(COMMERCIAL_PLAN_PRESETS.PROFESSIONAL.includedLicenses).toBe(30)
    })

    it('gera contrato com fidelidade de 12 meses, multa rescisória de 30%, LGPD e cláusula de nova contratação sem termos proibidos', () => {
        const form = createDefaultContractFormData()
        form.contractNumber = 'CG-2026-999'
        form.clientName = 'WorldSensory Terapias Multidisciplinares'
        form.clientCnpj = '46176944000115'
        form.clientAddress = 'Rua Esaú Isaac, 179, Jardim Mesquita, Itapetininga, São Paulo, CEP 18213-560'
        form.clientEmail = 'clinicaworldsensory@gmail.com'
        form.clientPhone = '15981105549'
        form.startDate = '2026-11-26'
        form.fidelityMonths = 12
        form.earlyTerminationPenaltyPct = 30
        form.isReactivationNewContract = true

        const text = generateCommercialContractText(form)

        expect(text).toContain('CG-2026-999')
        expect(text).toContain('46.176.944/0001-15')
        expect(text).toContain('12 (DOZE) MESES')
        expect(text).toContain('30% (30 por cento)')
        expect(text).toContain('26/11/2027')
        expect(text).toContain('1 (uma) unidade operacional')
        expect(text).toContain('R$\u00A049,90')
        expect(text).toContain('NOVA CONTRATAÇÃO INTEGRAL E INDEPENDENTE')
        expect(text).toContain('Lei n. 13.709/2018')
        expect(text).toContain('Guia de Uso Integrado')

        // Regras de ouro: zero Enterprise, zero ao vivo, zero &, zero emojis
        expect(text.toLowerCase()).not.toContain('enterprise')
        expect(text.toLowerCase()).not.toContain('ao vivo')
        expect(text).not.toContain('&')
        expect(/[\u{1F300}-\u{1FAFF}]/u.test(text)).toBe(false)
    })

    it('calcula corretamente o término da fidelidade e formata CNPJ', () => {
        expect(calculateFidelityEndDate('2026-11-26', 12)).toBe('26/11/2027')
        expect(formatCnpjDisplay('46176944000115')).toBe('46.176.944/0001-15')
    })

    it('gera HTML compatível com Microsoft Word (.doc) escapando caracteres especiais', () => {
        const html = buildEditableWordHtml(
            'Contrato Teste',
            'CG-2026-101',
            'CONTRATO DE LICENCIAMENTO\nCLÁUSULA 1 - TESTE\nTexto <seguro>.'
        )
        expect(html).toContain('urn:schemas-microsoft-com:office:word')
        expect(html).toContain('<meta charset="utf-8"')
        expect(html).toContain('&lt;seguro&gt;')
        expect(html).toContain('<h2')
    })

    it('diagnostica HTTP 404 do Railway com causa acionável', () => {
        const msg404 = diagnoseRailwayFailure(404, { message: 'Application not found' })
        expect(msg404).toContain('404')
        expect(msg404).toContain('Railway')

        const msgNet = diagnoseRailwayFailure(0, { error: 'Timeout' })
        expect(msgNet).toContain('Timeout')
    })

    it('protege /system-master-hub/contratos-comerciais com notFound() e noindex/nofollow', () => {
        const layoutPath = path.join(
            process.cwd(),
            'app/system-master-hub/contratos-comerciais/layout.tsx'
        )
        const content = fs.readFileSync(layoutPath, 'utf-8')
        expect(content).toContain('notFound()')
        expect(content).toContain('index: false')
        expect(content).toContain('follow: false')
        expect(content).toContain('SUPER_ADMIN')
    })

    it('garante que lib/whatsapp/service.ts não engole mais HTTP 404 do Railway silenciosamente', () => {
        const servicePath = path.join(process.cwd(), 'lib/whatsapp/service.ts')
        const content = fs.readFileSync(servicePath, 'utf-8')
        expect(content).toContain('connectRes.status === 404')
        expect(content).toContain('res.status === 404')
        expect(content).toContain('Application not found')
    })
})

