/**
 * Script de Verificação Automatizada — Módulo Pré-cadastros
 * Valida criação de links, hashing, schemas Zod, validações de CPF e regras de negócio.
 */

import {
    CreateLinkSchema,
    IntakeFormSchema,
    isValidCPF,
    normalizeBRPhone,
    INTAKE_CONSENT_TEXT,
    INTAKE_CONSENT_VERSION,
} from '../lib/validations/patient-intake'
import crypto from 'crypto'

async function runTests() {
    console.log('--- Iniciando Testes do Módulo de Pré-cadastros ---')
    let passed = 0
    let failed = 0

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`[PASS] ${testName}`)
            passed++
        } else {
            console.error(`[FAIL] ${testName}`)
            failed++
        }
    }

    // 1. Validação Matemática de CPF
    assert(isValidCPF('52998224725') === true, 'Validação de CPF válido')
    assert(isValidCPF('11111111111') === false, 'Rejeição de CPF com dígitos repetidos')
    assert(isValidCPF('12345678900') === false, 'Rejeição de CPF com dígitos verificadores inválidos')

    // 2. Normalização de Telefone BR
    assert(normalizeBRPhone('11999887766') === '5511999887766', 'Normaliza telefone adicionando DDI 55')
    assert(normalizeBRPhone('5511999887766') === '5511999887766', 'Preserva telefone já com DDI 55')

    // 3. Schema de Criação de Link
    const validLink = CreateLinkSchema.safeParse({
        lead_name: 'Maria Silva',
        lead_phone: '(11) 98765-4321',
    })
    assert(validLink.success === true, 'Schema CreateLink aceita lead_name e lead_phone')

    // 4. Token & Hash (SHA-256)
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    assert(rawToken.length === 64, 'Token puro tem 64 caracteres hex (256 bits)')
    assert(tokenHash.length === 64, 'Hash SHA-256 tem 64 caracteres')
    assert(rawToken !== tokenHash, 'Hash é irreversível e diferente do token original')

    // 5. Schema de Submissão com Validações
    const validSubmission = IntakeFormSchema.safeParse({
        patient_type: 'self',
        full_name: 'Carlos Alberto de Souza',
        date_of_birth: '1985-05-15',
        cpf: '52998224725',
        phone: '11999998888',
        email: 'carlos@exemplo.com.br',
        billing_type: 'particular',
        consent: {
            accepted: true,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(validSubmission.success === true, 'Schema IntakeFormSchema aceita adulto particular válido')

    // 6. Rejeição quando consentimento não foi aceito
    const submissionNoConsent = IntakeFormSchema.safeParse({
        patient_type: 'self',
        full_name: 'Carlos Alberto',
        date_of_birth: '1985-05-15',
        cpf: '52998224725',
        phone: '11999998888',
        billing_type: 'particular',
        consent: {
            accepted: false as any,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(submissionNoConsent.success === false, 'Rejeição obrigatória quando consent.accepted = false')

    // 7. Paciente Dependente/Menor ('other') exige dados do responsável
    const minorWithoutResp = IntakeFormSchema.safeParse({
        patient_type: 'other',
        full_name: 'Lucas Souza',
        date_of_birth: '2020-01-10',
        phone: '11999998888',
        billing_type: 'particular',
        consent: {
            accepted: true,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(minorWithoutResp.success === false, 'Rejeição de paciente tipo other sem dados de responsável')

    // 8. Paciente Dependente COM responsável válido
    const minorWithResp = IntakeFormSchema.safeParse({
        patient_type: 'other',
        full_name: 'Lucas Souza',
        date_of_birth: '2020-01-10',
        phone: '11999998888',
        guardian: {
            guardian_name: 'Ana Souza',
            guardian_cpf: '52998224725',
            guardian_relationship: 'Mãe',
            guardian_phone: '11988887777',
        },
        billing_type: 'particular',
        consent: {
            accepted: true,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(minorWithResp.success === true, 'Aprovação de menor com dados completos de responsável')

    // 9. Convênio exige dados de insurance
    const convenioWithoutInsurance = IntakeFormSchema.safeParse({
        patient_type: 'self',
        full_name: 'Paula Lima',
        date_of_birth: '1990-08-20',
        phone: '11999997777',
        billing_type: 'convenio',
        consent: {
            accepted: true,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(convenioWithoutInsurance.success === false, 'Rejeição de convênio sem dados do plano de saúde')

    // 10. Proteção Anti-Bot Honeypot
    const botSubmission = IntakeFormSchema.safeParse({
        patient_type: 'self',
        full_name: 'Bot Spammer',
        date_of_birth: '1990-01-01',
        phone: '11999997777',
        billing_type: 'particular',
        _hp_field: 'preenchido_por_robo',
        consent: {
            accepted: true,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
            accepted_at: new Date().toISOString(),
        },
    })
    assert(botSubmission.success === false, 'Honeypot bloqueia submissão automatizada de bot')

    console.log(`\n--- Resultado: ${passed} passaram, ${failed} falharam ---`)
    if (failed > 0) {
        process.exit(1)
    }
}

runTests().catch(err => {
    console.error(err)
    process.exit(1)
})
