import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstanceStatus } from '@/lib/whatsapp/service'

/**
 * GET /api/whatsapp/status
 * 
 * Consulta o status da conexão WhatsApp da clínica.
 * O frontend faz polling neste endpoint a cada 3s enquanto aguarda QR.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('clinic_id')
      .eq('id', user.id)
      .single()

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
    }

    // Buscar sessão local (QR code pode estar salvo)
    const { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('clinic_id', profile.clinic_id)
      .single()

    // Se não existe sessão nenhuma
    if (!session) {
      return NextResponse.json({
        connected: false,
        status: 'disconnected',
        phone_number: null,
        qr_code: null,
      })
    }

    // Consultar status real na Evolution API
    const liveStatus = await checkInstanceStatus(profile.clinic_id)

    // Se está conectando, verificar se QR ainda é válido
    let qrCode: string | null = null
    if (!liveStatus.connected && session.qr_code) {
      const expiresAt = session.qr_code_expires_at ? new Date(session.qr_code_expires_at) : null
      if (!expiresAt || expiresAt > new Date()) {
        qrCode = session.qr_code
      }
    }

    return NextResponse.json({
      connected: liveStatus.connected,
      status: liveStatus.status,
      phone_number: liveStatus.phone_number,
      connected_at: session.connected_at,
      qr_code: qrCode,
    })
  } catch (error: any) {
    console.error('[WhatsApp Status]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
