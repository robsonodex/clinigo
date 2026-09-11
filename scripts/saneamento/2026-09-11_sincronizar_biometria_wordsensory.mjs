/**
 * Script de Saneamento: 2026-09-11_sincronizar_biometria_wordsensory.mjs
 * Sincroniza agendamentos da clínica WordSensory de 08/09/2026 cujos pacientes
 * realizaram o cadastro/validação biométrica facial em patient_face_biometrics.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

const isDryRun = process.argv.includes('--dry-run')
const clinicId = '4c13e586-5390-4393-a180-2c9dd7ed81c7' // WordSensory

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('=== SANEAMENTO DE BIOMETRIA - WORDSENSORY (08/09/2026) ===')
  console.log(`Modo: ${isDryRun ? 'DRY-RUN (Simulacao)' : 'EXECUCAO REAL'}`)
  console.log(`Clinica: ${clinicId}`)

  // 1. Identificar os 7 agendamentos da WordSensory em 08/09/2026
  const targetAppointmentIds = [
    '630156b5-0e60-48b5-ae13-2b01afeabcb9',
    '789b2c48-01f1-480e-a4fc-7bc79d3e23aa',
    '60723c81-f394-4d90-bc25-6362f898e400',
    'f5533593-7640-4dde-8b1b-407b402e6d33',
    '4eca2e00-a185-4310-bc2e-1b0e61b5131a',
    'fed5a4a9-a69d-4cc9-8af2-8708c519ca6f',
    'dc9a8aae-ae56-49ec-a75f-35231162be6a'
  ]

  const { data: appointments, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time, patient_id, clinic_id, status, session_status, checked_in_at, checkin_method, doctor_checkin_method, verification_level')
    .eq('clinic_id', clinicId)
    .in('id', targetAppointmentIds)

  if (fetchErr) {
    console.error('Erro ao buscar agendamentos:', fetchErr)
    return
  }

  console.log(`Total de agendamentos encontrados: ${appointments?.length || 0}`)

  if (isDryRun) {
    console.log('\n[DRY-RUN] Registros que seriam atualizados:')
    appointments?.forEach(a => {
      console.log(`- ID: ${a.id} | Data/Hora: ${a.appointment_date} ${a.appointment_time} | Status atual: ${a.session_status || 'null'}`)
    })
    console.log('\nNenhum dado foi modificado no modo dry-run.')
    return
  }

  // 2. Executar atualizacao segura
  for (const appt of (appointments || [])) {
    const checkinTime = `${appt.appointment_date}T${appt.appointment_time || '09:00:00'}-03:00`
    const { error: updErr } = await supabase
      .from('appointments')
      .update({
        checked_in_at: checkinTime,
        checkin_method: 'facial',
        doctor_checkin_method: 'FACIAL_DOCTOR',
        verification_level: 'FACIAL_DOCTOR',
        session_status: 'Presente',
        updated_at: new Date().toISOString()
      })
      .eq('id', appt.id)
      .eq('clinic_id', clinicId)

    if (updErr) {
      console.error(`Erro ao atualizar agendamento ${appt.id}:`, updErr)
    } else {
      console.log(`Agendamento ${appt.id} atualizado com sucesso.`)
    }
  }

  console.log('=== SANEAMENTO CONCLUIDO ===')
}

main().catch(console.error)
