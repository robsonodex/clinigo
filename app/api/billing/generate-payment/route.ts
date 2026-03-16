import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { addDays, format } from 'date-fns'

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
        price: 147,
        description: 'Ideal para clínicas pequenas',
        features: ['Até 5 médicos', 'Teleconsultas', 'Agenda online'],
    },
    BASICO: {
        name: 'CliniGo Básico',
        price: 149,
        description: 'Ideal para clínicas pequenas',
        features: ['2 médicos', '100 agendamentos/mês', 'Check-in QR Code', 'Teleconsulta'],
    },
    AVANCADO: {
        name: 'CliniGo Avançado',
        price: 299,
        description: 'Para clínicas médias',
        features: ['5 médicos', '500 agendamentos/mês', 'Financeiro completo'],
    },
    PROFESSIONAL: {
        name: 'Profissional',
        price: 297,
        description: 'Para clínicas em crescimento',
        features: ['Até 10 médicos', 'Prontuário eletrônico', 'WhatsApp integrado', 'Relatórios'],
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 597,
        description: 'Solução completa para grandes clínicas',
        features: ['Médicos ilimitados', 'Todas as funcionalidades', 'Integrações avançadas', 'Suporte prioritário'],
    },
    NETWORK: {
        name: 'Network',
        price: 997,
        description: 'Para redes de clínicas',
        features: ['Multi-clínica', 'Dashboard consolidado', 'API completa', 'Suporte dedicado'],
    },
}

// =============================================================================
// API POST /api/billing/generate-payment
// =============================================================================

export async function POST(req: NextRequest) {
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
        let targetClinicId = userData?.clinic_id

        const body = await req.json()

        // Se for Super Admin, pode especificar clinic_id no body
        if (userData?.role === 'SUPER_ADMIN') {
            if (body.clinic_id) {
                targetClinicId = body.clinic_id
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

        // 4. Buscar dados da clínica alvo
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date, cnpj, address, responsible_name, phone')
            .eq('id', targetClinicId)
            .single()

        const clinic = clinicData as any

        if (!clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Validar dados necessários para boleto
        if (!clinic.cnpj) {
            return NextResponse.json({ error: 'CNPJ da clínica é obrigatório para gerar boleto' }, { status: 400 })
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
            const ddd = phone.length >= 2 ? phone.substring(0, 2) : '21'
            const number = phone.length > 2 ? phone.substring(2) : '900000000'

            // Parse address - can be a JSON object or a string
            const addr = clinic.address || {}
            const parsedAddress = typeof addr === 'string'
                ? { logradouro: addr, numero: 'S/N', bairro: 'Centro', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20000000' }
                : {
                    logradouro: String(addr.logradouro || addr.street || addr.rua || 'Rua nao informada'),
                    numero: String(addr.numero || addr.number || 'S/N'),
                    bairro: String(addr.bairro || addr.neighborhood || 'Centro'),
                    cidade: String(addr.cidade || addr.city || 'Rio de Janeiro'),
                    uf: String(addr.uf || addr.state || 'RJ'),
                    cep: String(addr.cep || addr.zipCode || addr.zip_code || '20000000').replace(/\D/g, ''),
                }

            const boletoData = {
                seuNumero: (clinic.id.replace(/-/g, '').substring(0, 8) + Date.now().toString().slice(-7)).substring(0, 15),
                valorNominal: planDetails.price,
                dataVencimento: formattedDueDate,
                numDiasAgenda: 0,
                pagador: {
                    cpfCnpj: clinic.cnpj.replace(/\D/g, ''),
                    tipoPessoa: (clinic.cnpj.replace(/\D/g, '').length > 11 ? 'JURIDICA' : 'FISICA') as 'FISICA' | 'JURIDICA',
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
                    linha2: `Assinatura Mensal`
                }
            }

            const billingResult = await bancoInterService.createBoleto(boletoData)
            if (!billingResult || !billingResult.nossoNumero) {
                console.error('Erro: Resposta do Inter inválida ou sem nossoNumero', billingResult)
                throw new Error('Falha ao gerar boleto: Resposta inválida do banco')
            }

            // 7. Salvar solicitação no banco
            const { error: insertError } = await supabase.from('payment_requests').insert({
                clinic_id: clinic.id,
                amount: planDetails.price,
                plan_type: targetPlan,
                description: `Assinatura ${planDetails.name} - Mensal`,
                mercadopago_preference_id: billingResult.nossoNumero, // Reusing column for Inter
                mercadopago_init_point: billingResult.linhaDigitavel, // Storing linha digitavel here
                status: 'PENDING',
            } as any)

            if (insertError) {
                console.error('Erro ao salvar payment_request:', insertError)
            }

            // 8. Retornar dados do boleto
            return NextResponse.json({
                success: true,
                payment_method: 'BOLETO',
                boleto: {
                    linha_digitavel: billingResult.linhaDigitavel,
                    codigo_barras: billingResult.codigoBarras,
                    nosso_numero: billingResult.nossoNumero,
                },
                plan: planDetails,
            })

        } catch (interError: any) {
            console.error('=== ERRO BANCO INTER DEBUG ===')
            console.error('Full error:', JSON.stringify(interError, Object.getOwnPropertyNames(interError), 2))
            console.error('Response data:', interError.response?.data)
            console.error('Response status:', interError.response?.status)
            console.error('Error message:', interError.message)
            console.error('=== FIM DEBUG ===')
            return NextResponse.json(
                {
                    error: 'Erro ao gerar boleto',
                    details: interError.response?.data?.message || interError.message || 'Erro desconhecido',
                },
                { status: 500 }
            )
        }

    } catch (error) {
        console.error('Erro ao gerar pagamento:', error)
        return NextResponse.json(
            {
                error: 'Erro ao gerar link de pagamento',
                details: error instanceof Error ? error.message : 'Erro desconhecido',
            },
            { status: 500 }
        )
    }
}

