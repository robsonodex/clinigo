/**
 * POST /api/billing/create-subscription
 * Creates a new subscription and Mercado Pago checkout preference
 * 
 * 🔥 CRITICAL: This enables revenue generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { z } from 'zod'
import { logger } from '@/lib/logger'

const createSubscriptionSchema = z.object({
    plan: z.enum(['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK']),
    billing_cycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
})

// 5-Tier Plan pricing (RJ Market 2026)
const PLAN_PRICES = {
    STARTER: { MONTHLY: 47, YEARLY: 470 },         // 10 meses
    BASIC: { MONTHLY: 87, YEARLY: 870 },           // 10 meses
    PROFESSIONAL: { MONTHLY: 247, YEARLY: 2470 },  // 10 meses
    ENTERPRISE: { MONTHLY: 497, YEARLY: 4970 },    // 10 meses
    NETWORK: { MONTHLY: 997, YEARLY: 9970 },       // 10 meses
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { plan, billing_cycle } = createSubscriptionSchema.parse(body)

        const supabase = await createClient()

        // Get user's clinic
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('clinic_id, clinics(id, name, plan_type)')
            .eq('id', userId)
            .single()

        if (userError || !(userData as any)?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const clinic = (userData as any).clinics
        const clinicId = clinic.id

        // Prevent downgrade (basic security)
        const currentPlan = clinic.plan_type
        if (currentPlan === 'ENTERPRISE' && plan !== 'ENTERPRISE') {
            return NextResponse.json({
                error: 'Não é possível fazer downgrade. Entre em contato com suporte.'
            }, { status: 400 })
        }

        // Calculate amount
        const amount = PLAN_PRICES[plan][billing_cycle]

        // Create subscription record
        const { data: subscription, error: subError } = await (supabase as any)
            .rpc('create_subscription', {
                p_clinic_id: clinicId,
                p_plan_type: plan,
                p_amount: amount,
                p_billing_cycle: billing_cycle,
            })

        if (subError) {
            logger.error({ error: subError, clinicId, plan }, 'Failed to create subscription')
            return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 })
        }

        const subscriptionId = subscription

        // Initialize Mercado Pago
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            logger.error('MERCADOPAGO_ACCESS_TOKEN not configured')
            return NextResponse.json({ error: 'Pagamento não configurado' }, { status: 500 })
        }

        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        })
        const preference = new Preference(client)

        // Create checkout preference
        const externalReference = `sub_${subscriptionId}`
        const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`

        const preferenceData = await preference.create({
            body: {
                items: [
                    {
                        id: subscriptionId,
                        title: `CliniGo ${plan} - ${billing_cycle === 'MONTHLY' ? 'Mensal' : 'Anual'}`,
                        description: `Assinatura ${plan} do CliniGo`,
                        category_id: 'services',
                        quantity: 1,
                        unit_price: amount,
                        currency_id: 'BRL',
                    },
                ],
                payer: {
                    email: (userData as any).email || 'contato@clinigo.com.br',
                },
                external_reference: externalReference,
                notification_url: notificationUrl,
                back_urls: {
                    success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes/plano?status=success`,
                    failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes/plano?status=failure`,
                    pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes/plano?status=pending`,
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_types: [],
                    installments: billing_cycle === 'YEARLY' ? 12 : 1,
                },
            },
        })

        // Update subscription with preference_id
        await (supabase
            .from('subscriptions') as any)
            .update({
                mp_preference_id: preferenceData.id,
                metadata: {
                    init_point: preferenceData.init_point,
                    sandbox_init_point: preferenceData.sandbox_init_point,
                },
            })
            .eq('id', subscriptionId)

        // Log billing event
        logger.info({
            event: 'subscription_created',
            subscriptionId,
            clinicId,
            plan,
            amount,
            billing_cycle,
            preferenceId: preferenceData.id,
        }, 'BILLING')

        return NextResponse.json({
            subscription_id: subscriptionId,
            preference_id: preferenceData.id,
            init_point: preferenceData.init_point,
            sandbox_init_point: preferenceData.sandbox_init_point,
        })

    } catch (error) {
        logger.error({ error }, 'Billing API error')

        if (error instanceof z.ZodError) {
            return NextResponse.json({
                error: 'Dados inválidos',
                details: error.errors,
            }, { status: 400 })
        }

        return NextResponse.json({
            error: 'Erro ao processar assinatura',
        }, { status: 500 })
    }
}

