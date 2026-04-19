/**
 * API Route: Start WhatsApp Session
 * POST /api/whatsapp-session/start
 * 
 * RBAC: CLINIC_ADMIN, SUPER_ADMIN only
 * Proxies to WhatsApp microservice
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_SERVICE_URL || 'http://localhost:3001'
const INTERNAL_SECRET = process.env.WHATSAPP_INTERNAL_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    // Auth check from middleware headers
    const userId = request.headers.get('x-user-id')
    const userRole = request.headers.get('x-user-role')
    const clinicId = request.headers.get('x-clinic-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // RBAC: Only CLINIC_ADMIN and SUPER_ADMIN can start sessions
    if (!userRole || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Apenas administradores podem conectar o WhatsApp' },
        { status: 403 }
      )
    }

    if (!clinicId) {
      return NextResponse.json(
        { error: 'Clínica não identificada' },
        { status: 400 }
      )
    }

    // Proxy to microservice
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ clinic_id: clinicId }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Falha ao iniciar sessão' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[WhatsApp Session Start]', error.message)
    return NextResponse.json(
      { error: 'Serviço WhatsApp indisponível. Verifique se o microserviço está rodando.' },
      { status: 503 }
    )
  }
}
