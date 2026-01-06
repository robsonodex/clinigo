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
    const supabase = createClient()

    const { data: clinic } = await supabase
        .from('clinics')
        .select('plan_type, plan_limits')
        .eq('id', clinicId)
        .single()

    if (!clinic) return; // Or throw error

    const planType = clinic.plan_type as keyof typeof PLANS
    const plan = PLANS[planType] || PLANS.FREE

    if (resource === 'doctor') {
        const { count } = await supabase
            .from('doctors')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)

        // Check if count is not null before comparing
        if (count !== null && plan.limits.max_doctors !== -1 && count >= plan.limits.max_doctors) {
            throw new PlanLimitError(
                `Limite de médicos atingido. Upgrade para ${PLANS.PRO.name}`,
                403,
                'PLAN_LIMIT_EXCEEDED'
            )
        }
    }

    if (resource === 'appointment') {
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)

        const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('created_at', firstDayOfMonth.toISOString())

        if (count !== null && plan.limits.max_appointments_month !== -1 && count >= plan.limits.max_appointments_month) {
            throw new PlanLimitError(
                `Limite de consultas mensais atingido. Upgrade para ${PLANS.PRO.name}`,
                403,
                'PLAN_LIMIT_EXCEEDED'
            )
        }
    }
}
