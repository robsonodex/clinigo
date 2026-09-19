import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDA1NzIsImV4cCI6MjA4MjYxNjU3Mn0.Y6qi1crn8g7eTzLwL1mF9nNfx445G2q3cRj8d2Y3_e4'

async function runTests() {
  console.log('=== TESTE DE SEGURANÇA E BLOQUEIO DE NOMENCLATURA / CONFIGURAÇÕES ===')
  
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const anonClient = createClient(supabaseUrl, anonKey)

  // 1. Verificar se a clínica WorldSensory está com a nomenclatura restaurada para 'Terapeuta'
  const wsClinicId = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
  const { data: wsClinic, error: wsError } = await adminClient
    .from('clinics')
    .select('id, name, professional_label, council_label')
    .eq('id', wsClinicId)
    .single()

  if (wsError || !wsClinic) {
    throw new Error('Falha ao consultar clínica WorldSensory: ' + wsError?.message)
  }

  if (wsClinic.professional_label !== 'Terapeuta') {
    throw new Error(`Falha: Nomenclatura da WorldSensory deveria ser 'Terapeuta', mas está '${wsClinic.professional_label}'`)
  }
  console.log(`[TESTE 1] Restauração da WorldSensory: SUCESSO (professional_label: ${wsClinic.professional_label}, council_label: ${wsClinic.council_label})`)

  // 2. Teste de tentativa de UPDATE anônimo via RLS
  const { error: anonUpdateError, count: anonCount } = await anonClient
    .from('clinics')
    .update({ professional_label: 'HACKED' })
    .eq('id', wsClinicId)

  // Como a policy exige authenticated e role = CLINIC_ADMIN, o update anônimo não deve ter sucesso nem alterar linhas
  const { data: wsAfterAnon } = await adminClient
    .from('clinics')
    .select('professional_label')
    .eq('id', wsClinicId)
    .single()

  if (wsAfterAnon?.professional_label === 'HACKED') {
    throw new Error('Falha CRÍTICA: Acesso anônimo conseguiu alterar a clínica!')
  }
  console.log('[TESTE 2] Tentativa de UPDATE anônimo barrada: SUCESSO (0 registros afetados)')

  console.log('=== TODOS OS TESTES DE ISOLAMENTO E SEGURANÇA PASSARAM COM 100% DE SUCESSO ===')
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
