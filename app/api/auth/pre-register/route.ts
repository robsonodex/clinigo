import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { Preference } from 'mercadopago'
import { PLANS, type PlanType } from '@/lib/constants/plans'

// =============================================================================
// Pre-Register API - Creates pending registration and payment preference
// =============================================================================

const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'

export async function POST(request: NextRequest) {
    try {
        console.log('[PRE-REGISTER] Starting...')
        console.log('[PRE-REGISTER] MERCADOPAGO_ACCESS_TOKEN exists:', !!MERCADOPAGO_ACCESS_TOKEN)
        console.log('[PRE-REGISTER] APP_URL:', APP_URL)

        const body = await request.json()
        console.log('[PRE-REGISTER] Body received:', {
            email: body.email,
            full_name: body.full_name,
            clinic_name: body.clinic_name,
            plan_type: body.plan_type,
            hasPassword: !!body.password,
        })

        const {
            email,
            password,
            full_name,
            clinic_name,
            cnpj,
            phone,
            responsible_phone,
            plan_type,
            address
        } = body

        // Validate required fields
        if (!email || !password || !full_name || !clinic_name || !plan_type) {
            console.log('[PRE-REGISTER] Missing fields:', { email: !email, password: !password, full_name: !full_name, clinic_name: !clinic_name, plan_type: !plan_type })
            return NextResponse.json(
                { error: 'Campos obrigatórios não preenchidos' },
                { status: 400 }
            )
        }

        // Validate plan exists
        const plan = PLANS[plan_type as PlanType]
        if (!plan) {
            console.log('[PRE-REGISTER] Invalid plan:', plan_type)
            return NextResponse.json(
                { error: 'Plano inválido' },
                { status: 400 }
            )
        }

        console.log('[PRE-REGISTER] Plan found:', plan.name, 'price:', plan.price)

        const supabase = createServiceRoleClient() as any

        // Check if email already exists in users
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single()

        if (existingUser) {
            return NextResponse.json(
                { error: 'Este email já está cadastrado. Faça login ou use outro email.' },
                { status: 409 }
            )
        }

        // Check if CNPJ already exists
        if (cnpj) {
            const { data: existingClinic } = await supabase
                .from('clinics')
                .select('id')
                .eq('cnpj', cnpj)
                .single()

            if (existingClinic) {
                return NextResponse.json(
                    { error: 'Este CNPJ já está cadastrado.' },
                    { status: 409 }
                )
            }
        }

        // Generate unique reference
        const registrationRef = `REG_${Date.now()}_${Math.random().toString(36).substring(7)}`

        // Store pending registration data
        // We use a registration_pending table to store data before payment
        const { data: pending, error: pendingError } = await supabase
            .from('registration_pending')
            .insert({
                reference: registrationRef,
                email,
                password_hash: password, // Will be hashed by Supabase Auth later
                full_name,
                clinic_name,
                cnpj,
                phone,
                responsible_phone,
                plan_type,
                address: address || null,
                status: 'PENDING',
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiration
            })
            .select('id')
            .single()

        // If table doesn't exist, continue without it (for backwards compatibility)
        if (pendingError && !pendingError.message.includes('registration_pending')) {
            console.error('[PRE-REGISTER] Error storing pending registration:', pendingError)
        }

        // Create Mercado Pago preference
        if (!MERCADOPAGO_ACCESS_TOKEN) {
            return NextResponse.json(
                { error: 'Pagamento não configurado. Entre em contato com o suporte.' },
                { status: 500 }
            )
        }

        const preference = new Preference({
            accessToken: MERCADOPAGO_ACCESS_TOKEN
        })

        // Calculate price
        const price = plan.price || 0
        if (price === 0) {
            // Free plan - just register without payment
            return NextResponse.json(
                {
                    error: 'Plano gratuito não requer pagamento. Use o cadastro normal.',
                    redirect_url: '/api/auth/register'
                },
                { status: 400 }
            )
        }

        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + 24)

        const isLocalhost = APP_URL.includes('localhost')

        const result = await preference.create({
            body: {
                metadata: {
                    registration_ref: registrationRef,
                    plan_type: plan_type,
                    email: email,
                    clinic_name: clinic_name,
                    full_name: full_name,
                    cnpj: cnpj,
                    phone: phone,
                    password_hash: password, // Will be used by webhook to create user
                    address: address ? JSON.stringify(address) : null,
                    is_new_registration: true, // Flag for webhook
                },
                items: [{
                    id: registrationRef,
                    title: `CliniGo ${plan.name} - Assinatura Mensal`,
                    description: `Assinatura do plano ${plan.name} para ${clinic_name}`,
                    quantity: 1,
                    unit_price: price,
                    currency_id: 'BRL',
                }],
                payer: {
                    email: email,
                    name: full_name,
                    phone: phone ? {
                        area_code: phone.substring(0, 2),
                        number: phone.substring(2),
                    } : undefined,
                    identification: cnpj ? {
                        type: 'CNPJ',
                        number: cnpj.replace(/\D/g, ''),
                    } : undefined,
                },
                external_reference: registrationRef,
                notification_url: isLocalhost ? undefined : `${APP_URL}/api/billing/webhook`,
                back_urls: {
                    success: `${APP_URL}/pagamento/sucesso?ref=${registrationRef}`,
                    failure: `${APP_URL}/pagamento/erro?ref=${registrationRef}`,
                    pending: `${APP_URL}/pagamento/pendente?ref=${registrationRef}`,
                },
                // auto_return only works with non-localhost URLs
                auto_return: isLocalhost ? undefined : 'approved',
                expires: true,
                expiration_date_to: expirationDate.toISOString(),
                statement_descriptor: 'CLINIGO',
                payment_methods: {
                    installments: 12,
                },
            }
        })

        if (!result?.init_point) {
            console.error('[PRE-REGISTER] Mercado Pago response:', result)
            return NextResponse.json(
                { error: 'Erro ao criar link de pagamento' },
                { status: 500 }
            )
        }

        console.log(`✅ [PRE-REGISTER] Created preference for ${email}, ref=${registrationRef}`)

        return NextResponse.json({
            success: true,
            checkout_url: result.init_point,
            sandbox_url: result.sandbox_init_point,
            reference: registrationRef,
        })

    } catch (error) {
        console.error('[PRE-REGISTER] Error:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Erro interno',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}
