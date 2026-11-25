/**
 * @jest-environment node
 *
 * Suíte P0 de Blindagem — Fase 1 (Entrega #1)
 * Valida:
 * - QA-17: Bloqueio de IDOR cross-tenant em /api/tiss/autorizacao/[id]/enviar
 * - REG-05 / AI-01: Escudo LGPD e minimização PII em glosa-predictor.ts (zero OpenAI direto)
 * - SEC-03: Verificação criptográfica real (Fail-Closed) em TISSDigitalSigner.verifySignature()
 * - QA-02: Bloqueio explícito de XXE / DTD / XML Bomb em todos os parsers XML TISS
 * - MOD-02 / QA-41: Regras determinísticas de terapias seriadas/TEA em analyzeGlosaRisk()
 */

import fs from 'fs'
import path from 'path'
import * as forge from 'node-forge'
import { NextRequest } from 'next/server'
import { assertSafeXmlNoXxe, prepareXMLBuffer } from '@/lib/services/tiss/encoding-utils'
import { parseUnimedXML } from '@/lib/services/tiss/tiss-xml-parser'
import { TissRealParser } from '@/lib/services/tiss/tiss-real-parser'
import { getTISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator'
import { createTISSSigner } from '@/lib/services/tiss/tiss-digital-signer'
import { analyzeGlosaRisk, buildMinimizedGuideForAI } from '@/lib/services/tiss/glosa-predictor'

function makeTestPfx(): { pfx: Buffer; password: string } {
    const password = 'secret-p0'
    const keys = forge.pki.rsa.generateKeyPair(2048)
    const cert = forge.pki.createCertificate()
    cert.publicKey = keys.publicKey
    cert.serialNumber = '01'
    cert.validity.notBefore = new Date(Date.now() - 86400000)
    cert.validity.notAfter = new Date(Date.now() + 86400000 * 365)
    const attrs = [{ name: 'commonName', value: 'CLINIGO P0 TEST' }]
    cert.setSubject(attrs)
    cert.setIssuer(attrs)
    cert.sign(keys.privateKey, forge.md.sha256.create())
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: '3des' })
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes()
    return { pfx: Buffer.from(p12Der, 'binary'), password }
}

describe('Fase 1 (Entrega #1) — Blindagem P0 de Segurança, LGPD e Integridade TISS', () => {
    describe('1. QA-02 — Bloqueio de XXE / DTD / XML Bomb em todos os parsers', () => {
        const XXE_PAYLOAD = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<ans:mensagemTISS><ans:cabecalho><ans:Padrao>&xxe;</ans:Padrao></ans:cabecalho></ans:mensagemTISS>`

        it('rejeita <!DOCTYPE e <!ENTITY em assertSafeXmlNoXxe e prepareXMLBuffer', () => {
            expect(() => assertSafeXmlNoXxe(XXE_PAYLOAD)).toThrow(/DTD\/ENTITY\/XXE/)
            expect(() => prepareXMLBuffer(Buffer.from(XXE_PAYLOAD, 'utf8'))).toThrow(/DTD\/ENTITY\/XXE/)
        })

        it('rejeita XXE em parseUnimedXML, TissRealParser e TISSXSDValidator', async () => {
            expect(() => parseUnimedXML(XXE_PAYLOAD)).toThrow(/DTD\/ENTITY\/XXE/)

            const realParser = new TissRealParser()
            const parsed = await realParser.parseBuffer(Buffer.from(XXE_PAYLOAD, 'utf8'))
            expect(parsed.success).toBe(false)
            expect(parsed.errors[0]?.message).toMatch(/DTD\/ENTITY\/XXE/)

            const xsdValidator = getTISSXSDValidator()
            const xsdRes = await xsdValidator.validateXML(XXE_PAYLOAD)
            expect(xsdRes.valid).toBe(false)
            expect(xsdRes.errors[0]?.message).toMatch(/DTD\/ENTITY\/XXE/)
        })
    })

    describe('2. SEC-03 — Verificação criptográfica Fail-Closed em XML-DSig', () => {
        const XML_BASE = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:prestadorParaOperadora><ans:loteGuias><ans:numeroLote>100</ans:numeroLote></ans:loteGuias></ans:prestadorParaOperadora>
</ans:mensagemTISS>`

        it('valida assinatura legítima via X509 embutido mesmo sem certificado pré-carregado e rejeita XML adulterado', () => {
            const { pfx, password } = makeTestPfx()
            const signer = createTISSSigner()
            signer.loadCertificate(pfx, password)
            const signed = signer.signXML(XML_BASE)
            expect(signed.success).toBe(true)

            // Verificador limpo (sem loadCertificate) deve validar via X509Certificate embutido
            const verifier = createTISSSigner()
            const validCheck = verifier.verifySignature(signed.signedXml!)
            expect(validCheck.signatureFound).toBe(true)
            expect(validCheck.valid).toBe(true)

            // Adulteração do número do lote após assinatura DEVE falhar (Fail-Closed)
            const tampered = signed.signedXml!.replace('<ans:numeroLote>100</ans:numeroLote>', '<ans:numeroLote>999</ans:numeroLote>')
            const tamperedCheck = verifier.verifySignature(tampered)
            expect(tamperedCheck.valid).toBe(false)

            // Tag <Signature> forjada sem X509Certificate DEVE falhar (Fail-Closed)
            const forged = XML_BASE.replace('</ans:mensagemTISS>', '<Signature><SignatureValue>FAKE</SignatureValue></Signature></ans:mensagemTISS>')
            const forgedCheck = verifier.verifySignature(forged)
            expect(forgedCheck.valid).toBe(false)
        })
    })

    describe('3. REG-05 / AI-01 / MOD-02 — Escudo LGPD e Regras de Terapias em glosa-predictor.ts', () => {
        it('não importa OpenAI SDK diretamente e remove PII na minimização para IA', () => {
            const src = fs.readFileSync(
                path.join(process.cwd(), 'lib/services/tiss/glosa-predictor.ts'),
                'utf8'
            )
            expect(src).not.toMatch(/from\s+['"]openai['"]/)
            expect(src).toContain('runClinigoAiTask')

            const minimized = buildMinimizedGuideForAI({
                patient_name: 'Maria Silva Paciente Real',
                cpf: '12345678901',
                numeroCarteira: '0011223344556677',
                codigoProcedimento: '50000470',
                valorProcedimento: 180,
                codigoCID: 'F84.0',
            })
            const serialized = JSON.stringify(minimized)
            expect(serialized).not.toContain('Maria Silva')
            expect(serialized).not.toContain('12345678901')
            expect(serialized).not.toContain('0011223344556677')
            expect(minimized.tamanhoCarteirinhaDigitos).toBe(16)
        })

        it('detecta carteirinha vencida, pedido médico vencido e estouro de saldo de sessões em terapias (QA-41)', async () => {
            const risk = await analyzeGlosaRisk(
                {
                    tipo: 'SADT',
                    numeroGuiaPrestador: 'G-2026-001',
                    codigoProcedimento: '50000470',
                    valorProcedimento: 150,
                    numeroCarteira: '0011223344556677',
                    validadeCarteira: '2026-01-01',
                    validadePedidoMedico: '2026-02-01',
                    dataAtendimento: '2026-10-15',
                    sessions_authorized: 10,
                    sessions_used: 10,
                    numeroConselhoExecutante: 'INVALIDO',
                },
                'UNIMED'
            )

            const codes = risk.predicted_issues.map((i) => i.glosa_code)
            expect(codes).toContain('1001') // carteirinha vencida
            expect(codes).toContain('1401') // pedido vencido
            expect(codes).toContain('1701') // saldo sessões esgotado
            expect(codes).toContain('1006') // conselho inválido
            expect(risk.risk_level).toBe('critical')
            expect(risk.lgpd_shielded).toBe(true)
        })
    })

    describe('4. QA-17 — Proteção contra IDOR e remoção de mock em elegibilidade', () => {
        it('AutorizacaoService.sendToOperator exige clinicId e filtra por clinic_id', () => {
            const src = fs.readFileSync(
                path.join(process.cwd(), 'lib/services/tiss/autorizacao-service.ts'),
                'utf8'
            )
            expect(src).toMatch(/async sendToOperator\(requestId:\s*string,\s*clinicId:\s*string\)/)
            expect(src).toContain(".eq('clinic_id', clinicId)")
        })

        it('rota /api/tiss/eligibility não contém lógica mockada endsWith(00) nem mocked: true', () => {
            const src = fs.readFileSync(
                path.join(process.cwd(), 'app/api/tiss/eligibility/route.ts'),
                'utf8'
            )
            expect(src).not.toContain("endsWith('00')")
            expect(src).not.toContain('mocked: true')
            expect(src).toContain('verification_method')
        })
    })
})

