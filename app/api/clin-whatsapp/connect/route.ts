import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { connectClinSession, getClinStatus, disconnectClinSession } from '@/lib/whatsapp/service'

/**
 * POST /api/clin-whatsapp/connect — Conectar/QR Code
 * GET  /api/clin-whatsapp/connect — Status
 * DELETE /api/clin-whatsapp/connect — Desconectar
 * 
 * Conecta/Gerencia a sessão nativa Baileys do Clin Sales Bot.
 * Roles: SUPER_ADMIN apenas.
 */

async function verifySuperAdmin() {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userRole = headersList.get('x-user-role')

    if (userId && userRole === 'SUPER_ADMIN') {
      return { id: userId, role: userRole } as any
    }
  } catch (err) {
    console.error('[verifySuperAdmin] Error verifying via headers, using fallback:', err)
  }

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
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const res = await connectClinSession(force)

    return NextResponse.json({
      qr_code: res.qr_code || null,
      status: res.status === 'connected' ? 'connected' : 'connecting',
      phone_number: null,
    })
  } catch (error: any) {
    console.error('[Clin WhatsApp Connect]', error.message)
    return NextResponse.json({
      error: error.message || 'Erro ao gerar QR Code do WhatsApp',
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await verifySuperAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Acesso restrito' }, { status: 403 })
    }

    const data = await getClinStatus()

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

    await disconnectClinSession()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Disconnect]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

