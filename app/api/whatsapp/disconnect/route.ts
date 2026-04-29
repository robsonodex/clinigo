import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectInstance } from '@/lib/whatsapp/service'

/**
 * POST /api/whatsapp/disconnect
 * 
 * Desconecta o WhatsApp da clínica.
 * RECEPTIONIST e NURSE NÃO podem desconectar.
 * 
 * Roles: CLINIC_ADMIN, SUPER_ADMIN
 */
export async function POST() {
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
      return NextResponse.json({ error: 'Apenas administradores podem desconectar o WhatsApp' }, { status: 403 })
    }

    await disconnectInstance(profile.clinic_id)

    return NextResponse.json({ success: true, message: 'WhatsApp desconectado' })
  } catch (error: any) {
    console.error('[WhatsApp Disconnect]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
