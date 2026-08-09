import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp/service'

async function verifySuperAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'SUPER_ADMIN') return null
  return user
}

export async function POST(request: Request) {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito a Super Administradores' }, { status: 403 })
    }

    const { to, text } = await request.json()
    if (!to || !text) {
      return NextResponse.json({ error: 'Destinatário (to) e texto (text) são obrigatórios' }, { status: 400 })
    }

    const success = await sendWhatsAppMessage('clin-sales-bot', to, text)
    if (!success) {
      throw new Error('Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Send]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao enviar mensagem pelo WhatsApp',
    }, { status: 500 })
  }
}

