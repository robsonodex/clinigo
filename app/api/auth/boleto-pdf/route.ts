import { NextRequest, NextResponse } from 'next/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { createServiceRoleClient } from '@/lib/supabase/server'

// =============================================================================
// GET /api/auth/boleto-pdf?nossoNumero=XXX
// Public endpoint - returns boleto PDF for pending registrations
// Security: only serves PDFs for nossoNumero that exist in registration_pending
// =============================================================================

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const nossoNumero = searchParams.get('nossoNumero')

        if (!nossoNumero) {
            return NextResponse.json(
                { error: 'nossoNumero é obrigatório' },
                { status: 400 }
            )
        }

        // Security: Verify this nossoNumero belongs to a pending registration
        const supabase = createServiceRoleClient() as any
        const { data: pending } = await supabase
            .from('registration_pending')
            .select('id')
            .eq('boleto_nosso_numero', nossoNumero)
            .eq('status', 'PENDING')
            .maybeSingle()

        if (!pending) {
            return NextResponse.json(
                { error: 'Boleto não encontrado ou já processado' },
                { status: 404 }
            )
        }

        console.log('[BOLETO-PDF-REG] Fetching PDF for:', nossoNumero)

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
        console.error('[BOLETO-PDF-REG] Error:', error.response?.data || error.message)
        return NextResponse.json(
            { error: 'Erro ao buscar PDF do boleto. Tente novamente em alguns minutos.' },
            { status: 500 }
        )
    }
}
