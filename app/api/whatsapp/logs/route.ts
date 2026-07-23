import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/whatsapp/logs?phone=XXXXXXXXXX
 * Retorna o histórico de mensagens enviadas para determinado número filtrado pela clínica.
 */
export async function GET(req: NextRequest) {
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

    const phone = req.nextUrl.searchParams.get('phone')
    if (!phone) {
      return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 })
    }

    // Normalizar telefone (remover não dígitos)
    const cleanPhone = phone.replace(/\D/g, '')
    // Montamos busca por 55... ou sem 55 para cobrir ambas possibilidades
    const phoneFormats = [cleanPhone]
    if (cleanPhone.startsWith('55')) {
      phoneFormats.push(cleanPhone.substring(2))
    } else {
      phoneFormats.push(`55${cleanPhone}`)
    }

    const { data: logs, error } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('clinic_id', profile.clinic_id)
      .in('recipient_phone', phoneFormats)
      .order('sent_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ logs: logs || [] })
  } catch (error: any) {
    console.error('[WhatsApp Logs GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
