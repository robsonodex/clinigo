/**
 * API Route: WhatsApp Session Status
 * GET /api/whatsapp-session/status
 * 
 * RBAC: Any authenticated user
 * Proxies to WhatsApp microservice
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const INTERNAL_SECRET = process.env.WHATSAPP_INTERNAL_SECRET || ''

export async function GET(request: NextRequest) {
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

    const response = await fetch(
      `${WHATSAPP_SERVICE_URL}/session/status?clinic_id=${clinicId}`,
      {
        headers: {
          'x-internal-secret': INTERNAL_SECRET,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Falha ao verificar status' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[WhatsApp Session Status]', error.message)
    // Return disconnected as default when service is down
    return NextResponse.json({
      connected: false,
      phone: null,
      service_unavailable: true,
    })
  }
}
