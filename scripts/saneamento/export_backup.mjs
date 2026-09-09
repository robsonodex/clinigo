import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const envMap = {}
env.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) envMap[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
})

const supabase = createClient(envMap.NEXT_PUBLIC_SUPABASE_URL, envMap.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const doctorId = '225a86a0-4f9b-4c70-a352-5918823ea794'
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)

  if (apptErr) throw apptErr

  const { data: series, error: seriesErr } = await supabase
    .from('recurring_appointment_series')
    .select('*')
    .eq('doctor_id', doctorId)

  if (seriesErr) throw seriesErr

  const backupData = {
    doctorId,
    timestamp: new Date().toISOString(),
    totalAppointments: appointments?.length || 0,
    totalSeries: series?.length || 0,
    appointments,
    series
  }

  fs.writeFileSync('scripts/saneamento/backup_eduarda_225a86a0_2026-09-09.json', JSON.stringify(backupData, null, 2))
  console.log('Backup salvo com sucesso. Total agendamentos:', appointments?.length, 'Series:', series?.length)
}

run().catch(console.error)
