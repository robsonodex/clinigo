import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Webhook Mercado Pago
// =============================================================================

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // 1. Pegar dados do webhook
        const body = await req.json()
        const { type, data } = body

        console.log('📥 Webhook Mercado Pago recebido:', { type, data })

        // Ignorar notificações que não são de pagamento
        if (type !== 'payment') {
            return NextResponse.json({ received: true })
        }

        // 2. Buscar detalhes do pagamento no Mercado Pago
        const paymentId = data.id
        if (!paymentId) {
            return NextResponse.json({ error: 'Payment ID missing' }, { status: 400 })
        }

        // TODO: Buscar payment do Mercado Pago SDK
        // Por ora, vamos confiar nos dados que vêm no webhook
        // Em produção, SEMPRE validar fazendo request para MP API

        // 3. Buscar payment_request no banco
        const { data: paymentRequest } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('mercadopago_payment_id', paymentId)
            .single()

        if (!paymentRequest) {
            // Se não encontrou por payment_id, buscar por preference_id
            const preferenceId = body.preference_id || data.preference_id
            if (!preferenceId) {
                return NextResponse.json({ error: 'Payment request not found' }, { status: 404 })
            }

            const { data: pr } = await supabase
                .from('payment_requests')
                .select('*')
                .eq('mercadopago_preference_id', preferenceId)
                .single()

            if (!pr) {
                return NextResponse.json({ error: 'Payment request not found' }, { status: 404 })
            }

            // Atualizar com payment_id
            await supabase
                .from('payment_requests')
                .update({ mercadopago_payment_id: paymentId })
                .eq('id', pr.id)
        }

        // 4. Verificar status do pagamento
        const status = data.status || body.status

        if (status === 'approved') {
            // PAGAMENTO APROVADO! 🎉

            const clinicId = paymentRequest.clinic_id
            const newPlan = paymentRequest.plan_type

            // 5. Atualizar clínica
            const newDueDate = new Date()
            newDueDate.setDate(newDueDate.getDate() + 30) // +30 dias

            await supabase
                .from('clinics')
                .update({
                    plan_type: newPlan,
                    subscription_due_date: newDueDate.toISOString(),
                    last_payment_date: new Date().toISOString(),
                    payment_status: 'ACTIVE',
                })
                .eq('id', clinicId)

            // 6. Atualizar payment_request
            await supabase
                .from('payment_requests')
                .update({
                    status: 'PAID',
                    paid_at: new Date().toISOString(),
                })
                .eq('id', paymentRequest.id)

            // 7. Criar histórico de pagamento
            await supabase.from('payment_history').insert({
                clinic_id: clinicId,
                payment_request_id: paymentRequest.id,
                amount: paymentRequest.amount,
                plan_type: newPlan,
                mercadopago_payment_id: paymentId,
                paid_at: new Date().toISOString(),
                subscription_extended_until: newDueDate.toISOString(),
            })

            // 8. Criar notificação de agradecimento
            await supabase.from('billing_notifications').insert({
                clinic_id: clinicId,
                type: 'PAYMENT_RECEIVED',
                title: 'Pagamento Confirmado! 🎉',
                message: `Recebemos seu pagamento de R$ ${paymentRequest.amount}. Sua assinatura foi renovada até ${newDueDate.toLocaleDateString('pt-BR')}. Obrigado por confiar no CliniGo!`,
                priority: 'HIGH',
            })

            console.log('✅ Pagamento processado com sucesso:', clinicId)
        } else if (status === 'rejected' || status === 'cancelled') {
            // Pagamento falhou
            await supabase
                .from('payment_requests')
                .update({ status: 'CANCELLED' })
                .eq('id', paymentRequest.id)

            // Criar notificação de falha
            await supabase.from('billing_notifications').insert({
                clinic_id: paymentRequest.clinic_id,
                type: 'PAYMENT_FAILED',
                title: 'Pagamento não processado',
                message: 'Não foi possível processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.',
                priority: 'HIGH',
            })
        }

        return NextResponse.json({ received: true, processed: status === 'approved' })
    } catch (error) {
        console.error('❌ Erro no webhook:', error)
        return NextResponse.json(
            {
                error: 'Erro ao processar webhook',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
