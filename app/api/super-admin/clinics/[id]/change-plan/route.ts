/**
 * API: Super Admin - Change Plan Manually
 * POST /api/super-admin/clinics/[id]/change-plan
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { BillingProrationService } from '@/lib/services/billing-proration'
import { FeatureGateService } from '@/lib/services/feature-gate'
import { PLANS, type PlanType } from '@/lib/constants/plans'
import { z } from 'zod'

const changeSchema = z.object({
    new_plan: z.enum(['STARTER', 'BASICO', 'AVANCADO', 'PROFESSIONAL', 'ENTERPRISE']),
    reason: z.string().min(10, 'Motivo deve ter no mínimo 10 caracteres'),
    billing_action: z.enum(['CHARGE_DIFFERENCE', 'COURTESY', 'ADJUST_NEXT_BILLING']),
    effective_date: z.enum(['IMMEDIATE', 'NEXT_BILLING_CYCLE']).default('IMMEDIATE'),
})

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        // Verificar se é super admin
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super admins podem alterar planos')
        }

        const clinicId = params.id
        const body = await request.json()
        const validatedData = changeSchema.parse(body)

        // Buscar clínica
        const { data: clinic } = await supabaseAdmin
            .from('clinics')
            .select('plan_type, name, created_at')
            .eq('id', clinicId)
            .single()

        if (!clinic) {
            throw new BadRequestError('Clínica não encontrada')
        }

        // Calcular tipo de mudança
        const billingService = new BillingProrationService()
        const changeType = billingService.getChangeType(
            clinic.plan_type as any,
            validatedData.new_plan as any
        )

        // Calcular impacto billing
        const proration = billingService.calculateProration(
            clinic.plan_type as any,
            validatedData.new_plan as any,
            new Date(clinic.created_at),
            billingService.getNextBillingDate(new Date(clinic.created_at)),
            new Date()
        )

        // Atualizar plano
        await supabaseAdmin
            .from('clinics')
            .update({
                plan_type: validatedData.new_plan,
                plan_limits: PLANS[validatedData.new_plan as PlanType]?.limits || PLANS.BASICO.limits,
                updated_at: new Date().toISOString(),
            })
            .eq('id', clinicId)

        // Registrar histórico
        await supabaseAdmin.from('clinic_plan_history').insert({
            clinic_id: clinicId,
            previous_plan: clinic.plan_type,
            new_plan: validatedData.new_plan,
            change_type: changeType,
            change_method: 'MANUAL_ADMIN',
            changed_by_admin_id: user.id,
            reason: validatedData.reason,
            billing_impact: proration.newPlanPrice - proration.currentPlanPrice,
            prorated_amount: validatedData.billing_action === 'COURTESY' ? 0 : proration.proratedAmount,
            effective_date: new Date().toISOString(),
        })

        // Invalidar cache
        const featureService = new FeatureGateService()
        await featureService.invalidateClinicFeatures(clinicId)

        return successResponse({
            message: 'Plano alterado com sucesso',
            clinic_name: clinic.name,
            previous_plan: clinic.plan_type,
            new_plan: validatedData.new_plan,
            change_type: changeType,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
