/**
 * Dashboard Stats API with Caching
 * 
 * Returns optimized dashboard statistics using materialized view
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cached, CacheKeys, CacheTTL } from '@/lib/cache/cache-service'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user's clinic
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const headerClinicId = req.headers.get('x-clinic-id')
        const clinicId = headerClinicId || profile.clinic_id

        // Use cached stats
        const stats = await cached(
            CacheKeys.dashboardStats(clinicId),
            async () => {
                // Try materialized view first
                const { data: mvStats } = await supabase
                    .from('dashboard_stats')
                    .select('*')
                    .eq('clinic_id', clinicId)
                    .single()

                if (mvStats) {
                    return mvStats
                }

                // Fallback to direct query if view doesn't exist
                const now = new Date()
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                const today = now.toISOString().split('T')[0]

                const [
                    { count: upcomingCount },
                    { count: todayTotal },
                    { count: completedToday },
                    { data: revenueData },
                    { count: newPatients }
                ] = await Promise.all([
                    // Upcoming appointments
                    supabase
                        .from('appointments')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinic_id', clinicId)
                        .eq('status', 'SCHEDULED')
                        .gt('scheduled_at', now.toISOString()),

                    // Today's total
                    supabase
                        .from('appointments')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinic_id', clinicId)
                        .gte('scheduled_at', `${today}T00:00:00`)
                        .lt('scheduled_at', `${today}T23:59:59`),

                    // Completed today
                    supabase
                        .from('appointments')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinic_id', clinicId)
                        .eq('status', 'COMPLETED')
                        .gte('scheduled_at', `${today}T00:00:00`)
                        .lt('scheduled_at', `${today}T23:59:59`),

                    // Monthly revenue
                    supabase
                        .from('appointments')
                        .select('payment_amount')
                        .eq('clinic_id', clinicId)
                        .eq('payment_status', 'PAID')
                        .gte('scheduled_at', startOfMonth.toISOString()),

                    // New patients this month
                    supabase
                        .from('patients')
                        .select('*', { count: 'exact', head: true })
                        .eq('clinic_id', clinicId)
                        .gte('created_at', startOfMonth.toISOString())
                ])

                const monthlyRevenue = revenueData?.reduce(
                    (sum: number, a: any) => sum + (a.payment_amount || 0),
                    0
                ) || 0

                return {
                    clinic_id: clinicId,
                    upcoming_count: upcomingCount || 0,
                    today_total: todayTotal || 0,
                    today_completed: completedToday || 0,
                    monthly_revenue: monthlyRevenue,
                    new_patients_month: newPatients || 0,
                    overdue_count: 0,
                    teleconsultas_month: 0
                }
            },
            { ttl: CacheTTL.dashboardStats }
        )

        return NextResponse.json({
            success: true,
            data: stats
        })

    } catch (error: any) {
        console.error('Dashboard stats error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
