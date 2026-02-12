
/**
 * POST /api/webhooks/bancointer
 * Processes Banco Inter webhook notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { logger } from '@/lib/logger'
import { sendPaymentConfirmationEmail } from '@/lib/services/email-payment'

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
                const seuNumero = notification.seuNumero

                logger.info({ nossoNumero, status, seuNumero }, 'Processing payment notification')

                if (status === 'PAGO' || status === 'LIQUIDADO') {
                    // ============================================
                    // STRATEGY 0: Find via registration_pending (new registrations)
                    // pre-register stores nossoNumero in boleto_nosso_numero
                    // ============================================
                    const { data: pendingReg } = await supabase
                        .from('registration_pending')
                        .select('*')
                        .eq('boleto_nosso_numero', nossoNumero)
                        .eq('status', 'PENDING')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle() as any

                    if (pendingReg) {
                        logger.info({ email: pendingReg.email, clinic: pendingReg.clinic_name }, 'Found registration_pending for boleto - creating clinic')

                        try {
                            // 1. Create Auth user in Supabase
                            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                                email: pendingReg.email,
                                password: pendingReg.password_hash,
                                email_confirm: true,
                                user_metadata: {
                                    full_name: pendingReg.full_name,
                                    role: 'CLINIC_ADMIN',
                                },
                            })

                            if (authError) {
                                logger.error({ error: authError }, 'Failed to create auth user for registration')
                                // Mark as error and skip
                                await supabase
                                    .from('registration_pending')
                                    .update({ status: 'ERROR', processed_at: new Date().toISOString() } as any)
                                    .eq('id', pendingReg.id)
                                continue
                            }

                            const authUserId = authData.user.id

                            // 2. Create Clinic
                            const newDueDate = new Date()
                            newDueDate.setDate(newDueDate.getDate() + 30)

                            const { data: newClinic, error: clinicError } = await (supabase
                                .from('clinics')
                                .insert({
                                    name: pendingReg.clinic_name,
                                    slug: pendingReg.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                                    email: pendingReg.email,
                                    cnpj: pendingReg.cnpj || null,
                                    phone: pendingReg.phone || null,
                                    address: pendingReg.address || {},
                                    plan_type: pendingReg.plan_type,
                                    owner_id: authUserId,
                                    payment_confirmed: true,
                                    payment_confirmed_at: new Date().toISOString(),
                                    payment_status: 'ACTIVE',
                                    is_active: true,
                                    approval_status: 'active',
                                    last_payment_date: new Date().toISOString(),
                                    subscription_due_date: newDueDate.toISOString(),
                                } as any) as any)
                                .select('id, name, slug')
                                .single()

                            if (clinicError) {
                                logger.error({ error: clinicError }, 'Failed to create clinic for registration')
                                await supabase
                                    .from('registration_pending')
                                    .update({ status: 'ERROR', processed_at: new Date().toISOString() } as any)
                                    .eq('id', pendingReg.id)
                                continue
                            }

                            // 3. Create User Profile linked to clinic
                            await (supabase.from('users').insert({
                                id: authUserId,
                                email: pendingReg.email,
                                full_name: pendingReg.full_name,
                                role: 'CLINIC_ADMIN',
                                clinic_id: newClinic.id,
                            } as any) as any)

                            // 4. Handle referral code if present
                            if (pendingReg.referral_code) {
                                const { data: partner } = await supabase
                                    .from('partners')
                                    .select('id')
                                    .eq('referral_code', pendingReg.referral_code.toUpperCase())
                                    .eq('is_active', true)
                                    .maybeSingle() as any

                                if (partner) {
                                    try {
                                        await (supabase.from('partner_referrals').insert({
                                            partner_id: partner.id,
                                            clinic_id: newClinic.id,
                                            status: 'CONVERTED',
                                            converted_at: new Date().toISOString(),
                                        } as any) as any)
                                    } catch (e: any) {
                                        logger.warn({ error: e.message }, 'partner_referrals insert failed (non-blocking)')
                                    }
                                }
                            }

                            // 5. Mark registration as processed
                            await supabase
                                .from('registration_pending')
                                .update({
                                    status: 'PROCESSED',
                                    processed_at: new Date().toISOString(),
                                } as any)
                                .eq('id', pendingReg.id)

                            // 6. Log payment
                            try {
                                await (supabase.from('payment_logs').insert({
                                    clinic_id: newClinic.id,
                                    payment_id: nossoNumero,
                                    payment_method: 'BOLETO',
                                    amount: 0,
                                    status: 'APPROVED',
                                    mercadopago_status: status,
                                    raw_webhook_data: notification,
                                } as any) as any)
                            } catch (e: any) {
                                logger.warn({ error: e.message }, 'payment_logs insert failed (non-blocking)')
                            }

                            // 7. Send welcome email
                            try {
                                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                                const loginUrl = 'https://clinigo.app/clinica'

                                await sendEmailMultiTenant({
                                    clinicId: newClinic.id,
                                    to: pendingReg.email,
                                    subject: '🎉 Bem-vindo ao CliniGo! Sua clínica foi ativada',
                                    html: `
                                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                                            <h1 style="color: #059669;">Bem-vindo ao CliniGo!</h1>
                                            <p>Olá <strong>${pendingReg.full_name}</strong>,</p>
                                            <p>Seu pagamento foi confirmado e sua clínica <strong>${newClinic.name}</strong> já está ativa!</p>
                                            <p><strong>Seus dados de acesso:</strong></p>
                                            <ul>
                                                <li>Email: <strong>${pendingReg.email}</strong></li>
                                                <li>Senha: a mesma definida no cadastro</li>
                                            </ul>
                                            <p><a href="${loginUrl}" style="display:inline-block;padding:12px 24px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">Acessar minha clínica</a></p>
                                        </div>
                                    `,
                                })
                            } catch (emailError) {
                                logger.warn({ error: emailError }, 'Welcome email failed (non-blocking)')
                            }

                            logger.info({
                                clinicId: newClinic.id,
                                clinicName: newClinic.name,
                                email: pendingReg.email,
                                plan: pendingReg.plan_type,
                            }, '✅ New clinic registered via boleto payment')
                            continue

                        } catch (regError) {
                            logger.error({ error: regError }, 'Error processing registration_pending')
                            await supabase
                                .from('registration_pending')
                                .update({ status: 'ERROR', processed_at: new Date().toISOString() } as any)
                                .eq('id', pendingReg.id)
                            continue
                        }
                    }

                    // ============================================
                    // STRATEGY 1: Find via payment_requests (primary)
                    // generate-payment stores nossoNumero in mercadopago_preference_id
                    // ============================================
                    const { data: paymentRequest } = await supabase
                        .from('payment_requests')
                        .select('id, clinic_id, plan_type, amount')
                        .eq('mercadopago_preference_id', nossoNumero)
                        .eq('status', 'PENDING')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle() as any

                    if (paymentRequest) {
                        logger.info({ clinicId: paymentRequest.clinic_id, plan: paymentRequest.plan_type }, 'Found payment_request for boleto')

                        const newDueDate = new Date()
                        newDueDate.setDate(newDueDate.getDate() + 30)

                        // 1. Update clinic: set payment_confirmed = true + activate
                        const { data: clinic } = await supabase
                            .from('clinics')
                            .update({
                                payment_confirmed: true,
                                payment_confirmed_at: new Date().toISOString(),
                                payment_status: 'ACTIVE',
                                is_active: true,
                                approval_status: 'active',
                                last_payment_date: new Date().toISOString(),
                                subscription_due_date: newDueDate.toISOString(),
                                updated_at: new Date().toISOString(),
                            } as any)
                            .eq('id', paymentRequest.clinic_id)
                            .select('id, name, email, plan_type')
                            .single()

                        // 2. Update payment_request to PAID
                        await supabase
                            .from('payment_requests')
                            .update({
                                status: 'PAID',
                                paid_at: new Date().toISOString(),
                            } as any)
                            .eq('id', paymentRequest.id)

                        // 3. Log payment
                        try {
                            await (supabase.from('payment_logs').insert({
                                clinic_id: paymentRequest.clinic_id,
                                payment_id: nossoNumero,
                                payment_method: 'BOLETO',
                                amount: paymentRequest.amount || 0,
                                status: 'APPROVED',
                                mercadopago_status: status,
                                raw_webhook_data: notification,
                                email_sent: false,
                            } as any) as any)
                        } catch (e: any) {
                            logger.warn({ error: e.message }, 'payment_logs insert failed (table may not exist)')
                        }

                        // 4. Create billing notification
                        try {
                            await (supabase.from('billing_notifications').insert({
                                clinic_id: paymentRequest.clinic_id,
                                type: 'PAYMENT_RECEIVED',
                                title: 'Pagamento Confirmado! 🎉',
                                message: `Recebemos seu pagamento via Boleto. Sua assinatura foi renovada até ${newDueDate.toLocaleDateString('pt-BR')}. Obrigado por confiar no CliniGo!`,
                                priority: 'HIGH',
                            } as any) as any)
                        } catch (e: any) {
                            logger.warn({ error: e.message }, 'billing_notifications insert failed')
                        }

                        // 5. Send confirmation email
                        if (clinic?.email) {
                            try {
                                await sendPaymentConfirmationEmail({
                                    to: clinic.email,
                                    clinicName: clinic.name,
                                    plan: clinic.plan_type || paymentRequest.plan_type,
                                    paymentMethod: 'BOLETO',
                                    amount: paymentRequest.amount || 0,
                                })

                                // Update payment_logs with email sent
                                try {
                                    await (supabase
                                        .from('payment_logs')
                                        .update({
                                            email_sent: true,
                                            email_sent_at: new Date().toISOString(),
                                        } as any)
                                        .eq('payment_id', nossoNumero)
                                        .eq('clinic_id', paymentRequest.clinic_id) as any)
                                } catch { /* non-blocking */ }
                            } catch (emailError) {
                                logger.warn({ error: emailError }, 'Email send failed (non-blocking)')
                            }
                        }

                        logger.info({
                            clinicId: paymentRequest.clinic_id,
                            plan: paymentRequest.plan_type,
                            paymentConfirmed: true,
                        }, 'Payment confirmed via payment_requests lookup')
                        continue
                    }

                    // ============================================
                    // STRATEGY 2: Find via subscriptions (legacy)
                    // ============================================
                    const { data: subscription } = await supabase
                        .from('subscriptions')
                        .select('id, clinic_id, plan_type, billing_cycle')
                        .eq('id', seuNumero)
                        .single() as any

                    if (subscription) {
                        logger.info({ subscriptionId: subscription.id }, 'Found subscription (legacy path)')

                        const periodEnd = subscription.billing_cycle === 'MONTHLY'
                            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

                        // Update subscription
                        await supabase
                            .from('subscriptions')
                            .update({
                                status: 'ACTIVE',
                                mp_payment_id: nossoNumero,
                                current_period_start: new Date().toISOString(),
                                current_period_end: periodEnd.toISOString(),
                                updated_at: new Date().toISOString(),
                            } as any)
                            .eq('id', seuNumero)

                        // Update clinic: set payment_confirmed + activate
                        const { data: clinic } = await supabase
                            .from('clinics')
                            .update({
                                plan_type: subscription.plan_type,
                                payment_confirmed: true,
                                payment_confirmed_at: new Date().toISOString(),
                                payment_status: 'ACTIVE',
                                is_active: true,
                                approval_status: 'active',
                                last_payment_date: new Date().toISOString(),
                                subscription_due_date: periodEnd.toISOString(),
                                updated_at: new Date().toISOString(),
                            } as any)
                            .eq('id', subscription.clinic_id)
                            .select('id, name, email, plan_type')
                            .single()

                        // Send confirmation email
                        if (clinic?.email) {
                            try {
                                await sendPaymentConfirmationEmail({
                                    to: clinic.email,
                                    clinicName: clinic.name,
                                    plan: clinic.plan_type || subscription.plan_type,
                                    paymentMethod: 'BOLETO',
                                    amount: 0,
                                })
                            } catch (emailError) {
                                logger.warn({ error: emailError }, 'Email send failed (non-blocking)')
                            }
                        }

                        logger.info({
                            clinicId: subscription.clinic_id,
                            plan: subscription.plan_type,
                            paymentConfirmed: true,
                        }, 'Subscription Activated via Inter (legacy path)')
                        continue
                    }

                    // Neither found
                    logger.warn({ nossoNumero, seuNumero }, 'No payment_request or subscription found for boleto payment')
                }
            }
        }

        return NextResponse.json({ received: true })

    } catch (error) {
        logger.error({ error }, 'Banco Inter Webhook Error')
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
