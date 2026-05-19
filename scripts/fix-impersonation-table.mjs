/**
 * Script para adicionar colunas faltantes na tabela impersonation_sessions
 * Usa Supabase service role + fetch direto na API SQL do Supabase
 */

const SUPABASE_URL = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não definida')
  process.exit(1)
}

// Primeiro, verificar a estrutura atual da tabela
async function checkColumns() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/impersonation_sessions?select=*&limit=0`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  console.log('📋 Status da tabela:', res.status, res.statusText)
  const headers = Object.fromEntries(res.headers.entries())
  console.log('📋 Content-Range:', headers['content-range'])
  return res.ok
}

// Tentar inserir com as colunas novas para verificar se existem
async function testInsertDryRun() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/impersonation_sessions?select=reason,ip_address&limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  })
  if (res.ok) {
    console.log('✅ Colunas reason e ip_address JÁ EXISTEM na tabela!')
    return true
  } else {
    const error = await res.json()
    console.log('⚠️ Colunas não encontradas:', error.message)
    return false
  }
}

// Executar SQL via Supabase SQL API (pgrest v1/rpc)
// Como não temos uma função SQL para isso, vamos tentar criar uma temporária
async function executeSqlViaRpc(sql) {
  // Criar função temporária para executar SQL
  const createFnSql = `
    CREATE OR REPLACE FUNCTION temp_exec_sql(query text) RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `
  
  // Tentar executar via RPC
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/temp_exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  })
  
  return res
}

async function main() {
  console.log('🔧 Verificando tabela impersonation_sessions...\n')
  
  const tableExists = await checkColumns()
  if (!tableExists) {
    console.log('❌ Tabela impersonation_sessions não acessível')
    process.exit(1)
  }

  const columnsExist = await testInsertDryRun()
  if (columnsExist) {
    console.log('\n✅ Nenhuma alteração necessária — colunas já existem!')
    process.exit(0)
  }

  console.log('\n🔧 Tentando adicionar colunas via RPC...')
  
  // Tentar executar via RPC  
  const res1 = await executeSqlViaRpc("ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS reason TEXT")
  if (res1.ok) {
    console.log('✅ Coluna reason adicionada')
  } else {
    const err = await res1.json()
    console.log('⚠️ RPC resultado:', err.message || JSON.stringify(err))
    console.log('\n⚠️ A função RPC não existe no banco.')
    console.log('📋 Você precisa executar manualmente no Supabase SQL Editor:')
    console.log('─────────────────────────────────────────────')
    console.log('ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS reason TEXT;')
    console.log('ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;')
    console.log('─────────────────────────────────────────────')
    process.exit(1)
  }

  const res2 = await executeSqlViaRpc("ALTER TABLE impersonation_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT")
  if (res2.ok) {
    console.log('✅ Coluna ip_address adicionada')
  } else {
    const err = await res2.json()
    console.log('❌ Erro ip_address:', err.message)
  }

  // Verificar novamente
  console.log('\n🔍 Verificando resultado...')
  const finalCheck = await testInsertDryRun()
  if (finalCheck) {
    console.log('\n🎉 Migração concluída com sucesso!')
  }
}

main().catch(console.error)
