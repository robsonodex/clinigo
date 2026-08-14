import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSessions() {
  console.log('=== WHATSAPP SESSIONS ===')
  const { data, error } = await supabase.from('whatsapp_sessions').select('*')
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

checkSessions().catch(console.error)
