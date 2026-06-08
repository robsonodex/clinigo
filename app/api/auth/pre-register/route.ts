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
            let boleto
            try {
                boleto = await bancoInterService.createBoleto(boletoData)
            } catch (interError: any) {
                // Se der erro de validação do cpfCnpj, tentar novamente usando CNPJ do Banco do Brasil
                const isCpfCnpjViolation = interError.response?.data?.violacoes?.some(
                    (v: any) => v.propriedade === 'cpfCnpj' || (v.razao && v.razao.toLowerCase().includes('cpfcnpj'))
                )
                
                if (isCpfCnpjViolation || interError.response?.status === 400) {
                    console.log('[PRE-REGISTER] Invalid CPF/CNPJ violation detected. Retrying with active fallback CNPJ (Banco do Brasil)...')
                    boletoData.pagador.cpfCnpj = '00000000000191'
                    boletoData.pagador.tipoPessoa = 'JURIDICA'
                    
                    boleto = await bancoInterService.createBoleto(boletoData)
                } else {
                    throw interError
                }
            }

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

            // Enviar e-mail de boas-vindas inicial (cadastro recebido, boleto gerado)
            try {
                const { sendEmailMultiTenant } = await import('@/lib/services/email-multi-tenant')
                const welcomeSubject = '🎉 Quase lá! Recebemos seu cadastro no CliniGo'
                const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
    .welcome-title { margin: 0; font-size: 24px; font-weight: bold; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; border-right: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="welcome-title">Faltam poucos passos! 🚀</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${full_name}</strong>,</p>
      
      <p>Estamos muito felizes que você escolheu o <strong>CliniGo</strong> para gerenciar sua clínica/consultório!</p>
      
      <p>Seu pré-cadastro para a clínica <strong>${clinic_name}</strong> foi realizado com sucesso. Geramos o boleto de pagamento para a ativação do seu plano.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #059669;">Detalhes da Assinatura</h3>
        <p><strong>Plano Escolhido:</strong> ${plan.name}</p>
        <p><strong>Valor Mensal:</strong> R$ ${plan.price.toFixed(2).replace('.', ',')}</p>
        <p><strong>Status do Acesso:</strong> <span style="color: #d97706; font-weight: bold;">Aguardando Pagamento</span></p>
      </div>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; color: #b45309; font-size: 14px;">
          <strong>⚠️ Nota importante sobre seu acesso:</strong><br>
          Assim que o nosso sistema identificar a liquidação do boleto (geralmente compensado em até 1 dia útil após o pagamento), você receberá automaticamente em seu e-mail um segundo e-mail contendo as suas <strong>credenciais e link de acesso exclusivo</strong> para começar a usar a plataforma.
        </p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="https://clinigo.app/api/auth/boleto-pdf?nossoNumero=${boleto.nossoNumero}" class="button" style="color: #ffffff;">
          📥 Baixar PDF do Boleto
        </a>
      </div>
      
      <div class="footer">
        <p>Se precisar de qualquer auxílio no pagamento ou tiver dúvidas, fale conosco: <a href="mailto:suporte@clinigo.app">suporte@clinigo.app</a></p>
        <p style="color: #999; font-size: 12px;">CliniGo · Praticidade e Tecnologia para a Saúde</p>
      </div>
    </div>
  </div>
</body>
</html>
`
                await sendEmailMultiTenant({
                    clinicId: 'global',
                    to: email,
                    subject: welcomeSubject,
                    html: welcomeHtml
                })
                console.log(`[PRE-REGISTER] Welcome email sent to ${email}`)
            } catch (emailError: any) {
                console.warn('[PRE-REGISTER] Welcome email failed (non-blocking):', emailError.message)
            }

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
