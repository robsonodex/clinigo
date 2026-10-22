import { withAxiom, AxiomRequest } from 'next-axiom'
/**
 * Partner Registration API
 * POST /api/partners/register - Register a new partner/affiliate
 */

import { NextRequest, NextResponse } from 'next/server'
import { registerPartner } from '@/lib/services/partner.service'
import { partnerRegistrationSchema } from '@/lib/validations/partner.schema'

export const POST = withAxiom(async (request: AxiomRequest) => {
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
        request.log.error('partners/register', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API:partners/register] Error:', error)

        return NextResponse.json(
            { error: 'Erro interno ao processar cadastro' },
            { status: 500 }
        )
    }
})
