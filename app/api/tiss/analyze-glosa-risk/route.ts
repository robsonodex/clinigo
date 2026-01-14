/**
 * POST /api/tiss/analyze-glosa-risk
 * AI-powered glosa risk analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { analyzeGlosaRisk, autoFixGuide } from '@/lib/services/tiss/glosa-predictor'
import { log } from '@/lib/logger'

const analyzeSchema = z.object({
    guide: z.object({
        tipo: z.string().optional(),
        numeroGuiaPrestador: z.string(),
        codigoProcedimento: z.string(),
        valorProcedimento: z.string().or(z.number()),
        codigoCID: z.string().optional(),
        numeroCarteira: z.string().optional(),
        dataAtendimento: z.string().optional(),
        numeroConselhoExecutante: z.string().optional(),
    }),
    operator_name: z.string().default('UNIMED'),
    auto_fix: z.boolean().default(false),
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth + role check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        // Parse request
        const body = await request.json()
        const validated = analyzeSchema.parse(body)

        // Analyze glosa risk
        const risk = await analyzeGlosaRisk(validated.guide, validated.operator_name)

        // Auto-fix if requested
        let fixedGuide = null
        let appliedFixes = []

        if (validated.auto_fix && risk.can_auto_fix) {
            const result = autoFixGuide(validated.guide)
            fixedGuide = result.fixed
            appliedFixes = result.changes
        }

        // Log high-risk guides for analytics
        if (risk.risk_level === 'high' || risk.risk_level === 'critical') {
            log.warn('[TISS Glosa] High risk detected', {
                clinic_id: profile.clinic_id,
                operator: validated.operator_name,
                risk_level: risk.risk_level,
                probability: risk.probability,
                estimated_loss: risk.estimated_loss
            })
        }

        return NextResponse.json({
            risk,
            fixed_guide: fixedGuide,
            applied_fixes: appliedFixes,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            )
        }

        log.error('[TISS Glosa Analysis] Error:', error)
        return NextResponse.json(
            { error: 'Erro ao analisar risco de glosa' },
            { status: 500 }
        )
    }
}
