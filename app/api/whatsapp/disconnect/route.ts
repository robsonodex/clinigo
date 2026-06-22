import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectInstance } from '@/lib/whatsapp/service'

/**
 * POST /api/whatsapp/disconnect
 * Desconecta sessão WhatsApp. Suporta sector via body.
 * Roles: CLINIC_ADMIN, SUPER_ADMIN
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    if (!['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    let sector = 'default'
    try {
      const body = await req.json()
      if (body?.sector) sector = body.sector
    } catch { /* default */ }

    await disconnectInstance(profile.clinic_id, sector)

    return NextResponse.json({ success: true, sector })
  } catch (error: any) {
    console.error('[WhatsApp Disconnect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
