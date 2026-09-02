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

export async function deleteDemoExcellence() {
  console.log(`🔥 [EXECUÇÃO] Excluindo permanentemente todos os dados da Clínica Demo Excellence (${CLINIC_ID})...`);

  // 1. Buscar IDs dos usuários para remover do auth.users também
  const { data: usersToDelete } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('clinic_id', CLINIC_ID);

  console.log(`👤 Identificados ${usersToDelete?.length || 0} usuários da clínica.`);

  // Ordem de deleção respeitando dependências de chaves estrangeiras
  const cascadeOrder = [
    'audit_logs',
    'whatsapp_logs',
    'whatsapp_sessions',
    'tiss_guides',
    'tiss_batches',
    'appointment_qr_codes',
    'session_evolutions',
    'consultations',
    'prescriptions',
    'prescription_items',
    'medical_records',
    'appointments',
    'recurring_appointment_series',
    'waiting_list',
    'room_qr_codes',
    'financial_entries',
    'doctor_patient_rate_history',
    'doctor_patient_rates',
    'doctor_contract_insurance_rules',
    'doctor_contracts',
    'schedules',
    'patient_documents',
    'patient_reimbursement_rules',
    'patients',
    'health_insurance_plans',
    'health_insurances',
    'doctors',
    'users',
  ];

  for (const table of cascadeOrder) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('clinic_id', CLINIC_ID);

      if (error) {
        console.warn(`   ⚠️ Tabela "${table}": erro ou sem registros (${error.message})`);
      } else {
        console.log(`   ✓ Deletado da tabela "${table}": ${count ?? 0} registro(s)`);
      }
    } catch (err: any) {
      console.warn(`   ⚠️ Erro ao tentar deletar de "${table}":`, err?.message);
    }
  }

  // Deletar os usuários do auth.users
  if (usersToDelete && usersToDelete.length > 0) {
    console.log(`\n🔐 Removendo usuários de auth.users:`);
    for (const u of usersToDelete) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(u.id);
        if (error) {
          console.warn(`   ⚠️ Erro ao remover ${u.email} do auth:`, error.message);
        } else {
          console.log(`   ✓ Usuário ${u.email} (${u.id}) removido do Auth com sucesso.`);
        }
      } catch (err: any) {
        console.warn(`   ⚠️ Exceção ao remover ${u.email} do auth:`, err?.message);
      }
    }
  }

  // Por fim, deletar a clínica da tabela clinics
  const { error: clinicDelError } = await supabase
    .from('clinics')
    .delete()
    .eq('id', CLINIC_ID);

  if (clinicDelError) {
    console.error('❌ Erro ao deletar registro da clínica em "clinics":', clinicDelError);
  } else {
    console.log(`\n🎉 Clínica "Clínica Demo Excellence" (${CLINIC_ID}) DELETADA COM SUCESSO!`);
  }
}

// Se rodado diretamente via CLI
if (require.main === module) {
  deleteDemoExcellence().catch(console.error);
}
