/**
 * Commission Service - CliniGo
 * MODELO: COMISSÃO ÚNICA POR VENDA (não recorrente)
 * 
 * Regras:
 * - Parceiro recebe 30% da PRIMEIRA mensalidade UMA VEZ
 * - Se não vender, não recebe nada
 * - SEM renda passiva ou recorrência
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { PLANS, type PlanType } from '@/lib/constants/plans'

export interface PendingPayment {
    partner_id: string
    partner_name: string
    pix_key: string
    pix_key_type: string
    cpf: string
    cnpj: string | null
    total_amount: number
    commissions: CommissionDetail[]
}

export interface CommissionDetail {
    id: string
    clinic_name: string
    subscription_plan: string
    subscription_amount: number
    commission_amount: number
    sale_month: string // Mês da VENDA, não da cobrança
}

/**
 * Calcula comissões das vendas do MÊS ANTERIOR
 * Executar via cron todo dia 1 do mês
 * 
 * IMPORTANTE: Só calcula comissão UMA VEZ por venda
 * - Busca clinic_referrals com commission_status = 'PENDING' e first_payment_date não nulo
 * - Cria uma comissão por venda
 * - Marca o referral como 'PAID' para nunca mais processar
 */
export async function calculateMonthlyCommissions(): Promise<{
    success: boolean
    commissions_created: number
    total_amount: number
    error?: string
}> {
    const supabase = createServiceRoleClient()

    try {
        // Mês anterior (mês das vendas)
        const lastMonth = new Date()
        lastMonth.setMonth(lastMonth.getMonth() - 1)
        lastMonth.setDate(1)
        lastMonth.setHours(0, 0, 0, 0)

        const firstDayLastMonth = lastMonth.toISOString().split('T')[0]
        const lastDayLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0)
            .toISOString().split('T')[0]

        console.log(`[COMMISSION] Calculando comissões ÚNICAS das vendas de ${firstDayLastMonth}`)

        // 1. Buscar vendas do mês anterior que:
        //    - Ainda não geraram comissão (commission_status = 'PENDING')
        //    - Clínica já pagou primeira mensalidade (first_payment_date não é null)
        const { data: referrals, error: referralsError } = await supabase
            .from('clinic_referrals')
            .select(`
                id,
                clinic_id,
                partner_id,
                referral_code_used,
                registration_date,
                first_payment_date,
                clinic:clinics(
                    id,
                    name,
                    plan_type,
                    subscription_status
                ),
                partner:partners(
                    id,
                    commission_rate,
                    status
                )
            `)
            .eq('commission_status', 'PENDING')
            .not('first_payment_date', 'is', null)
            .gte('registration_date', firstDayLastMonth)
            .lte('registration_date', lastDayLastMonth)

        if (referralsError) {
            console.error('[COMMISSION] Erro ao buscar referrals:', referralsError)
            return { success: false, commissions_created: 0, total_amount: 0, error: referralsError.message }
        }

        if (!referrals || referrals.length === 0) {
            console.log('[COMMISSION] Nenhuma venda pendente encontrada para o período')
            return { success: true, commissions_created: 0, total_amount: 0 }
        }

        const commissions: any[] = []
        const referralIdsToUpdate: string[] = []

        // 2. Para cada venda, criar registro de comissão ÚNICA
        for (const ref of referrals) {
            const clinic = ref.clinic as any
            const partner = ref.partner as any

            // Validações
            if (!clinic || !partner) continue
            if (partner.status !== 'ACTIVE') continue

            // Pegar preço do plano
            const planType = clinic.plan_type as PlanType
            const planConfig = PLANS[planType]

            if (!planConfig) {
                console.warn(`[COMMISSION] Plano desconhecido: ${planType} para clínica ${clinic.id}`)
                continue
            }

            const subscriptionAmount = planConfig.price
            const commissionRate = partner.commission_rate || 30.00
            const commissionAmount = subscriptionAmount * (commissionRate / 100)

            commissions.push({
                partner_id: partner.id,
                clinic_id: clinic.id,
                referral_id: ref.id, // Vincula à venda específica
                sale_month: firstDayLastMonth, // Mês da VENDA
                subscription_plan: planType,
                subscription_amount: subscriptionAmount,
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
                status: 'PENDING'
            })

            referralIdsToUpdate.push(ref.id)
        }

        if (commissions.length === 0) {
            console.log('[COMMISSION] Nenhuma comissão a criar')
            return { success: true, commissions_created: 0, total_amount: 0 }
        }

        // 3. Inserir comissões (com constraint unique_commission_per_sale)
        const { error: insertError } = await supabase
            .from('partner_commissions')
            .insert(commissions)

        if (insertError) {
            console.error('[COMMISSION] Erro ao inserir comissões:', insertError)
            return { success: false, commissions_created: 0, total_amount: 0, error: insertError.message }
        }

        // 4. Marcar referrals como processados (commission_status = 'PAID')
        // Isso garante que NUNCA vão gerar comissão novamente
        const { error: updateError } = await supabase
            .from('clinic_referrals')
            .update({ commission_status: 'PAID' })
            .in('id', referralIdsToUpdate)

        if (updateError) {
            console.error('[COMMISSION] Erro ao atualizar referrals:', updateError)
            // Não é erro fatal, as comissões já foram criadas
        }

        const totalAmount = commissions.reduce((sum, c) => sum + c.commission_amount, 0)

        console.log(`[COMMISSION] Criadas ${commissions.length} comissões ÚNICAS, total: R$ ${totalAmount.toFixed(2)}`)

        return {
            success: true,
            commissions_created: commissions.length,
            total_amount: totalAmount
        }
    } catch (error: any) {
        console.error('[COMMISSION] Exception:', error)
        return { success: false, commissions_created: 0, total_amount: 0, error: error.message }
    }
}

/**
 * Lista pagamentos pendentes agrupados por parceiro
 */
export async function getPendingPayments(month?: Date): Promise<PendingPayment[]> {
    const supabase = createServiceRoleClient()

    let query = supabase
        .from('partner_commissions')
        .select(`
            id,
            partner_id,
            clinic_id,
            sale_month,
            subscription_plan,
            subscription_amount,
            commission_amount,
            partner:partners(
                id,
                full_name,
                pix_key,
                pix_key_type,
                cpf,
                cnpj
            ),
            clinic:clinics(
                id,
                name
            )
        `)
        .eq('status', 'PENDING')
        .order('partner_id')

    if (month) {
        const saleMonth = new Date(month)
        saleMonth.setDate(1)
        query = query.eq('sale_month', saleMonth.toISOString().split('T')[0])
    }

    const { data, error } = await query

    if (error) {
        console.error('[COMMISSION] Erro ao buscar pagamentos pendentes:', error)
        return []
    }

    if (!data || data.length === 0) {
        return []
    }

    // Agrupar por parceiro
    const grouped: Record<string, PendingPayment> = {}

    for (const comm of data) {
        const partner = comm.partner as any
        const clinic = comm.clinic as any

        if (!partner) continue

        if (!grouped[comm.partner_id]) {
            grouped[comm.partner_id] = {
                partner_id: comm.partner_id,
                partner_name: partner.full_name,
                pix_key: partner.pix_key,
                pix_key_type: partner.pix_key_type,
                cpf: partner.cpf,
                cnpj: partner.cnpj,
                total_amount: 0,
                commissions: []
            }
        }

        grouped[comm.partner_id].total_amount += comm.commission_amount
        grouped[comm.partner_id].commissions.push({
            id: comm.id,
            clinic_name: clinic?.name || 'Clínica desconhecida',
            subscription_plan: comm.subscription_plan,
            subscription_amount: comm.subscription_amount,
            commission_amount: comm.commission_amount,
            sale_month: comm.sale_month
        })
    }

    return Object.values(grouped)
}

/**
 * Marca comissões como pagas
 */
export async function markCommissionsAsPaid(
    commissionIds: string[],
    paidBy: string,
    proofUrl?: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
        .from('partner_commissions')
        .update({
            status: 'PAID',
            paid_at: new Date().toISOString(),
            paid_by: paidBy,
            payment_proof_url: proofUrl || null,
            notes: notes || null
        })
        .in('id', commissionIds)

    if (error) {
        console.error('[COMMISSION] Erro ao marcar como pago:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

/**
 * Histórico de comissões do parceiro
 */
export async function getPartnerCommissionHistory(partnerId: string, limit = 12): Promise<any[]> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
        .from('partner_commissions')
        .select(`
            id,
            sale_month,
            subscription_plan,
            subscription_amount,
            commission_amount,
            status,
            paid_at,
            clinic:clinics(
                id,
                name
            )
        `)
        .eq('partner_id', partnerId)
        .order('sale_month', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('[COMMISSION] Erro ao buscar histórico:', error)
        return []
    }

    return data || []
}
