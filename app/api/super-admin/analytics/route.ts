import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isMasterAdmin } from '@/lib/super-admin-middleware'

// Lazy init to avoid build-time crash when env vars are not available
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    // Verify Super Admin
    const isAuthorized = await isMasterAdmin(request)
    if (!isAuthorized) {
        return new NextResponse('Not Found', { status: 404 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const parsedMonths = parseInt(searchParams.get('months') || '6', 10)
        const months = Number.isFinite(parsedMonths) ? Math.min(Math.max(parsedMonths, 1), 24) : 6

        const supabaseAdmin = getSupabaseAdmin()
        const now = new Date()
        const monthWindows = Array.from({ length: months }, (_, idx) => {
            const offset = months - 1 - idx
            const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
            const monthKey = date.toISOString().slice(0, 7)
            const monthStart = `${monthKey}-01`
            const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
            const monthEnd = nextMonth.toISOString().slice(0, 10)
            return { date, monthKey, monthStart, monthEnd }
        })

        const rangeStart = monthWindows[0].monthStart
        const rangeEnd = monthWindows[monthWindows.length - 1].monthEnd

        // Buscar clínicas e análises de IA da janela em apenas 2 queries agregadas + contagens mensais em paralelo
        const [clinicsRes, aiRes, ...consultationCounts] = await Promise.all([
            supabaseAdmin
                .from('clinics')
                .select('id, name, plan_type, custom_price, is_demo, is_active, created_at'),
            supabaseAdmin
                .from('consultation_ai_analyses')
                .select('tokens_used, created_at')
                .gte('created_at', rangeStart)
                .lt('created_at', rangeEnd),
            ...monthWindows.map((w) =>
                supabaseAdmin
                    .from('consultations')
                    .select('id', { count: 'estimated', head: true })
                    .gte('date', w.monthStart)
                    .lt('date', w.monthEnd)
            ),
        ])

        const allClinics = clinicsRes.data || []
        const allAiAnalyses = aiRes.data || []
        const planPrices: Record<string, number> = { BASIC: 199, BASICO: 299, PROFESSIONAL: 449, PRO: 399, ENTERPRISE: 799 }

        const monthlyData = monthWindows.map((w, idx) => {
            let activeClinicCount = 0
            let newClinicCount = 0
            let mrr = 0

            for (const c of allClinics) {
                const createdStr = c.created_at ? String(c.created_at) : ''
                if (createdStr >= w.monthStart && createdStr < w.monthEnd) {
                    newClinicCount++
                }
                if (c.is_active === true && createdStr <= w.monthEnd) {
                    activeClinicCount++
                    const isDemo =
                        c.is_demo === true ||
                        c.id === 'de000000-0000-0000-0000-000000000001' ||
                        (c.name && c.name.toLowerCase().includes('demo'))
                    if (!isDemo) {
                        const price =
                            c.custom_price !== null && c.custom_price !== undefined
                                ? Number(c.custom_price)
                                : (planPrices[c.plan_type] || 0)
                        mrr += price
                    }
                }
            }

            let aiTokens = 0
            for (const a of allAiAnalyses) {
                const createdStr = a.created_at ? String(a.created_at) : ''
                if (createdStr >= w.monthStart && createdStr < w.monthEnd) {
                    aiTokens += a.tokens_used || 0
                }
            }

            const aiCost = aiTokens * 0.000002 * 5.5 // USD to BRL
            const consultationCount = consultationCounts[idx]?.count || 0

            return {
                month: w.monthKey,
                monthLabel: w.date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
                activeClinics: activeClinicCount,
                newClinics: newClinicCount,
                consultations: consultationCount,
                mrr,
                aiTokens,
                aiCost,
            }
        })

        // Calculate growth rates
        const latestMRR = monthlyData[monthlyData.length - 1]?.mrr || 0
        const previousMRR = monthlyData[monthlyData.length - 2]?.mrr || 0
        const mrrGrowth = previousMRR > 0 ? ((latestMRR - previousMRR) / previousMRR) * 100 : 0

        // Plan distribution (reutiliza allClinics sem query extra)
        const planDistribution = allClinics.filter((c) => c.is_active === true)

        const distribution = { BASIC: 0, PRO: 0, ENTERPRISE: 0 }
        planDistribution?.forEach(c => {
            if (c.plan_type in distribution) {
                distribution[c.plan_type as keyof typeof distribution]++
            }
        })

        // Log analytics access
        await getSupabaseAdmin().from('system_logs').insert({
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
        request.log.error('super-admin/analytics', { error: error instanceof Error ? error.message : String(error) })
        console.error('[Analytics] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
})

