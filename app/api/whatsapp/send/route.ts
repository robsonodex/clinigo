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
    const { phone, message, trigger_source } = body

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone e message são obrigatórios' }, { status: 400 })
    }

    await sendWhatsAppMessage(
      profile.clinic_id,
      phone,
      message,
      trigger_source || 'manual'
    )

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
