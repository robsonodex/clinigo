import { createServiceRoleClient } from '@/lib/supabase/server'
import { generatePhoneVariations } from '@/lib/services/whatsapp-repasse'

interface ProcessAppointmentResult {
  processed: boolean
  action?: 'CONFIRMED' | 'CANCELLED' | 'GENERAL_MESSAGE'
  appointmentId?: string
  patientName?: string
  responseMessage?: string
}

/**
 * Normaliza texto para deteccao de intencao do paciente
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Verifica se a mensagem e uma confirmacao de presenca
 */
export function isConfirmationMessage(text: string): boolean {
  if (!text) return false
  const norm = normalizeText(text)
  const triggers = [
    'sim',
    'confirmo',
    'confirmar',
    'confirmado',
    'confirmada',
    'estarei presente',
    'vou sim',
    'com certeza',
    'ok',
    'vou',
    'positivo',
    'confirmadissimo'
  ]
  return triggers.some((t) => norm === t || norm.startsWith(`${t} `) || norm.endsWith(` ${t}`))
}

/**
 * Verifica se a mensagem e um cancelamento ou desmarque
 */
export function isCancellationMessage(text: string): boolean {
  if (!text) return false
  const norm = normalizeText(text)
  const triggers = [
    'nao',
    'nao vou',
    'nao posso',
    'nao poderei',
    'cancelar',
    'desmarcar',
    'cancela',
    'imprevisto'
  ]
  return triggers.some((t) => norm === t || norm.startsWith(`${t} `))
}

/**
 * Sincroniza mensagem recebida para o Chat Interno da clinica
 */
async function syncIncomingToChat(
  supabase: any,
  clinicId: string,
  rawPhone: string,
  message: string,
  patientName?: string
) {
  try {
    const cleanPhone = rawPhone.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('55')
      ? `+55 (${cleanPhone.substring(2, 4)}) ${cleanPhone.substring(4, 9)}-${cleanPhone.substring(9)}`
      : cleanPhone

    const title = patientName ? `WhatsApp: ${patientName} (${formattedPhone})` : `WhatsApp: ${formattedPhone}`

    // Procura conversa existente por telefone
    let { data: conv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('clinic_id', clinicId)
      .ilike('title', `%${cleanPhone}%`)
      .maybeSingle()

    if (!conv) {
      const { data: firstAdmin } = await supabase
        .from('users')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle()

      const createdBy = firstAdmin?.id || null

      const { data: newConv } = await supabase
        .from('chat_conversations')
        .insert({
          clinic_id: clinicId,
          type: 'internal',
          title: title,
          created_by: createdBy,
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
        })
        .select('id')
        .single()

      if (newConv) {
        conv = newConv
        if (createdBy) {
          await supabase.from('chat_participants').insert({
            conversation_id: newConv.id,
            user_id: createdBy,
            role: 'admin',
          })
        }
      }
    }

    if (conv?.id) {
      await supabase
        .from('chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 100),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conv.id)

      const { data: senderUser } = await supabase
        .from('users')
        .select('id')
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle()

      if (senderUser?.id) {
        await supabase.from('chat_messages').insert({
          conversation_id: conv.id,
          sender_id: senderUser.id,
          content: `[WhatsApp recebido de ${patientName || formattedPhone}]:\n${message}`,
          message_type: 'text',
        })
      }
    }
  } catch (err) {
    console.error('[WhatsApp Appointment] Erro ao sincronizar com chat:', err)
  }
}

/**
 * Processa mensagem recebida de paciente no WhatsApp da clinica
 */
export async function processIncomingWhatsAppAppointment(
  clinicId: string,
  remoteJid: string,
  text: string,
  sector: string = 'default'
): Promise<ProcessAppointmentResult> {
  const supabase = createServiceRoleClient() as any
  const rawPhone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')

  if (!rawPhone || !text) {
    return { processed: false }
  }

  const phoneVariations = generatePhoneVariations(rawPhone)

  // 1. Localizar o paciente na clinica
  const { data: patients } = await supabase
    .from('patients')
    .select('id, full_name, phone')
    .eq('clinic_id', clinicId)
    .in('phone', phoneVariations)
    .limit(5)

  const patient = patients && patients.length > 0 ? patients[0] : null
  const patientName = patient?.full_name || undefined

  // 2. Sincronizar qualquer mensagem recebida com o Chat da Recepcao
  await syncIncomingToChat(supabase, clinicId, rawPhone, text, patientName)

  // 3. Verificar se e confirmacao de presenca
  const isConfirm = isConfirmationMessage(text)
  const isCancel = isCancellationMessage(text)

  if (!isConfirm && !isCancel) {
    return {
      processed: true,
      action: 'GENERAL_MESSAGE',
      patientName,
    }
  }

  // 4. Buscar agendamento futuro mais proximo do paciente
  const todayStr = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('appointments')
    .select(`
      id,
      appointment_date,
      appointment_time,
      status,
      doctor:doctors!appointments_doctor_id_fkey(id, specialty, user:users(full_name)),
      patient:patients(id, full_name, phone),
      clinic:clinics(name)
    `)
    .eq('clinic_id', clinicId)
    .gte('appointment_date', todayStr)
    .in('status', ['SCHEDULED', 'PENDING_PAYMENT', 'CONFIRMED'])
    .order('appointment_date', { ascending: true })
    .order('appointment_time', { ascending: true })
    .limit(1)

  if (patient?.id) {
    query = query.eq('patient_id', patient.id)
  } else {
    // Busca por telefone do paciente no join
    const { data: matchingPatients } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinicId)
      .in('phone', phoneVariations)

    const ids = matchingPatients?.map((p: any) => p.id) || []
    if (ids.length === 0) {
      return { processed: false }
    }
    query = query.in('patient_id', ids)
  }

  const { data: upcomingAppointments, error: aptErr } = await query

  if (aptErr || !upcomingAppointments || upcomingAppointments.length === 0) {
    return {
      processed: true,
      action: 'GENERAL_MESSAGE',
      patientName,
    }
  }

  const appointment = upcomingAppointments[0] as any
  const [year, month, day] = appointment.appointment_date.split('-')
  const formattedDate = `${day}/${month}/${year}`
  const formattedTime = appointment.appointment_time?.substring(0, 5) || ''
  const clinicName = (appointment.clinic as any)?.name || 'nossa clinica'

  if (isConfirm) {
    // Atualizar agendamento para CONFIRMED
    await supabase
      .from('appointments')
      .update({
        status: 'CONFIRMED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    // Registrar log
    await supabase.from('whatsapp_logs').insert({
      clinic_id: clinicId,
      recipient_phone: rawPhone,
      message_preview: `Confirmacao recebida: ${text.substring(0, 50)}`,
      trigger_source: 'patient_confirmation',
      status: 'confirmed',
    })

    const reply = `Ola, ${appointment.patient?.full_name || 'Paciente'}! Sua presenca na consulta do dia ${formattedDate} as ${formattedTime} foi confirmada com sucesso na ${clinicName}. Ate breve!`

    return {
      processed: true,
      action: 'CONFIRMED',
      appointmentId: appointment.id,
      patientName: appointment.patient?.full_name,
      responseMessage: reply,
    }
  }

  if (isCancel) {
    // Registrar aviso de cancelamento
    await supabase
      .from('appointments')
      .update({
        status: 'CANCELLED',
        cancellation_reason: 'Cancelado pelo paciente via WhatsApp',
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointment.id)

    await supabase.from('whatsapp_logs').insert({
      clinic_id: clinicId,
      recipient_phone: rawPhone,
      message_preview: `Cancelamento recebido: ${text.substring(0, 50)}`,
      trigger_source: 'patient_cancellation',
      status: 'cancelled',
    })

    const reply = `Ola, ${appointment.patient?.full_name || 'Paciente'}. Seu agendamento para o dia ${formattedDate} as ${formattedTime} foi desmarcado. Caso deseje reagendar, entre em contato com nossa equipe.`

    return {
      processed: true,
      action: 'CANCELLED',
      appointmentId: appointment.id,
      patientName: appointment.patient?.full_name,
      responseMessage: reply,
    }
  }

  return { processed: true, action: 'GENERAL_MESSAGE', patientName }
}
