
/**
 * POST /api/webhooks/bancointer
 * Processes Banco Inter webhook notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { logger } from '@/lib/logger'
import { bancoInterService } from '@/lib/services/bancointer'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        logger.info({ body }, 'Banco Inter Webhook Received')

        // Inter sends array of notifications usually
        const notifications = Array.isArray(body) ? body : [body]

        const supabase = createServiceRoleClient()

        for (const notification of notifications) {
            // Check if it's a Boleto payment notification
            // Structure: { nossoNumero: '...', seuNumero: '...', dataHoraSituacao: '...', situacao: 'PAGO' }

            if (notification.nossoNumero && notification.situacao) {
                const nossoNumero = notification.nossoNumero
                const status = notification.situacao // PAGO, BAIXADO, etc.
                const subscriptionId = notification.seuNumero // We mapped seuNumero to subscriptionId

                logger.info({ nossoNumero, status, subscriptionId }, 'Processing payment notification')

                if (status === 'PAGO' || status === 'LIQUIDADO') {
                    // 1. Get Subscription
                    const { data: subscription } = await supabase
                        .from('subscriptions')
                        .select('id, clinic_id, plan_type, billing_cycle')
                        .eq('id', subscriptionId)
                        .single()

                    if (!subscription) {
                        logger.warn({ subscriptionId }, 'Subscription not found for payment')
                        continue
                    }

                    // 2. Activate Subscription
                    const periodEnd = subscription.billing_cycle === 'MONTHLY'
                        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

                    await supabase
                        .from('subscriptions')
                        .update({
                            status: 'ACTIVE',
                            mp_payment_id: nossoNumero, // Storing nossoNumero here
                            current_period_start: new Date().toISOString(),
                            current_period_end: periodEnd.toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', subscriptionId)

                    // 3. Update Clinic Plan
                    await supabase
                        .from('clinics')
                        .update({
                            plan_type: subscription.plan_type,
                            updated_at: new Date().toISOString(),
                            is_active: true, // Ensure clinic is active
                        })
                        .eq('id', subscription.clinic_id)

                    logger.info({ clinicId: subscription.clinic_id, plan: subscription.plan_type }, 'Subscription Activated via Inter')
                }
            }
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        logger.error({ error }, 'Banco Inter Webhook Error')
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
