import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { PLANS, type PlanType } from '@/lib/constants/plans'
import { addDays, format } from 'date-fns'

// =============================================================================
// Pre-Register API - Creates pending registration and generates Banco Inter boleto
// =============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'

export async function POST(request: NextRequest) {
    try {
        console.log('[PRE-REGISTER] Starting...')

        const body = await request.json()
        console.log('[PRE-REGISTER] Body received:', {
            email: body.email,
            full_name: body.full_name,
            clinic_name: body.clinic_name,
            plan_type: body.plan_type,
            hasPassword: !!body.password,
            referral_code: body.referral_code || null,
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
            address,
            referral_code
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

        // Free plan - no payment needed
        if (!plan.price || plan.price === 0) {
            return NextResponse.json(
                { error: 'Plano gratuito não requer pagamento. Use o cadastro normal.' },
                { status: 400 }
            )
        }

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
                referral_code: referral_code || null,
                payment_method: 'BOLETO',
                status: 'PENDING',
                expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h expiration for boleto
            })
            .select('id')
            .single()

        if (pendingError) {
            console.error('[PRE-REGISTER] Error storing pending registration:', pendingError)
            return NextResponse.json(
                { error: 'Erro ao salvar dados do pré-cadastro.' },
                { status: 500 }
            )
        }

        console.log('[PRE-REGISTER] Pending registration saved:', pending?.id)

        // =====================================================================
        // Generate Boleto via Banco Inter
        // =====================================================================
        try {
            const dueDate = addDays(new Date(), 5) // 5 days to pay
            const formattedDueDate = format(dueDate, 'yyyy-MM-dd')

            // Clean phone for boleto
            const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
            const ddd = cleanPhone.length >= 2 ? cleanPhone.substring(0, 2) : '21'
            const phoneNumber = cleanPhone.length > 2 ? cleanPhone.substring(2) : '900000000'

            // Parse address for boleto
            const addr = address || {}
            const parsedAddress = {
                logradouro: String(addr.street || addr.logradouro || 'Rua nao informada').substring(0, 90),
                numero: String(addr.number || addr.numero || 'S/N').substring(0, 10),
                bairro: String(addr.neighborhood || addr.bairro || 'Centro').substring(0, 60),
                cidade: String(addr.city || addr.cidade || 'Rio de Janeiro').substring(0, 60),
                uf: String(addr.state || addr.uf || 'RJ').substring(0, 2),
                cep: String(addr.zip || addr.cep || '20000000').replace(/\D/g, '').substring(0, 8),
            }

            // seuNumero must be max 15 chars
            const seuNumero = ('REG' + Date.now().toString().slice(-12)).substring(0, 15)

            // Determine pagador type
            const cleanCnpj = cnpj ? cnpj.replace(/\D/g, '') : ''
            const tipoPessoa = cleanCnpj.length > 11 ? 'JURIDICA' : 'FISICA'

            const boletoData = {
                seuNumero,
                valorNominal: plan.price,
                dataVencimento: formattedDueDate,
                numDiasAgenda: 5,
                pagador: {
                    cpfCnpj: cleanCnpj || '00000000000',
                    tipoPessoa: tipoPessoa as 'FISICA' | 'JURIDICA',
                    nome: String(full_name || clinic_name || 'Nao informado').substring(0, 100),
                    endereco: parsedAddress.logradouro,
                    numero: parsedAddress.numero,
                    bairro: parsedAddress.bairro,
                    cidade: parsedAddress.cidade,
                    uf: parsedAddress.uf,
                    cep: parsedAddress.cep,
                    email: email,
                    ddd: ddd,
                    telefone: phoneNumber,
                },
                mensagem: {
                    linha1: `CliniGo - Plano ${plan.name}`,
                    linha2: `Cadastro: ${clinic_name}`,
                },
            }

            console.log('[PRE-REGISTER] Generating boleto via Banco Inter...')
            const boleto = await bancoInterService.createBoleto(boletoData)

            if (!boleto || !boleto.nossoNumero) {
                console.error('[PRE-REGISTER] Invalid Inter response:', boleto)
                throw new Error('Resposta inválida do banco')
            }

            console.log('[PRE-REGISTER] Boleto generated:', boleto.nossoNumero)

            // Update registration_pending with boleto data
            await supabase
                .from('registration_pending')
                .update({
                    boleto_nosso_numero: boleto.nossoNumero,
                    boleto_linha_digitavel: boleto.linhaDigitavel,
                    boleto_codigo_barras: boleto.codigoBarras,
                    mercadopago_preference_id: boleto.nossoNumero, // Keep compatibility with webhook lookup
                })
                .eq('id', pending.id)

            // Also save in payment_requests for webhook processing
            try {
                await (supabase.from('payment_requests').insert({
                    clinic_id: null, // Clinic not created yet
                    amount: plan.price,
                    plan_type: plan_type,
                    description: `Cadastro ${plan.name} - ${clinic_name}`,
                    mercadopago_preference_id: boleto.nossoNumero,
                    mercadopago_init_point: boleto.linhaDigitavel,
                    status: 'PENDING',
                } as any) as any)
            } catch (e: any) {
                console.warn('[PRE-REGISTER] payment_requests insert failed (non-blocking):', e.message)
            }

            console.log(`✅ [PRE-REGISTER] Boleto created for ${email}, ref=${registrationRef}`)

            return NextResponse.json({
                success: true,
                payment_method: 'BOLETO',
                reference: registrationRef,
                boleto: {
                    linha_digitavel: boleto.linhaDigitavel,
                    codigo_barras: boleto.codigoBarras,
                    nosso_numero: boleto.nossoNumero,
                },
                plan: {
                    name: plan.name,
                    price: plan.price,
                },
                due_date: formattedDueDate,
            })

        } catch (interError: any) {
            console.error('=== ERRO BANCO INTER (PRE-REGISTER) ===')
            console.error('Full error:', JSON.stringify(interError, Object.getOwnPropertyNames(interError), 2))
            console.error('Response data:', interError.response?.data)
            console.error('Response status:', interError.response?.status)
            console.error('=== FIM DEBUG ===')

            return NextResponse.json(
                {
                    error: 'Erro ao gerar boleto de pagamento',
                    details: interError.response?.data?.message || interError.message || 'Erro desconhecido',
                },
                { status: 500 }
            )
        }

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
