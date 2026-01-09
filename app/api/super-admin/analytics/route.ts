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
        const months = parseInt(searchParams.get('months') || '6')

        // Get monthly data for the last N months
        const monthlyData = []
        const now = new Date()

        for (let i = months - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthKey = date.toISOString().slice(0, 7) // "2026-01"
            const monthStart = `${monthKey}-01`
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
            const monthEnd = nextMonth.toISOString().slice(0, 10)

            // Get active clinics at end of month
            const { count: activeClinicCount } = await supabaseAdmin
                .from('clinics')
                .select('*', { count: 'exact', head: true })
                .eq('is_active', true)
                .lte('created_at', monthEnd)

            // Get new clinics this month
            const { count: newClinicCount } = await supabaseAdmin
                .from('clinics')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', monthStart)
                .lt('created_at', monthEnd)

            // Get consultations this month
            const { count: consultationCount } = await supabaseAdmin
                .from('consultations')
                .select('*', { count: 'exact', head: true })
                .gte('date', monthStart)
                .lt('date', monthEnd)

            // Calculate MRR (simplified - based on active clinics)
            const { data: clinicsWithPlans } = await supabaseAdmin
                .from('clinics')
                .select('plan_type')
                .eq('is_active', true)
                .lte('created_at', monthEnd)

            const planPrices = { BASIC: 97, PRO: 297, ENTERPRISE: 997 }
            const mrr = clinicsWithPlans?.reduce((sum, c) => {
                return sum + (planPrices[c.plan_type as keyof typeof planPrices] || 0)
            }, 0) || 0

            // Get AI tokens
            const { data: aiData } = await supabaseAdmin
                .from('consultation_ai_analyses')
                .select('tokens_used')
                .gte('created_at', monthStart)
                .lt('created_at', monthEnd)

            const aiTokens = aiData?.reduce((sum, a) => sum + (a.tokens_used || 0), 0) || 0
            const aiCost = aiTokens * 0.000002 * 5.5 // USD to BRL

            monthlyData.push({
                month: monthKey,
                monthLabel: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                activeClinics: activeClinicCount || 0,
                newClinics: newClinicCount || 0,
                consultations: consultationCount || 0,
                mrr,
                aiTokens,
                aiCost,
            })
        }

        // Calculate growth rates
        const latestMRR = monthlyData[monthlyData.length - 1]?.mrr || 0
        const previousMRR = monthlyData[monthlyData.length - 2]?.mrr || 0
        const mrrGrowth = previousMRR > 0 ? ((latestMRR - previousMRR) / previousMRR) * 100 : 0

        // Plan distribution
        const { data: planDistribution } = await supabaseAdmin
            .from('clinics')
            .select('plan_type')
            .eq('is_active', true)

        const distribution = { BASIC: 0, PRO: 0, ENTERPRISE: 0 }
        planDistribution?.forEach(c => {
            if (c.plan_type in distribution) {
                distribution[c.plan_type as keyof typeof distribution]++
            }
        })

        // Log analytics access
        await supabaseAdmin.from('system_logs').insert({
            admin_email: 'robsonfenriz@gmail.com',
            action_type: 'VIEW',
            action_category: 'ANALYTICS',
            action_description: 'Viewed business analytics',
        })

        return NextResponse.json({
            monthly: monthlyData,
            summary: {
                currentMRR: latestMRR,
                mrrGrowth: mrrGrowth.toFixed(1),
                totalConsultations: monthlyData.reduce((sum, m) => sum + m.consultations, 0),
                totalAiCost: monthlyData.reduce((sum, m) => sum + m.aiCost, 0),
            },
            planDistribution: distribution,
        })

    } catch (error) {
        console.error('[Analytics] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

