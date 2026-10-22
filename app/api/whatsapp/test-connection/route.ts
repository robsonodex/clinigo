import { withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkInstanceStatus } from '@/lib/whatsapp/service'

/**
 * GET /api/whatsapp/test-connection
 * Health check da conexão WhatsApp.
 */
export const GET = withAxiom(async (request: AxiomRequest) => {
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

    const status = await checkInstanceStatus(profile.clinic_id)

    return NextResponse.json({
      connected: status.connected,
      status: status.status,
      phone_number: status.phone_number,
    })
  } catch (error: any) {
        request.log.error('whatsapp/test-connection', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
})
