import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runPredictiveDiagnosis } from '@/lib/ai/brain-engine'
import { z } from 'zod'

const requestSchema = z.object({
    consultationId: z.string().uuid(),
    currentSymptoms: z.string().min(10, 'Descreva os sintomas com mais detalhes'),
    additionalContext: z.string().optional(),
})

// Feature availability by plan
const PLAN_ACCESS = {
    BASIC: false,
    PRO: 'addon', // Requires addon purchase
    ENTERPRISE: true,
}

// Monthly limits per plan
const MONTHLY_LIMITS = {
    BASIC: 0,
    PRO: 100, // With addon
    ENTERPRISE: Infinity,
}

export async function POST(request: NextRequest) {
    try {
        // Get user info from middleware headers
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId || !userRole) {
            return NextResponse.json(
                { error: 'Não autorizado', code: 'UNAUTHORIZED' },
                { status: 401 }
            )
        }

        // Only doctors and clinic admins can use AI diagnosis
        if (!['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return NextResponse.json(
                { error: 'Recurso disponível apenas para médicos', code: 'FORBIDDEN' },
                { status: 403 }
            )
        }

        // Validate request body
        const body = await request.json()
        const data = requestSchema.parse(body)

        const supabase = await createClient()

        // Get clinic plan
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id, plan_type, name')
            .eq('id', clinicId)
            .single()

        const planType = (clinic as any)?.plan_type || 'BASIC'
        const access = PLAN_ACCESS[planType as keyof typeof PLAN_ACCESS]

        // Check plan access
        if (access === false) {
            return NextResponse.json({
                error: 'Recurso indisponível no seu plano',
                code: 'PLAN_UPGRADE_REQUIRED',
                upgradeRequired: true,
                currentPlan: planType,
                requiredPlan: 'ENTERPRISE',
                feature: 'ai_diagnosis',
                preview: {
                    message: 'IA Preditiva de Diagnóstico',
                    description: 'Obtenha sugestões de diagnóstico baseadas em IA para suporte à decisão clínica.',
                    benefits: [
                        '3 hipóteses diagnósticas rankeadas',
                        'Análise baseada em evidências',
                        'Sugestões de conduta',
                        'Red flags automáticos',
                    ],
                }
            }, { status: 402 }) // Payment Required
        }

        // Check addon for PRO plans
        if (access === 'addon') {
            const { data: addon } = await supabase
                .from('clinic_addons')
                .select('id, is_active')
                .eq('clinic_id', clinicId)
                .eq('addon_type', 'AI_DIAGNOSIS')
                .eq('is_active', true)
                .single()

            if (!addon) {
                return NextResponse.json({
                    error: 'Addon não ativado',
                    code: 'ADDON_REQUIRED',
                    upgradeRequired: true,
                    addonName: 'IA Preditiva de Diagnóstico',
                    addonPrice: 200,
                    currentPlan: planType,
                }, { status: 402 })
            }
        }

        // Check monthly limit
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
            .from('consultation_ai_analyses')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('analysis_type', 'diagnosis_suggestions')
            .gte('created_at', startOfMonth.toISOString())

        const limit = MONTHLY_LIMITS[planType as keyof typeof MONTHLY_LIMITS] || 0
        if ((count || 0) >= limit && limit !== Infinity) {
            return NextResponse.json({
                error: 'Limite mensal atingido',
                code: 'LIMIT_EXCEEDED',
                used: count,
                limit,
                resetsAt: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1).toISOString(),
            }, { status: 429 })
        }

        // Verify consultation belongs to this clinic
        const { data: consultation } = await supabase
            .from('consultations')
            .select('id, doctor_id')
            .eq('id', data.consultationId)
            .eq('clinic_id', clinicId)
            .single()

        if (!consultation) {
            return NextResponse.json(
                { error: 'Consulta não encontrada', code: 'NOT_FOUND' },
                { status: 404 }
            )
        }

        // Run AI diagnosis
        const result = await runPredictiveDiagnosis({
            consultationId: data.consultationId,
            doctorId: (consultation as any).doctor_id,
            clinicId: clinicId!,
            currentSymptoms: data.currentSymptoms,
            additionalContext: data.additionalContext,
        })

        return NextResponse.json({
            success: true,
            ...result,
            usage: {
                used: (count || 0) + 1,
                limit: limit === Infinity ? 'Ilimitado' : limit,
                remaining: limit === Infinity ? 'Ilimitado' : limit - (count || 0) - 1,
            }
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message, code: 'VALIDATION_ERROR' },
                { status: 400 }
            )
        }

        console.error('[AI Predict Diagnosis] Error:', error)
        return NextResponse.json(
            { error: 'Erro ao processar análise', code: 'INTERNAL_ERROR' },
            { status: 500 }
        )
    }
}

