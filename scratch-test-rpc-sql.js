const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    const query = `
CREATE TABLE IF NOT EXISTS public.payment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    plan_type VARCHAR NOT NULL,
    description VARCHAR,
    mercadopago_preference_id VARCHAR,
    mercadopago_init_point VARCHAR,
    status VARCHAR DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all payment_requests" ON public.payment_requests;
CREATE POLICY "Super admins can manage all payment_requests" ON public.payment_requests
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'SUPER_ADMIN'
        )
    );

DROP POLICY IF EXISTS "Service role can do everything on payment_requests" ON public.payment_requests;
CREATE POLICY "Service role can do everything on payment_requests" ON public.payment_requests
    FOR ALL TO service_role USING (true) WITH CHECK (true);
`;
    
    console.log('Tentando executar DDL via RPC genérico...');
    
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

runMigration().catch(console.error);
