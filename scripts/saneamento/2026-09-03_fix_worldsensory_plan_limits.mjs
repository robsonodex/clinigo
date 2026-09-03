/**
 * Script de Saneamento: 2026-09-03_fix_worldsensory_plan_limits.mjs
 * Atualiza os limites da clínica WorldSensory para o plano PROFESSIONAL (30 profissionais).
 */
const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  const clinicId = '4c13e586-5390-4393-a180-2c9dd7ed81c7'; // WorldSensory
  
  // 1. Buscar estado atual
  const res = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  const [clinic] = await res.json();
  
  console.log('--- ESTADO ATUAL DA CLÍNICA ---');
  console.log('ID:', clinic.id);
  console.log('Nome:', clinic.name);
  console.log('Plano:', clinic.plan_type);
  console.log('Plan Limits atuais:', JSON.stringify(clinic.plan_limits));
  console.log('Addons atuais:', JSON.stringify(clinic.addons));

  const targetLimits = {
    max_units: 3,
    max_doctors: 30,
    max_patients: -1,
    max_storage_gb: 100,
    max_appointments_month: -1
  };

  if (isDryRun) {
    console.log('\n[DRY-RUN] Nenhuma alteração aplicada. O payload a ser atualizado seria:');
    console.log({
      plan_limits: targetLimits,
      addons: { ...clinic.addons, extra_doctors: 0 },
      updated_at: new Date().toISOString()
    });
    return;
  }

  // 2. Aplicar atualização
  const updateRes = await fetch(`${supabaseUrl}/rest/v1/clinics?id=eq.${clinicId}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      plan_limits: targetLimits,
      addons: { ...clinic.addons, extra_doctors: 0 },
      updated_at: new Date().toISOString()
    })
  });

  const updated = await updateRes.json();
  console.log('\n[SUCESSO] Clínica atualizada:', updated);
}

main().catch(console.error);
