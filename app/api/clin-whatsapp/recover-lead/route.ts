import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminSalesHq } from '@/app/api/super-admin/prospeccao/_auth'
import { recoverOfflineLeadByClin } from '@/lib/whatsapp/clin-sentinel'

export const dynamic = 'force-dynamic'

/**
 * POST /api/clin-whatsapp/recover-lead
 * Aciona manualmente o motor do Bot Clin (/api/chatbot) para um lead que enviou
 * mensagem durante uma indisponibilidade e dispara a resposta oficial no WhatsApp.
 */
export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    try {
        const body = await request.json()
        const phone = String(body.phone || '').trim()
        const incomingMessage = typeof body.incomingMessage === 'string' ? body.incomingMessage : 'Olá'
        const includeApologyPrefix = body.includeApologyPrefix !== false

        const result = await recoverOfflineLeadByClin({
            phone,
            incomingMessage,
            includeApologyPrefix,
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[Clin WhatsApp Recover Lead]', error)
        return NextResponse.json(
            { error: error?.message || 'Erro ao acionar resposta do Bot Clin' },
            { status: 400 }
        )
    }
}

