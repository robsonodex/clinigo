import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { bancoInterService } from '@/lib/services/bancointer'
import { addDays, format } from 'date-fns'

// =============================================================================
// Tipos
// =============================================================================

type PlanType = 'STARTER' | 'BASIC' | 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE' | 'NETWORK'

const PLAN_PRICES: Record<string, number> = {
    STARTER: 0,
    BASIC: 99,
    BASICO: 99,
    AVANCADO: 249,
    PROFESSIONAL: 449,
    ENTERPRISE: 699,
    NETWORK: 999,
}

const PLAN_NAMES: Record<string, string> = {
    STARTER: 'Starter',
    BASIC: 'Básico',
    BASICO: 'CliniGo Básico',
    AVANCADO: 'CliniGo Avançado',
    PROFESSIONAL: 'Profissional',
    ENTERPRISE: 'Enterprise',
    NETWORK: 'Network',
}

// =============================================================================
// POST /api/billing/generate-payment-link
// Gera boleto para uma clínica e retorna link público para pagamento
// Apenas SUPER_ADMIN pode usar
// =============================================================================

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. Verificar autenticação e permissão
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Acesso restrito a Super Administradores' }, { status: 403 })
        }

        // 2. Extrair clinic_id do body
        const body = await req.json()
        const { clinic_id } = body

        if (!clinic_id) {
            return NextResponse.json({ error: 'clinic_id é obrigatório' }, { status: 400 })
        }

        // 3. Buscar dados da clínica
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('id, name, plan_type, subscription_due_date, cnpj, address, responsible_name, phone, email')
            .eq('id', clinic_id)
            .single()

        const clinic = clinicData as any
        if (!clinic) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (!clinic.cnpj) {
            return NextResponse.json({ error: 'CNPJ da clínica é obrigatório para gerar boleto' }, { status: 400 })
        }

        const planType = clinic.plan_type as PlanType
        const price = PLAN_PRICES[planType] || 0
        const planName = PLAN_NAMES[planType] || planType

        if (price === 0) {
            return NextResponse.json({ error: 'Plano gratuito não requer pagamento' }, { status: 400 })
        }

        // 4. Verificar se já existe um payment_request PENDING para essa clínica
        const { data: existingPR } = await supabase
            .from('payment_requests')
            .select('id, mercadopago_preference_id, mercadopago_init_point, amount, created_at')
            .eq('clinic_id', clinic_id)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle() as any

        if (existingPR && existingPR.mercadopago_preference_id) {
            // Já existe boleto pendente — retornar link existente
            const publicLink = `https://clinigo.app/pagar/${existingPR.id}`

            return NextResponse.json({
                success: true,
                reused: true,
                link: publicLink,
                payment_request_id: existingPR.id,
                linha_digitavel: existingPR.mercadopago_init_point,
                amount: existingPR.amount,
                clinic_name: clinic.name,
                plan_name: planName,
            })
        }

        // 5. Gerar novo boleto via Banco Inter
        const dueDate = addDays(new Date(), 5)
        const formattedDueDate = format(dueDate, 'yyyy-MM-dd')

        const phone = clinic.phone ? clinic.phone.replace(/\D/g, '') : ''
        const ddd = phone.length >= 2 ? phone.substring(0, 2) : '21'
        const number = phone.length > 2 ? phone.substring(2) : '900000000'

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
            valorNominal: price,
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
                email: clinic.email || user.email || '',
                ddd: ddd.substring(0, 2),
                telefone: number.substring(0, 9),
            },
            mensagem: {
                linha1: `CliniGo - Plano ${planName}`,
                linha2: `Assinatura Mensal`,
            },
        }

        const billingResult = await bancoInterService.createBoleto(boletoData)
        if (!billingResult || !billingResult.nossoNumero) {
            console.error('Erro: Resposta do Inter inválida', billingResult)
            throw new Error('Falha ao gerar boleto: Resposta inválida do banco')
        }

        // 6. Salvar payment_request
        const { data: newPR, error: insertError } = await supabase.from('payment_requests').insert({
            clinic_id: clinic.id,
            amount: price,
            plan_type: planType,
            description: `Assinatura ${planName} - Mensal`,
            mercadopago_preference_id: billingResult.nossoNumero,
            mercadopago_init_point: billingResult.linhaDigitavel,
            status: 'PENDING',
        } as any).select('id').single()

        if (insertError) {
            console.error('Erro ao salvar payment_request:', insertError)
            return NextResponse.json({ error: 'Erro ao salvar registro de pagamento' }, { status: 500 })
        }

        // 7. Criar notificação in-app para a clínica
        try {
            const adminSupabase = createServiceRoleClient()
            await adminSupabase.from('billing_notifications').insert({
                clinic_id: clinic.id,
                type: 'PAYMENT_REQUEST',
                title: '💰 Nova cobrança recebida',
                message: `Foi gerada uma cobrança de R$ ${price.toFixed(2)} referente ao plano ${planName}. Vencimento: ${format(dueDate, 'dd/MM/yyyy')}.`,
                priority: 'HIGH',
            } as any)
        } catch (notifError) {
            console.error('Erro ao criar notificação:', notifError)
        }

        // 8. Retornar link público
        const publicLink = `https://clinigo.app/pagar/${(newPR as any).id}`

        return NextResponse.json({
            success: true,
            reused: false,
            link: publicLink,
            payment_request_id: (newPR as any).id,
            linha_digitavel: billingResult.linhaDigitavel,
            amount: price,
            clinic_name: clinic.name,
            plan_name: planName,
        })

    } catch (error: any) {
        console.error('[Generate Payment Link]', error.message)
        return NextResponse.json({
            error: error.message || 'Erro ao gerar link de pagamento',
        }, { status: 500 })
    }
}
