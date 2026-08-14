import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRodrigoClinic() {
  console.log('=== ATUALIZANDO CLÍNICA DO RODRIGO ===')
  const { data, error } = await supabase
    .from('clinics')
    .update({
      payment_confirmed: true
    })
    .eq('id', '6b66b938-a585-4fab-9ceb-ede76b739569')

  if (error) console.error('Erro ao atualizar:', error)
  else console.log('✅ Clínica do Rodrigo atualizada com sucesso no banco!')
}

fixRodrigoClinic().catch(console.error)
