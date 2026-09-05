import fs from 'fs';

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
import { getSpecialtyTemplate } from '../lib/session-plans/registry';

async function testAllSpecialtiesSessionFlow() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 TESTE DE CRIAÇÃO E ABERTURA DE SESSÃO (5 MÓDULOS)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const supabase = createServiceRoleClient();
    const patientId = 'a594e0b5-b5ba-4c58-91af-a2a0f510bedb';
    const clinicId = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30'; // Demo Teste

    const especialidades = [
        'fisioterapia',
        'fonoaudiologia',
        'intervencao-precoce-aba',
        'psicologia',
        'terapia-ocupacional',
    ];

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

    for (const esp of especialidades) {
        console.log(`\n📌 Testando fluxo completo para: ${esp}...`);

        // 1. Template
        const template = getSpecialtyTemplate(esp);
        assert(!!template, `Template encontrado para ${esp} (${template?.name})`);

        // 2. Criar Sessão
        const newSession = {
            clinica_id: clinicId,
            paciente_id: patientId,
            especialidade: esp,
            data_sessao: new Date().toISOString().split('T')[0],
            duracao_minutos: 50,
            contexto: 'Clínica',
            forma_mobilidade: 'Marcha independente',
            condicao_inicial: {},
            objetivos_selecionados: [],
            estrategias: {},
            planejamento_etapas: [],
            registro_desempenho: [],
            qualidade_movimento: {},
            analise_clinica: {},
            decisao_proxima_sessao: {},
            orientacao_familia: {},
            grafico_indicadores: {},
            status: 'rascunho',
        };

        const { data: createdSession, error: createError } = await supabase
            .from('planos_sessao')
            .insert(newSession)
            .select()
            .single();

        assert(!createError && !!createdSession, `Sessão criada no banco com sucesso (ID: ${createdSession?.id})`);

        // 3. Simular query exata da página de detalhe /sessao/[sessaoId]
        const { data: sessaoCarregada, error: pageQueryError } = await supabase
            .from('planos_sessao')
            .select(`
                *,
                users:profissional_id (
                    id,
                    full_name,
                    email
                )
            `)
            .eq('id', createdSession.id)
            .eq('clinica_id', clinicId)
            .eq('paciente_id', patientId)
            .single();

        assert(!pageQueryError, `Query da página de sessão executou SEM ERRO (sem 404) para ${esp}`);
        assert(sessaoCarregada?.id === createdSession.id, `Dados da sessão recuperados com sucesso para ${esp}`);

        // 4. Limpeza da sessão de teste
        await supabase.from('planos_sessao').delete().eq('id', createdSession.id);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎉 RESULTADO: ${passed}/${total} ASSERÇÕES PASSARAM COM SUCESSO!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testAllSpecialtiesSessionFlow().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
