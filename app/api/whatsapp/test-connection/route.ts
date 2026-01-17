/**
 * API Route: Test WhatsApp Connection
 * POST /api/whatsapp/test-connection
 * 
 * DEPRECATED: WhatsApp API foi removida.
 * Clínicas agora usam compartilhamento manual via wa.me links.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    // WhatsApp API removida - retorna mensagem indicando migração para compartilhamento manual
    return NextResponse.json({
        connected: false,
        deprecated: true,
        error: 'WhatsApp API foi removida. Use o botão de compartilhamento manual na interface.',
        migration_note: 'Clínicas agora compartilham via wa.me links através do WhatsAppShareButton'
    }, { status: 410 }) // 410 Gone - resource no longer available
}

