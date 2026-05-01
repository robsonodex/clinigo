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
  envs.NEXT_PUBLIC_SUPABASE_URL.replace(/['"]/g, ''),
  (envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY).replace(/['"]/g, '')
)

async function run() {
  const { data, error } = await supabase.storage.getBucket('whatsapp-sessions')
  console.log(data ? 'Bucket exists' : 'Bucket does not exist', error)
}
run()
