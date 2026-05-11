import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/clin-whatsapp/connect
 * Proxy para o servidor Railway — conecta a sessão do Clin.
 * 
 * GET /api/clin-whatsapp/connect
 * Proxy para o servidor Railway — status da sessão do Clin.
 * 
 * DELETE /api/clin-whatsapp/connect
 * Proxy para o servidor Railway — desconecta a sessão do Clin.
 * 
 * Roles: SUPER_ADMIN apenas
 */

const RAILWAY_URL = process.env.SIGNALING_SERVER_URL || 'https://clinigo-whatsapp-service-production.up.railway.app'

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

export async function POST() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    // Chamar Railway para conectar e obter QR
    const res = await fetch(`${RAILWAY_URL}/clin/qr`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()

    return NextResponse.json({
      qr_code: data.qr || null,
      status: data.status === 'connected' ? 'connected' : 'connecting',
      phone_number: data.phone_number || null,
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Connect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const res = await fetch(`${RAILWAY_URL}/clin/status`)
    const data = await res.json()

    return NextResponse.json({
      connected: data.connected || false,
      phone_number: data.phone_number || null,
      status: data.status || 'disconnected',
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Status]', error)
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

    await fetch(`${RAILWAY_URL}/clin/disconnect`, { method: 'POST' })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Disconnect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
