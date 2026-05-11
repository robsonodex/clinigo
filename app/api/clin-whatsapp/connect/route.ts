import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/clin-whatsapp/connect — Proxy para Railway (conectar/QR)
 * GET  /api/clin-whatsapp/connect — Proxy para Railway (status)
 * DELETE /api/clin-whatsapp/connect — Proxy para Railway (desconectar)
 * 
 * Roles: SUPER_ADMIN apenas
 */

function getRailwayUrl(): string {
  // Tentar env dedicada primeiro
  if (process.env.SIGNALING_SERVER_URL) return process.env.SIGNALING_SERVER_URL

  // Derivar da URL de WebSocket que já existe
  const wsUrl = process.env.NEXT_PUBLIC_WHATSAPP_WS_URL
  if (wsUrl) {
    return wsUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://')
      .replace(/\/ws\/?$/, '')
  }

  return 'https://clinigo-whatsapp-service-production.up.railway.app'
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

async function fetchRailway(path: string, method = 'GET'): Promise<any> {
  const url = `${getRailwayUrl()}${path}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const text = await res.text()

    // Verificar se é JSON válido
    if (text.startsWith('<') || text.startsWith('<!')) {
      throw new Error('Railway retornou HTML — deploy pode estar em andamento')
    }

    return JSON.parse(text)
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') {
      throw new Error('Railway não respondeu em 8s — servidor pode estar reiniciando')
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

    const data = await fetchRailway('/clin/qr')

    return NextResponse.json({
      qr_code: data.qr || null,
      status: data.status === 'connected' ? 'connected' : 'connecting',
      phone_number: data.phone_number || null,
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Connect]', error.message)
    return NextResponse.json({
      error: `Servidor Railway indisponível: ${error.message}. Aguarde o deploy concluir e tente novamente.`,
    }, { status: 502 })
  }
}

export async function GET() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const data = await fetchRailway('/clin/status')

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

    await fetchRailway('/clin/disconnect', 'POST')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Disconnect]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
