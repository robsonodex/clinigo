import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/clin-whatsapp/connect — Conectar/QR Code
 * GET  /api/clin-whatsapp/connect — Status
 * DELETE /api/clin-whatsapp/connect — Desconectar
 * 
 * Proxy para o serviço Clin Bot no Railway (24/7).
 * ENV: CLIN_BOT_URL = URL do serviço Railway
 * Roles: SUPER_ADMIN apenas.
 */

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

async function fetchClinBot(path: string, method = 'GET'): Promise<any> {
  const url = `${getClinBotUrl()}${path}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout (QR demora)

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeout)
    const text = await res.text()

    if (text.startsWith('<') || text.startsWith('<!')) {
      throw new Error('Serviço Clin Bot retornou HTML. Deploy pode estar em andamento.')
    }

    return JSON.parse(text)
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Clin Bot não respondeu em 15s. Verifique se o serviço Railway está ativo.')
    }
    throw err
  }
}

export async function POST() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    // 1. Chamar /clin/connect para iniciar sessão (limpa auth antigo)
    await fetchClinBot('/clin/connect', 'POST')

    // 2. Buscar QR gerado
    const data = await fetchClinBot('/clin/qr')

    return NextResponse.json({
      qr_code: data.qr || null,
      status: data.status === 'connected' ? 'connected' : 'connecting',
      phone_number: data.phone_number || null,
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Connect]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao conectar com o serviço Clin Bot no Railway',
    }, { status: 502 })
  }
}

export async function GET() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const data = await fetchClinBot('/clin/status')

    return NextResponse.json({
      connected: data.connected || false,
      phone_number: data.phone_number || null,
      status: data.status || 'disconnected',
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Status]', error.message)
    return NextResponse.json({
      connected: false,
      phone_number: null,
      status: 'disconnected',
    })
  }
}

export async function DELETE() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    await fetchClinBot('/clin/disconnect', 'POST')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Disconnect]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
