import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createInstanceAndGetQR,
  checkInstanceStatus,
  disconnectInstance,
} from '@/lib/whatsapp/service'

/**
 * POST /api/clin-whatsapp/connect — Conectar WhatsApp do Clin
 * GET  /api/clin-whatsapp/connect — Status da conexão
 * DELETE /api/clin-whatsapp/connect — Desconectar
 * 
 * Usa diretamente o lib/whatsapp/service.ts (Baileys in-process).
 * Roles: SUPER_ADMIN apenas.
 */

const CLIN_CLINIC_ID = 'clin-sales-bot'

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

    const result = await createInstanceAndGetQR(CLIN_CLINIC_ID)

    return NextResponse.json({
      qr_code: result.qr_code,
      status: result.status,
      instance_name: result.instance_name,
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

    const status = await checkInstanceStatus(CLIN_CLINIC_ID)

    return NextResponse.json({
      connected: status.connected,
      phone_number: status.phone_number,
      status: status.status,
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

    await disconnectInstance(CLIN_CLINIC_ID)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Clin WhatsApp Disconnect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
