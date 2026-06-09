import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { bancoInterService } from '@/lib/services/bancointer'

// =============================================================================
// GET /api/billing/public-payment/pdf?token=UUID
// Endpoint PÚBLICO (sem auth) - retorna PDF do boleto
// =============================================================================

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({ error: 'Token é obrigatório' }, { status: 400 })
        }

        // UUID validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(token)) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
        }

        const supabase = createServiceRoleClient() as any

        // Buscar payment_request pelo ID (token)
        const { data: pr, error } = await supabase
            .from('payment_requests')
            .select('id, mercadopago_preference_id, status')
            .eq('id', token)
            .single()

        if (error || !pr) {
            return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })
        }

        const nossoNumero = pr.mercadopago_preference_id
        if (!nossoNumero) {
            return NextResponse.json({ error: 'Boleto não disponível' }, { status: 404 })
        }

        // Buscar PDF do Banco Inter
        const pdfBase64 = await bancoInterService.getBoletoPdf(nossoNumero)

        if (!pdfBase64) {
            return NextResponse.json(
                { error: 'PDF não disponível ainda. Tente novamente em alguns minutos.' },
                { status: 404 }
            )
        }

        const pdfBuffer = Buffer.from(pdfBase64, 'base64')

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="boleto_clinigo_${nossoNumero}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        })

    } catch (error: any) {
        console.error('[Public Payment PDF]', error.response?.data || error.message)
        return NextResponse.json(
            { error: 'Erro ao buscar PDF do boleto. Tente novamente em alguns minutos.' },
            { status: 500 }
        )
    }
}
