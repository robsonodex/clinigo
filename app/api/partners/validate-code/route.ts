/**
 * Referral Code Validation API
 * POST /api/partners/validate-code - Validate a referral code
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateReferralCode } from '@/lib/services/partner.service'
import { referralCodeSchema } from '@/lib/validations/partner.schema'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate input
        const validated = referralCodeSchema.safeParse(body)

        if (!validated.success) {
            return NextResponse.json(
                { valid: false, error: 'Código inválido' },
                { status: 400 }
            )
        }

        // Validate referral code
        const result = await validateReferralCode(validated.data.code)

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('[API:partners/validate-code] Error:', error)

        return NextResponse.json(
            { valid: false, error: 'Erro ao validar código' },
            { status: 500 }
        )
    }
}
