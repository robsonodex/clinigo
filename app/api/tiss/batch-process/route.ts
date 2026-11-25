import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'
/**
 * POST /api/tiss/batch-process
 * Batch processing for multiple TISS guides (LGPD shielded)
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { analyzeGlosaRisk, autoFixGuide } from '@/lib/services/tiss/glosa-predictor'
import { validateTISSGuide } from '@/lib/services/tiss/tiss-validator'
import { log } from '@/lib/logger'

const batchSchema = z.object({
    guides: z.array(
        z.object({
            id: z.string(),
            data: z.any(),
            operator_name: z.string().default('UNIMED'),
        })
    ),
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

export const POST = withAxiom(async (request: AxiomRequest) => {
    const guard = await requireTissAction(request, 'lote.criar')
    if (!guard.authorized) {
        return guard.response
    }
    try {
        const supabase = await createClient()

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()
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

        const body = await request.json()
        const validated = batchSchema.parse(body)

        log.info('[TISS Batch] Processing batch', {
            clinic_id: profile.clinic_id,
            guide_count: validated.guides.length,
            auto_fix: validated.auto_fix,
        })

        const results: BatchResult[] = []

        for (const guide of validated.guides) {
            try {
                let validation = null
                if (validated.include_validation) {
                    validation = validateTISSGuide(guide.data, guide.data.tipo || 'CONSULTA')
                }

                const riskAnalysis = await analyzeGlosaRisk(guide.data, guide.operator_name, {
                    clinicId: profile.clinic_id,
                    userId: user.id,
                })

                let autoFixApplied = false
                let fixes: string[] = []

                if (validated.auto_fix && riskAnalysis.can_auto_fix) {
                    const fixResult = autoFixGuide(guide.data)
                    if (fixResult.changes.length > 0) {
                        autoFixApplied = true
                        fixes = fixResult.changes

                        const newRisk = await analyzeGlosaRisk(fixResult.fixed, guide.operator_name, {
                            clinicId: profile.clinic_id,
                            userId: user.id,
                        })
                        results.push({
                            guide_id: guide.id,
                            status: 'success',
                            risk_analysis: newRisk,
                            validation,
                            auto_fix_applied: autoFixApplied,
                            fixes,
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
                    fixes,
                })
            } catch (error) {
                request.log.error('tiss/batch-process', { error: error instanceof Error ? error.message : String(error) })
                results.push({
                    guide_id: guide.id,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                })

                log.error('[TISS Batch] Guide processing error', {
                    guide_id: guide.id,
                    error,
                })
            }
        }

        const totalLossCents = results.reduce(
            (sum, r) => sum + Math.round((Number(r.risk_analysis?.estimated_loss) || 0) * 100),
            0
        )

        const summary = {
            total_guides: results.length,
            successful: results.filter((r) => r.status === 'success').length,
            failed: results.filter((r) => r.status === 'error').length,
            high_risk: results.filter(
                (r) =>
                    r.risk_analysis &&
                    (r.risk_analysis.risk_level === 'high' || r.risk_analysis.risk_level === 'critical')
            ).length,
            auto_fixed: results.filter((r) => r.auto_fix_applied).length,
            total_estimated_loss: totalLossCents / 100,
        }

        log.info('[TISS Batch] Batch completed', {
            clinic_id: profile.clinic_id,
            summary,
        })

        return NextResponse.json({
            results,
            summary,
            timestamp: new Date().toISOString(),
        })
    } catch (error) {
        request.log.error('tiss/batch-process', { error: error instanceof Error ? error.message : String(error) })
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
        }

        log.error('[TISS Batch] Error:', error)
        return NextResponse.json({ error: 'Erro no processamento em lote' }, { status: 500 })
    }
})
