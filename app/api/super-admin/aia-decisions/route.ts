import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMasterAdmin } from '@/lib/super-admin-middleware'

// Use service role for full access
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
    // Verify Super Admin
    const isAuthorized = await isMasterAdmin(request)
    if (!isAuthorized) {
        return new NextResponse('Not Found', { status: 404 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')

        // Get AiA decisions from consultation_ai_analyses
        const { data: analyses, error } = await supabaseAdmin
            .from('consultation_ai_analyses')
            .select(`
                id,
                consultation_id,
                clinic_id,
                doctor_id,
                result,
                model_used,
                tokens_used,
                created_at,
                clinic:clinics(name),
                doctor:doctors(user:users(full_name))
            `)
            .eq('analysis_type', 'diagnosis_suggestions')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (error) {
            console.error('Error fetching AiA decisions:', error)
            throw error
        }

        // Format decisions
        const decisions = (analyses || []).map(a => {
            const result = a.result as any || {}
            const hypotheses = result.hypotheses || []
            const topHypothesis = hypotheses[0] || {}

            return {
                id: a.id,
                consultationId: a.consultation_id,
                clinicName: (a.clinic as any)?.name || 'Clínica',
                doctorName: (a.doctor as any)?.user?.full_name || 'Médico',
                patientAge: result.patient_age || 0,
                patientGender: result.patient_gender || 'N/I',
                mainSymptom: result.main_symptom || 'N/I',
                topHypothesis: topHypothesis.condition || 'Análise inconclusiva',
                confidence: topHypothesis.confidence || 0,
                hadRedFlags: (result.redFlags || []).length > 0,
                requiresReview: topHypothesis.requires_human_review || false,
                tokensUsed: a.tokens_used || 0,
                modelUsed: a.model_used || 'unknown',
                createdAt: a.created_at,
            }
        })

        // Log this access
        await supabaseAdmin.from('system_logs').insert({
            admin_email: 'robsonfenriz@gmail.com',
            action_type: 'VIEW',
            action_category: 'AI',
            action_description: 'Viewed AiA Decision History',
        })

        return NextResponse.json({
            decisions,
            total: decisions.length,
        })

    } catch (error) {
        console.error('[AiA Decisions API] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

