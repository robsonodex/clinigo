// @ts-nocheck
/**
 * API: Super Admin Dashboard
 * GET /api/super-admin/dashboard
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const PLAN_PRICES: Record<string, number> = {
    FREE: 0,
    STARTER: 149,
    BASIC: 199,
    BASICO: 299,
    PROFESSIONAL: 449,
    PRO: 399,
    AVANCADO: 549,
    ENTERPRISE: 799,
    NETWORK: 999,
}

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
            .select('role, email')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Super admin only')
        }

        // Get all clinics
        const { data: clinics } = await supabaseAdmin
            .from('clinics')
            .select('id, name, plan_type, is_active, is_demo, created_at, approval_status, trial_ends_at, subscription_due_date, custom_price')
            .order('created_at', { ascending: false })

        const isDemoClinic = (c: any) => c.is_demo === true || c.id === 'de000000-0000-0000-0000-000000000001' || (c.name && c.name.toLowerCase().includes('demo'))

        // Count metrics (excluding demo from active count if desired, or keeping totalClinics)
        const totalClinics = clinics?.length || 0
        const activeClinics = clinics?.filter(c => c.is_active && !isDemoClinic(c)).length || 0

        // MRR calculation - Demo clinics are ALWAYS zeroed out (R$ 0). Only real clinics (Espaço Incluir, WorldSensory, etc.) count.
        const mrr = clinics?.reduce((sum, c) => {
            if (!c.is_active || isDemoClinic(c)) return sum
            const price = c.custom_price !== null && c.custom_price !== undefined ? Number(c.custom_price) : (PLAN_PRICES[c.plan_type] || 0)
            return sum + price
        }, 0) || 0

        // Clinics by plan (real clinics only for enterprise/starter counts)
        const clinicsByPlan = {
            STARTER: clinics?.filter(c => c.plan_type === 'STARTER' && !isDemoClinic(c)).length || 0,
            BASICO: clinics?.filter(c => c.plan_type === 'BASICO' && !isDemoClinic(c)).length || 0,
            AVANCADO: clinics?.filter(c => c.plan_type === 'AVANCADO' && !isDemoClinic(c)).length || 0,
            PROFESSIONAL: clinics?.filter(c => c.plan_type === 'PROFESSIONAL' && !isDemoClinic(c)).length || 0,
            ENTERPRISE: clinics?.filter(c => c.plan_type === 'ENTERPRISE' && !isDemoClinic(c)).length || 0,
        }

        // New clinics last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const newClinics = clinics?.filter(c =>
            !isDemoClinic(c) && new Date(c.created_at) > thirtyDaysAgo
        ).length || 0

        // Churn rate
        const inactiveClinics = clinics?.filter(c => !c.is_active && !isDemoClinic(c)).length || 0
        const realClinicsTotal = clinics?.filter(c => !isDemoClinic(c)).length || 0
        const churnRate = realClinicsTotal > 0 ? (inactiveClinics / realClinicsTotal) * 100 : 0

        // Total counts
        const { count: totalDoctors } = await supabaseAdmin
            .from('doctors')
            .select('*', { count: 'exact', head: true })

        const { count: totalPatients } = await supabaseAdmin
            .from('patients')
            .select('*', { count: 'exact', head: true })

        const { count: totalAppointments } = await supabaseAdmin
            .from('appointments')
            .select('*', { count: 'exact', head: true })

        // Recent activity logs (if table exists) - usar try/catch ao invés de .catch()
        let recentLogs: any[] = []
        try {
            const { data, error } = await supabaseAdmin
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10)

            if (!error && data) {
                recentLogs = data
            }
        } catch {
            // Table might not exist, ignore
        }

        // Log this access - usar try/catch ao invés de .catch()
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_email: userData.email,
                action_type: 'VIEW',
                action_category: 'SYSTEM',
                action_description: 'Accessed Super Admin Dashboard',
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                request_path: '/api/super-admin/dashboard',
            })
        } catch {
            // Table might not exist, ignore
        }

        // Clinic data for frontend
        const mockClinics = clinics?.map(c => {
            const isDemo = isDemoClinic(c)
            const price = isDemo ? 0 : (c.custom_price !== null && c.custom_price !== undefined ? Number(c.custom_price) : (PLAN_PRICES[c.plan_type] || 0))
            const renewalDate = c.subscription_due_date
                ? new Date(c.subscription_due_date + 'T00:00:00').toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            return {
                id: c.id,
                name: c.name,
                planType: isDemo ? 'DEMO' : c.plan_type,
                isActive: c.is_active,
                isDemo: isDemo,
                revenue: price,
                renewalDate,
                aiTokensUsed: 0,
                approvalStatus: c.approval_status || null,
                trialEndsAt: c.trial_ends_at || null,
                subscriptionDueDate: c.subscription_due_date || null,
            }
        }) || []

        // Map logs to match frontend camelCase expectations
        const mappedLogs = recentLogs?.map((log: any) => ({
            id: log.id,
            actionType: log.action_type || 'SYSTEM',
            actionDescription: log.action_description || 'Ação registrada',
            targetClinic: log.target_clinic || '-',
            createdAt: log.created_at || new Date().toISOString(),
        })) || []

        return successResponse({
            metrics: {
                totalClinics: totalClinics,
                activeClinics: activeClinics,
                inactiveClinics: inactiveClinics,
                churnRate: parseFloat(churnRate.toFixed(2)),
                mrr,
                arr: mrr * 12,
                totalRevenue: mrr * 12, // ARR
                totalConsultations: totalAppointments || 0,
                totalDoctors: totalDoctors || 0,
                totalPatients: totalPatients || 0,
                totalAppointments: totalAppointments || 0,
                newClinicsLast30Days: newClinics,
                aiTokensUsed: 0,
                aiCostBRL: 0,
            },
            clinicsByPlan: clinicsByPlan,
            recentLogs: mappedLogs,
            clinics: mockClinics,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
