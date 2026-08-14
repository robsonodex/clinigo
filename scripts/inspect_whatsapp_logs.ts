import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

let envs: Record<string, string> = {}
try {
  const envPath = fs.existsSync('.env.local') ? '.env.local' : fs.existsSync('.env') ? '.env' : null
  if (envPath) {
    fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .filter(l => l.includes('='))
      .forEach(l => {
        const idx = l.indexOf('=')
        envs[l.slice(0, idx).trim()] = l.slice(idx + 1).trim().replace(/['"]/g, '')
      })
  }
} catch (e) {
  console.error('Error reading env file:', e)
}

const supabaseUrl = envs.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = envs.SUPABASE_SERVICE_ROLE_KEY || envs.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key missing. Envs:', Object.keys(envs))
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('--- RECENT WHATSAPP LOGS (LAST 30) ---')
  const { data: logs, error: logsErr } = await supabase
    .from('whatsapp_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(30)
  
  if (logsErr) {
    console.error('Error fetching logs:', logsErr)
  } else {
    console.log(`Found ${logs?.length || 0} logs:`)
    logs?.forEach((l: any) => {
      console.log(`[${l.sent_at}] ${l.recipient_phone} - Status: ${l.status} - Source: ${l.trigger_source} - Preview: "${l.message_preview}"`)
    })
  }

  console.log('\n--- WAITING LIST ITEMS RECENTLY UPDATED ---')
  const { data: waitlist, error: waitlistErr } = await supabase
    .from('waiting_list')
    .select('id, patient_name, patient_phone, commercial_notes, notes, status, updated_at, clinic_id')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (waitlistErr) {
    console.error('Error fetching waitlist:', waitlistErr)
  } else {
    console.log(`Found ${waitlist?.length || 0} waitlist items:`)
    waitlist?.forEach((w: any) => {
      console.log(`[${w.updated_at}] ID: ${w.id} | ${w.patient_name} (${w.patient_phone}) | Status: ${w.status} | CommNotes: "${w.commercial_notes || ''}" | Notes: "${w.notes || ''}"`)
    })
  }
}

run()
