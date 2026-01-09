/**
 * POST /api/webhooks/mercadopago
 * Processes Mercado Pago webhook notifications with idempotency
 * 
 * 🔥 CRITICAL: This activates subscriptions after payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import {
    checkWebhookIdempotency,
    acquireWebhookLock,
    markWebhookCompleted,
    markWebhookFailed
} from '@/lib/webhooks/idempotency'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

// Database types for manual insertion
interface BillingEventInsert {
    subscription_id: string
    clinic_id: string
    event_type: string
    mp_payment_id: string
    amount: number
    status: string
    metadata: Record<string, unknown>
}

interface SubscriptionUpdate {
    status?: string
    mp_payment_id?: string
    mp_payer_id?: string
    current_period_start?: string
    current_period_end?: string
    updated_at: string
    cancelled_at?: string
}

interface ClinicPlanUpdate {
    plan_type: string
    updated_at: string
}

// Validate MP webhook signature using HMAC-SHA256
// See: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks#verify-notification-origin
async function validateSignature(req: NextRequest, body: string): Promise<boolean> {
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    // In development/test, allow without validation if no secret configured
    if (!webhookSecret) {
        logger.warn('MERCADOPAGO_WEBHOOK_SECRET not configured - skipping signature validation')
        return process.env.NODE_ENV !== 'production'
    }

    if (!xSignature || !xRequestId) {
        logger.warn('Missing x-signature or x-request-id headers')
        return false
    }

    try {
        // Parse x-signature header (format: ts=TIMESTAMP,v1=SIGNATURE)
        const signatureParts = xSignature.split(',')
        const tsEntry = signatureParts.find(p => p.startsWith('ts='))
        const v1Entry = signatureParts.find(p => p.startsWith('v1='))

        if (!tsEntry || !v1Entry) {
            logger.warn({ xSignature }, 'Invalid x-signature format')
            return false
        }

        const timestamp = tsEntry.replace('ts=', '')
        const signature = v1Entry.replace('v1=', '')

        // Build the signed payload: id:[data.id];request-id:[x-request-id];ts:[timestamp];
        const parsedBody = JSON.parse(body)
        const dataId = parsedBody?.data?.id || ''
        const signedPayload = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`

        // Compute HMAC-SHA256
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(signedPayload)
            .digest('hex')

        // Timing-safe comparison
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )

        if (!isValid) {
            logger.warn({ expected: expectedSignature.substring(0, 16), received: signature.substring(0, 16) }, 'Signature mismatch')
        }

        // Additionally check timestamp is within 5 minutes to prevent replay attacks
        const timestampMs = parseInt(timestamp, 10) * 1000
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000

        if (Math.abs(now - timestampMs) > fiveMinutes) {
            logger.warn({ timestamp, now, diff: Math.abs(now - timestampMs) }, 'Webhook timestamp too old (possible replay)')
            return false
        }

        return isValid
    } catch (error) {
        logger.error({ error }, 'Error validating webhook signature')
        return false
    }
}

export async function POST(request: NextRequest) {
    let webhookId: string | null = null

    try {
        webhookId = request.headers.get('x-request-id')

        if (!webhookId) {
            logger.warn('Webhook received without x-request-id')
            return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
        }

        // Idempotency check
        const { isProcessed } = await checkWebhookIdempotency(webhookId)

        if (isProcessed) {
            logger.info({ webhookId }, 'Webhook already processed (idempotent)')
            return NextResponse.json({ received: true, idempotent: true })
        }

        // Read body as text FIRST for signature validation
        const bodyText = await request.text()

        // Validate webhook signature with body
        if (!(await validateSignature(request, bodyText))) {
            logger.warn({ webhookId }, 'Invalid webhook signature')
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
        }

        // Now parse the body
        const body = JSON.parse(bodyText) as { type?: string; data?: { id?: string } }
        const { type, data } = body

        logger.info({ type, data }, 'Webhook received')

        // We only care about payment events
        if (type !== 'payment') {
            return NextResponse.json({ received: true })
        }

        const paymentId = data?.id
        if (!paymentId) {
            return NextResponse.json({ error: 'No payment ID' }, { status: 400 })
        }

        // Acquire lock for processing
        const lockAcquired = await acquireWebhookLock(webhookId)
        if (!lockAcquired) {
            logger.info({ webhookId }, 'Could not acquire lock - might be processing elsewhere')
            return NextResponse.json({ received: true, processing: true })
        }

        // Initialize MP client
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            logger.error('MERCADOPAGO_ACCESS_TOKEN not configured')
            await markWebhookFailed(webhookId, 'MERCADOPAGO_ACCESS_TOKEN not configured')
            return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
        }

        // Initialize MP client
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        })

        // Payment constructor in some versions might behave differently with types
        // Cast to unknown to bypass potential type mismatch in this specific version
        const payment = new Payment(client as unknown as MercadoPagoConfig)

        // Fetch payment details
        const paymentData = await payment.get({ id: paymentId })

        logger.info({ paymentId, status: paymentData.status }, 'Payment details fetched')

        const externalReference = paymentData.external_reference
        if (!externalReference || !externalReference.startsWith('sub_')) {
            logger.warn({ externalReference }, 'Invalid external reference')
            await markWebhookFailed(webhookId, 'Invalid external reference')
            return NextResponse.json({ error: 'Invalid reference' }, { status: 400 })
        }

        const subscriptionId = externalReference.replace('sub_', '')

        // Use service role client (bypasses RLS for webhook)
        const supabase = createServiceRoleClient()

        // Get subscription with type assertion
        const { data: subscription, error: subError } = await supabase
            .from('subscriptions')
            .select('id, clinic_id, plan_type, billing_cycle, status')
            .eq('id', subscriptionId)
            .single()

        if (subError || !subscription) {
            logger.error({ error: subError, subscriptionId }, 'Subscription not found')
            await markWebhookFailed(webhookId, 'Subscription not found')
            return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
        }

        // Type the subscription data
        const sub = subscription as {
            id: string
            clinic_id: string
            plan_type: string
            billing_cycle: string
            status: string
        }

        const clinicId = sub.clinic_id
        const status = paymentData.status
        const payerId = paymentData.payer?.id

        // Log billing event
        await supabase
            .from('billing_events')
            .insert({
                subscription_id: subscriptionId,
                clinic_id: clinicId,
                event_type: `payment.${status}`,
                mp_payment_id: paymentId.toString(),
                amount: paymentData.transaction_amount,
                status: status,
                metadata: {
                    payment_method: paymentData.payment_method_id,
                    status_detail: paymentData.status_detail,
                },
            } as any) // Keep cast for dynamic table if necessary, or better: ensure table exists in types
        // Since billing_events might not be in generated types yet, we use explicit type for clarity but cast to allow compilation

        // Note: Ideally regen types. For now, cast is safest to avoid build error if table missing in types.

        // Update subscription based on payment status
        if (status === 'approved') {
            // Payment approved - activate subscription
            const periodEnd = sub.billing_cycle === 'MONTHLY'
                ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
                : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +365 days

            // Update subscription status
            await supabase
                .from('subscriptions')
                .update({
                    status: 'ACTIVE',
                    mp_payment_id: paymentId.toString(),
                    mp_payer_id: payerId?.toString(),
                    current_period_start: new Date().toISOString(),
                    current_period_end: periodEnd.toISOString(),
                    updated_at: new Date().toISOString(),
                } as SubscriptionUpdate as any)
                .eq('id', subscriptionId)

            // 🔥 CRITICAL: Update clinic plan_type for immediate access
            await supabase
                .from('clinics')
                .update({
                    plan_type: sub.plan_type,
                    updated_at: new Date().toISOString(),
                } as ClinicPlanUpdate as any)
                .eq('id', clinicId)

            logger.info({
                event: 'subscription_activated',
                subscriptionId,
                clinicId,
                plan: sub.plan_type,
                paymentId,
            }, 'BILLING')

            // Mark webhook as completed
            await markWebhookCompleted(webhookId)

        } else if (status === 'rejected' || status === 'cancelled') {
            // Payment rejected/cancelled
            await supabase
                .from('subscriptions')
                .update({
                    status: 'CANCELLED',
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                } as SubscriptionUpdate as any)
                .eq('id', subscriptionId)

            logger.warn({
                event: 'subscription_cancelled',
                subscriptionId,
                clinicId,
                reason: paymentData.status_detail,
            }, 'BILLING')

            await markWebhookCompleted(webhookId)

        } else if (status === 'pending' || status === 'in_process') {
            // Payment pending (PIX waiting)
            await supabase
                .from('subscriptions')
                .update({
                    mp_payment_id: paymentId.toString(),
                    updated_at: new Date().toISOString(),
                } as SubscriptionUpdate as any)
                .eq('id', subscriptionId)

            logger.info({
                event: 'payment_pending',
                subscriptionId,
                clinicId,
                method: paymentData.payment_method_id,
            }, 'BILLING')
        }

        return NextResponse.json({ received: true, processed: true })

    } catch (error) {
        logger.error({ error }, 'Webhook processing error')
        if (webhookId) {
            await markWebhookFailed(webhookId, (error as Error).message)
        }
        return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
    }
}

// GET is also required by MP to validate the webhook
export async function GET() {
    return NextResponse.json({ status: 'ok' })
}
