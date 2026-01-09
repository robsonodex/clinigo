/**
 * Billing Server Actions
 * Handles subscription upgrades, downgrades, and pro-rata calculations
 * 
 * @module app/actions/billing.ts
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { PLANS, type PlanType, PLAN_LEVEL } from '@/lib/constants/plans'

// ============================================================================
// TYPES
// ============================================================================

interface UpgradeResult {
    success: boolean
    preferenceId?: string
    initPoint?: string
    error?: string
    proRataAmount?: number
}

interface SubscriptionInfo {
    id: string
    clinic_id: string
    plan_type: PlanType
    status: string
    current_period_start: string
    current_period_end: string
    billing_cycle: 'MONTHLY' | 'YEARLY'
    amount: number
}

// ============================================================================
// PLAN PRICING (RJ Market 2026)
// ============================================================================

const PLAN_PRICES = {
    STARTER: { MONTHLY: 47, YEARLY: 470 },
    BASIC: { MONTHLY: 87, YEARLY: 870 },
    PROFESSIONAL: { MONTHLY: 247, YEARLY: 2470 },
    ENTERPRISE: { MONTHLY: 497, YEARLY: 4970 },
    NETWORK: { MONTHLY: 997, YEARLY: 9970 },
} as const

// ============================================================================
// PRO-RATA CALCULATION
// ============================================================================

/**
 * Calculates pro-rata amount for plan upgrade based on remaining days
 */
function calculateProRata(
    currentPlan: PlanType,
    targetPlan: PlanType,
    billingCycle: 'MONTHLY' | 'YEARLY',
    periodEnd: Date
): { amount: number; daysRemaining: number; creditAmount: number } {
    const now = new Date()
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate daily rate for current plan (credit)
    const currentMonthlyPrice = PLAN_PRICES[currentPlan].MONTHLY
    const currentDailyRate = currentMonthlyPrice / 30
    const creditAmount = Math.round(daysRemaining * currentDailyRate * 100) / 100

    // Calculate daily rate for target plan (charge)
    const targetMonthlyPrice = PLAN_PRICES[targetPlan].MONTHLY
    const targetDailyRate = targetMonthlyPrice / 30
    const chargeAmount = Math.round(daysRemaining * targetDailyRate * 100) / 100

    // Pro-rata = charge for remaining days on new plan - credit for remaining days on old plan
    const amount = Math.max(0, Math.round((chargeAmount - creditAmount) * 100) / 100)

    return { amount, daysRemaining, creditAmount }
}

// ============================================================================
// UPGRADE ACTION
// ============================================================================

/**
 * Server Action: Creates a Mercado Pago preference for plan upgrade
 * Calculates pro-rata based on remaining days in current period
 */
export async function createUpgradePreference(
    targetPlan: PlanType,
    billingCycle: 'MONTHLY' | 'YEARLY' = 'MONTHLY'
): Promise<UpgradeResult> {
    try {
        const supabase = await createClient()

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return { success: false, error: 'Não autenticado' }
        }

        // Get user's clinic
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        // Cast to any to bypass strict type error if types are outdated
        const clinicId = (userData as any)?.clinic_id

        if (userError || !clinicId) {
            return { success: false, error: 'Clínica não encontrada' }
        }

        // Get current subscription
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('status', 'ACTIVE')
            .single()

        const sub = subscription as SubscriptionInfo | null

        // Get clinic current plan
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('plan_type, name, email')
            .eq('id', clinicId)
            .single()

        if (clinicError || !clinic) {
            return { success: false, error: 'Clínica não encontrada' }
        }

        const currentPlan = ((clinic as any).plan_type || 'STARTER') as PlanType

        // Validate upgrade path
        if (PLAN_LEVEL[targetPlan] <= PLAN_LEVEL[currentPlan]) {
            return { success: false, error: 'Não é possível fazer downgrade por esta rota' }
        }

        // Calculate amount
        let amount: number
        let proRataAmount: number | undefined

        if (sub && sub.current_period_end) {
            // Existing subscription - calculate pro-rata
            const periodEnd = new Date(sub.current_period_end)
            const proRata = calculateProRata(currentPlan, targetPlan, billingCycle, periodEnd)
            amount = proRata.amount
            proRataAmount = proRata.amount
        } else {
            // New subscription - full price
            amount = PLAN_PRICES[targetPlan][billingCycle]
        }

        // Minimum charge
        if (amount < 5) {
            amount = 5
        }

        // Initialize Mercado Pago
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        if (!accessToken) {
            return { success: false, error: 'Mercado Pago não configurado' }
        }

        const mpClient = new MercadoPagoConfig({ accessToken })
        const preferenceClient = new Preference(mpClient)

        // Create subscription record if doesn't exist
        let subscriptionId: string

        if (!sub) {
            const { data: newSub, error: createError } = await (supabase
                .from('subscriptions') as any)
                .insert({
                    clinic_id: clinicId,
                    plan_type: targetPlan,
                    billing_cycle: billingCycle,
                    amount: PLAN_PRICES[targetPlan][billingCycle],
                    status: 'PENDING',
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            if (createError || !newSub) {
                console.error('Failed to create subscription:', createError)
                return { success: false, error: 'Erro ao criar assinatura' }
            }

            subscriptionId = (newSub as any).id
        } else {
            // Update existing subscription with pending upgrade
            subscriptionId = sub.id
            await (supabase
                .from('subscriptions') as any)
                .update({
                    pending_plan_type: targetPlan,
                    pending_amount: amount,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', subscriptionId)
        }

        // Create Mercado Pago preference
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const preference = await preferenceClient.create({
            body: {
                items: [{
                    id: `upgrade_${subscriptionId}`,
                    title: `CliniGo ${PLANS[targetPlan].name} - ${proRataAmount ? 'Upgrade Pro-rata' : billingCycle === 'MONTHLY' ? 'Mensal' : 'Anual'}`,
                    description: `Upgrade para plano ${PLANS[targetPlan].name}${proRataAmount ? ` (Pro-rata: R$ ${proRataAmount.toFixed(2)})` : ''}`,
                    quantity: 1,
                    unit_price: amount,
                    currency_id: 'BRL',
                }],
                payer: {
                    email: (clinic as any).email || user.email || '',
                },
                external_reference: `sub_${subscriptionId}`,
                back_urls: {
                    success: `${appUrl}/dashboard/billing/success?subscription_id=${subscriptionId}`,
                    failure: `${appUrl}/dashboard/billing/failure`,
                    pending: `${appUrl}/dashboard/billing/pending`,
                },
                auto_return: 'approved',
                notification_url: `${appUrl}/api/webhooks/mercadopago`,
                statement_descriptor: 'CLINIGO',
                expires: true,
                expiration_date_from: new Date().toISOString(),
                expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
            },
        })

        if (!preference.id || !preference.init_point) {
            return { success: false, error: 'Erro ao criar preferência de pagamento' }
        }

        // Update subscription with preference ID
        await (supabase
            .from('subscriptions') as any)
            .update({
                mp_preference_id: preference.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', subscriptionId)

        return {
            success: true,
            preferenceId: preference.id,
            initPoint: preference.init_point,
            proRataAmount,
        }

    } catch (error) {
        console.error('Upgrade preference error:', error)
        return { success: false, error: (error as Error).message }
    }
}

// ============================================================================
// GET SUBSCRIPTION INFO
// ============================================================================

/**
 * Server Action: Gets current subscription details for a clinic
 */
export async function getCurrentSubscription(): Promise<{
    success: boolean
    subscription?: SubscriptionInfo & { clinic_name: string }
    error?: string
}> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { success: false, error: 'Não autenticado' }
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        if (!(userData as any)?.clinic_id) {
            return { success: false, error: 'Clínica não encontrada' }
        }

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*, clinic:clinics(name)')
            .eq('clinic_id', (userData as any).clinic_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (error || !subscription) {
            return { success: false, error: 'Assinatura não encontrada' }
        }

        return {
            success: true,
            subscription: {
                ...(subscription as any),
                clinic_name: (subscription as any).clinic?.name || '',
            } as SubscriptionInfo & { clinic_name: string },
        }

    } catch (error) {
        return { success: false, error: (error as Error).message }
    }
}
