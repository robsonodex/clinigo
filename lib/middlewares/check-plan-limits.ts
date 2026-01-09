import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/constants/plans'

// Using a custom error or just throwing simplified error
// Assuming 'AppError' is not widely used yet, so throwing Error with structure
class PlanLimitError extends Error {
    statusCode: number;
    code: string;

    constructor(message: string, statusCode: number, code: string) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

export async function checkPlanLimits(
    clinicId: string,
    resource: 'doctor' | 'appointment'
) {
    const supabase = await createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type, plan_limits')
        .eq('id', clinicId)
        .single()

    if (!clinic) return; // Or throw error

    // Type-safe extraction
    const clinicData = clinic as { plan_type?: string; plan_limits?: Record<string, unknown> } | null
    const planType = (clinicData?.plan_type || 'STARTER') as keyof typeof PLANS

    // Ensure we have a valid plan, fallback to STARTER
    const plan = PLANS[planType] || PLANS.STARTER

    // Suggest next plan for upgrade
    const nextPlan = planType === 'STARTER' ? 'BASIC' :
        planType === 'BASIC' ? 'PROFESSIONAL' :
            planType === 'PROFESSIONAL' ? 'ENTERPRISE' : 'NETWORK'

    const nextPlanName = PLANS[nextPlan].name

    if (resource === 'doctor') {
        const { count } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        // Check if count is not null before comparing
        if (count !== null && plan.limits.max_doctors !== -1 && count >= plan.limits.max_doctors) {
            throw new PlanLimitError(
                `Limite de médicos atingido no plano ${plan.name}. Upgrade para ${nextPlanName} para aumentar.`,
                403,
                'PLAN_LIMIT_EXCEEDED'
            )
        }
    }

    if (resource === 'appointment') {
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        firstDayOfMonth.setHours(0, 0, 0, 0)

        const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('created_at', firstDayOfMonth.toISOString())

        if (count !== null && plan.limits.max_appointments_month !== -1 && count >= plan.limits.max_appointments_month) {
            throw new PlanLimitError(
                `Limite de consultas mensais atingido no plano ${plan.name}. Upgrade para ${nextPlanName} para continuar.`,
                403,
                'PLAN_LIMIT_EXCEEDED'
            )
        }
    }
}

