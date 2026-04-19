/**
 * API Route: Send WhatsApp Message
 * POST /api/whatsapp/send
 * 
 * RBAC: Any authenticated user with clinic_id
 * Proxies to WhatsApp microservice
 * Supports text, PDF, and generic file attachments
 * Logs every send attempt to whatsapp_messages_log
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const INTERNAL_SECRET = process.env.WHATSAPP_INTERNAL_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const clinicId = request.headers.get('x-clinic-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    if (!clinicId) {
      return NextResponse.json(
        { error: 'Clínica não identificada' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { to, message, file_url, filename, mimetype, trigger_context } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: to, message' },
        { status: 400 }
      )
    }

    // Choose endpoint based on whether file is included
    let endpoint: string
    let proxyBody: Record<string, unknown>

    if (file_url) {
      endpoint = `${WHATSAPP_SERVICE_URL}/message/send-file`
      proxyBody = {
        clinic_id: clinicId,
        to,
        message,
        file_url,
        filename: filename || file_url.split('/').pop() || 'documento',
        mimetype: mimetype || 'application/octet-stream',
      }
    } else {
      endpoint = `${WHATSAPP_SERVICE_URL}/message/send`
      proxyBody = {
        clinic_id: clinicId,
        to,
        message,
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify(proxyBody),
    })

    const data = await response.json()

    // Log to whatsapp_messages_log
    const supabase = createServiceRoleClient()
    await supabase.from('whatsapp_messages_log').insert({
      clinic_id: clinicId,
      to_number: to,
      message,
      has_attachment: !!file_url,
      attachment_url: file_url || null,
      trigger_context: trigger_context || null,
      status: response.ok ? 'sent' : 'failed',
      error_message: response.ok ? null : (data.error || 'Falha no envio'),
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Falha ao enviar mensagem',
        },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[WhatsApp Send]', error.message)
    return NextResponse.json(
      {
        success: false,
        error: 'Serviço WhatsApp indisponível. Verifique se o microserviço está rodando.',
      },
      { status: 503 }
    )
  }
}
