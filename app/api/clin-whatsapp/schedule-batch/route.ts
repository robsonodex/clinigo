import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ContactInput {
  name: string
  phone: string
}

interface ScheduleGroupInput {
  scheduledFor: string
  contacts: ContactInput[]
}

interface ScheduleBatchBody {
  subject: string
  message: string
  imageBase64?: string | null
  scheduleGroups: ScheduleGroupInput[]
}

/**
 * Higieniza e valida o número de telefone no formato internacional (DDI 55 + DDD + Número)
 */
function normalizePhone(rawPhone: string): { valid: boolean; formatted: string; error?: string } {
  if (!rawPhone) {
    return { valid: false, formatted: '', error: 'Telefone não informado.' }
  }

  const digits = rawPhone.replace(/\D/g, '')

  if (digits.length < 10) {
    return { valid: false, formatted: '', error: `Telefone '${rawPhone}' é inválido. Mínimo de 10 dígitos com DDD.` }
  }

  let target = digits
  if (!target.startsWith('55') && (target.length === 10 || target.length === 11)) {
    target = '55' + target
  }

  if (target.length < 12 || target.length > 13) {
    return { valid: false, formatted: '', error: `Telefone '${rawPhone}' tem extensão fora do padrão brasileiro (${target.length} dígitos com DDI 55).` }
  }

  return { valid: true, formatted: target }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Validar autenticação e autorização SUPER_ADMIN
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a Super Administradores do sistema.' }, { status: 403 })
    }

    // 2. Extração e validação do payload
    const body: ScheduleBatchBody = await request.json()
    const { subject, message, imageBase64, scheduleGroups } = body

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: 'O campo Assunto é obrigatório.' }, { status: 400 })
    }

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'O campo Mensagem é obrigatório.' }, { status: 400 })
    }

    if (!scheduleGroups || !Array.isArray(scheduleGroups) || scheduleGroups.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos um bloco de horário com destinatários.' }, { status: 400 })
    }

    const now = new Date()
    const recordsToInsert: Array<{
      scheduled_for: string
      recipient_phone: string
      recipient_name: string
      subject: string
      message: string
      image_base64: string | null
      status: 'pending'
    }> = []

    // 3. Validação dos blocos e seus respectivos contatos
    for (let gIdx = 0; gIdx < scheduleGroups.length; gIdx++) {
      const group = scheduleGroups[gIdx]
      const groupNum = gIdx + 1

      if (!group.scheduledFor) {
        return NextResponse.json(
          { error: `Informe a data e hora para o Bloco de Horário ${groupNum}.` },
          { status: 400 }
        )
      }

      const scheduledDate = new Date(group.scheduledFor)
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { error: `Data/hora inválida no Bloco de Horário ${groupNum}.` },
          { status: 400 }
        )
      }

      if (scheduledDate <= now) {
        return NextResponse.json(
          { error: `A data e hora do Bloco ${groupNum} (${scheduledDate.toLocaleString('pt-BR')}) deve ser no futuro.` },
          { status: 400 }
        )
      }

      if (!group.contacts || !Array.isArray(group.contacts) || group.contacts.length === 0) {
        return NextResponse.json(
          { error: `O Bloco de Horário ${groupNum} deve conter pelo menos um contato.` },
          { status: 400 }
        )
      }

      for (let cIdx = 0; cIdx < group.contacts.length; cIdx++) {
        const contact = group.contacts[cIdx]
        const contactNum = cIdx + 1

        if (!contact.name || !contact.name.trim()) {
          return NextResponse.json(
            { error: `Nome obrigatório para o contato ${contactNum} do Bloco ${groupNum}.` },
            { status: 400 }
          )
        }

        if (!contact.phone || !contact.phone.trim()) {
          return NextResponse.json(
            { error: `Telefone obrigatório para o contato '${contact.name.trim()}' (Bloco ${groupNum}).` },
            { status: 400 }
          )
        }

        const phoneCheck = normalizePhone(contact.phone)
        if (!phoneCheck.valid) {
          return NextResponse.json(
            { error: `Contato '${contact.name.trim()}' (Bloco ${groupNum}): ${phoneCheck.error}` },
            { status: 400 }
          )
        }

        recordsToInsert.push({
          scheduled_for: scheduledDate.toISOString(),
          recipient_phone: phoneCheck.formatted,
          recipient_name: contact.name.trim(),
          subject: subject.trim(),
          message: message.trim(),
          image_base64: imageBase64 || null,
          status: 'pending'
        })
      }
    }

    if (recordsToInsert.length === 0) {
      return NextResponse.json({ error: 'Nenhum contato válido encontrado para agendamento.' }, { status: 400 })
    }

    // 4. Inserção em lote na fila existente (scheduled_whatsapp_messages)
    const { data, error: insertError } = await (supabase
      .from('scheduled_whatsapp_messages') as any)
      .insert(recordsToInsert)
      .select('id')

    if (insertError) {
      console.error('[ScheduleBatch] Erro ao inserir na fila:', insertError)
      return NextResponse.json(
        { error: `Falha ao salvar agendamentos na fila: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: recordsToInsert.length,
      message: `${recordsToInsert.length} agendamento(s) programado(s) com sucesso na fila.`,
      ids: data?.map((d: any) => d.id) || []
    })
  } catch (err: any) {
    console.error('[ScheduleBatch] Exceção crítica:', err)
    return NextResponse.json(
      { error: err.message || 'Erro interno ao processar agendamento em lote.' },
      { status: 500 }
    )
  }
}
