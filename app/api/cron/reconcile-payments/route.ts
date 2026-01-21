/**
 * Payment Reconciliation Cron Job
 * 
 * Runs daily to find orphan payments (webhook missed)
 * and activate clinics that should have been activated
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { addMonths, subDays } from 'date-fns'

// Vercel Cron: runs daily at 3:00 AM UTC
// Add to vercel.json: { "crons": [{ "path": "/api/cron/reconcile-payments", "schedule": "0 3 * * *" }] }

export async function GET(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServiceRoleClient()
        const results = {
            checked: 0,
            reconciled: 0,
            errors: [] as string[]
        }

        // Find clinics pending for more than 24 hours
        const oneDayAgo = subDays(new Date(), 1).toISOString()

        const { data: pendingClinics, error } = await supabase
            .from('clinics')
            .select('id, name, email, created_at')
            .eq('approval_status', 'pending_approval')
            .lt('created_at', oneDayAgo)

        if (error) {
            console.error('[RECONCILE] Error fetching pending clinics:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (!pendingClinics || pendingClinics.length === 0) {
            console.log('[RECONCILE] No pending clinics found')
            return NextResponse.json({
                success: true,
                message: 'No pending clinics to reconcile',
                results
            })
        }

        console.log(`[RECONCILE] Found ${pendingClinics.length} pending clinics`)

        // Initialize Mercado Pago
        const mp = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!
        })
        const paymentClient = new Payment(mp)

        for (const clinic of pendingClinics) {
            results.checked++

            try {
                // Search for payments with this clinic ID as external reference
                const searchResult = await paymentClient.search({
                    options: {
                        external_reference: clinic.id
                    }
                })

                const approvedPayment = searchResult.results?.find(
                    (p: any) => p.status === 'approved'
                )

                if (approvedPayment) {
                    console.log(`[RECONCILE] Found orphan payment for clinic ${clinic.id}:`, approvedPayment.id)

                    // Activate clinic
                    const { error: updateError } = await supabase
                        .from('clinics')
                        .update({
                            approval_status: 'active',
                            is_active: true,
                            mercadopago_payment_id: String(approvedPayment.id),
                            paid_amount: approvedPayment.transaction_amount,
                            subscription_starts_at: new Date().toISOString(),
                            subscription_ends_at: addMonths(new Date(), 1).toISOString()
                        })
                        .eq('id', clinic.id)

                    if (updateError) {
                        throw updateError
                    }

                    // Create subscription record
                    await supabase.from('subscriptions').insert({
                        clinic_id: clinic.id,
                        plan_type: 'BASIC', // Default, can be updated based on payment amount
                        status: 'ACTIVE',
                        amount: approvedPayment.transaction_amount,
                        payment_method: 'MERCADOPAGO',
                        external_payment_id: String(approvedPayment.id),
                        starts_at: new Date().toISOString(),
                        ends_at: addMonths(new Date(), 1).toISOString()
                    })

                    // Log audit
                    await supabase.from('audit_logs').insert({
                        clinic_id: clinic.id,
                        action: 'PAYMENT_RECONCILED',
                        resource_type: 'CLINIC',
                        resource_id: clinic.id,
                        metadata: {
                            payment_id: approvedPayment.id,
                            amount: approvedPayment.transaction_amount,
                            reconciled_at: new Date().toISOString()
                        }
                    })

                    // Send welcome email
                    try {
                        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send-welcome`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                clinicId: clinic.id,
                                email: clinic.email,
                                clinicName: clinic.name
                            })
                        })
                    } catch (emailErr) {
                        console.error('[RECONCILE] Failed to send welcome email:', emailErr)
                    }

                    results.reconciled++
                    console.log(`[RECONCILE] Successfully reconciled clinic ${clinic.name}`)
                }
            } catch (err: any) {
                console.error(`[RECONCILE] Error processing clinic ${clinic.id}:`, err)
                results.errors.push(`Clinic ${clinic.id}: ${err.message}`)
            }
        }

        // Send report to Slack if any reconciliations happened
        if (results.reconciled > 0 || results.errors.length > 0) {
            try {
                await fetch(process.env.SLACK_WEBHOOK_URL!, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `📊 *Payment Reconciliation Report*\n` +
                            `• Checked: ${results.checked}\n` +
                            `• Reconciled: ${results.reconciled}\n` +
                            `• Errors: ${results.errors.length}\n` +
                            (results.errors.length > 0 ? `\nErrors:\n${results.errors.join('\n')}` : '')
                    })
                })
            } catch {
                // Ignore Slack errors
            }
        }

        return NextResponse.json({
            success: true,
            results
        })

    } catch (error: any) {
        console.error('[RECONCILE] Fatal error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
