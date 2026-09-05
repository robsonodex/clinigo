/**
 * TESTE DE ISOLAMENTO RIGOROSO DA FASE 0 (Central de Planos de Sessão)
 * Valida que NENHUMA clínica fora da Allowlist (Camada A + Camada B) consegue acessar,
 * visualizar ou habilitar estes módulos, testando com clínica decoy (Espaço Incluir).
 */

import fs from 'fs'
import path from 'path'

if (fs.existsSync('.env.local')) {
    const envFile = fs.readFileSync('.env.local', 'utf-8')
    envFile.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...rest] = trimmed.split('=')
            const val = rest.join('=').replace(/^["']|["']$/g, '').trim()
            if (key && !process.env[key]) {
                process.env[key] = val
            }
        }
    })
}

import {
    isClinicInSessionPlansAllowlist,
    SESSION_PLANS_BETA_CLINIC_IDS,
} from '../lib/constants/session-plans-beta-clinics'
import {
    verifySessionPlanAccess,
    getEnabledSessionPlanSpecialties,
    isSessionPlansKillSwitchActive,
} from '../lib/services/session-plans-guard'
import {
    getClinicPermissions,
    enableFeature,
} from '../lib/services/permissions-service'
import { FEATURE_KEYS } from '../lib/constants/features'

const WORLD_SENSORY_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
const DEMO_TESTE_ID = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30'
const DECOY_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46' // Espaço Incluir
const FAKE_RANDOM_ID = '99999999-9999-9999-9999-999999999999'

async function runIsolationTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧪 INICIANDO TESTE DE ISOLAMENTO DE DUAS CAMADAS (FASE 0)')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    let passedTests = 0
    let totalTests = 0

    function assert(condition: boolean, testName: string) {
        totalTests++
        if (condition) {
            console.log(`✅ [PASS] ${testName}`)
            passedTests++
        } else {
            console.error(`❌ [FAIL] ${testName}`)
            throw new Error(`Teste falhou: ${testName}`)
        }
    }

    // --- TESTE 1: Allowlist Camada A ---
    console.log('📌 Testando Camada A (Allowlist Estrita no Código)...')
    assert(
        SESSION_PLANS_BETA_CLINIC_IDS.length === 2,
        'Allowlist contém estritamente 2 clínicas autorizadas'
    )
    assert(
        isClinicInSessionPlansAllowlist(WORLD_SENSORY_ID),
        'World Sensory está na Allowlist'
    )
    assert(
        isClinicInSessionPlansAllowlist(DEMO_TESTE_ID),
        'Clínica Demo Teste está na Allowlist'
    )
    assert(
        !isClinicInSessionPlansAllowlist(DECOY_CLINIC_ID),
        'Clínica Decoy (Espaço Incluir) NÃO está na Allowlist'
    )
    assert(
        !isClinicInSessionPlansAllowlist(FAKE_RANDOM_ID),
        'UUID aleatório não existente NÃO está na Allowlist'
    )
    assert(
        !isClinicInSessionPlansAllowlist(null),
        'null NÃO está na Allowlist'
    )
    assert(
        !isClinicInSessionPlansAllowlist(undefined),
        'undefined NÃO está na Allowlist'
    )

    // --- TESTE 2: Especialidades Habilitadas (Camada B com filtro de Camada A) ---
    console.log('\n📌 Testando Consulta de Especialidades Habilitadas...')
    const decoySpecialties = await getEnabledSessionPlanSpecialties(DECOY_CLINIC_ID)
    assert(
        decoySpecialties.length === 0,
        `Clínica Decoy retorna 0 especialidades disponíveis (obtido: ${JSON.stringify(decoySpecialties)})`
    )

    const randomSpecialties = await getEnabledSessionPlanSpecialties(FAKE_RANDOM_ID)
    assert(
        randomSpecialties.length === 0,
        `UUID aleatório retorna 0 especialidades disponíveis`
    )

    const sensorySpecialties = await getEnabledSessionPlanSpecialties(WORLD_SENSORY_ID)
    assert(
        sensorySpecialties.includes('fisioterapia'),
        `World Sensory possui fisioterapia habilitada (obtido: ${JSON.stringify(sensorySpecialties)})`
    )

    const demoSpecialties = await getEnabledSessionPlanSpecialties(DEMO_TESTE_ID)
    assert(
        demoSpecialties.includes('fisioterapia'),
        `Demo Teste possui fisioterapia habilitada (obtido: ${JSON.stringify(demoSpecialties)})`
    )

    // --- TESTE 3: Verificação de Acesso às Rotas & APIs (Retorno 404 para Não Autorizados) ---
    console.log('\n📌 Testando Guard de Acesso às Rotas e APIs...')
    const decoyAccess = await verifySessionPlanAccess({
        clinicId: DECOY_CLINIC_ID,
        route: '/dashboard/pacientes/123/planos-sessao/fisioterapia',
        specialty: 'fisioterapia',
    })
    assert(
        decoyAccess.isAllowed === false,
        'Acesso da Clínica Decoy é TERMINANTEMENTE NEGADO'
    )

    const fakeAccess = await verifySessionPlanAccess({
        clinicId: FAKE_RANDOM_ID,
        route: '/dashboard/pacientes/123/planos-sessao/fisioterapia',
        specialty: 'fisioterapia',
    })
    assert(
        fakeAccess.isAllowed === false,
        'Acesso de UUID aleatório é TERMINANTEMENTE NEGADO'
    )

    const sensoryAccess = await verifySessionPlanAccess({
        clinicId: WORLD_SENSORY_ID,
        route: '/dashboard/pacientes/123/planos-sessao/fisioterapia',
        specialty: 'fisioterapia',
    })
    assert(
        sensoryAccess.isAllowed === true,
        'Acesso da World Sensory à Fisioterapia é PERMITIDO'
    )

    // --- TESTE 4: Proteção no Master Hub (Impossibilidade de Ativar para Outra Clínica) ---
    console.log('\n📌 Testando Proteção do Master Hub & API de Permissões...')
    const decoyPermissions = await getClinicPermissions(DECOY_CLINIC_ID)
    assert(
        decoyPermissions[FEATURE_KEYS.PSICOMOTRICIDADE]?.enabled === false,
        'Psicomotricidade é FALSE no Master Hub para Clínica Decoy'
    )
    assert(
        decoyPermissions[FEATURE_KEYS.PLANO_FISIOTERAPIA]?.enabled === false,
        'Plano Fisioterapia é FALSE no Master Hub para Clínica Decoy'
    )

    let threwOnDecoyEnable = false
    try {
        await enableFeature(DECOY_CLINIC_ID, FEATURE_KEYS.PLANO_FISIOTERAPIA, 'test-runner')
    } catch (e) {
        threwOnDecoyEnable = true
    }
    assert(
        threwOnDecoyEnable,
        'Tentativa de ativar Plano Fisioterapia para Clínica Decoy no backend é BLOQUEADA COM ERRO'
    )

    // --- TESTE 5: Kill Switch ---
    console.log('\n📌 Testando Kill Switch de Emergência...')
    process.env.SESSION_PLANS_BETA_ENABLED = 'false'
    const killSwitchActive = isSessionPlansKillSwitchActive()
    assert(killSwitchActive === true, 'Kill switch reporta ativo quando env=false')

    const sensoryAccessWithKillSwitch = await verifySessionPlanAccess({
        clinicId: WORLD_SENSORY_ID,
        route: '/dashboard/pacientes/123/planos-sessao/fisioterapia',
        specialty: 'fisioterapia',
    })
    assert(
        sensoryAccessWithKillSwitch.isAllowed === false,
        'Com Kill Switch ativo, até a World Sensory é bloqueada instantaneamente'
    )

    // Restaura ambiente
    delete process.env.SESSION_PLANS_BETA_ENABLED

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`🎉 RESULTADO FINAL: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO!`)
    console.log('🔒 ISOLAMENTO DE DUAS CAMADAS (FASE 0) 100% COMPROVADO!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

runIsolationTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Falha nos testes:', err)
        process.exit(1)
    })
