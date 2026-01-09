/**
 * API Route: Test WhatsApp Connection
 * POST /api/whatsapp/test-connection
 * 
 * Validates credentials for different WhatsApp providers
 */

import { NextRequest, NextResponse } from 'next/server'
import { testWhatsAppConnection } from '@/lib/services/whatsapp-adapter'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { provider, api_key, instance_id } = body

        if (!provider || provider === 'NONE') {
            return NextResponse.json(
                { connected: false, error: 'Provedor não selecionado' },
                { status: 400 }
            )
        }

        if (!api_key || !instance_id) {
            return NextResponse.json(
                { connected: false, error: 'Credenciais incompletas' },
                { status: 400 }
            )
        }

        // Test connection using adapter
        const result = await testWhatsAppConnection(provider, api_key, instance_id)

        if (result.connected) {
            return NextResponse.json({ connected: true })
        } else {
            return NextResponse.json(
                { connected: false, error: result.error || 'Falha na conexão' },
                { status: 400 }
            )
        }
    } catch (error: any) {
        console.error('[WhatsApp Test] Error:', error)
        return NextResponse.json(
            { connected: false, error: error.message || 'Erro interno' },
            { status: 500 }
        )
    }
}

