
import { NextResponse } from 'next/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const nossoNumero = searchParams.get('nossoNumero')

    if (!nossoNumero) {
        return NextResponse.json({ error: 'nossoNumero is required' }, { status: 400 })
    }

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Optional: verify if the boleto belongs to the user's clinic for security
        // For now, relying on authenticated user access

        const pdfBase64 = await bancoInterService.getBoletoPdf(nossoNumero)

        if (!pdfBase64) {
            return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
        }

        // Convert base64 to buffer
        const pdfBuffer = Buffer.from(pdfBase64, 'base64')

        // Return PDF file
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="boleto-${nossoNumero}.pdf"`,
            },
        })
    } catch (error: any) {
        console.error('Error fetching PDF:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to fetch PDF' },
            { status: 500 }
        )
    }
}
