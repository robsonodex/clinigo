/**
 * AiA Triage API Route
 * CliniGo - Sistema de Triagem Médica
 * 
 * POST /api/aia/triage
 * - Create new triage session or continue existing one
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTriageService } from '@/lib/aia/triage-service'
import { TriageRequest } from '@/lib/aia/triage-types'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Rate limiting: simple in-memory store (replace with Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 100 // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const record = rateLimitStore.get(ip)

    if (!record || now > record.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
        return true
    }

    if (record.count >= RATE_LIMIT) {
        return false
    }

    record.count++
    return true
}

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown'

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                { status: 429 }
            )
        }

        // Parse request body
        const body = await request.json()
        const triageRequest: TriageRequest = {
            session_id: body.session_id,
            message: body.message,
            demographics: body.demographics,
            clinic_id: body.clinic_id,
            patient_id: body.patient_id,
        }

        // Validate required fields
        if (!triageRequest.message && !triageRequest.session_id) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            )
        }

        // Get authenticated user's clinic if not provided
        if (!triageRequest.clinic_id) {
            try {
                const supabase = await createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (user) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('clinic_id')
                        .eq('id', user.id)
                        .single()

                    const clinicId = (profile as { clinic_id?: string } | null)?.clinic_id
                    if (clinicId) {
                        triageRequest.clinic_id = clinicId
                    }
                }
            } catch {
                // Continue without clinic_id (will use STARTER plan defaults)
            }
        }

        // Process triage message
        const triageService = getTriageService()
        const response = await triageService.processMessage(triageRequest)

        return NextResponse.json(response)

    } catch (error) {
        console.error('Triage API error:', error)

        const errorMessage = error instanceof Error ? error.message : 'Internal server error'

        return NextResponse.json(
            {
                error: errorMessage,
                session_id: null,
                message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.',
                is_emergency: false,
            },
            { status: 500 }
        )
    }
}

// GET - Get session details
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const sessionId = searchParams.get('session_id')

        if (!sessionId) {
            return NextResponse.json(
                { error: 'session_id is required' },
                { status: 400 }
            )
        }

        const triageService = getTriageService()
        const session = await triageService.getSession(sessionId)

        if (!session) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 }
            )
        }

        const messages = await triageService.getConversationHistory(sessionId)

        return NextResponse.json({
            session,
            messages,
        })

    } catch (error) {
        console.error('Triage GET error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
