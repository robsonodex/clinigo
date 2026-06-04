// Script de Automação Temporário: Tentar executar DDL SQL via RPC no Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const query = `ALTER TABLE scheduled_whatsapp_messages ADD COLUMN IF NOT EXISTS image_base64 TEXT DEFAULT NULL;`;
    
    console.log('Tentando executar DDL via RPC genérico...');
    
    // Tenta diferentes nomes comuns de RPC administrativa
    const rpcNames = ['exec_sql', 'execute_sql', 'run_sql', 'sql'];
    let applied = false;
    
    for (const name of rpcNames) {
        try {
            console.log(`Testando RPC: ${name}...`);
            const { data, error } = await supabase.rpc(name, { sql_query: query, query_string: query, sql: query });
            
            if (!error) {
                console.log(`✅ Sucesso usando a RPC: ${name}!`);
                console.log('Dados de retorno:', data);
                applied = true;
                break;
            } else {
                console.log(`❌ Falha na RPC ${name}:`, error.message);
            }
        } catch (err) {
            console.log(`❌ Erro crítico ao chamar RPC ${name}:`, err.message);
        }
    }
    
    if (!applied) {
        console.log('\n⚠️ Nenhuma RPC administrativa genérica disponível no banco.');
        console.log('A migração precisará ser executada manualmente no painel do Supabase SQL Editor.');
    }
}

runMigration();
