const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function findActiveRPC() {
  const query = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'session_evolutions';
  `;

  const rpcNames = ['execute_sql', 'exec_sql', 'run_sql', 'sql', 'query'];
  
  for (const name of rpcNames) {
    try {
      console.log(`Testando RPC: ${name}...`);
      const { data, error } = await supabase.rpc(name, { 
        sql_query: query, 
        query_string: query, 
        sql: query,
        query: query
      });
      
      if (!error) {
        console.log(`✅ Sucesso com RPC: ${name}`);
        console.log(JSON.stringify(data, null, 2));
        return;
      } else {
        console.log(`❌ Falha com RPC ${name}:`, error.message);
      }
    } catch (err) {
      console.log(`❌ Erro no RPC ${name}:`, err.message);
    }
  }
}

findActiveRPC();
