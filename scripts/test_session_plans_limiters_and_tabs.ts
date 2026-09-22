/**
 * Teste Automatizado: Validação de Categorias, Abas e Limitadores Clínicos
 * World Sensory & CliniGo - Planos de Sessão
 */

import { SESSION_PLANS_REGISTRY } from '../lib/session-plans/registry'

console.log('--- INICIANDO TESTE: LIMITADORES CLÍNICOS E ABAS DE PLANOS DE SESSÃO ---')

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
    if (condition) {
        console.log(`[PASS] ${msg}`)
        passed++
    } else {
        console.error(`[FAIL] ${msg}`)
        failed++
    }
}

const specialties = [
    'fisioterapia',
    'fonoaudiologia',
    'intervencao_precoce_aba',
    'psicologia',
    'terapia_ocupacional'
]

for (const spec of specialties) {
    const template = SESSION_PLANS_REGISTRY[spec]
    assert(!!template, `Template '${spec}' existe no registro`)

    if (!template) continue

    // 1. Categorias e Aba Inicial
    const firstCat = template.categories?.[0]?.id
    assert(!!firstCat && firstCat.length > 0, `Especialidade '${spec}': possui primeira categoria válida ('${firstCat}')`)

    const activeTab = template.categories?.[0]?.id || 'MOB'
    const tabExists = template.categories.some(c => c.id === activeTab)
    assert(tabExists, `Especialidade '${spec}': activeTab inicial ('${activeTab}') existe nas categorias do template`)

    // 2. Limitadores Clínicos (Seção 23 - Análise Clínica)
    const limiters = template.clinicalLimiters
    assert(Array.isArray(limiters) && limiters.length >= 5, `Especialidade '${spec}': clinicalLimiters possui pelo menos 5 opções (encontrado: ${limiters?.length || 0})`)
    assert(limiters?.includes('Outro') === true, `Especialidade '${spec}': clinicalLimiters inclui a opção 'Outro'`)

    // 3. Qualidade da Execução / Resposta (Seção 22)
    const quality = template.movementQualityOptions
    assert(Array.isArray(quality) && quality.length >= 5, `Especialidade '${spec}': movementQualityOptions possui pelo menos 5 opções (encontrado: ${quality?.length || 0})`)
    assert(quality?.includes('Outro') === true, `Especialidade '${spec}': movementQualityOptions inclui a opção 'Outro'`)

    // 4. Decisões de Próxima Sessão e Contextos
    assert(Array.isArray(template.nextSessionDecisions) && template.nextSessionDecisions.length > 0, `Especialidade '${spec}': nextSessionDecisions configurado`)
    assert(Array.isArray(template.generalizationContexts) && template.generalizationContexts.length > 0, `Especialidade '${spec}': generalizationContexts configurado`)
}

// 5. Teste específico para a Psicologia do Vitor (World Sensory)
const psi = SESSION_PLANS_REGISTRY['psicologia']
assert(psi.categories[0].id === 'EP', `Psicologia: primeira categoria é 'EP' (Engajamento e Participação)`)
assert(psi.clinicalLimiters?.includes('Regulação emocional / Frustração') === true, `Psicologia: contém 'Regulação emocional / Frustração' nos limitadores`)
assert(psi.clinicalLimiters?.includes('Engajamento / Motivação') === true, `Psicologia: contém 'Engajamento / Motivação' nos limitadores`)
assert(psi.clinicalLimiters?.includes('Atenção e concentração') === true, `Psicologia: contém 'Atenção e concentração' nos limitadores`)

console.log(`\n--- RESULTADO FINAL: ${passed} PASSOU, ${failed} FALHOU ---`)

if (failed > 0) {
    process.exit(1)
} else {
    process.exit(0)
}
