import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { createClient } from '@/lib/supabase/server'

export const GET = withAxiom(async (request: AxiomRequest) => {
    const { searchParams } = new URL(request.url)
    const nossoNumero = searchParams.get('nossoNumero')
    const forceDownload = searchParams.get('download') === '1'

    if (!nossoNumero) {
        return NextResponse.json({ error: 'nossoNumero é obrigatório' }, { status: 400 })
    }

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const pdfBase64 = await bancoInterService.getBoletoPdf(nossoNumero)

        if (!pdfBase64) {
            return NextResponse.json({ error: 'PDF do boleto ainda não disponível. Aguarde alguns segundos e tente novamente.' }, { status: 404 })
        }

        const pdfBuffer = Buffer.from(pdfBase64, 'base64')
        const disposition = forceDownload ? 'attachment' : 'inline'

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${disposition}; filename="boleto-clinigo-${nossoNumero}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
                'Cache-Control': 'private, max-age=300',
            },
        })
    } catch (error: any) {
        request.log.error('billing/boleto-pdf', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error fetching PDF:', error)
        return NextResponse.json(
            { error: error.message || 'Não foi possível carregar o PDF do boleto' },
            { status: 500 }
        )
    }
})
