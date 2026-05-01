import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8')
const envs: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=')
  if (key && vals.length > 0) envs[key.trim()] = vals.join('=').trim()
})

const supabase = createClient(
  envs.NEXT_PUBLIC_SUPABASE_URL,
  envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function run() {
  const { data, error } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('--- LATEST WHATSAPP LOGS ---')
    console.log(JSON.stringify(data, null, 2))
  }
}

run()
