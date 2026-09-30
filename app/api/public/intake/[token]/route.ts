/**
 * Public Intake API — GET/POST /api/public/intake/[token]
 * 
 * GET: Validates token, returns clinic info and pre-filled phone
 * POST: Receives the intake form submission
 * 
 * No authentication required (public route, bypassed by middleware via /api/public prefix)
 * Rate limited by IP via Upstash
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateIntakeToken, submitIntakeForm } from '@/lib/services/patient-intake'
import { IntakeFormSchema, INTAKE_CONSENT_TEXT, INTAKE_CONSENT_VERSION } from '@/lib/validations/patient-intake'
import { checkRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

interface Props {
    params: Promise<{ token: string }>
}

function getClientIP(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.ip ||
        '0.0.0.0'
    )
}

/**
 * GET /api/public/intake/[token]
 * Validates the token and returns minimal clinic data + pre-filled phone
 */
export async function GET(request: NextRequest, { params }: Props) {
    try {
        const { token } = await params

        if (!token || token.length < 32) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
        }

        // Rate limit: non-blocking check on GET to guarantee instant loading for patients
        const ip = getClientIP(request)
        checkRateLimit('api', `intake-get:${ip}`).catch(() => {})

        const result = await validateIntakeToken(token)

        if (!result.valid) {
            return NextResponse.json(
                { error: result.error || 'Link inválido' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            clinic: result.clinic,
            lead_phone: result.link?.lead_phone || null,
            is_static: result.link?.is_static || false,
            correction: result.link?.correction || null,
            consent_text: INTAKE_CONSENT_TEXT,
            consent_version: INTAKE_CONSENT_VERSION,
        })
    } catch (error: any) {
        console.error('[Public Intake GET] Error:', error.message)
        return NextResponse.json(
            { error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/public/intake/[token]
 * Receives the filled intake form
 */
export async function POST(request: NextRequest, { params }: Props) {
    try {
        const { token } = await params

        if (!token || token.length < 32) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
        }

        // Rate limit: 5 submissions per minute per IP (stricter)
        const ip = getClientIP(request)
        const rateLimitResult = await checkRateLimit('auth', `intake-post:${ip}`)
        if (!rateLimitResult.success) {
            return NextResponse.json(
                { error: 'Muitas tentativas. Aguarde um momento.' },
                { status: 429 }
            )
        }

        const body = await request.json()

        // Honeypot check
        if (body._hp_field && body._hp_field.length > 0) {
            // Silent rejection for bots
            return NextResponse.json({ success: true })
        }

        // Validate form data with Zod
        const parsed = IntakeFormSchema.safeParse(body)
        if (!parsed.success) {
            const errors = parsed.error.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            }))
            return NextResponse.json(
                { error: 'Dados inválidos', details: errors },
                { status: 400 }
            )
        }

        const userAgent = request.headers.get('user-agent') || 'unknown'

        const result = await submitIntakeForm(token, parsed.data, ip, userAgent)

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Ficha enviada com sucesso. A clínica irá revisar seus dados.',
        })
    } catch (error: any) {
        console.error('[Public Intake POST] Error:', error.message)
        return NextResponse.json(
            { error: 'Erro interno. Tente novamente.' },
            { status: 500 }
        )
    }
}
