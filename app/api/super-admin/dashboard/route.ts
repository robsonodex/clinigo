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
        // Get all clinics with billing data
        const { data: clinics, error: clinicsError } = await supabaseAdmin
            .from('clinics')
            .select(`
                id,
                name,
                plan_type,
                is_active,
                created_at
            `)
            .order('created_at', { ascending: false })

        if (clinicsError) throw clinicsError

        // Get consultation counts
        const { count: totalConsultations } = await supabaseAdmin
            .from('consultations')
            .select('*', { count: 'exact', head: true })

        // Get AI token usage
        const currentMonth = new Date().toISOString().slice(0, 7)
        const { data: aiUsage } = await supabaseAdmin
            .from('consultation_ai_analyses')
            .select('tokens_used, clinic_id')
            .gte('created_at', `${currentMonth}-01`)

        // Calculate AI costs
        const totalAiTokens = aiUsage?.reduce((sum, a) => sum + (a.tokens_used || 0), 0) || 0
        const aiCostUSD = totalAiTokens * 0.000002 // ~$2 per million tokens
        const aiCostBRL = aiCostUSD * 5.5 // USD to BRL

        // Calculate MRR (Monthly Recurring Revenue)
        const planPrices = { BASIC: 97, PRO: 297, ENTERPRISE: 997 }
        const mrr = clinics?.reduce((sum, c) => {
            if (!c.is_active) return sum
            return sum + (planPrices[c.plan_type as keyof typeof planPrices] || 0)
        }, 0) || 0

        // Calculate churn (simplified)
        const inactiveClinics = clinics?.filter(c => !c.is_active).length || 0
        const churnRate = clinics?.length ? (inactiveClinics / clinics.length) * 100 : 0

        // Get tokens per clinic
        const tokensByClinic: Record<string, number> = {}
        aiUsage?.forEach(a => {
            if (a.clinic_id) {
                tokensByClinic[a.clinic_id] = (tokensByClinic[a.clinic_id] || 0) + (a.tokens_used || 0)
            }
        })

        // Format clinics with extra data
        const formattedClinics = clinics?.map(c => ({
            id: c.id,
            name: c.name,
            planType: c.plan_type,
            isActive: c.is_active,
            revenue: planPrices[c.plan_type as keyof typeof planPrices] || 0,
            renewalDate: getNextRenewalDate(c.created_at),
            aiTokensUsed: tokensByClinic[c.id] || 0,
        })) || []

        // Get recent system logs
        const { data: recentLogs } = await supabaseAdmin
            .from('system_logs')
            .select('id, action_type, action_description, target_clinic_id, created_at')
            .order('created_at', { ascending: false })
            .limit(20)

        // Get clinic names for logs
        const clinicIds = [...new Set(recentLogs?.filter(l => l.target_clinic_id).map(l => l.target_clinic_id))]
        const { data: clinicNames } = await supabaseAdmin
            .from('clinics')
            .select('id, name')
            .in('id', clinicIds)

        const clinicNameMap = Object.fromEntries(clinicNames?.map(c => [c.id, c.name]) || [])

        const formattedLogs = recentLogs?.map(l => ({
            id: l.id,
            actionType: l.action_type,
            actionDescription: l.action_description,
            targetClinic: l.target_clinic_id ? clinicNameMap[l.target_clinic_id] : null,
            createdAt: l.created_at,
        })) || []

        // Log this access
        await supabaseAdmin.from('system_logs').insert({
            admin_email: 'robsonfenriz@gmail.com',
            action_type: 'VIEW',
            action_category: 'SYSTEM',
            action_description: 'Accessed Super Admin Dashboard',
            ip_address: request.headers.get('x-forwarded-for') || 'unknown',
            request_path: '/api/super-admin/dashboard',
        })

        return NextResponse.json({
            metrics: {
                totalClinics: clinics?.length || 0,
                activeClinics: clinics?.filter(c => c.is_active).length || 0,
                totalRevenue: mrr * 12, // Annualized
                mrr,
                churnRate,
                totalConsultations: totalConsultations || 0,
                aiTokensUsed: totalAiTokens,
                aiCostBRL,
            },
            clinics: formattedClinics,
            recentLogs: formattedLogs,
        })

    } catch (error) {
        console.error('[SuperAdmin Dashboard] Error:', error)
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        )
    }
}

function getNextRenewalDate(createdAt: string): string {
    const created = new Date(createdAt)
    const now = new Date()
    const renewal = new Date(created)

    // Set to same day next month
    while (renewal < now) {
        renewal.setMonth(renewal.getMonth() + 1)
    }

    return renewal.toISOString()
}

