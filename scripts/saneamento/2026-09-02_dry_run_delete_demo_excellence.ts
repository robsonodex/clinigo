import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('🔍 [DRY-RUN] Buscando clínica "Clínica Demo Excellence"...');

  // 1. Localizar a clínica
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name, slug, email, created_at')
    .or('name.ilike.%Excellence%,slug.ilike.%excellence%,name.ilike.%Demo%');

  if (clinicError) {
    console.error('❌ Erro ao buscar clínica:', clinicError);
    process.exit(1);
  }

  console.log(`📋 Clínicas encontradas no banco (${clinics?.length || 0}):`);
  for (const c of clinics || []) {
    console.log(`   - ID: ${c.id} | Nome: "${c.name}" | Slug: "${c.slug}" | Criado em: ${c.created_at}`);
  }

  const targetClinic = clinics?.find(
    (c) =>
      c.name.toLowerCase().includes('excellence') ||
      c.slug.toLowerCase().includes('excellence')
  );

  if (!targetClinic) {
    console.log('\n⚠️ Nenhuma clínica específica com nome "Excellence" encontrada.');
    return;
  }

  console.log(`\n======================================================`);
  console.log(`🏥 AUDITORIA DRY-RUN: ${targetClinic.name} (${targetClinic.id})`);
  console.log(`======================================================`);

  const tablesToCount = [
    'users',
    'doctors',
    'patients',
    'appointments',
    'medical_records',
    'session_evolutions',
    'consultations',
    'prescriptions',
    'prescription_items',
    'financial_entries',
    'doctor_contracts',
    'doctor_patient_rates',
    'doctor_patient_rate_history',
    'health_insurances',
    'patient_reimbursement_rules',
    'schedules',
    'recurring_appointment_series',
    'appointment_qr_codes',
    'patient_documents',
    'tiss_guides',
    'tiss_batches',
    'whatsapp_sessions',
    'whatsapp_logs',
    'waiting_list',
    'room_qr_codes',
    'audit_logs',
  ];

  const counts: Record<string, number> = {};

  for (const table of tablesToCount) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', targetClinic.id);

      if (!error && count !== null) {
        counts[table] = count;
      } else {
        counts[table] = 0;
      }
    } catch {
      counts[table] = 0;
    }
  }

  // Contar usuários associados em users
  const { data: clinicUsers } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .eq('clinic_id', targetClinic.id);

  console.log('\n📊 Registros a serem excluídos permanentemente:');
  let totalRecords = 0;
  for (const [t, c] of Object.entries(counts)) {
    if (c > 0) {
      console.log(`   - Tabela "${t}": ${c} registro(s)`);
      totalRecords += c;
    }
  }

  console.log(`\n👥 Usuários que serão removidos do sistema (${clinicUsers?.length || 0}):`);
  for (const u of clinicUsers || []) {
    console.log(`   - ID: ${u.id} | ${u.full_name || 'Sem nome'} (${u.email}) [Perfil: ${u.role}]`);
  }

  console.log(`\n🚨 TOTAL ESTIMADO DE REGISTROS DIRETAMENTE AFETADOS: ${totalRecords + (clinicUsers?.length || 0) + 1} (incluindo o registro da clínica em "clinics")`);
}

main().catch(console.error);
