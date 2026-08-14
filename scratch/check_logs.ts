import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkWaLogs() {
  console.log('\n=== ULTIMOS LOGS DE WHATSAPP ===')
  const { data: waLogs, error: wErr } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .limit(10)

  if (wErr) console.error('Erro whatsapp logs:', wErr)
  else console.log(JSON.stringify(waLogs, null, 2))
}

checkWaLogs().catch(console.error)
