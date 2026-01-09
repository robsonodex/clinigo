import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'

// Use service_role to bypass RLS for global metrics
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function GET() {
    try {
        // Verify caller is SUPER_ADMIN
        const supabase = await createSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const role = user.user_metadata?.role
        if (role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden: SUPER_ADMIN only' }, { status: 403 })
        }

        // Use admin client for global queries (bypasses RLS)
        const adminClient = getAdminClient()

        // 1. Total Revenue (all clinics)
        const { data: payments } = await adminClient
            .from('payments')
            .select('amount, clinic_id, status')
            .eq('status', 'PAID')

        const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

        // 2. Clinic Stats
        const { data: clinics, count: totalClinics } = await adminClient
            .from('clinics')
            .select('id, name, plan_type, is_active, created_at', { count: 'exact' })

        const activeClinics = clinics?.filter(c => c.is_active).length || 0
        const inactiveClinics = clinics?.filter(c => !c.is_active).length || 0

        // Churn calculation (inactive / total)
        const churnRate = totalClinics && totalClinics > 0
            ? ((inactiveClinics / totalClinics) * 100).toFixed(2)
            : '0'

        // Plan distribution
        const planDistribution = {
            BASIC: clinics?.filter(c => c.plan_type === 'BASIC').length || 0,
            PRO: clinics?.filter(c => c.plan_type === 'PRO').length || 0,
            ENTERPRISE: clinics?.filter(c => c.plan_type === 'ENTERPRISE').length || 0,
        }

        // 3. AiA Token Usage (from ai_analyses table)
        const { data: aiAnalyses } = await adminClient
            .from('ai_analyses')
            .select('clinic_id, tokens_used, created_at')

        const totalTokens = aiAnalyses?.reduce((sum, a) => sum + (a.tokens_used || 0), 0) || 0

        // Token usage by tenant
        const tokensByTenant: Record<string, number> = {}
        aiAnalyses?.forEach(a => {
            const clinicId = a.clinic_id
            tokensByTenant[clinicId] = (tokensByTenant[clinicId] || 0) + (a.tokens_used || 0)
        })

        // Top 10 clinics by revenue
        const revenueByClinic: Record<string, number> = {}
        payments?.forEach(p => {
            const clinicId = p.clinic_id
            revenueByClinic[clinicId] = (revenueByClinic[clinicId] || 0) + (p.amount || 0)
        })

        const topClinics = Object.entries(revenueByClinic)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([clinicId, revenue]) => {
                const clinic = clinics?.find(c => c.id === clinicId)
                return {
                    id: clinicId,
                    name: clinic?.name || 'Unknown',
                    plan: clinic?.plan_type || 'BASIC',
                    revenue,
                    tokens: tokensByTenant[clinicId] || 0,
                }
            })

        // 4. Recent Activity
        const { data: recentAppointments } = await adminClient
            .from('appointments')
            .select('id, created_at, status')
            .order('created_at', { ascending: false })
            .limit(100)

        const appointmentsToday = recentAppointments?.filter(a => {
            const created = new Date(a.created_at)
            const today = new Date()
            return created.toDateString() === today.toDateString()
        }).length || 0

        return NextResponse.json({
            success: true,
            data: {
                revenue: {
                    total: totalRevenue,
                    formatted: `R$ ${(totalRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                },
                clinics: {
                    total: totalClinics || 0,
                    active: activeClinics,
                    inactive: inactiveClinics,
                    churnRate: `${churnRate}%`,
                },
                plans: planDistribution,
                ai: {
                    totalTokens,
                    tokensByTenant: Object.entries(tokensByTenant)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 10)
                        .map(([clinicId, tokens]) => ({
                            clinicId,
                            clinicName: clinics?.find(c => c.id === clinicId)?.name || 'Unknown',
                            tokens,
                        })),
                },
                topClinics,
                activity: {
                    appointmentsToday,
                },
                generatedAt: new Date().toISOString(),
            },
        })
    } catch (error) {
        console.error('Super Admin metrics error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch metrics' },
            { status: 500 }
        )
    }
}
