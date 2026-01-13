import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mercado Pago SDK
import { MercadoPagoConfig, Preference } from 'mercadopago'

// =============================================================================
// Tipos
// =============================================================================

type PlanType = 'STARTER' | 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

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
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date')
            .eq('id', targetClinicId)
            .single()

        if (!clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // 5. Pegar plan_type
        const targetPlan = (body.plan_type || clinic.plan_type) as PlanType

        if (!PLAN_DETAILS[targetPlan]) {
            return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })
        }

        const planDetails = PLAN_DETAILS[targetPlan]

        // Se plano é STARTER, não gerar pagamento (exceto se forçarem valor manual, mas por enquanto segue a regra)
        if (planDetails.price === 0) {
            return NextResponse.json({ error: 'Plano gratuito não requer pagamento' }, { status: 400 })
        }

        // 5. Configurar Mercado Pago
        const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        if (!accessToken) {
            console.error('MERCADOPAGO_ACCESS_TOKEN não configurado')
            return NextResponse.json({ error: 'Configuração de pagamento inválida' }, { status: 500 })
        }

        const client = new MercadoPagoConfig({
            accessToken,
            options: { timeout: 5000 },
        })

        // 6. Criar preferência de pagamento
        const preference = new Preference(client)

        const preferenceData = {
            items: [
                {
                    id: `PLAN-${targetPlan}`,
                    title: `CliniGo - ${planDetails.name}`,
                    description: planDetails.description,
                    quantity: 1,
                    unit_price: planDetails.price,
                    currency_id: 'BRL',
                },
            ],
            payer: {
                name: clinic.name,
                email: user.email || 'noreply@clinigo.com.br',
            },
            back_urls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?payment=success`,
                failure: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?payment=failure`,
                pending: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/configuracoes?payment=pending`,
            },
            auto_return: 'approved' as const,
            external_reference: clinic.id,
            metadata: {
                clinic_id: clinic.id,
                plan_type: targetPlan,
                current_plan: clinic.plan_type,
            },
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/webhook`,
        }

        const response = await preference.create({ body: preferenceData })

        // 7. Salvar solicitação no banco
        const { error: insertError } = await supabase.from('payment_requests').insert({
            clinic_id: clinic.id,
            amount: planDetails.price,
            plan_type: targetPlan,
            description: `Assinatura ${planDetails.name} - Mensal`,
            mercadopago_preference_id: response.id!,
            mercadopago_init_point: response.init_point!,
            status: 'PENDING',
        } as any) // Type assertion para evitar erro com PostgrestFilterBuilder

        if (insertError) {
            console.error('Erro ao salvar payment_request:', insertError)
        }

        // 8. Retornar link de pagamento
        return NextResponse.json({
            success: true,
            payment_url: response.init_point,
            preference_id: response.id,
            plan: planDetails,
        })
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
