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
    
    const cleanTo = to.replace(/\D/g, '')
    const targets = []
    
    // Inversão inteligente: para DDD > 28, o correto no WhatsApp é SEM o 9
    if (cleanTo.startsWith('55') && cleanTo.length === 13) {
      const ddd = parseInt(cleanTo.substring(2, 4), 10)
      if (ddd > 28) {
        const semNove = cleanTo.substring(0, 4) + cleanTo.substring(5)
        targets.push(semNove) // Tenta SEM o 9 primeiro
        targets.push(cleanTo) // Fallback COM o 9
      } else {
        targets.push(cleanTo)
      }
    } else {
      targets.push(cleanTo)
    }

    let success = false
    let lastError = null

    for (const target of targets) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
      
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: target, text }),
          signal: controller.signal,
        })

        clearTimeout(timeout)
        
        const text = await res.text()
        let data: any = {}
        try {
          data = JSON.parse(text)
        } catch {
          lastError = 'O serviço do WhatsApp (Clin Bot) retornou uma resposta inválida (HTML).'
          continue
        }
        if (res.ok) {
          success = true
          break // Para o envio se obteve sucesso em um dos alvos
        } else {
          lastError = data.error || 'Erro reportado pelo serviço do WhatsApp'
        }
      } catch (err: any) {
        clearTimeout(timeout)
        if (err.name === 'AbortError') {
          lastError = 'O serviço do WhatsApp (Clin Bot) não respondeu a tempo.'
        } else {
          lastError = err.message
        }
      }
    }

    if (!success) {
      throw new Error(lastError || 'Falha ao enviar mensagem pelo WhatsApp')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Send Proxy]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao conectar com o serviço Clin Bot no Railway',
    }, { status: 502 })
  }
}
