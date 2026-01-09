/**
 * Webhook Idempotency Handler
 * Prevents duplicate processing of Mercado Pago webhooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

interface WebhookEvent {
    id: string
    webhook_id: string
    payment_id: string
    event_type: string
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
    attempts: number
    last_error?: string
    created_at: string
    completed_at?: string
}

// ============================================================================
// IDEMPOTENCY CHECK
// ============================================================================

export async function checkWebhookIdempotency(
    webhookId: string
): Promise<{ isProcessed: boolean; event?: WebhookEvent }> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('webhook_id', webhookId)
        .single()

    if (error && error.code !== 'PGRST116') {
        logger.error({ error, webhookId }, 'Failed to check webhook idempotency')
        throw error
    }

    if (data && data.status === 'COMPLETED') {
        logger.info({ webhookId }, 'Webhook already processed (idempotent)')
        return { isProcessed: true, event: data as WebhookEvent }
    }

    return { isProcessed: false, event: data as WebhookEvent | undefined }
}

// ============================================================================
// ACQUIRE PROCESSING LOCK
// ============================================================================

export async function acquireWebhookLock(
    webhookId: string,
    paymentId: string,
    eventType: string
): Promise<boolean> {
    const supabase = createServiceRoleClient()

    try {
        const { error } = await supabase
            .from('webhook_events')
            .upsert({
                webhook_id: webhookId,
                payment_id: paymentId,
                event_type: eventType,
                status: 'PROCESSING',
                attempts: 0
            }, {
                onConflict: 'webhook_id',
                ignoreDuplicates: false
            })

        if (error) {
            // Se já existe e está PROCESSING, outro processo pegou
            if (error.code === '23505') { // unique violation
                logger.warn({ webhookId }, 'Webhook lock already acquired by another process')
                return false
            }
            throw error
        }

        logger.info({ webhookId, paymentId }, 'Webhook lock acquired')
        return true

    } catch (error) {
        logger.error({ error, webhookId }, 'Failed to acquire webhook lock')
        return false
    }
}

// ============================================================================
// MARK COMPLETED
// ============================================================================

export async function markWebhookCompleted(webhookId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('webhook_events')
        .update({
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
        })
        .eq('webhook_id', webhookId)

    if (error) {
        logger.error({ error, webhookId }, 'Failed to mark webhook completed')
        throw error
    }

    logger.info({ webhookId }, 'Webhook marked as completed')
}

// ============================================================================
// MARK FAILED
// ============================================================================

export async function markWebhookFailed(
    webhookId: string,
    errorMessage: string
): Promise<void> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('webhook_events')
        .update({
            status: 'FAILED',
            last_error: errorMessage,
            attempts: supabase.rpc('increment_attempts', { webhook_id: webhookId })
        })
        .eq('webhook_id', webhookId)

    if (error) {
        logger.error({ error, webhookId }, 'Failed to mark webhook as failed')
    }

    logger.warn({ webhookId, errorMessage }, 'Webhook marked as failed')
}

// ============================================================================
// RETRY FAILED WEBHOOKS
// ============================================================================

export async function retryFailedWebhooks(maxAttempts: number = 3): Promise<number> {
    const supabase = createServiceRoleClient()

    const { data: failedEvents, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('status', 'FAILED')
        .lt('attempts', maxAttempts)
        .order('created_at', { ascending: true })
        .limit(10)

    if (error) {
        logger.error({ error }, 'Failed to fetch failed webhooks for retry')
        return 0
    }

    if (!failedEvents || failedEvents.length === 0) {
        return 0
    }

    let retriedCount = 0

    for (const event of failedEvents) {
        try {
            logger.info({ webhookId: event.webhook_id }, 'Retrying failed webhook')

            // Reset to PROCESSING
            await supabase
                .from('webhook_events')
                .update({ status: 'PROCESSING' })
                .eq('webhook_id', event.webhook_id)

            // Trigger reprocessing (implementar lógica específica)
            // await reprocessWebhook(event)

            retriedCount++
        } catch (retryError) {
            logger.error({ error: retryError, webhookId: event.webhook_id }, 'Retry failed')
        }
    }

    return retriedCount
}

// ============================================================================
// GET WEBHOOK STATS
// ============================================================================

export async function getWebhookStats(
    clinicId?: string,
    hours: number = 24
): Promise<{
    total: number
    completed: number
    failed: number
    processing: number
    success_rate: number
}> {
    const supabase = createServiceRoleClient()

    let query = supabase
        .from('webhook_events')
        .select('status', { count: 'exact' })

    if (clinicId) {
        query = query.eq('clinic_id', clinicId)
    }

    query = query.gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    const { data, count, error } = await query

    if (error) {
        logger.error({ error }, 'Failed to get webhook stats')
        throw error
    }

    const stats = {
        total: count || 0,
        completed: 0,
        failed: 0,
        processing: 0,
        success_rate: 0
    }

    if (data) {
        stats.completed = data.filter(e => e.status === 'COMPLETED').length
        stats.failed = data.filter(e => e.status === 'FAILED').length
        stats.processing = data.filter(e => e.status === 'PROCESSING').length
        stats.success_rate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    }

    return stats
}

