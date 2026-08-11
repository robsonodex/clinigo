import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

/**
 * POST /api/whatsapp/send
 * 
 * Envia mensagem WhatsApp via Evolution API.
 * O clinic_id vem do token de sessão — NUNCA do body.
 * 
 * Body: { phone, message, trigger_source? }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    const body = await req.json()
    const { phone, message, trigger_source, sector, waiting_list_id } = body

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone e message são obrigatórios' }, { status: 400 })
    }

    await sendWhatsAppMessage(
      profile.clinic_id,
      phone,
      message,
      trigger_source || 'manual',
      sector || 'default'
    )

    // Gravação atômica no servidor da observação commercial_notes se o disparo for de fila de espera
    if (trigger_source === 'waiting-list' || waiting_list_id) {
      try {
        const dateStr = new Date().toLocaleString('pt-BR')
        const logAppend = `\n[${dateStr} - WhatsApp (${(sector || 'comercial').toUpperCase()})]: "${message}"`

        let targetId = waiting_list_id
        if (!targetId) {
          const cleanPhone = phone.replace(/\D/g, '')
          const lastDigits = cleanPhone.slice(-8)
          const { data: matchedItem } = await supabase
            .from('waiting_list')
            .select('id, commercial_notes')
            .eq('clinic_id', profile.clinic_id)
            .ilike('patient_phone', `%${lastDigits}%`)
            .limit(1)
            .maybeSingle()

          if (matchedItem) {
            targetId = matchedItem.id
          }
        }

        if (targetId) {
          const { data: currentItem } = await supabase
            .from('waiting_list')
            .select('commercial_notes')
            .eq('id', targetId)
            .single()

          if (currentItem) {
            const updatedNotes = currentItem.commercial_notes
              ? `${currentItem.commercial_notes}${logAppend}`
              : logAppend.trim()

            await supabase
              .from('waiting_list')
              .update({
                commercial_notes: updatedNotes,
                updated_at: new Date().toISOString()
              })
              .eq('id', targetId)
          }
        }
      } catch (logErr) {
        console.error('[WhatsApp Send] Erro ao salvar observação automática na fila:', logErr)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[WhatsApp Send]', error)

    // Mensagem amigável se não está conectado
    if (error.message?.includes('não conectado')) {
      return NextResponse.json({
        error: error.message,
        action: 'configure_whatsapp',
      }, { status: 422 })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

