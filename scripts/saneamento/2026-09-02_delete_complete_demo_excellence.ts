import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLINIC_ID = 'de000000-0000-0000-0000-000000000001';

async function main() {
  console.log(`🧹 Limpando todas as tabelas filhas e secundárias vinculadas a ${CLINIC_ID}...`);

  // Lista exaustiva de todas as tabelas do sistema CliniGo que podem ter clinic_id
  const tables = [
    'inventory_transactions',
    'products',
    'product_categories',
    'rooms',
    'room_qr_codes',
    'services',
    'payment_methods',
    'clinic_settings',
    'clinic_modules',
    'clinic_integrations',
    'clinic_whatsapp_settings',
    'clinic_subscription_history',
    'subscriptions',
    'subscription_invoices',
    'impersonation_sessions',
    'system_logs',
    'audit_logs',
    'waiting_list',
    'recurring_appointment_series',
    'appointment_qr_codes',
    'appointment_slot_locks',
    'reschedule_tokens',
    'session_evolutions',
    'medical_records',
    'consultations',
    'prescription_items',
    'prescriptions',
    'patient_documents',
    'patient_consents',
    'patient_credentials',
    'patient_sessions',
    'patient_reimbursement_rules',
    'reimbursement_configs',
    'tiss_guides',
    'tiss_batches',
    'tiss_returns',
    'financial_entries',
    'financial_closings',
    'doctor_patient_rate_history',
    'doctor_patient_rates',
    'doctor_contract_insurance_rules',
    'doctor_contracts',
    'doctor_certificates',
    'digital_signatures',
    'medical_record_signatures',
    'schedules',
    'schedule_price_ranges',
    'appointments',
    'patients',
    'health_insurance_plans',
    'health_insurances',
    'doctors',
    'users',
  ];

  for (const t of tables) {
    try {
      const { count, error } = await supabase
        .from(t)
        .delete({ count: 'exact' })
        .eq('clinic_id', CLINIC_ID);

      if (!error && count && count > 0) {
        console.log(`   ✓ ${t}: ${count} registro(s) deletado(s)`);
      }
    } catch (e: any) {
      // Tabela pode não existir ou não ter clinic_id
    }
  }

  // Deletar a clínica de clinics
  console.log(`\n🏥 Deletando registro de "clinics" com id ${CLINIC_ID}...`);
  const { error: clinicDelError } = await supabase
    .from('clinics')
    .delete()
    .eq('id', CLINIC_ID);

  if (clinicDelError) {
    console.error('❌ Erro final ao deletar da tabela clinics:', clinicDelError);
  } else {
    console.log('✅ SUCESSO ABSOLUTO! A "Clínica Demo Excellence" foi excluída definitivamente de todas as tabelas e do https://clinigo.app/system-master-hub!');
  }

  // Verificar se ainda consta
  const { data: check } = await supabase.from('clinics').select('id, name').eq('id', CLINIC_ID);
  if (!check || check.length === 0) {
    console.log('🔍 Confirmação pós-exclusão: 0 registros encontrados em clinics.');
  } else {
    console.warn('⚠️ A clínica ainda consta:', check);
  }
}

main().catch(console.error);
