import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendPaymentConfirmationEmail } from '@/lib/services/email-payment'
import { generateSlug } from '@/lib/utils/slug'
import { PLANS, type PlanType } from '@/lib/constants/plans'

// =============================================================================
// Webhook Mercado Pago - Payment Confirmation System v3.3.0
// =============================================================================

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN

// Handle new registration after payment approval
async function handleNewRegistration(supabase: any, payment: any, paymentId: string) {
    const metadata = payment.metadata
    const amount = payment.transaction_amount || 0
    const paymentMethod = payment.payment_type_id || 'unknown'

    console.log('🆕 [WEBHOOK] Processing NEW REGISTRATION:', {
        email: metadata.email,
        clinic_name: metadata.clinic_name,
        plan_type: metadata.plan_type
    })

    try {
        // 1. Check if already processed (idempotency)
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', metadata.email)
            .single()

        if (existingUser) {
            console.log('⚠️ [WEBHOOK] User already exists, skipping creation')
            return NextResponse.json({
                received: true,
                message: 'User already exists',
                user_id: existingUser.id
            })
        }

        // 2. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: metadata.email,
            password: metadata.password_hash,
            email_confirm: true,
            user_metadata: {
                full_name: metadata.full_name,
                role: 'CLINIC_ADMIN'
            }
        })

        if (authError) {
            console.error('❌ [WEBHOOK] Error creating auth user:', authError)
            throw new Error(`Auth error: ${authError.message}`)
        }

        const userId = authData.user.id

        // 3. Parse address if present
        let address = null
        if (metadata.address) {
            try {
                address = typeof metadata.address === 'string'
                    ? JSON.parse(metadata.address)
                    : metadata.address
            } catch (e) {
                console.warn('Could not parse address:', e)
            }
        }

        // Format address as string for clinic
        let addressString = null
        if (address) {
            const parts = [address.street, address.number, address.complement, address.neighborhood, address.city, address.state].filter(Boolean)
            addressString = parts.join(', ')
        }

        // 4. Create clinic
        const slug = generateSlug(metadata.clinic_name)
        const planType = metadata.plan_type || 'BASICO'

        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .insert({
                name: metadata.clinic_name,
                slug: slug,
                email: metadata.email,
                phone: metadata.phone,
                cnpj: metadata.cnpj,
                address: addressString,
                plan_type: planType,
                plan_limits: PLANS[planType as PlanType]?.limits || PLANS.BASICO.limits,
                is_active: true,
                approval_status: 'active',
                payment_confirmed: true,
                payment_confirmed_at: new Date().toISOString(),
                payment_method: paymentMethod.toUpperCase(),
                mercadopago_payment_id: paymentId.toString(),
                payment_status: 'ACTIVE',
                last_payment_date: new Date().toISOString(),
                subscription_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .select('id, name, email')
            .single()

        if (clinicError) {
            console.error('❌ [WEBHOOK] Error creating clinic:', clinicError)
            // Rollback: delete auth user
            await supabase.auth.admin.deleteUser(userId)
            throw new Error(`Clinic error: ${clinicError.message}`)
        }

        // 5. Create user record
        const { error: userError } = await supabase
            .from('users')
            .insert({
                id: userId,
                email: metadata.email,
                full_name: metadata.full_name,
                role: 'CLINIC_ADMIN',
                clinic_id: clinic.id,
            })

        if (userError) {
            console.error('❌ [WEBHOOK] Error creating user record:', userError)
            // Don't rollback - clinic was already created
        }

        // 6. Log payment
        await supabase.from('payment_logs').insert({
            clinic_id: clinic.id,
            payment_id: paymentId.toString(),
            payment_method: paymentMethod.toUpperCase(),
            amount: amount,
            status: 'APPROVED',
            mercadopago_status: payment.status,
            raw_webhook_data: payment,
            email_sent: false
        })

        // 7. Update registration_pending if exists
        if (metadata.registration_ref) {
            await supabase
                .from('registration_pending')
                .update({
                    status: 'PAID',
                    processed_at: new Date().toISOString(),
                    mercadopago_payment_id: paymentId.toString()
                })
                .eq('reference', metadata.registration_ref)
        }

        // 8. Send confirmation email
        if (clinic.email) {
            try {
                await sendPaymentConfirmationEmail({
                    to: clinic.email,
                    clinicName: clinic.name,
                    plan: planType,
                    paymentMethod: paymentMethod,
                    amount: amount
                })
            } catch (e) {
                console.warn('Email send failed:', e)
            }
        }

        console.log(`✅ [WEBHOOK] NEW REGISTRATION complete: clinic=${clinic.id}, user=${userId}`)

        return NextResponse.json({
            received: true,
            processed: true,
            new_registration: true,
            clinic_id: clinic.id,
            user_id: userId
        })

    } catch (error) {
        console.error('❌ [WEBHOOK] handleNewRegistration error:', error)
        return NextResponse.json(
            { error: 'Failed to process new registration', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        )
    }
}


export async function POST(req: NextRequest) {
    try {
        const supabase = createServiceRoleClient() as any

        // 1. Parse webhook data
        const body = await req.json()
        const { type, data } = body

        console.log('📥 [WEBHOOK] Mercado Pago received:', { type, data })

        // Ignore non-payment notifications
        if (type !== 'payment') {
            return NextResponse.json({ received: true })
        }

        // 2. Get payment ID
        const paymentId = data.id
        if (!paymentId) {
            console.error('❌ [WEBHOOK] Payment ID missing')
            return NextResponse.json({ error: 'Payment ID missing' }, { status: 400 })
        }

        // 3. Fetch payment details from Mercado Pago API
        let payment: any = null
        if (MERCADOPAGO_ACCESS_TOKEN) {
            try {
                const mpResponse = await fetch(
                    `https://api.mercadopago.com/v1/payments/${paymentId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`
                        }
                    }
                )
                if (mpResponse.ok) {
                    payment = await mpResponse.json()
                    console.log('📦 [WEBHOOK] Payment details from MP:', {
                        id: payment.id,
                        status: payment.status,
                        payment_type: payment.payment_type_id,
                        amount: payment.transaction_amount,
                        metadata: payment.metadata
                    })
                }
            } catch (error) {
                console.error('⚠️ [WEBHOOK] Could not fetch payment from MP API:', error)
            }
        }

        // 4. Check if this is a NEW REGISTRATION payment
        const isNewRegistration = payment?.metadata?.is_new_registration === true ||
            payment?.metadata?.is_new_registration === 'true'

        if (isNewRegistration && payment?.status === 'approved') {
            // Process new clinic registration
            return await handleNewRegistration(supabase, payment, paymentId)
        }

        // 5. Get clinic_id from various sources (for existing clinics)
        let clinicId: string | null = null

        // Try metadata first (from create-preference)
        if (payment?.metadata?.clinic_id) {
            clinicId = payment.metadata.clinic_id
        }
        // Try external_reference (format: clinic_<uuid>)
        if (!clinicId && payment?.external_reference) {
            const match = payment.external_reference.match(/clinic_([a-f0-9-]+)/i)
            if (match) clinicId = match[1]
        }
        // Try from body
        if (!clinicId && body.external_reference) {
            const match = body.external_reference.match(/clinic_([a-f0-9-]+)/i)
            if (match) clinicId = match[1]
        }

        // 5. Fallback: Look up payment_request in database
        if (!clinicId) {
            const { data: paymentRequest } = await supabase
                .from('payment_requests')
                .select('clinic_id')
                .eq('mercadopago_payment_id', paymentId)
                .single()

            if (paymentRequest) {
                clinicId = paymentRequest.clinic_id
            } else {
                // Try by preference_id
                const preferenceId = body.preference_id || data.preference_id || payment?.preference_id
                if (preferenceId) {
                    const { data: pr } = await supabase
                        .from('payment_requests')
                        .select('id, clinic_id')
                        .eq('mercadopago_preference_id', preferenceId)
                        .single()

                    if (pr) {
                        clinicId = pr.clinic_id
                        // Update with payment_id for future lookups
                        await supabase
                            .from('payment_requests')
                            .update({ mercadopago_payment_id: paymentId })
                            .eq('id', pr.id)
                    }
                }
            }
        }

        if (!clinicId) {
            console.error('❌ [WEBHOOK] clinic_id not found in webhook data')
            return NextResponse.json({ error: 'clinic_id not found' }, { status: 400 })
        }

        // 6. Get payment status
        const status = payment?.status || data.status || body.status
        const paymentMethod = payment?.payment_type_id || data.payment_type_id || 'unknown'
        const amount = payment?.transaction_amount || data.transaction_amount || 0

        console.log(`📊 [WEBHOOK] Processing: clinic=${clinicId}, status=${status}, method=${paymentMethod}`)

        // 7. Map status to internal values
        let paymentStatus = 'PENDING'
        let paymentConfirmed = false

        if (status === 'approved') {
            paymentStatus = 'APPROVED'
            paymentConfirmed = true
        } else if (status === 'rejected') {
            paymentStatus = 'REJECTED'
        } else if (status === 'cancelled') {
            paymentStatus = 'CANCELLED'
        } else if (status === 'in_process' || status === 'pending') {
            paymentStatus = 'PENDING'
        }

        // 8. Get clinic for email
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, email, plan_type')
            .eq('id', clinicId)
            .single()

        if (clinicError || !clinic) {
            console.error('❌ [WEBHOOK] Clinic not found:', clinicId)
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
        }

        // 9. Update clinic with payment information
        const newDueDate = new Date()
        newDueDate.setDate(newDueDate.getDate() + 30)

        const updateData: any = {
            payment_status: paymentConfirmed ? 'ACTIVE' : paymentStatus,
            mercadopago_payment_id: paymentId.toString(),
            payment_method: paymentMethod.toUpperCase(),
            updated_at: new Date().toISOString()
        }

        if (paymentConfirmed) {
            updateData.payment_confirmed = true
            updateData.payment_confirmed_at = new Date().toISOString()
            updateData.subscription_due_date = newDueDate.toISOString()
            updateData.last_payment_date = new Date().toISOString()
            updateData.is_active = true
            updateData.approval_status = 'active'
        }

        const { error: updateError } = await supabase
            .from('clinics')
            .update(updateData)
            .eq('id', clinicId)

        if (updateError) {
            console.error('❌ [WEBHOOK] Error updating clinic:', updateError)
            throw updateError
        }

        // 10. Log to payment_logs table
        await supabase.from('payment_logs').insert({
            clinic_id: clinicId,
            payment_id: paymentId.toString(),
            payment_method: paymentMethod.toUpperCase(),
            amount: amount,
            status: paymentStatus,
            mercadopago_status: status,
            raw_webhook_data: payment || body,
            email_sent: false
        })

        // 11. Also update payment_requests if exists
        const { data: existingPR } = await supabase
            .from('payment_requests')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (existingPR && paymentConfirmed) {
            await supabase
                .from('payment_requests')
                .update({
                    status: 'PAID',
                    paid_at: new Date().toISOString(),
                    mercadopago_payment_id: paymentId.toString()
                })
                .eq('id', existingPR.id)
        }

        // 12. Create billing notification
        if (paymentConfirmed) {
            await supabase.from('billing_notifications').insert({
                clinic_id: clinicId,
                type: 'PAYMENT_RECEIVED',
                title: 'Pagamento Confirmado! 🎉',
                message: `Recebemos seu pagamento de R$ ${amount.toFixed(2)}. Sua assinatura foi renovada até ${newDueDate.toLocaleDateString('pt-BR')}. Obrigado por confiar no CliniGo!`,
                priority: 'HIGH',
            })
        } else if (status === 'rejected' || status === 'cancelled') {
            await supabase.from('billing_notifications').insert({
                clinic_id: clinicId,
                type: 'PAYMENT_FAILED',
                title: 'Pagamento não processado',
                message: 'Não foi possível processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.',
                priority: 'HIGH',
            })
        }

        // 13. Create payment_history record
        if (paymentConfirmed) {
            await supabase.from('payment_history').insert({
                clinic_id: clinicId,
                amount: amount,
                plan_type: clinic.plan_type,
                mercadopago_payment_id: paymentId.toString(),
                paid_at: new Date().toISOString(),
                subscription_extended_until: newDueDate.toISOString(),
            }).catch((e: Error) => {
                // payment_history may not exist, silently fail
                console.log('[WEBHOOK] payment_history insert skipped:', e.message)
            })
        }

        // 14. Send confirmation email if approved
        if (paymentConfirmed && clinic.email) {
            try {
                await sendPaymentConfirmationEmail({
                    to: clinic.email,
                    clinicName: clinic.name,
                    plan: clinic.plan_type,
                    paymentMethod: paymentMethod,
                    amount: amount
                })

                // Update payment_logs with email sent status
                await supabase
                    .from('payment_logs')
                    .update({
                        email_sent: true,
                        email_sent_at: new Date().toISOString()
                    })
                    .eq('payment_id', paymentId.toString())
                    .eq('clinic_id', clinicId)
            } catch (emailError) {
                console.error('⚠️ [WEBHOOK] Email send failed:', emailError)
                // Don't fail the webhook if email fails
            }
        }

        console.log(`✅ [WEBHOOK] Processed: clinic=${clinicId}, confirmed=${paymentConfirmed}`)

        return NextResponse.json({
            received: true,
            processed: true,
            payment_confirmed: paymentConfirmed,
            clinic_id: clinicId
        })

    } catch (error) {
        console.error('❌ [WEBHOOK] Error:', error)
        return NextResponse.json(
            {
                error: 'Webhook processing error',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
