import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstanceStatus, getAllClinicSessions } from '@/lib/whatsapp/service'

/**
 * GET /api/whatsapp/status?sector=default
 * Retorna status da conexão WhatsApp.
 * Se sector=all, retorna todas as sessões da clínica.
 */
export async function GET(req: NextRequest) {
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

    let sector = req.nextUrl.searchParams.get('sector') || 'default'

    // Se o usuário for DOCTOR, ele só pode consultar o próprio status
    if (profile.role === 'DOCTOR') {
      sector = user.id
    } else {
      // Se sector=all, retornar todas as sessões
      if (sector === 'all') {
        const sessions = await getAllClinicSessions(profile.clinic_id)
        return NextResponse.json({ sessions })
      }
    }

    // Buscar status em tempo real via Baileys
    const liveStatus = await checkInstanceStatus(profile.clinic_id, sector)

    // Buscar dados persistidos do banco
    const { data: dbSession } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('clinic_id', profile.clinic_id)
      .eq('sector', sector)
      .single()

    return NextResponse.json({
      connected: liveStatus.connected,
      status: liveStatus.status,
      phone_number: liveStatus.phone_number || (dbSession as any)?.phone_number,
      connected_at: (dbSession as any)?.connected_at,
      qr_code: (dbSession as any)?.qr_code,
      sector,
    })
  } catch (error: any) {
    console.error('[WhatsApp Status]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
