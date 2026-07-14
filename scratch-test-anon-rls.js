const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const serviceClient = createClient(supabaseUrl, supabaseKey);

async function testWithRealPatient() {
  const isabellaDoctorId = '084b2ba1-f8ba-4eac-9b50-6cd69701ba19';
  const cristianeDoctorId = '401e9601-4fb3-4b33-8e1b-0f27617c80ab';

  console.log('1. Buscando qualquer paciente que tenha agendamento com a Isabella...');
  const { data: isabellaAppts } = await serviceClient
    .from('appointments')
    .select('patient_id, patients(full_name)')
    .eq('doctor_id', isabellaDoctorId)
    .limit(5);

  if (!isabellaAppts || isabellaAppts.length === 0) {
    console.log('Isabella não possui agendamentos nos registros para validar.');
    return;
  }

  // Agrupar IDs de pacientes
  const patientIds = [...new Set(isabellaAppts.map(a => a.patient_id))];
  console.log(`Isabella tem agendamentos com os pacientes:`, isabellaAppts.map(a => a.patients?.full_name));

  // 2. Buscar se a Cristiane tem alguma evolução criada para um desses pacientes
  console.log('\n2. Buscando evoluções de Cristiane com esses mesmos pacientes...');
  const { data: cristianeEvolutions } = await serviceClient
    .from('session_evolutions')
    .select('id, patient_id, patients(full_name), content')
    .eq('doctor_id', cristianeDoctorId)
    .in('patient_id', patientIds);

  console.log(`Encontradas ${cristianeEvolutions?.length || 0} evoluções de Cristiane com pacientes de Isabella.`);

  if (!cristianeEvolutions || cristianeEvolutions.length === 0) {
    console.log('Cristiane não tem evoluções com os pacientes atuais de Isabella.');
    return;
  }

  const targetEv = cristianeEvolutions[0];
  console.log(`Evolução encontrada: ID ${targetEv.id} do paciente ${targetEv.patients?.full_name}`);

  // 3. Autenticar como Isabella e tentar ler
  console.log('\n3. Autenticando anon client como Isabella...');
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

  const { data: readData, error: readErr } = await anonClient
    .from('session_evolutions')
    .select('id, content')
    .eq('id', targetEv.id);

  if (readErr) {
    console.error('❌ Erro de RLS:', readErr.message);
  } else {
    console.log(`✅ Sucesso! Retornou ${readData?.length || 0} registros.`);
    if (readData && readData.length > 0) {
      console.log(`Registro lido com sucesso (Conteúdo: "${readData[0].content}")`);
    } else {
      console.log('⚠️ Retornou 0 registros. RLS barrou mesmo com agendamento do paciente.');
    }
  }
}

testWithRealPatient().catch(console.error);
