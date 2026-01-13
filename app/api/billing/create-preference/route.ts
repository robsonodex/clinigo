import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { PLANS, type PlanType } from '@/lib/constants/plans'

const createPreferenceSchema = z.object({
    clinic_id: z.string().uuid(),
    plan_type: z.enum(['STARTER', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK']),
    billing_cycle: z.enum(['MONTHLY', 'ANNUAL']).default('MONTHLY'),
})

// Calculate price with annual discount (2 months free = 10 months price)
function calculatePrice(planType: PlanType, billingCycle: 'MONTHLY' | 'ANNUAL'): number {
    const plan = PLANS[planType]
    const monthlyPrice = plan.price

    if (billingCycle === 'ANNUAL') {
        return monthlyPrice * 10 // 2 months free
    }
    return monthlyPrice
}

function getPlanLabel(planType: PlanType, billingCycle: 'MONTHLY' | 'ANNUAL'): string {
    const plan = PLANS[planType]
    return billingCycle === 'ANNUAL'
        ? `${plan.name} (Anual)`
        : `${plan.name} (Mensal)`
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const data = createPreferenceSchema.parse(body)

        // Check if Mercado Pago is configured
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            return NextResponse.json({
                success: false,
                error: { message: 'Mercado Pago não configurado' }
            }, { status: 500 })
        }

        const supabase = createServiceRoleClient() as any

        // Get clinic data
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('id, name, email, responsible_name, phone, cnpj, approval_status')
            .eq('id', data.clinic_id)
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({
                success: false,
                error: { message: 'Clínica não encontrada' }
            }, { status: 404 })
        }

        // Don't allow if already active
        if (clinic.approval_status === 'active') {
            return NextResponse.json({
                success: false,
                error: { message: 'Clínica já está ativa' }
            }, { status: 400 })
        }

        // Calculate price
        const price = calculatePrice(data.plan_type, data.billing_cycle)
        const planLabel = getPlanLabel(data.plan_type, data.billing_cycle)

        // Initialize Mercado Pago
        const client = new MercadoPagoConfig({
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
        })

        const preference = new Preference(client)

        // Expiration: 24 hours
        const expirationDate = new Date()
        expirationDate.setHours(expirationDate.getHours() + 24)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // Create preference
        const result = await preference.create({
            body: {
                items: [{
                    id: data.clinic_id,
                    title: `CliniGo - ${planLabel}`,
                    description: `Assinatura CliniGo para ${clinic.name}`,
                    quantity: 1,
                    unit_price: price,
                    currency_id: 'BRL',
                }],
                payer: {
                    name: clinic.responsible_name || clinic.name,
                    email: clinic.email,
                    phone: clinic.phone ? {
                        area_code: clinic.phone.substring(0, 2),
                        number: clinic.phone.substring(2),
                    } : undefined,
                    identification: clinic.cnpj ? {
                        type: 'CNPJ',
                        number: clinic.cnpj.replace(/\D/g, ''),
                    } : undefined,
                },
                external_reference: `clinic_${data.clinic_id}`,
                notification_url: `${appUrl}/api/webhooks/mercadopago`,
                back_urls: {
                    success: `${appUrl}/pagamento/sucesso?clinic_id=${data.clinic_id}`,
                    failure: `${appUrl}/pagamento/erro?clinic_id=${data.clinic_id}`,
                    pending: `${appUrl}/pagamento/pendente?clinic_id=${data.clinic_id}`,
                },
                auto_return: 'approved',
                expires: true,
                expiration_date_to: expirationDate.toISOString(),
                statement_descriptor: 'CLINIGO',
                payment_methods: {
                    installments: 12, // Allow up to 12x
                },
            }
        })

        if (!result.id || !result.init_point) {
            console.error('[CreatePreference] Invalid MP response:', result)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao criar link de pagamento' }
            }, { status: 500 })
        }

        // Update clinic with preference ID
        await supabase
            .from('clinics')
            .update({
                mercadopago_preference_id: result.id,
                plan_type: data.plan_type,
                billing_cycle: data.billing_cycle,
            })
            .eq('id', data.clinic_id)

        console.log(`[CreatePreference] Created for clinic ${data.clinic_id}: ${result.id}`)

        return NextResponse.json({
            success: true,
            preference_id: result.id,
            init_point: result.init_point,
            sandbox_init_point: result.sandbox_init_point,
            price,
            plan_label: planLabel,
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[CreatePreference] Error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno no servidor' }
        }, { status: 500 })
    }
}
