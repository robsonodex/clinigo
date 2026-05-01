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
  const { data: users } = await supabase.from('users').select('clinic_id').limit(1)
  const clinicId = users[0].clinic_id
  
  console.log('Testing lazy reconnection for clinic:', clinicId)

  const filePath = `${clinicId}/auth_info.json`
  const { data, error } = await supabase.storage.from('whatsapp-sessions').download(filePath)
  if (error || !data) {
    console.log('No auth_info.json found', error)
  } else {
    const text = await data.text()
    console.log('auth_info.json size (chars):', text.length)
    if (text.length < 500) {
      console.log('auth_info.json is suspiciously small:', text)
    }
  }
}
run()
