/**
 * POST /api/tiss/batch-process
 * Batch processing for multiple TISS guides
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { analyzeGlosaRisk, autoFixGuide } from '@/lib/services/tiss/glosa-predictor'
import { parseTISSReturn } from '@/lib/services/tiss/tiss-xml-parser'
import { validateTISSGuide } from '@/lib/services/tiss/tiss-validator'
import { log } from '@/lib/logger'

const batchSchema = z.object({
    guides: z.array(z.object({
        id: z.string(),
        data: z.any(),
        operator_name: z.string().default('UNIMED'),
    })),
    auto_fix: z.boolean().default(false),
    include_validation: z.boolean().default(true),
})

interface BatchResult {
    guide_id: string
    status: 'success' | 'error'
    risk_analysis?: any
    validation?: any
    auto_fix_applied?: boolean
    fixes?: string[]
    error?: string
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        // Parse request
        const body = await request.json()
        const validated = batchSchema.parse(body)

        log.info('[TISS Batch] Processing batch', {
            clinic_id: profile.clinic_id,
            guide_count: validated.guides.length,
            auto_fix: validated.auto_fix
        })

        // Process each guide
        const results: BatchResult[] = []

        for (const guide of validated.guides) {
            try {
                // 1. Validate if requested
                let validation = null
                if (validated.include_validation) {
                    validation = validateTISSGuide(guide.data, guide.data.tipo || 'CONSULTA')
                }

                // 2. Analyze glosa risk
                const riskAnalysis = await analyzeGlosaRisk(guide.data, guide.operator_name)

                // 3. Auto-fix if requested and possible
                let autoFixApplied = false
                let fixes: string[] = []

                if (validated.auto_fix && riskAnalysis.can_auto_fix) {
                    const fixResult = autoFixGuide(guide.data)
                    if (fixResult.changes.length > 0) {
                        autoFixApplied = true
                        fixes = fixResult.changes

                        // Re-analyze after fixes
                        const newRisk = await analyzeGlosaRisk(fixResult.fixed, guide.operator_name)
                        results.push({
                            guide_id: guide.id,
                            status: 'success',
                            risk_analysis: newRisk,
                            validation,
                            auto_fix_applied: autoFixApplied,
                            fixes
                        })
                        continue
                    }
                }

                results.push({
                    guide_id: guide.id,
                    status: 'success',
                    risk_analysis: riskAnalysis,
                    validation,
                    auto_fix_applied: autoFixApplied,
                    fixes
                })

            } catch (error) {
                results.push({
                    guide_id: guide.id,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error'
                })

                log.error('[TISS Batch] Guide processing error', {
                    guide_id: guide.id,
                    error
                })
            }
        }

        // Calculate summary statistics
        const summary = {
            total_guides: results.length,
            successful: results.filter(r => r.status === 'success').length,
            failed: results.filter(r => r.status === 'error').length,
            high_risk: results.filter(r =>
                r.risk_analysis &&
                (r.risk_analysis.risk_level === 'high' || r.risk_analysis.risk_level === 'critical')
            ).length,
            auto_fixed: results.filter(r => r.auto_fix_applied).length,
            total_estimated_loss: results.reduce((sum, r) =>
                sum + (r.risk_analysis?.estimated_loss || 0), 0
            )
        }

        log.info('[TISS Batch] Batch completed', {
            clinic_id: profile.clinic_id,
            summary
        })

        return NextResponse.json({
            results,
            summary,
            timestamp: new Date().toISOString()
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            )
        }

        log.error('[TISS Batch] Error:', error)
        return NextResponse.json(
            { error: 'Erro no processamento em lote' },
            { status: 500 }
        )
    }
}
