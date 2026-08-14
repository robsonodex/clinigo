import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('=== BUSCANDO CLÍNICA RODRIGO ===')
  const { data: clinics, error: cErr } = await supabase
    .from('clinics')
    .select('*')
    .ilike('name', '%Rodrigo%')

  if (cErr) {
    console.error('Erro ao buscar clinica:', cErr)
    return
  }

  console.log('Clinicas encontradas:', JSON.stringify(clinics, null, 2))

  if (clinics && clinics.length > 0) {
    for (const clinic of clinics) {
      console.log(`\n=== BUSCANDO USUÁRIOS DA CLÍNICA ${clinic.id} (${clinic.name}) ===`)
      const { data: users, error: uErr } = await supabase
        .from('users')
        .select('*')
        .eq('clinic_id', clinic.id)

      if (uErr) {
        console.error('Erro ao buscar usuarios:', uErr)
      } else {
        console.log('Usuarios da clinica:', JSON.stringify(users, null, 2))
      }

      console.log(`\n=== BUSCANDO USUÁRIOS AUTH ===`)
      const { data: authUsers, error: aErr } = await supabase.auth.admin.listUsers()
      if (aErr) {
        console.error('Erro ao listar auth users:', aErr)
      } else {
        const matched = authUsers.users.filter(u => 
          users?.some(dbU => dbU.id === u.id || dbU.email === u.email) || u.email?.includes('rodrigo')
        )
        console.log('Auth Users correspondentes:', JSON.stringify(matched, null, 2))
      }
    }
  }
}

main().catch(console.error)
