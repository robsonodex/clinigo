import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createInstanceAndGetQR } from '@/lib/whatsapp/service'

/**
 * POST /api/whatsapp/connect
 * 
 * Cria instância na Evolution API e retorna QR Code em base64.
 * O dono da clínica escaneia com o celular → conectado.
 * Suporta múltiplos setores via body.sector
 * 
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
      return NextResponse.json({ error: 'Apenas administradores podem conectar o WhatsApp' }, { status: 403 })
    }

    // Ler sector do body (default = 'default')
    let sector = 'default'
    try {
      const body = await req.json()
      if (body?.sector) sector = body.sector
    } catch { /* body vazio = default */ }

    const result = await createInstanceAndGetQR(profile.clinic_id, sector)

    return NextResponse.json({
      qr_code: result.qr_code,
      status: result.status,
      instance_name: result.instance_name,
      sector,
    })
  } catch (error: any) {
    console.error('[WhatsApp Connect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
