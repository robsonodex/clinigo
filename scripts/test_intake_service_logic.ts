/**
 * Teste de Lógica de Serviço e Mensageria — Módulo Pré-cadastros
 */

import { buildIntakeWhatsAppMessage } from '../lib/services/patient-intake'

async function runServiceTests() {
    console.log('--- Iniciando Testes de Serviço do Módulo de Pré-cadastros ---')
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

    // 1. Geração de Mensagem WhatsApp com nome do lead
    const msgWithLead = buildIntakeWhatsAppMessage(
        'Mariana Oliveira',
        'Clínica Mais Saúde',
        'https://clinigo.app/pre-cadastro/abc123token'
    )
    assert(msgWithLead.includes('Olá, Mariana Oliveira!'), 'Saudação personalizada com nome do lead')
    assert(msgWithLead.includes('Clínica Mais Saúde'), 'Contém nome da clínica')
    assert(msgWithLead.includes('https://clinigo.app/pre-cadastro/abc123token'), 'Contém link correto')

    // 2. Geração de Mensagem WhatsApp sem nome do lead
    const msgNoLead = buildIntakeWhatsAppMessage(
        undefined,
        'Clínica São Lucas',
        'https://clinigo.app/pre-cadastro/xyz789token'
    )
    assert(msgNoLead.startsWith('Olá!'), 'Saudação neutra quando lead não informado')
    assert(msgNoLead.includes('Clínica São Lucas'), 'Contém nome da clínica')
    assert(msgNoLead.includes('https://clinigo.app/pre-cadastro/xyz789token'), 'Contém link correto')

    // 3. Proibição de emojis em mensagens de sistema (Regra Zero / SaaS Premium)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
    assert(!emojiRegex.test(msgWithLead), 'Mensagem com lead está livre de emojis')
    assert(!emojiRegex.test(msgNoLead), 'Mensagem sem lead está livre de emojis')

    console.log(`\n--- Resultado: ${passed} passaram, ${failed} falharam ---`)
    if (failed > 0) process.exit(1)
}

runServiceTests().catch(err => {
    console.error(err)
    process.exit(1)
})
