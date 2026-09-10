import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey);

async function run() {
  const seriesId = '9c3625d9-a565-43ea-a2c0-44823d558aba';
  console.log('[SANEAMENTO] Verificando serie a ser expurgada:', seriesId);

  const { data: series, error: sErr } = await adminClient
    .from('recurring_appointment_series')
    .select('id, is_active, doctor_id, patient_id, appointment_time')
    .eq('id', seriesId)
    .single();

  if (sErr || !series) {
    console.log('Serie nao encontrada ou ja removida:', sErr);
    return;
  }

  console.log('Dados da serie encontrada:', series);

  // Contar agendamentos vinculados
  const { count: totalAppts } = await adminClient
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('series_id', seriesId);

  console.log(`Total de agendamentos vinculados: ${totalAppts}`);

  // Como a foreign key em appointments.series_id eh ON DELETE SET NULL,
  // ao deletar a serie, todos os agendamentos historicos cancelados tem seu series_id desvinculado,
  // e a serie eh completamente removida de recurring_appointment_series.
  const { error: delErr } = await adminClient
    .from('recurring_appointment_series')
    .delete()
    .eq('id', seriesId);

  if (delErr) {
    console.error('Erro ao deletar serie:', delErr);
  } else {
    console.log('Serie 9c3625d9-a565-43ea-a2c0-44823d558aba expurgada com sucesso com cascata limpa!');
  }
}

run();
