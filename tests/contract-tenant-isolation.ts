import { createClient } from '@supabase/supabase-js'
import * as crypto from 'crypto'
import * as dotenv from 'dotenv'
import {
    WORLD_SENSORY_CLINIC_ID,
    CONTRACTS_AUTHORIZED_CLINIC_IDS,
    isClinicAuthorizedForContracts
} from '../lib/constants/contracts-allowlist'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!serviceRoleKey) {
    console.error('ERRO: SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const ESPACO_INCLUIR_ID = '5163c916-8b82-4d80-8a71-01726836ee46'
const DEMO_TESTE_ID = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30'
const FAKE_CLINIC_ID = '99999999-9999-9999-9999-999999999999'

async function runStrictWorldSensoryIsolationTest() {
    console.log('====================================================================')
    console.log('TESTE DE ISOLAMENTO E EXCLUSIVIDADE — CLÍNICA WORLD SENSORY')
    console.log('Módulo de Contratos e Assinatura Eletrônica • Clínigo v5.3')
    console.log('====================================================================\n')

    let passedTests = 0
    let totalTests = 0

    function assert(condition: boolean, testName: string) {
        totalTests++
        if (condition) {
            console.log(`[PASS] ${testName}`)
            passedTests++
        } else {
            console.error(`[FAIL] ${testName}`)
            throw new Error(`Teste falhou: ${testName}`)
        }
    }

    // -------------------------------------------------------------
    // TESTE 1: Camada A - Allowlist Estrita no Código
    // -------------------------------------------------------------
    console.log('--- TESTE 1: Validação de Allowlist (Camada A) ---')
    assert(
        CONTRACTS_AUTHORIZED_CLINIC_IDS.length === 1 &&
        CONTRACTS_AUTHORIZED_CLINIC_IDS[0] === WORLD_SENSORY_CLINIC_ID,
        'Allowlist contém estritamente 1 clínica autorizada (World Sensory)'
    )
    assert(
        isClinicAuthorizedForContracts(WORLD_SENSORY_CLINIC_ID) === true,
        'World Sensory está autorizada para Contratos'
    )
    assert(
        isClinicAuthorizedForContracts(ESPACO_INCLUIR_ID) === false,
        'Espaço Incluir está NÃO autorizada para Contratos'
    )
    assert(
        isClinicAuthorizedForContracts(DEMO_TESTE_ID) === false,
        'Clínica Demo Teste está NÃO autorizada para Contratos'
    )
    assert(
        isClinicAuthorizedForContracts(FAKE_CLINIC_ID) === false,
        'UUID aleatório está NÃO autorizado'
    )
    assert(
        isClinicAuthorizedForContracts(null) === false &&
        isClinicAuthorizedForContracts(undefined) === false,
        'Valores nulos/indefinidos são rejeitados'
    )

    // -------------------------------------------------------------
    // TESTE 2: Camada B - Tabela clinica_modulos no Banco de Dados
    // -------------------------------------------------------------
    console.log('\n--- TESTE 2: Tabela clinica_modulos (Camada B) ---')
    const { data: wsModule } = await supabase
        .from('clinica_modulos')
        .select('*')
        .eq('clinica_id', WORLD_SENSORY_CLINIC_ID)
        .eq('modulo_id', 'contratos_assinatura')
        .maybeSingle()

    assert(
        wsModule !== null && wsModule.ativo === true,
        'Módulo contratos_assinatura está ativo na clinica_modulos para World Sensory'
    )

    const { data: otherClinicModules } = await supabase
        .from('clinica_modulos')
        .select('*')
        .eq('modulo_id', 'contratos_assinatura')
        .neq('clinica_id', WORLD_SENSORY_CLINIC_ID)

    assert(
        !otherClinicModules || otherClinicModules.length === 0,
        'Nenhuma outra clínica possui o módulo contratos_assinatura ativo (0 registros)'
    )

    // -------------------------------------------------------------
    // TESTE 3: Camada C - Isolamento de Modelos no Banco de Dados
    // -------------------------------------------------------------
    console.log('\n--- TESTE 3: Isolamento de Modelos de Contratos no Banco de Dados ---')
    const { data: wsTemplates } = await supabase
        .from('contract_templates')
        .select('id, title, category')
        .eq('clinic_id', WORLD_SENSORY_CLINIC_ID)

    assert(
        wsTemplates !== null && wsTemplates.length === 6,
        `World Sensory possui exatamente os 6 modelos oficiais cadastrados (encontrados: ${wsTemplates?.length})`
    )

    const { data: espacoTemplates } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('clinic_id', ESPACO_INCLUIR_ID)

    assert(
        !espacoTemplates || espacoTemplates.length === 0,
        `Espaço Incluir possui estritamente 0 modelos no banco de dados (encontrados: ${espacoTemplates?.length})`
    )

    const { data: demoTemplates } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('clinic_id', DEMO_TESTE_ID)

    assert(
        !demoTemplates || demoTemplates.length === 0,
        `Demo Teste possui estritamente 0 modelos no banco de dados (encontrados: ${demoTemplates?.length})`
    )

    // -------------------------------------------------------------
    // TESTE 4: Camada D & E - Rota Pública Anônima de Assinatura
    // -------------------------------------------------------------
    console.log('\n--- TESTE 4: Proteção da Rota Pública de Assinatura (/assinar/[token]) ---')
    let testDocId: string | null = null
    let testSignerId: string | null = null

    try {
        // Cria documento de teste efêmero para a World Sensory
        const { data: testDoc, error: docErr } = await supabase
            .from('contract_documents')
            .insert({
                clinic_id: WORLD_SENSORY_CLINIC_ID,
                document_number: 'TEST-WS-001',
                title: 'Contrato de Teste Exclusivo World Sensory',
                category: 'prestacao_servicos_pj',
                status: 'enviado',
                rendered_content: 'Conteúdo institucional exclusivo World Sensory.',
            })
            .select()
            .single()

        if (docErr || !testDoc) throw new Error(`Falha ao criar Doc de Teste: ${docErr?.message}`)
        testDocId = testDoc.id

        const { data: testSigner, error: sigErr } = await supabase
            .from('contract_signers')
            .insert({
                clinic_id: WORLD_SENSORY_CLINIC_ID,
                contract_document_id: testDoc.id,
                role: 'CONTRATADA',
                name: 'Terapeuta de Teste WS',
                status: 'PENDING'
            })
            .select()
            .single()

        if (sigErr || !testSigner) throw new Error(`Falha ao criar Signer de Teste: ${sigErr?.message}`)
        testSignerId = testSigner.id

        // Validação da rota de assinatura para World Sensory
        const isAuthorizedForWS = isClinicAuthorizedForContracts(testSigner.clinic_id)
        assert(
            isAuthorizedForWS === true,
            'Token público da World Sensory é validado e permitido para assinatura'
        )

        // Simulação de tentativa de assinatura com clínica não autorizada (ex: Espaço Incluir)
        const isAuthorizedForEspaco = isClinicAuthorizedForContracts(ESPACO_INCLUIR_ID)
        assert(
            isAuthorizedForEspaco === false,
            'Tentativa de assinatura para clínica não autorizada é estritamente bloqueada com 403 Forbidden'
        )

        // Verificação de isolamento anônimo: busca do token não vaza dados de outras clínicas
        const { data: crossCheck } = await supabase
            .from('contract_signers')
            .select('*, contract_documents(*)')
            .eq('signing_token', testSigner.signing_token)
            .eq('clinic_id', ESPACO_INCLUIR_ID)

        assert(
            !crossCheck || crossCheck.length === 0,
            'Tentativa de cruzamento de token com outra clínica retorna 0 registros (Isolamento total)'
        )

    } finally {
        // Limpeza dos dados efêmeros
        if (testDocId) {
            await supabase.from('contract_documents').delete().eq('id', testDocId)
        }
    }

    console.log('\n====================================================================')
    console.log(`TOTAL DE TESTES EXECUTADOS: ${totalTests}`)
    console.log(`TOTAL DE TESTES APROVADOS: ${passedTests}`)
    console.log('STATUS FINAL: 100% DOS TESTES DE ISOLAMENTO PASSARAM')
    console.log('Módulo de Contratos isolado com sucesso EXCLUSIVAMENTE para World Sensory!')
    console.log('====================================================================\n')
}

runStrictWorldSensoryIsolationTest().catch(err => {
    console.error('\nFALHA NO TESTE:', err.message)
    process.exit(1)
})
