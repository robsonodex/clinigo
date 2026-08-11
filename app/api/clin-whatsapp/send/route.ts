import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getClinBotUrl(): string {
  const url = process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'
  if (url.includes('clinigo.app') || url.includes('localhost') || !url.startsWith('http')) {
    return 'https://clinigo-whatsapp-service-production.up.railway.app'
  }
  return url.replace(/\/$/, '')
}

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

    const cleanTo = to.replace(/\D/g, '')
    const fullPhone = cleanTo.startsWith('55') ? cleanTo : `55${cleanTo}`

    const botUrl = getClinBotUrl()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${botUrl}/clin/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: fullPhone, text }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const resText = await res.text()
    let data: any = {}
    try {
      data = JSON.parse(resText)
    } catch {
      data = { error: 'Resposta inválida do serviço do WhatsApp' }
    }

    if (!res.ok) {
      throw new Error(data.error || 'Falha ao enviar mensagem. Verifique se o WhatsApp está conectado.')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Send]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao enviar mensagem pelo WhatsApp',
    }, { status: 500 })
  }
}


