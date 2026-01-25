/**
 * API: Upgrade Plan
 * POST /api/plans/upgrade
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { BillingProrationService } from '@/lib/services/billing-proration'
import { FeatureGateService } from '@/lib/services/feature-gate'
import { z } from 'zod'

const upgradeSchema = z.object({
    new_plan: z.enum(['STARTER', 'BASICO', 'AVANCADO', 'ENTERPRISE']),
    billing_action: z.enum(['CHARGE_NOW', 'NEXT_BILLING']).optional().default('CHARGE_NOW'),
})

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new BadRequestError('Not authenticated')
        }

        // Buscar clinic_id
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            throw new BadRequestError('User not associated with clinic')
        }

        // Buscar plano atual da clínica
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type, created_at')
            .eq('id', userData.clinic_id)
            .single()

        if (!clinic) {
            throw new BadRequestError('Clinic not found')
        }

        const body = await request.json()
        const validatedData = upgradeSchema.parse(body)

        // Verificar se é realmente um upgrade
        const billingService = new BillingProrationService()
        const changeType = billingService.getChangeType(
            clinic.plan_type as any,
            validatedData.new_plan as any
        )

        if (changeType === 'SAME') {
            throw new BadRequestError('Você já está neste plano')
        }

        // Calcular valor proporcional
        const today = new Date()
        const billingCycleStart = new Date(clinic.created_at)
        const billingCycleEnd = billingService.getNextBillingDate(billingCycleStart)

        const proration = billingService.calculateProration(
            clinic.plan_type as any,
            validatedData.new_plan as any,
            billingCycleStart,
            billingCycleEnd,
            today
        )

        // Atualizar plano da clínica
        const { error: updateError } = await supabaseAdmin
            .from('clinics')
            .update({
                plan_type: validatedData.new_plan,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userData.clinic_id)

        if (updateError) throw updateError

        // Registrar histórico de mudança
        await supabaseAdmin.from('clinic_plan_history').insert({
            clinic_id: userData.clinic_id,
            previous_plan: clinic.plan_type,
            new_plan: validatedData.new_plan,
            change_type: changeType,
            change_method: 'SELF_SERVICE',
            changed_by_user_id: user.id,
            billing_impact: proration.newPlanPrice - proration.currentPlanPrice,
            prorated_amount: proration.proratedAmount,
            effective_date: new Date().toISOString(),
        })

        // Invalidar cache de features
        const featureService = new FeatureGateService()
        await featureService.invalidateClinicFeatures(userData.clinic_id)

        // TODO: Enviar notificação por e-mail
        // TODO: Integrar com Mercado Pago para cobrar valor proporcional

        return successResponse({
            message: `${changeType === 'UPGRADE' ? 'Upgrade' : 'Downgrade'} realizado com sucesso!`,
            new_plan: validatedData.new_plan,
            proration,
        }, { status: 200 })
    } catch (error) {
        return handleApiError(error)
    }
}
