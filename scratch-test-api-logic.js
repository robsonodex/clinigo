const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseKey);

async function testApiLogic() {
  const isabellaDoctorId = '084b2ba1-f8ba-4eac-9b50-6cd69701ba19';
  const cristianeDoctorId = '401e9601-4fb3-4b33-8e1b-0f27617c80ab';
  const clinicId = '5163c916-8b82-4d80-8a71-01726836ee46';

  console.log('=== TESTE DE LÓGICA DE API (ROUTE.TS EXTENDIDA) ===\n');

  // 1. Simular o SELECT da API usando o CLIENT DE SERVIÇO (bypass de RLS - como se a RLS já estivesse corrigida)
  // Isso valida que a expressão OR(`.or(...)`) da nossa API Next.js retorna os dados da Cristiane corretamente!
  console.log('1. Executando query da API usando o Service Client (bypass RLS)...');
  
  let serviceQuery = serviceClient
    .from('session_evolutions')
    .select(`
        id,
        evolution_date,
        content,
        doctor_id,
        clinic_id,
        patients(id, full_name),
        doctors(id, specialty, users(full_name))
    `)
    .eq('clinic_id', clinicId)
    .order('evolution_date', { ascending: false });

  // Lógica implementada: Isabella vê dela + Cristiane
  serviceQuery = serviceQuery.or(`doctor_id.eq.${isabellaDoctorId},doctor_id.eq.${cristianeDoctorId}`);

  const { data: serviceData, error: serviceErr } = await serviceQuery.limit(5);

  if (serviceErr) {
    console.error('❌ Erro na query do Service Client:', serviceErr.message);
  } else {
    console.log(`✅ Sucesso! Retornou ${serviceData?.length || 0} evoluções.`);
    serviceData.forEach((ev, idx) => {
      console.log(`  [Evolução #${idx+1}] ID: ${ev.id} | Data: ${ev.evolution_date} | Profissional: ${ev.doctors?.users?.full_name || 'Desconhecido'} (${ev.doctor_id})`);
    });
  }

  // 2. Executar a mesma query usando o token da Isabella (com RLS atual de produção)
  // Isso validará o comportamento de RLS ativo
  console.log('\n2. Executando query da API logado como Isabella (autenticação real + RLS de produção)...');
  
  const { data: linkData } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'prestadora_isabella.psico@espacoincluirscs.com.br'
  });

  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  await anonClient.auth.verifyOtp({
    email: 'prestadora_isabella.psico@espacoincluirscs.com.br',
    token: linkData.properties.email_otp,
    type: 'magiclink'
  });

  console.log('✅ Autenticado como Isabella.');

  let isabellaQuery = anonClient
    .from('session_evolutions')
    .select(`
        id,
        evolution_date,
        content,
        doctor_id,
        patients(id, full_name),
        doctors(id, specialty, users(full_name))
    `)
    .eq('clinic_id', clinicId)
    .order('evolution_date', { ascending: false });

  isabellaQuery = isabellaQuery.or(`doctor_id.eq.${isabellaDoctorId},doctor_id.eq.${cristianeDoctorId}`);

  const { data: isabellaData, error: isabellaErr } = await isabellaQuery.limit(5);

  if (isabellaErr) {
    console.error('❌ Erro na query com RLS ativo:', isabellaErr.message);
  } else {
    console.log(`✅ Consulta finalizada! Retornou ${isabellaData?.length || 0} evoluções de Cristiane/Isabella sob a RLS atual.`);
    if (isabellaData && isabellaData.length > 0) {
      isabellaData.forEach((ev, idx) => {
        console.log(`  [Evolução #${idx+1}] ID: ${ev.id} | Criado por: ${ev.doctors?.users?.full_name}`);
      });
    } else {
      console.log('⚠️ Como esperado, sob o RLS atual de produção, retornou 0 evoluções de Cristiane (RLS filtrou silenciosamente).');
    }
  }
}

testApiLogic().catch(console.error);
