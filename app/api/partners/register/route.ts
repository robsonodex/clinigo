/**
 * Partner Registration API
 * POST /api/partners/register - Register a new partner/affiliate
 */

import { NextRequest, NextResponse } from 'next/server'
import { registerPartner } from '@/lib/services/partner.service'
import { partnerRegistrationSchema } from '@/lib/validations/partner.schema'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate input
        const validated = partnerRegistrationSchema.safeParse(body)

        if (!validated.success) {
            console.log('[API:partners/register] Validation errors:', JSON.stringify(validated.error.errors, null, 2))
            console.log('[API:partners/register] Body received:', JSON.stringify(body, null, 2))
            return NextResponse.json(
                {
                    error: 'Dados inválidos',
                    details: validated.error.errors.map(e => ({
                        field: e.path.join('.'),
                        message: e.message
                    }))
                },
                { status: 400 }
            )
        }

        // Register partner
        const result = await registerPartner(validated.data)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Erro ao registrar parceiro' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                partner_id: result.partner_id,
                referral_code: result.referral_code
            },
            { status: 201 }
        )
    } catch (error: any) {
        console.error('[API:partners/register] Error:', error)

        return NextResponse.json(
            { error: 'Erro interno ao processar cadastro' },
            { status: 500 }
        )
    }
}
