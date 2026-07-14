const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleArgRPCs() {
  const sqlTest = `SELECT 1 as test_val;`;
  
  const rpcs = [
    { name: 'execute_sql', params: [{ sql: sqlTest }, { query: sqlTest }, { sql_query: sqlTest }] },
    { name: 'exec_sql', params: [{ sql: sqlTest }, { query: sqlTest }, { sql_query: sqlTest }] },
    { name: 'run_sql', params: [{ sql: sqlTest }, { query: sqlTest }, { sql_query: sqlTest }] },
    { name: 'sql', params: [{ sql: sqlTest }, { query: sqlTest }, { sql_query: sqlTest }] },
    { name: 'query', params: [{ sql: sqlTest }, { query: sqlTest }, { sql_query: sqlTest }] }
  ];

  console.log('=== TESTANDO ASSINATURAS DE RPCS DE SQL ===\n');

  for (const rpc of rpcs) {
    for (const p of rpc.params) {
      const pKey = Object.keys(p)[0];
      try {
        console.log(`Testando rpc('${rpc.name}', { ${pKey}: '...' })`);
        const { data, error } = await supabase.rpc(rpc.name, p);
        
        if (!error) {
          console.log(`  🎉 SUCESSO! RPC '${rpc.name}' com parâmetro '${pKey}' funcionou!`);
          console.log(`  Resultado:`, data);
          return; // Para no primeiro sucesso
        } else {
          // Se o erro for de assinatura (could not find the function), mostra simplificado
          if (error.message.includes('Could not find the function') || error.message.includes('does not exist')) {
            // não existe
          } else {
            console.log(`  ❌ Outro erro:`, error.message);
          }
        }
      } catch (e) {
        // erro js
      }
    }
  }
  
  console.log('\n❌ Nenhuma RPC de SQL padrão aceitou os parâmetros testados.');
}

testSingleArgRPCs();
