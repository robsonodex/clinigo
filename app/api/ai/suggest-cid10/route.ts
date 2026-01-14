/**
 * POST /api/ai/suggest-cid10
 * NLP-powered CID-10 suggestions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { suggestCID10, isValidCID10, searchCID10 } from '@/lib/ai/cid10-suggester'
import { log } from '@/lib/logger'

const suggestSchema = z.object({
    symptoms: z.string().min(3),
    diagnosis: z.string().optional(),
    record_id: z.string().uuid().optional(),
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Validate request
        const body = await request.json()
        const validated = suggestSchema.parse(body)

        // Get suggestions
        const suggestions = await suggestCID10(validated.symptoms, validated.diagnosis)

        // Log usage for analytics
        log.info('[CID-10 AI] Suggestions generated', {
            user_id: user.id,
            record_id: validated.record_id,
            suggestions_count: suggestions.length,
            top_confidence: suggestions[0]?.confidence
        })

        return NextResponse.json({
            suggestions,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            )
        }

        log.error('[CID-10 AI] Error:', error)
        return NextResponse.json(
            { error: 'Erro ao gerar sugestões' },
            { status: 500 }
        )
    }
}

// GET /api/ai/suggest-cid10?q=query
// Search CID-10 codes
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const query = request.nextUrl.searchParams.get('q')
        if (!query || query.length < 2) {
            return NextResponse.json({ results: [] })
        }

        const results = searchCID10(query)

        return NextResponse.json({ results })

    } catch (error) {
        log.error('[CID-10 Search] Error:', error)
        return NextResponse.json({ error: 'Erro na busca' }, { status: 500 })
    }
}
