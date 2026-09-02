import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CLINIC_ID = 'de000000-0000-0000-0000-000000000001';

async function backup() {
  console.log('📦 Iniciando backup dos dados de "Clínica Demo Excellence" (de000000-0000-0000-0000-000000000001)...');

  const backupData: Record<string, any> = {
    exported_at: new Date().toISOString(),
    clinic_id: CLINIC_ID,
  };

  const tables = [
    'clinics',
    'users',
    'doctors',
    'patients',
    'appointments',
    'medical_records',
    'session_evolutions',
    'consultations',
    'prescriptions',
    'financial_entries',
    'doctor_contracts',
    'health_insurances',
    'schedules',
    'recurring_appointment_series',
    'appointment_qr_codes',
    'tiss_guides',
    'tiss_batches',
    'whatsapp_sessions',
    'audit_logs',
  ];

  for (const t of tables) {
    if (t === 'clinics') {
      const { data } = await supabase.from(t).select('*').eq('id', CLINIC_ID);
      backupData[t] = data || [];
    } else {
      const { data } = await supabase.from(t).select('*').eq('clinic_id', CLINIC_ID);
      backupData[t] = data || [];
    }
    console.log(`   ✓ Exportado ${backupData[t].length} registros da tabela "${t}"`);
  }

  const backupPath = path.resolve(
    process.cwd(),
    'scripts/saneamento/backup_demo_excellence_2026-09-02.json'
  );
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

  console.log(`\n💾 Backup salvo com sucesso em: ${backupPath}`);
}

backup().catch(console.error);
