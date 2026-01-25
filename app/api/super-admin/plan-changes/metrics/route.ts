/**
 * API: Plan Changes Metrics (Super Admin)
 * GET /api/super-admin/plan-changes/metrics
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new ForbiddenError('Not authenticated')
        }

        // Verificar se é super admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Super admin only')
        }

        // Calcular métricas
        const { count: totalUpgrades } = await supabaseAdmin
            .from('clinic_plan_history')
            .select('*', { count: 'exact', head: true })
            .eq('change_type', 'UPGRADE')

        const { count: totalDowngrades } = await supabaseAdmin
            .from('clinic_plan_history')
            .select('*', { count: 'exact', head: true })
            .eq('change_type', 'DOWNGRADE')

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { count: last30Days } = await supabaseAdmin
            .from('clinic_plan_history')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', thirtyDaysAgo.toISOString())

        // Calcular MRR increase
        const { data: changes } = await supabaseAdmin
            .from('clinic_plan_history')
            .select('billing_impact')
            .eq('change_type', 'UPGRADE')
            .gte('created_at', thirtyDaysAgo.toISOString())

        const mrrIncrease = changes?.reduce((sum, change) => sum + (change.billing_impact || 0), 0) || 0

        return successResponse({
            total_upgrades: totalUpgrades || 0,
            total_downgrades: totalDowngrades || 0,
            last_30_days: last30Days || 0,
            mrr_increase: mrrIncrease,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
