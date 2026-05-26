import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getClinBotUrl(): string {
  return process.env.CLIN_BOT_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'
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
    // 1. Validar que o usuário é SUPER_ADMIN
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito a Super Administradores' }, { status: 403 })
    }

    // 2. Extrair dados da requisição
    const { to, text } = await request.json()
    if (!to || !text) {
      return NextResponse.json({ error: 'Destinatário (to) e texto (text) são obrigatórios' }, { status: 400 })
    }

    // 3. Fazer requisição para o serviço Clin Bot no Railway
    const url = `${getClinBotUrl()}/clin/send`
    
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, text }),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro reportado pelo serviço do WhatsApp')
      }

      return NextResponse.json({ success: true })
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        throw new Error('O serviço do WhatsApp (Clin Bot) não respondeu a tempo.')
      }
      throw err
    }
  } catch (error: any) {
    console.error('[Clin WhatsApp Send Proxy]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao conectar com o serviço Clin Bot no Railway',
    }, { status: 502 })
  }
}
