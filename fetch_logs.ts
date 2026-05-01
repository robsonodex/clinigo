import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envs = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/['"]/g, '')]
    })
)

const s = createClient(
  envs.NEXT_PUBLIC_SUPABASE_URL,
  envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data, error } = await s
    .from('whatsapp_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  console.log(JSON.stringify(data, null, 2))
}

run()
