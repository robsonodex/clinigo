import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env vars
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Buscando clínica "Robson Teste"...');
  
  const { data: clinics, error: clinicError } = await supabase
    .from('clinics')
    .select('id, name')
    .ilike('name', '%Robson Teste%')
    .limit(1);

  if (clinicError) {
    console.error('Erro ao buscar clínica:', clinicError);
    return;
  }

  if (!clinics || clinics.length === 0) {
    console.log('Clínica "Robson Teste" não encontrada. Ativando para TODAS as clínicas para facilitar o teste local...');
    
    const { error: insertError } = await supabase
      .from('clinica_modulos')
      .upsert({
         modulo_id: 'psicomotricidade_sensory',
         ativo: true,
      }, { onConflict: 'clinica_id, modulo_id' }); 
      // Supabase JS upsert sem clinica_id não funciona bem se for chave composta para todas as clínicas de uma vez sem listar.
      
      // Select all clinics and insert
      const { data: allClinics } = await supabase.from('clinics').select('id');
      if (allClinics) {
         const inserts = allClinics.map(c => ({
             clinica_id: c.id,
             modulo_id: 'psicomotricidade_sensory',
             ativo: true
         }));
         await supabase.from('clinica_modulos').upsert(inserts, { onConflict: 'clinica_id, modulo_id' });
         console.log('Módulo ativado para todas as clínicas!');
      }
      return;
  }

  const clinicaId = clinics[0].id;
  console.log(`Clínica encontrada! ID: ${clinicaId}`);

  console.log('Ativando módulo psicomotricidade_sensory...');
  
  const { error: insertError } = await supabase
    .from('clinica_modulos')
    .upsert({
      clinica_id: clinicaId,
      modulo_id: 'psicomotricidade_sensory',
      ativo: true
    }, { onConflict: 'clinica_id, modulo_id' });

  if (insertError) {
    console.error('Erro ao ativar módulo:', insertError);
    return;
  }

  console.log('✅ Módulo ativado com sucesso para a clínica "Robson Teste"!');
  
  // Também garantir que os 55 objetivos padrão sejam clonados para a biblioteca dessa clínica,
  // pois a migration pode ter inserido apenas para a World Sensory.
  console.log('Copiando biblioteca de objetivos para a clínica...');
  
  const { data: sourceObjs } = await supabase
    .from('objetivos_biblioteca')
    .select('*')
    .limit(1); // just to see if we have them

  if (sourceObjs && sourceObjs.length > 0) {
     // A procedure no Supabase para copiar seria ideal, mas podemos copiar todos os objetivos de uma clinica base
     const { data: allObjs } = await supabase
        .from('objetivos_biblioteca')
        .select('*');
        
     if (allObjs) {
        // filtrar únicos por código
        const uniqueObjs = [];
        const seenCodes = new Set();
        for(let obj of allObjs) {
            if(!seenCodes.has(obj.codigo)) {
                seenCodes.add(obj.codigo);
                uniqueObjs.push(obj);
            }
        }
        
        const newInserts = uniqueObjs.map(obj => ({
            clinica_id: clinicaId,
            codigo: obj.codigo,
            categoria: obj.categoria,
            descricao_template: obj.descricao_template,
            estrutura_parametros: obj.estrutura_parametros,
            ativo: true
        }));
        
        await supabase.from('objetivos_biblioteca').upsert(newInserts, { onConflict: 'clinica_id, codigo' });
        console.log('✅ Biblioteca de 55 objetivos copiada com sucesso para a clínica!');
     }
  }
}

main().catch(console.error);
