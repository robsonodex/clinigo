const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function buscarTerapeutas() {
  console.log('=== BUSCA DE TERAPEUTAS — HERANÇA CRISTIANE (Espaço Incluir) ===\n');

  // 1. Buscar a clínica Espaço Incluir
  const { data: clinics, error: clinicErr } = await supabase
    .from('clinics')
    .select('id, name')
    .ilike('name', '%espa%incluir%');

  if (clinicErr) { console.error('Erro ao buscar clínica:', clinicErr.message); return; }
  console.log('--- CLÍNICA ---');
  clinics.forEach(c => console.log(`  ID: ${c.id} | Nome: ${c.name}`));
  const clinicId = clinics[0]?.id;
  if (!clinicId) { console.error('Clínica não encontrada!'); return; }

  // 2. Buscar terapeutas: Cristiane (psico), Isabella de Sousa da Silva, Cintia Victonte Franco
  console.log('\n--- BUSCA DE TERAPEUTAS (users + doctors) ---');
  
  const nomes = ['Cristiane', 'Isabella', 'Cintia'];
  
  for (const nome of nomes) {
    console.log(`\n🔍 Buscando "${nome}"...`);
    
    // Buscar na tabela users
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, email, role, clinic_id, is_coordinator')
      .eq('clinic_id', clinicId)
      .ilike('full_name', `%${nome}%`);

    if (userErr) { console.error(`  Erro users: ${userErr.message}`); continue; }
    
    if (!users || users.length === 0) {
      console.log(`  ⚠️ Nenhum usuário encontrado com nome "${nome}" na clínica`);
      continue;
    }

    for (const u of users) {
      console.log(`  👤 USER — ID: ${u.id}`);
      console.log(`     Nome: ${u.full_name}`);
      console.log(`     Email: ${u.email}`);
      console.log(`     Role: ${u.role}`);
      console.log(`     Coordenadora: ${u.is_coordinator ? 'Sim' : 'Não'}`);
      
      // Buscar doctor_id associado
      const { data: docs, error: docErr } = await supabase
        .from('doctors')
        .select('id, specialty, user_id')
        .eq('user_id', u.id);

      if (docErr) { console.error(`  Erro doctors: ${docErr.message}`); continue; }
      
      if (docs && docs.length > 0) {
        for (const d of docs) {
          console.log(`  🩺 DOCTOR — ID: ${d.id}`);
          console.log(`     Specialty: ${d.specialty}`);
        }
      } else {
        console.log(`  ⚠️ Sem registro na tabela doctors`);
      }
    }
  }

  // 3. Buscar evoluções da Cristiane para ver quais pacientes ela atendia
  console.log('\n\n--- EVOLUÇÕES DA CRISTIANE (pacientes atendidos) ---');
  
  // Primeiro pegar o doctor_id da Cristiane
  const { data: cristianeUsers } = await supabase
    .from('users')
    .select('id')
    .eq('clinic_id', clinicId)
    .ilike('full_name', '%Cristiane%');

  if (cristianeUsers && cristianeUsers.length > 0) {
    for (const cu of cristianeUsers) {
      const { data: cristDocs } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', cu.id);

      if (cristDocs && cristDocs.length > 0) {
        for (const cd of cristDocs) {
          const { data: evolucoes, error: evErr } = await supabase
            .from('session_evolutions')
            .select('patient_id, patients(full_name), evolution_date')
            .eq('doctor_id', cd.id)
            .eq('clinic_id', clinicId)
            .order('evolution_date', { ascending: false });

          if (evErr) { console.error(`  Erro evoluções: ${evErr.message}`); continue; }

          // Agrupar por paciente
          const pacientes = {};
          (evolucoes || []).forEach(ev => {
            const pid = ev.patient_id;
            const pname = ev.patients?.full_name || 'Desconhecido';
            if (!pacientes[pid]) pacientes[pid] = { nome: pname, total: 0, ultima: ev.evolution_date };
            pacientes[pid].total++;
          });

          console.log(`\n  Doctor ID Cristiane: ${cd.id}`);
          console.log(`  Total de evoluções: ${(evolucoes || []).length}`);
          console.log(`  Pacientes atendidos:`);
          Object.entries(pacientes).forEach(([pid, p]) => {
            console.log(`    📋 ${p.nome}`);
            console.log(`       Patient ID: ${pid}`);
            console.log(`       Evoluções: ${p.total} | Última: ${p.ultima}`);
          });
        }
      }
    }
  }

  console.log('\n=== FIM DA BUSCA ===');
}

buscarTerapeutas().catch(err => console.error('Erro geral:', err));
