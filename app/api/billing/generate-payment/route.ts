import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { cookies } from 'next/headers'
import { addDays, format } from 'date-fns'
import { getSeatStatus, computeMonthlyTotalCents } from '@/lib/services/seat-licensing'

// =============================================================================
// Tipos
// =============================================================================

type PlanType = 'STARTER' | 'BASIC' | 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

interface PlanDetails {
    name: string
    price: number
    description: string
    features: string[]
}

// =============================================================================
// Configuração de Planos e Preços
// =============================================================================

const PLAN_DETAILS: Record<PlanType, PlanDetails> = {
    STARTER: {
        name: 'Starter',
        price: 0,
        description: 'Plano inicial gratuito',
        features: ['Até 2 médicos', 'Agendamentos básicos'],
    },
    BASIC: {
        name: 'Básico',
        price: 99,
        description: 'Ideal para clínicas pequenas',
        features: ['Até 5 médicos', 'Teleconsultas', 'Agenda online'],
    },
    BASICO: {
        name: 'CliniGo Básico',
        price: 99,
        description: 'Ideal para clínicas pequenas',
        features: ['2 médicos', '100 agendamentos/mês', 'Check-in QR Code', 'Teleconsulta'],
    },
    AVANCADO: {
        name: 'CliniGo Avançado',
        price: 249,
        description: 'Para clínicas médias',
        features: ['5 médicos', '500 agendamentos/mês', 'Financeiro completo'],
    },
    PROFESSIONAL: {
        name: 'Profissional',
        price: 449,
        description: 'Para clínicas em crescimento',
        features: ['Até 10 médicos', 'Prontuário eletrônico', 'WhatsApp integrado', 'Relatórios'],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 699,
        description: 'Solução completa para grandes clínicas',
        features: ['Médicos ilimitados', 'Todas as funcionalidades', 'Integrações avançadas', 'Suporte prioritário'],
    },
    NETWORK: {
        name: 'Network',
        price: 999,
        description: 'Para redes de clínicas',
        features: ['Multi-clínica', 'Dashboard consolidado', 'API completa', 'Suporte dedicado'],
    },
}

// =============================================================================
// Validação Matemática de CPF e CNPJ (Módulo 11 — Receita Federal / FEBRABAN)
// =============================================================================

function isValidCpf(raw: string): boolean {
    const cpf = raw.replace(/\D/g, '')
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i), 10) * (10 - i)
    let rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    if (rev !== parseInt(cpf.charAt(9), 10)) return false
    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i), 10) * (11 - i)
    rev = 11 - (sum % 11)
    if (rev === 10 || rev === 11) rev = 0
    return rev === parseInt(cpf.charAt(10), 10)
}

function isValidCnpj(raw: string): boolean {
    const cnpj = raw.replace(/\D/g, '')
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false
    const calc = (sliceLen: number) => {
        let sum = 0
        let pos = sliceLen - 7
        for (let i = sliceLen; i >= 1; i--) {
            sum += parseInt(cnpj.charAt(sliceLen - i), 10) * pos--
            if (pos < 2) pos = 9
        }
        const res = sum % 11
        return res < 2 ? 0 : 11 - res
    }
    return calc(12) === parseInt(cnpj.charAt(12), 10) && calc(13) === parseInt(cnpj.charAt(13), 10)
}

function isValidCpfOrCnpj(raw?: string | null): boolean {
    if (!raw) return false
    const clean = raw.replace(/\D/g, '')
    if (clean.length === 11) return isValidCpf(clean)
    if (clean.length === 14) return isValidCnpj(clean)
    return false
}

// =============================================================================
// API GET /api/billing/generate-payment (Consulta boleto pendente da clínica)
// =============================================================================

export const GET = withAxiom(async (req: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const cookieStore = await cookies()
        const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value
        const targetClinicId = (userData?.role === 'SUPER_ADMIN' && impersonationClinicId)
            ? impersonationClinicId
            : userData?.clinic_id

        if (!targetClinicId) {
            return NextResponse.json({ pending_boleto: null })
        }

        const adminSupabase = createServiceRoleClient() as any
        const { data: pr } = await adminSupabase
            .from('payment_requests')
            .select('id, amount, plan_type, description, mercadopago_preference_id, mercadopago_init_point, status, created_at')
            .eq('clinic_id', targetClinicId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!pr || !pr.mercadopago_preference_id) {
            return NextResponse.json({ pending_boleto: null })
        }

        let linhaDigitavel = pr.mercadopago_init_point || ''
        if (!linhaDigitavel) {
            try {
                const details = await bancoInterService.getBoletoStatus(pr.mercadopago_preference_id)
                linhaDigitavel =
                    details?.boleto?.linhaDigitavel ||
                    details?.cobranca?.linhaDigitavel ||
                    details?.linhaDigitavel ||
                    ''
                if (linhaDigitavel) {
                    await adminSupabase
                        .from('payment_requests')
                        .update({ mercadopago_init_point: linhaDigitavel })
                        .eq('id', pr.id)
                }
            } catch {
                // Non-blocking fallback
            }
        }

        return NextResponse.json({
            pending_boleto: {
                payment_request_id: pr.id,
                nosso_numero: pr.mercadopago_preference_id,
                linha_digitavel: linhaDigitavel,
                amount: Number(pr.amount || 0),
                plan_type: pr.plan_type,
                description: pr.description,
                created_at: pr.created_at,
                public_url: `https://clinigo.app/pagar/${pr.id}`,
            }
        })
    } catch {
        return NextResponse.json({ pending_boleto: null })
    }
})

// =============================================================================
// API POST /api/billing/generate-payment
// =============================================================================

export const POST = withAxiom(async (req: AxiomRequest) => {
    try {
        const supabase = await createClient()

        // 1. Verificar autenticação
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // 2. Buscar dados do usuário
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        // 3. Determinar clínica alvo
        const cookieStore = await cookies()
        const impersonationClinicId = cookieStore.get('impersonation_clinic_id')?.value

        let targetClinicId = userData?.clinic_id

        const body = await req.json().catch(() => ({}))

        // Se for Super Admin, aceita body.clinic_id ou cookie de impersonation
        if (userData?.role === 'SUPER_ADMIN') {
            if (body.clinic_id) {
                targetClinicId = body.clinic_id
            } else if (impersonationClinicId) {
                targetClinicId = impersonationClinicId
            } else if (!targetClinicId) {
                return NextResponse.json({ error: 'clinic_id obrigatório para Super Admin' }, { status: 400 })
            }
        } else if (userData?.role === 'CLINIC_ADMIN') {
            // Clinic Admin só gera para própria clínica
            if (!targetClinicId) {
                return NextResponse.json({ error: 'Usuário não vinculado a uma clínica' }, { status: 400 })
            }
        } else {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const adminSupabase = createServiceRoleClient() as any

        // 4. Buscar dados da clínica alvo
        const { data: clinicData } = await adminSupabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date, cnpj, address, responsible_name, phone, is_demo, custom_price, seat_price_override_cents, seat_overage_waived')
            .eq('id', targetClinicId)
            .single()

        const clinic = clinicData as any

        if (!clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // 4b. Determinar e validar CPF/CNPJ do pagador (Módulo 11 — Banco Inter exige dígito verificador válido)
        const providedCpfCnpj = typeof body.cpf_cnpj === 'string' ? body.cpf_cnpj.replace(/\D/g, '') : ''
        const effectiveCpfCnpj = providedCpfCnpj || (clinic.cnpj ? String(clinic.cnpj).replace(/\D/g, '') : '')

        if (providedCpfCnpj) {
            if (!isValidCpfOrCnpj(providedCpfCnpj)) {
                return NextResponse.json(
                    {
                        error: 'O CPF ou CNPJ informado é inválido. Verifique os dígitos informados.',
                        code: 'INVALID_CPF_CNPJ',
                        current_cnpj: providedCpfCnpj,
                    },
                    { status: 400 }
                )
            }
            // Atualizar o CPF/CNPJ válido no cadastro da clínica se solicitado
            if (body.save_cnpj !== false) {
                await adminSupabase
                    .from('clinics')
                    .update({ cnpj: providedCpfCnpj })
                    .eq('id', clinic.id)
            }
        } else if (!effectiveCpfCnpj || !isValidCpfOrCnpj(effectiveCpfCnpj)) {
            const isPlaceholderDemo = effectiveCpfCnpj === '00000000000001' || clinic.is_demo
            return NextResponse.json(
                {
                    error: isPlaceholderDemo
                        ? `O CNPJ cadastrado nesta clínica (${effectiveCpfCnpj || 'vazio'}) é um número fictício de demonstração e não possui dígito verificador válido na FEBRABAN/Banco Inter. Informe um CPF ou CNPJ válido para emitir o boleto.`
                        : 'O CPF/CNPJ cadastrado na clínica está ausente ou possui dígitos verificadores inválidos. Informe um CPF ou CNPJ válido para emitir o boleto.',
                    code: 'INVALID_CPF_CNPJ',
                    current_cnpj: clinic.cnpj || '',
                },
                { status: 422 }
            )
        }

        // 5. Pegar plan_type
        const targetPlan = (body.plan_type || clinic.plan_type) as PlanType

        if (!PLAN_DETAILS[targetPlan]) {
            return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
        }

        const planDetails = PLAN_DETAILS[targetPlan]

        // Se plano é STARTER, não gerar pagamento
        if (planDetails.price === 0) {
            return NextResponse.json({ error: 'Plano gratuito não requer pagamento' }, { status: 400 })
        }

        // 6. Gerar Boleto via Banco Inter
        try {
            const dueDate = addDays(new Date(), 5) // 5 dias para pagar
            const formattedDueDate = format(dueDate, 'yyyy-MM-dd')

            // Clean phone
            const phone = clinic.phone ? clinic.phone.replace(/\D/g, '') : ''
            const ddd = phone.length >= 2 ? phone.substring(0, 2) : '15'
            const number = phone.length > 2 ? phone.substring(2) : '999999999'

            // Parse address - can be a JSON object or a string
            const addr = clinic.address || {}
            let parsedAddress = {
                logradouro: 'Rua Principal',
                numero: 'S/N',
                bairro: 'Centro',
                cidade: 'São Paulo',
                uf: 'SP',
                cep: '01000000',
            }

            if (typeof addr === 'string') {
                const parts = addr.split(',').map((s: string) => s.trim())
                const logradouro = parts[0] || 'Rua Principal'
                const numero = parts[1] || 'S/N'
                const bairro = parts[2] || 'Centro'
                const cidade = parts[3] || 'São Paulo'
                const cepMatch = addr.match(/(\d{5}-?\d{3})/)
                const cep = cepMatch ? cepMatch[1].replace(/\D/g, '') : '18213560'
                const ufMatch = addr.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i)
                const isSP = addr.toLowerCase().includes('são paulo') || addr.toLowerCase().includes('sp')
                const uf = ufMatch ? ufMatch[1].toUpperCase() : (isSP ? 'SP' : 'SP')

                parsedAddress = {
                    logradouro,
                    numero,
                    bairro,
                    cidade,
                    uf,
                    cep,
                }
            } else {
                parsedAddress = {
                    logradouro: String(addr.logradouro || addr.street || addr.rua || 'Rua Principal'),
                    numero: String(addr.numero || addr.number || 'S/N'),
                    bairro: String(addr.bairro || addr.neighborhood || 'Centro'),
                    cidade: String(addr.cidade || addr.city || 'São Paulo'),
                    uf: String(addr.uf || addr.state || 'SP'),
                    cep: String(addr.cep || addr.zipCode || addr.zip_code || '01000000').replace(/\D/g, ''),
                }
            }

            if (parsedAddress.cep.length !== 8 || /^0+$/.test(parsedAddress.cep)) {
                parsedAddress.cep = '01001000'
            }

            // Calcular valor total incluindo licenças de assento adicionais (fonte da verdade única)
            const seatStatus = await getSeatStatus(clinic.id)
            const finalPriceCents = (targetPlan && targetPlan !== clinic.plan_type)
                ? computeMonthlyTotalCents(targetPlan, clinic.custom_price, seatStatus.active_seats, {
                    seatPriceOverrideCents: clinic.seat_price_override_cents,
                    seatOverageWaived: clinic.seat_overage_waived,
                }).totalCents
                : seatStatus.total_monthly_cents
            const finalPriceReais = finalPriceCents / 100

            const boletoData = {
                seuNumero: (clinic.id.replace(/-/g, '').substring(0, 8) + Date.now().toString().slice(-7)).substring(0, 15),
                valorNominal: finalPriceReais,
                dataVencimento: formattedDueDate,
                numDiasAgenda: 0,
                pagador: {
                    cpfCnpj: effectiveCpfCnpj,
                    tipoPessoa: (effectiveCpfCnpj.length > 11 ? 'JURIDICA' : 'FISICA') as 'FISICA' | 'JURIDICA',
                    nome: String(clinic.responsible_name || clinic.name || 'Nao informado').substring(0, 100),
                    endereco: parsedAddress.logradouro.substring(0, 90),
                    numero: parsedAddress.numero.substring(0, 10),
                    bairro: parsedAddress.bairro.substring(0, 60),
                    cidade: parsedAddress.cidade.substring(0, 60),
                    uf: parsedAddress.uf.substring(0, 2),
                    cep: parsedAddress.cep.replace(/\D/g, '').substring(0, 8),
                    email: user.email || '',
                    ddd: ddd.substring(0, 2),
                    telefone: number.substring(0, 9)
                },
                mensagem: {
                    linha1: `CliniGo - Plano ${planDetails.name}`,
                    linha2: seatStatus.extra_seats > 0 ? `Assinatura + ${seatStatus.extra_seats} licenca(s) adicional(is)` : `Assinatura Mensal`
                }
            }

            const billingResult = await bancoInterService.createBoleto(boletoData)
            if (!billingResult || !billingResult.nossoNumero) {
                console.error('Erro: Resposta do Inter inválida ou sem nossoNumero', billingResult)
                throw new Error('Falha ao gerar boleto: Resposta inválida do banco')
            }

            // 7. Salvar solicitação no banco usando service role para evitar bloqueio de RLS
            const { data: newPR, error: insertError } = await adminSupabase
                .from('payment_requests')
                .insert({
                    clinic_id: clinic.id,
                    amount: finalPriceReais,
                    plan_type: targetPlan,
                    description: seatStatus.extra_seats > 0
                        ? `Assinatura ${planDetails.name} (+${seatStatus.extra_seats} lic. extras) - Mensal`
                        : `Assinatura ${planDetails.name} - Mensal`,
                    mercadopago_preference_id: billingResult.nossoNumero,
                    mercadopago_init_point: billingResult.linhaDigitavel,
                    status: 'PENDING',
                } as any)
                .select('id')
                .single()

            if (insertError) {
                console.error('Erro ao salvar payment_request:', insertError)
            }

            // 7b. Criar notificação in-app para a clínica
            try {
                await adminSupabase.from('billing_notifications').insert({
                    clinic_id: clinic.id,
                    type: 'PAYMENT_REQUEST',
                    title: 'Nova cobrança recebida',
                    message: `Foi gerada uma cobrança de R$ ${finalPriceReais.toFixed(2)} referente ao plano ${planDetails.name}${seatStatus.extra_seats > 0 ? ` com ${seatStatus.extra_seats} licença(s) adicional(is)` : ''}. Vencimento: ${format(dueDate, 'dd/MM/yyyy')}.`,
                    priority: 'HIGH'
                } as any)
            } catch (notifError) {
                req.log.error('billing/generate-payment', { error: notifError instanceof Error ? notifError.message : String(notifError) })
                console.error('Erro ao criar notificação de cobrança:', notifError)
            }

            // 8. Retornar dados do boleto
            return NextResponse.json({
                success: true,
                payment_method: 'BOLETO',
                payment_request_id: newPR?.id || null,
                public_url: newPR?.id ? `https://clinigo.app/pagar/${newPR.id}` : null,
                amount: finalPriceReais,
                due_date: formattedDueDate,
                boleto: {
                    linha_digitavel: billingResult.linhaDigitavel,
                    codigo_barras: billingResult.codigoBarras,
                    nosso_numero: billingResult.nossoNumero,
                    pix_copia_e_cola: billingResult.pixCopiaECola || '',
                },
                plan: planDetails,
            })

        } catch (interError: any) {
            const interViolations = interError?.response?.data?.violacoes
            const firstViolationReason = Array.isArray(interViolations) && interViolations.length > 0
                ? interViolations.map((v: any) => `${v.razao || v.propriedade || ''}`).filter(Boolean).join(' ')
                : null

            req.log.error('billing/generate-payment', {
                error: firstViolationReason || (interError instanceof Error ? interError.message : String(interError)),
            })

            const isCpfCnpjViolation = Array.isArray(interViolations) && interViolations.some(
                (v: any) => String(v.propriedade || '').toLowerCase().includes('cpfcnpj')
            )

            if (isCpfCnpjViolation) {
                return NextResponse.json(
                    {
                        error: firstViolationReason || 'O CPF/CNPJ informado não foi aceito pelo Banco Inter.',
                        code: 'INVALID_CPF_CNPJ',
                        current_cnpj: effectiveCpfCnpj,
                    },
                    { status: 422 }
                )
            }

            return NextResponse.json(
                {
                    error: firstViolationReason || 'Erro ao gerar boleto junto ao Banco Inter',
                    details: firstViolationReason || interError.response?.data?.detail || interError.response?.data?.message || interError.message || 'Erro desconhecido',
                },
                { status: interError?.response?.status === 400 ? 400 : 500 }
            )
        }

    } catch (error) {
        req.log.error('billing/generate-payment', { error: error instanceof Error ? error.message : String(error) })
        console.error('Erro ao gerar pagamento:', error)
        return NextResponse.json(
            {
                error: 'Erro ao gerar cobrança',
                details: error instanceof Error ? error.message : 'Erro desconhecido',
            },
            { status: 500 }
        )
    }
})
