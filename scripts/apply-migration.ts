import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
    console.log('--- Verificando criação de tabelas de questionários ---')
    
    // Tenta chamar RPC exec_sql se existir
    const sqlPath = path.join(process.cwd(), 'supabase/migrations/20260825000000_create_therapeutic_questionnaires.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    try {
        const { data, error } = await supabase.rpc('exec_sql', { query: sql } as any)
        if (error) {
            console.log('RPC exec_sql não disponível:', error.message)
        } else {
            console.log('✅ Migration executada com sucesso via RPC!')
        }
    } catch (e: any) {
        console.log('Erro ao tentar RPC:', e.message)
    }
}

applyMigration()
