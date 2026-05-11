import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { connectClinSession, getClinStatus, disconnectClinSession } from '@/lib/whatsapp/service'

/**
 * POST /api/clin-whatsapp/connect
 * Conecta a sessão do Clin e retorna QR Code.
 * 
 * GET /api/clin-whatsapp/connect
 * Verifica status da sessão do Clin.
 * 
 * DELETE /api/clin-whatsapp/connect
 * Desconecta a sessão do Clin.
 * 
 * Roles: SUPER_ADMIN apenas
 */

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

    const result = await connectClinSession()

    return NextResponse.json({
      qr_code: result.qr_code,
      status: result.status,
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

    const status = await getClinStatus()
    return NextResponse.json(status)
  } catch (error: any) {
    console.error('[Clin WhatsApp Status]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    console.error('[Clin WhatsApp Disconnect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
