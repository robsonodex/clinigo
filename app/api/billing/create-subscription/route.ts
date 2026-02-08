/**
 * POST /api/billing/create-subscription
 * Creates a new subscription and Banco Inter billing (Boleto/Pix)
 * 
 * 🔥 CRITICAL: This enables revenue generation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { bancoInterService } from '@/lib/services/bancointer'
import { addDays, format } from 'date-fns'

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
            .select('clinic_id, email, clinics(id, name, plan_type, cnpj, address, responsible_name, phone)')
            .eq('id', userId)
            .single()

        if (userError || !(userData as any)?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const clinic = (userData as any).clinics
        // Basic Clinic Data Validation for Boleto
        if (!clinic.cnpj || !clinic.address) {
            return NextResponse.json({ error: 'CNPJ e Endereço são obrigatórios para emissão de boleto.' }, { status: 400 })
        }

        const clinicId = clinic.id

        // Prevent downgrade (basic security)
        const currentPlan = clinic.plan_type
        if (currentPlan === 'ENTERPRISE' && plan !== 'ENTERPRISE') {
            return NextResponse.json({
                error: 'Não é possível fazer downgrade. Entre em contato com suporte.'
            }, { status: 400 })
        }

        // Calculate amount
        const amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES][billing_cycle as 'MONTHLY' | 'YEARLY']

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

        // Initialize Banco Inter Payment
        try {
            const dueDate = addDays(new Date(), 3) // 3 days to pay
            const formattedDueDate = format(dueDate, 'yyyy-MM-dd')

            // Clean phone
            const phone = clinic.phone ? clinic.phone.replace(/\D/g, '') : ''
            const ddd = phone.length >= 2 ? phone.substring(0, 2) : '21'
            const number = phone.length > 2 ? phone.substring(2) : '900000000'

            const boletoData = {
                seuNumero: subscriptionId, // Using UUID as custom identifier
                cnpjCPFBeneficiario: process.env.INTER_CNPJ_BENEFICIARIO || '', // Must be set in env
                valorNominal: amount,
                dataVencimento: formattedDueDate,
                numDiasAgenda: 0,
                pagador: {
                    cpfCnpj: clinic.cnpj.replace(/\D/g, ''),
                    tipoPessoa: clinic.cnpj.replace(/\D/g, '').length > 11 ? 'JURIDICA' : 'FISICA' as any,
                    nome: clinic.responsible_name || clinic.name,
                    endereco: clinic.address || 'Endereço não informado', // Split address logic might be needed
                    numero: 'S/N', // Ideally should be separated
                    bairro: 'Centro',
                    cidade: 'Rio de Janeiro',
                    uf: 'RJ',
                    cep: '20000000', // Default if missing
                    email: (userData as any).email,
                    ddd: ddd,
                    telefone: number
                },
                mensagem: {
                    linha1: `Assinatura CliniGo ${plan}`,
                    linha2: billing_cycle === 'MONTHLY' ? 'Mensal' : 'Anual'
                }
            }

            // NOTE: Split address logic is simplified here. In production, address should be structured.
            // Assuming clinic.address might contain full info, but Inter requires splitting.
            // For now, using defaults if not structured to avoid blocking, but this MUST be improved.

            const billingResult = await bancoInterService.createBoleto(boletoData)

            // Update subscription with payment info
            await (supabase
                .from('subscriptions') as any)
                .update({
                    mp_preference_id: billingResult.nossoNumero, // Storing nossoNumero in existing column for now
                    metadata: {
                        gateway: 'BANCO_INTER',
                        nosso_numero: billingResult.nossoNumero,
                        linha_digitavel: billingResult.linhaDigitavel,
                        codigo_barras: billingResult.codigoBarras,
                        boleto_pdf: `https://cdpj.partners.bancointer.com.br/cobranca/v2/boletos/${billingResult.nossoNumero}/pdf` // Hypothetical common URL, usually client gets via API
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
                gateway: 'BANCO_INTER',
                nossoNumero: billingResult.nossoNumero
            }, 'BILLING')

            return NextResponse.json({
                subscription_id: subscriptionId,
                payment_method: 'BOLETO',
                boleto: {
                    linha_digitavel: billingResult.linhaDigitavel,
                    codigo_barras: billingResult.codigoBarras,
                    nosso_numero: billingResult.nossoNumero
                }
            })

        } catch (interError: any) {
            console.error('Inter Error:', JSON.stringify(interError.response?.data || interError))
            logger.error({ error: interError, clinicId }, 'Banco Inter Billing Failed')
            return NextResponse.json({ error: 'Erro ao gerar boleto. Verifique os dados cadastrais (CNPJ/Endereço).' }, { status: 500 })
        }

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


