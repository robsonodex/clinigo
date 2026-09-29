#!/usr/bin/env node
/**
 * scripts/staging/compare-repasse-real.mjs
 * 
 * SCRIPT SOMENTE LEITURA - NÃO EXECUTA ESCRITAS OU MODIFICAÇÕES NO BANCO.
 * Compara o cálculo de repasse legado (commit 711df48) vs cálculo novo
 * sobre os atendimentos reais de um mês fechado.
 * 
 * USO SEGURO:
 * Executar preferencialmente em ambiente de staging ou cópia de homologação.
 * 
 * Variáveis de ambiente obrigatórias:
 *   SUPABASE_URL - URL do projeto Supabase de homologação/staging
 *   SUPABASE_SERVICE_ROLE_KEY - Chave de serviço (apenas para leitura)
 *   CLINIC_ID - (Opcional) ID da clínica específica para auditar
 *   TARGET_MONTH - (Opcional) Mês no formato YYYY-MM (ex: 2026-08). Padrão: último mês fechado.
 */

import { createClient } from '@supabase/supabase-js';

// 1. Verificação estrita de credenciais exclusivamente via variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('\n[ERRO DE CONFIGURAÇÃO]');
    console.error('Credenciais do Supabase não fornecidas.');
    console.error('Por segurança, nenhuma credencial é armazenada em código.');
    console.error('\nComo executar:');
    console.error('  $env:SUPABASE_URL="https://seu-projeto-staging.supabase.co"');
    console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"');
    console.error('  node scripts/staging/compare-repasse-real.mjs\n');
    process.exit(1);
}

// 2. Lógica de cálculo legada (711df48)
function computeRepasseLegacy(params) {
    const { appointmentValue, override, contract, isInsurance } = params;
    const value = Number(appointmentValue) || 0;

    // 1. Override específico por paciente tem precedência máxima
    if (override && override.active) {
        if (override.rate_type === 'FIXED' && override.fixed_value != null) {
            return {
                amount: Number(override.fixed_value),
                source: 'OVERRIDE_FIXED',
            };
        }
        if (override.rate_type === 'PERCENTAGE' && override.percentage != null) {
            const pct = Number(override.percentage);
            return {
                amount: Math.round((value * pct / 100) * 100) / 100,
                source: 'OVERRIDE_PERCENTAGE',
            };
        }
    }

    // 2. Contrato do médico (percentual particular ou convênio)
    if (contract) {
        const pct = isInsurance
            ? Number(contract.percentage_insurance || contract.percentage || 0)
            : Number(contract.percentage_private || contract.percentage || 0);

        return {
            amount: Math.round((value * pct / 100) * 100) / 100,
            source: isInsurance ? 'CONTRACT_INSURANCE' : 'CONTRACT_PRIVATE',
        };
    }

    // 3. Fallback sem regra cadastrada: repasse zero
    return {
        amount: 0,
        source: 'NO_RULE',
    };
}

// 3. Lógica de cálculo nova (HEAD)
function computeRepasseNew(params) {
    const { appointmentValue, override, contract, isInsurance } = params;
    const value = Number(appointmentValue) || 0;

    // 1. Override com precedência absoluta
    if (override && override.active) {
        if (override.rate_type === 'FIXED' && override.fixed_value != null) {
            return {
                amount: Math.min(Number(override.fixed_value), value),
                source: 'OVERRIDE_FIXED',
            };
        }
        if (override.rate_type === 'PERCENTAGE' && override.percentage != null) {
            const pct = Math.min(100, Math.max(0, Number(override.percentage)));
            return {
                amount: Math.round((value * pct / 100) * 100) / 100,
                source: 'OVERRIDE_PERCENTAGE',
            };
        }
    }

    // 2. Contrato
    if (contract) {
        const pct = isInsurance
            ? Number(contract.percentage_insurance ?? contract.percentage ?? 0)
            : Number(contract.percentage_private ?? contract.percentage ?? 0);

        const safePct = Math.min(100, Math.max(0, pct));
        return {
            amount: Math.round((value * safePct / 100) * 100) / 100,
            source: isInsurance ? 'CONTRACT_INSURANCE' : 'CONTRACT_PRIVATE',
        };
    }

    return {
        amount: 0,
        source: 'NO_RULE',
    };
}

async function runComparison() {
    console.log('================================================================');
    console.log('AUDITORIA DE REPASSE: LEGADO (711df48) vs NOVO (HEAD)');
    console.log('Modo: SOMENTE LEITURA (Nenhuma alteração é gravada)');
    console.log('================================================================');

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });

    // Definir período do último mês fechado
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth(); // 0 a 11 (mês anterior)
    if (targetMonth === 0) {
        targetMonth = 12;
        targetYear -= 1;
    }

    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01T00:00:00.000Z`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}T23:59:59.999Z`;

    console.log(`Período analisado: ${startDate.slice(0, 10)} até ${endDate.slice(0, 10)}`);

    // 1. Buscar atendimentos concluídos no período
    let query = supabase
        .from('appointments')
        .select(`
            id,
            clinic_id,
            doctor_id,
            patient_id,
            appointment_date,
            final_price,
            price,
            payment_type,
            health_insurance_id,
            status,
            doctors(id, full_name, email)
        `)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .in('status', ['COMPLETED', 'CONFIRMED', 'ATTENDED']);

    if (process.env.CLINIC_ID) {
        query = query.eq('clinic_id', process.env.CLINIC_ID);
        console.log(`Filtrando para Clínica ID: ${process.env.CLINIC_ID}`);
    }

    const { data: appointments, error: appError } = await query;

    if (appError) {
        console.error('[ERRO] Falha ao consultar atendimentos:', appError.message);
        process.exit(1);
    }

    if (!appointments || appointments.length === 0) {
        console.log('\nNenhum atendimento concluído encontrado para o período especificado.');
        console.log('Sugestão: defina TARGET_MONTH="AAAA-MM" para analisar outro período.');
        process.exit(0);
    }

    console.log(`Total de atendimentos localizados: ${appointments.length}`);

    // 2. Buscar contratos e overrides
    const { data: contracts } = await supabase.from('doctor_contracts').select('*');
    const { data: overrides } = await supabase.from('professional_patient_rate_overrides').select('*');

    const contractsMap = new Map();
    (contracts || []).forEach(c => contractsMap.set(`${c.clinic_id}:${c.doctor_id}`, c));

    const overridesMap = new Map();
    (overrides || []).forEach(o => overridesMap.set(`${o.clinic_id}:${o.doctor_id}:${o.patient_id}`, o));

    // 3. Processamento médico a médico
    const doctorStats = new Map();
    let totalDivergences = 0;

    for (const app of appointments) {
        const docId = app.doctor_id || 'SEM_MEDICO';
        const docName = app.doctors?.full_name || 'Profissional Não Identificado';
        const appValue = Number(app.final_price || app.price || 0);
        const isInsurance = Boolean(app.health_insurance_id || app.payment_type === 'CONVENIO');

        const contract = contractsMap.get(`${app.clinic_id}:${app.doctor_id}`);
        const override = overridesMap.get(`${app.clinic_id}:${app.doctor_id}:${app.patient_id}`);

        const legacyResult = computeRepasseLegacy({
            appointmentValue: appValue,
            contract,
            override,
            isInsurance,
        });

        const newResult = computeRepasseNew({
            appointmentValue: appValue,
            contract,
            override,
            isInsurance,
        });

        if (!doctorStats.has(docId)) {
            doctorStats.set(docId, {
                name: docName,
                count: 0,
                totalProduction: 0,
                totalLegacy: 0,
                totalNew: 0,
                divergences: 0,
            });
        }

        const stat = doctorStats.get(docId);
        stat.count++;
        stat.totalProduction += appValue;
        stat.totalLegacy += legacyResult.amount;
        stat.totalNew += newResult.amount;

        const delta = Math.abs(legacyResult.amount - newResult.amount);
        if (delta > 0.009) {
            stat.divergences++;
            totalDivergences++;
        }
    }

    // 4. Exibição dos resultados em tabela
    console.log('\n---------------------------------------------------------------------------------------------------------');
    console.log(
        'Médico / Profissional'.padEnd(30) +
        'Atendimentos'.padStart(14) +
        'Produção Bruta'.padStart(18) +
        'Total Legado'.padStart(16) +
        'Total Novo'.padStart(16) +
        'Divergência'.padStart(15)
    );
    console.log('---------------------------------------------------------------------------------------------------------');

    let grandProduction = 0;
    let grandLegacy = 0;
    let grandNew = 0;

    for (const [, s] of doctorStats.entries()) {
        grandProduction += s.totalProduction;
        grandLegacy += s.totalLegacy;
        grandNew += s.totalNew;
        const diff = s.totalNew - s.totalLegacy;
        const diffStr = diff === 0 ? 'R$ 0,00' : `${diff > 0 ? '+' : ''}R$ ${diff.toFixed(2)}`;

        console.log(
            s.name.slice(0, 28).padEnd(30) +
            String(s.count).padStart(14) +
            `R$ ${s.totalProduction.toFixed(2)}`.padStart(18) +
            `R$ ${s.totalLegacy.toFixed(2)}`.padStart(16) +
            `R$ ${s.totalNew.toFixed(2)}`.padStart(16) +
            diffStr.padStart(15)
        );
    }

    console.log('---------------------------------------------------------------------------------------------------------');
    const grandDiff = grandNew - grandLegacy;
    console.log(
        'TOTAIS CONSOLIDADOS'.padEnd(30) +
        String(appointments.length).padStart(14) +
        `R$ ${grandProduction.toFixed(2)}`.padStart(18) +
        `R$ ${grandLegacy.toFixed(2)}`.padStart(16) +
        `R$ ${grandNew.toFixed(2)}`.padStart(16) +
        `${grandDiff === 0 ? 'R$ 0,00' : `${grandDiff > 0 ? '+' : ''}R$ ${grandDiff.toFixed(2)}`}`.padStart(15)
    );
    console.log('=========================================================================================================\n');

    if (totalDivergences === 0) {
        console.log('RESULTADO DA AUDITORIA: PARIDADE 100% CONFIRMADA.');
        console.log('Nenhuma divergência de centavos encontrada entre o cálculo legado e o novo para os atendimentos auditados.');
    } else {
        console.warn(`ATENÇÃO: Foram encontradas ${totalDivergences} divergências no cálculo.`);
        console.warn('Conforme diretriz do projeto: Se houver divergência, reverter repasse-calculator.ts ao padrão de 711df48.');
    }
}

runComparison().catch(err => {
    console.error('[ERRO CRÍTICO]', err);
    process.exit(1);
});
