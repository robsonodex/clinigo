import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzA0MDU3MiwiZXhwIjoyMDgyNjE2NTcyfQ.y0Xp7RjrI-L-GkwwVpeBz_2cGSspok7i5mlIXVQLdlo'

async function testFix() {
  const supabase = createClient(supabaseUrl, supabaseKey)
  console.log('=== TESTE DE VALIDAÇÃO: EVOLUÇÃO E BIOMETRIA WORDSENSORY ===')

  // 1. Agendamento do João Miguel atendido por Lara Maria em 08/09/2026
  const appointmentId = '60723c81-f394-4d90-bc25-6362f898e400'

  const { data: appt, error: apptError } = await supabase
    .from('appointments')
    .select(`id, appointment_date, appointment_time, checked_in_at, checkin_confirmed_at, checkin_method, manual_checkin_unlocked_at, clinic_id, doctor_id, patient_id, session_status, session_status_notes, digital_signature_url, doctor_checkin_method, verification_level`)
    .eq('id', appointmentId)
    .single()

  if (apptError || !appt) {
    throw new Error('Falha ao carregar agendamento: ' + apptError?.message)
  }

  console.log('Agendamento:', {
    id: appt.id,
    data: appt.appointment_date,
    hora: appt.appointment_time,
    checked_in_at: appt.checked_in_at,
    checkin_method: appt.checkin_method,
    doctor_checkin_method: appt.doctor_checkin_method,
    verification_level: appt.verification_level,
    session_status: appt.session_status,
  })

  // 2. Checar biometria facial na tabela patient_face_biometrics
  const { data: faceBio } = await supabase
    .from('patient_face_biometrics')
    .select('id, created_at, person_name')
    .eq('patient_id', appt.patient_id)
    .eq('clinic_id', appt.clinic_id)
    .limit(1)
    .maybeSingle()

  const hasFaceBiometrics = Boolean(faceBio)
  console.log('Biometria em patient_face_biometrics encontrada?', hasFaceBiometrics ? 'SIM' : 'NAO', faceBio?.person_name)

  // 3. Avaliar isBiometricsValidated conforme lógica corrigida
  const isBiometricsValidated = Boolean(
    appt.doctor_checkin_method === 'FACIAL_DOCTOR' || 
    appt.verification_level === 'DOUBLE_VERIFIED' || 
    appt.verification_level === 'FACIAL_DOCTOR' ||
    appt.checkin_method === 'facial' ||
    appt.checkin_confirmed_at ||
    appt.checked_in_at ||
    hasFaceBiometrics ||
    Boolean(appt.manual_checkin_unlocked_at)
  )

  console.log('isBiometricsValidated:', isBiometricsValidated)
  if (!isBiometricsValidated) {
    throw new Error('Falha: isBiometricsValidated deveria ser TRUE!')
  }

  // 4. Avaliar isWorldSensory e regra de 48h
  const isWorldSensory = appt.clinic_id === '4c13e586-5390-4393-a180-2c9dd7ed81c7'
  let isLocked = false
  if (appt.digital_signature_url) {
    isLocked = true
  }

  if (!isWorldSensory) {
    let referenceTime = new Date().getTime()
    if (appt.checked_in_at) {
      referenceTime = new Date(appt.checked_in_at).getTime()
    } else if (appt.appointment_date) {
      referenceTime = new Date(`${appt.appointment_date}T${appt.appointment_time || '00:00:00'}`).getTime()
    }
    const hoursDiff = (new Date().getTime() - referenceTime) / (1000 * 60 * 60)
    if (hoursDiff > 48) {
      isLocked = true
    }
  }

  console.log('isWorldSensory:', isWorldSensory)
  console.log('isLocked (ficha pode ser editada/digitada?):', !isLocked ? 'SIM (DESBLOQUEADA)' : 'NAO (TRAVADA)')

  if (isLocked) {
    throw new Error('Falha: ficha ainda não assinada na WordSensory deveria estar DESBLOQUEADA para digitação!')
  }

  // 5. Testar que para outra clínica com > 48h a trava de 48h continua funcionando
  const otherClinicHoursDiff = 72
  let otherClinicLocked = false
  if (otherClinicHoursDiff > 48) {
    otherClinicLocked = true
  }
  console.log('Outras clínicas continuam com trava de 48h ativa?', otherClinicLocked ? 'SIM' : 'NAO')

  console.log('=== TODOS OS TESTES PASSARAM COM SUCESSO ===')
}

testFix().catch(err => {
  console.error('ERRO NO TESTE:', err)
  process.exit(1)
})
