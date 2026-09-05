import { createClient } from '@supabase/supabase-js';

const url = 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(url, key);

const WORLD_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7';
const DEMO_ID = '0c9ccb05-8530-4f8d-8d64-dd3eb6614e30';

async function main() {
  console.log('=== ATIVAÇÃO PSICOMOTRICIDADE: WORLDSENSORY & TESTE ===');

  // 1. clinica_modulos
  const clinics = [
    { clinica_id: WORLD_ID, modulo_id: 'psicomotricidade_sensory', ativo: true },
    { clinica_id: DEMO_ID, modulo_id: 'psicomotricidade_sensory', ativo: true }
  ];

  const { error: errModulos } = await supabase
    .from('clinica_modulos')
    .upsert(clinics, { onConflict: 'clinica_id,modulo_id' });

  if (errModulos) {
    console.error('Erro ao ativar clinica_modulos:', errModulos);
    return;
  }
  console.log('✅ clinica_modulos atualizado com sucesso para ambas as clínicas.');

  // 2. clinic_custom_permissions
  const permissions = [
    { clinic_id: WORLD_ID, feature_key: 'psicomotricidade', is_enabled: true, reason: 'Ativação inicial solicitada pelo proprietário' },
    { clinic_id: DEMO_ID, feature_key: 'psicomotricidade', is_enabled: true, reason: 'Ativação inicial solicitada pelo proprietário' }
  ];

  const { error: errPerms } = await supabase
    .from('clinic_custom_permissions')
    .upsert(permissions, { onConflict: 'clinic_id,feature_key' });

  if (errPerms) {
    console.error('Erro ao atualizar clinic_custom_permissions:', errPerms);
  } else {
    console.log('✅ clinic_custom_permissions atualizado com sucesso.');
  }

  // 3. Clone 55 objetivos para WorldSensory a partir da Demo Teste
  const { data: demoObjetivos, error: errFetch } = await supabase
    .from('objetivos_biblioteca')
    .select('codigo, categoria, descricao_template, estrutura_parametros, versao, ativo')
    .eq('clinica_id', DEMO_ID);

  if (errFetch || !demoObjetivos) {
    console.error('Erro ao carregar objetivos da Demo:', errFetch);
    return;
  }

  console.log(`Encontrados ${demoObjetivos.length} objetivos na clínica Demo para clonar para a WorldSensory.`);

  const worldObjetivos = demoObjetivos.map(obj => ({
    clinica_id: WORLD_ID,
    codigo: obj.codigo,
    categoria: obj.categoria,
    descricao_template: obj.descricao_template,
    estrutura_parametros: obj.estrutura_parametros,
    versao: obj.versao,
    ativo: obj.ativo
  }));

  const { error: errInsert } = await supabase
    .from('objetivos_biblioteca')
    .upsert(worldObjetivos, { onConflict: 'clinica_id,codigo' });

  if (errInsert) {
    console.error('Erro ao inserir objetivos na WorldSensory:', errInsert);
  } else {
    console.log(`✅ ${worldObjetivos.length} objetivos cadastrados com sucesso para a WorldSensory!`);
  }

  // Verificação final
  const { count: finalWorldCount } = await supabase
    .from('objetivos_biblioteca')
    .select('*', { count: 'exact', head: true })
    .eq('clinica_id', WORLD_ID);

  console.log(`Total final de objetivos na WorldSensory: ${finalWorldCount}`);
}

main().catch(console.error);
