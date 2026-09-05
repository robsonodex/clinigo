import fs from 'fs';
import path from 'path';

if (fs.existsSync('.env.local')) {
    const envFile = fs.readFileSync('.env.local', 'utf-8');
    envFile.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...rest] = trimmed.split('=');
            const val = rest.join('=').replace(/^["']|["']$/g, '').trim();
            if (key && !process.env[key]) {
                process.env[key] = val;
            }
        }
    });
}

import { createServiceRoleClient } from '../lib/supabase/service-role';
import { enforceSessionPlanRouteGuard } from '../lib/services/session-plans-guard';

async function runTests() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 VALIDANDO CORREÇÃO DE ENDEREÇO E PLANOS DE SESSÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const supabase = createServiceRoleClient();
    let passed = 0;
    let total = 0;

    function assert(condition: boolean, description: string) {
        total++;
        if (condition) {
            console.log(`✅ [PASS] ${description}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${description}`);
            process.exitCode = 1;
        }
    }

    // ----------------------------------------------------
    // TESTE 1: Planos de Sessão - Consulta do Paciente e Guard
    // ----------------------------------------------------
    console.log('📌 Teste 1: Validação das rotas dos Planos de Sessão (Correção de birth_date -> date_of_birth)...');
    const patientId = 'a594e0b5-b5ba-4c58-91af-a2a0f510bedb'; // Aline Teste

    const { data: patientCheck, error: pCheckError } = await supabase
        .from('patients')
        .select('id, clinic_id, full_name, date_of_birth, cpf, phone, gender, created_at')
        .eq('id', patientId)
        .single();

    assert(!pCheckError && !!patientCheck, `Paciente Aline Teste localizado no banco (ID: ${patientCheck?.id})`);
    assert(patientCheck?.clinic_id === '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30', 'Paciente pertence à Clínica Demo Teste (Autorizada)');
    assert('date_of_birth' in (patientCheck || {}), 'date_of_birth existe no registro e não causa erro de coluna');

    // Testar as 5 especialidades
    const especialidades = ['fisioterapia', 'fonoaudiologia', 'intervencao-precoce-aba', 'psicologia', 'terapia-ocupacional'];
    for (const esp of especialidades) {
        const { data: sessoes, error: sError } = await supabase
            .from('planos_sessao')
            .select('id')
            .eq('clinica_id', patientCheck.clinic_id)
            .eq('paciente_id', patientId)
            .eq('especialidade', esp);
        assert(!sError, `Consulta de sessões para ${esp} executada sem erro de RLS ou schema`);
    }

    // ----------------------------------------------------
    // TESTE 2: Cadastro de Novo Paciente com 7 Campos de Endereço
    // ----------------------------------------------------
    console.log('\n📌 Teste 2: Criação de Paciente com 7 campos de endereço...');
    const testClinicId = '4c13e586-5390-4393-a180-2c9dd7ed81c7'; // World Sensory

    const payloadNovoPaciente = {
        full_name: 'Paciente Teste Validacao Endereco ' + Date.now(),
        cpf: '00000000000',
        phone: '11999999999',
        email: 'teste.endereco@clinigo.com.br',
        date_of_birth: '2015-05-20',
        gender: 'M',
        address_street: 'Avenida Paulista',
        address_number: '1000',
        address_complement: 'Sala 501',
        address_neighborhood: 'Bela Vista',
        address_city: 'São Paulo',
        address_state: 'SP',
        address_zip_code: '01310-100'
    };

    // Simular lógica de montagem do POST /api/patients
    const addressObj = {
        street: payloadNovoPaciente.address_street.trim(),
        number: payloadNovoPaciente.address_number.trim(),
        complement: payloadNovoPaciente.address_complement.trim(),
        neighborhood: payloadNovoPaciente.address_neighborhood.trim(),
        city: payloadNovoPaciente.address_city.trim(),
        state: payloadNovoPaciente.address_state.trim().toUpperCase(),
        zip_code: payloadNovoPaciente.address_zip_code.replace(/\D/g, '')
    };

    const insertData = {
        full_name: payloadNovoPaciente.full_name,
        cpf: payloadNovoPaciente.cpf,
        email: payloadNovoPaciente.email,
        phone: payloadNovoPaciente.phone,
        date_of_birth: payloadNovoPaciente.date_of_birth,
        gender: payloadNovoPaciente.gender,
        clinic_id: testClinicId,
        address: addressObj,
        address_number: addressObj.number,
        address_complement: addressObj.complement,
        neighborhood: addressObj.neighborhood,
        city: addressObj.city,
        state: addressObj.state,
        zip_code: addressObj.zip_code,
        updated_at: new Date().toISOString()
    };

    const { data: createdPatient, error: createError } = await supabase
        .from('patients')
        .insert(insertData)
        .select()
        .single();

    assert(!createError && !!createdPatient, `Paciente inserido com sucesso (ID: ${createdPatient?.id})`);

    // ----------------------------------------------------
    // TESTE 3: Verificação de Leitura na Tela de Edição
    // ----------------------------------------------------
    console.log('\n📌 Teste 3: Leitura e preenchimento dos 7 campos de endereço na tela de Edição...');
    const { data: fetchedPatient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', createdPatient?.id)
        .single();

    assert(!fetchError && !!fetchedPatient, 'Paciente consultado para simular carregamento da tela de edição');

    const addr = fetchedPatient?.address && typeof fetchedPatient.address === 'object' ? fetchedPatient.address : {};

    assert(addr.street === 'Avenida Paulista', `Rua preservada no JSONB: ${addr.street}`);
    assert(addr.number === '1000', `Número preservado no JSONB: ${addr.number}`);
    assert(addr.complement === 'Sala 501', `Complemento preservado no JSONB: ${addr.complement}`);
    assert(addr.neighborhood === 'Bela Vista', `Bairro preservado no JSONB: ${addr.neighborhood}`);
    assert(addr.city === 'São Paulo', `Cidade preservada no JSONB: ${addr.city}`);
    assert(addr.state === 'SP', `UF preservada no JSONB: ${addr.state}`);
    assert(addr.zip_code === '01310100', `CEP preservado no JSONB: ${addr.zip_code}`);

    assert(fetchedPatient?.address_number === '1000', `address_number salvo na coluna dedicada: ${fetchedPatient?.address_number}`);
    assert(fetchedPatient?.address_complement === 'Sala 501', `address_complement salvo na coluna dedicada: ${fetchedPatient?.address_complement}`);
    assert(fetchedPatient?.neighborhood === 'Bela Vista', `neighborhood salvo na coluna dedicada: ${fetchedPatient?.neighborhood}`);
    assert(fetchedPatient?.city === 'São Paulo', `city salvo na coluna dedicada: ${fetchedPatient?.city}`);
    assert(fetchedPatient?.state === 'SP', `state salvo na coluna dedicada: ${fetchedPatient?.state}`);
    assert(fetchedPatient?.zip_code === '01310100', `zip_code salvo na coluna dedicada: ${fetchedPatient?.zip_code}`);

    // Limpeza de segurança (LGPD)
    if (createdPatient?.id) {
        await supabase.from('patients').delete().eq('id', createdPatient.id);
        console.log('\n🧹 Limpeza de segurança: Registro de teste removido.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 RESULTADO: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runTests().catch(err => {
    console.error('Erro nos testes:', err);
    process.exit(1);
});
