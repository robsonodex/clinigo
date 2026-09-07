import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendEmailMultiTenant } from '@/lib/services/email-multi-tenant'
import { logger } from '@/lib/logger'

export interface OwnerPaymentNotificationParams {
    clinicName: string
    clinicId?: string
    adminEmail?: string
    adminName?: string
    amount: number
    planType: string
    paymentMethod: 'BOLETO' | 'PIX' | 'CREDIT_CARD' | string
    transactionId: string
    dueDate?: string
}

/**
 * Notifica o proprietário da plataforma CliniGo sobre recebimento e liquidação automática de pagamentos.
 * Dispara e-mail executivo via credenciais de sistema ('system') e grava registro na auditoria de notificações.
 */
export async function notifyOwnerPaymentReceived(params: OwnerPaymentNotificationParams): Promise<void> {
    const {
        clinicName,
        clinicId,
        adminEmail,
        adminName,
        amount,
        planType,
        paymentMethod,
        transactionId,
        dueDate
    } = params

    const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL || process.env.SMTP_FROM_EMAIL || 'contato@clinigo.app'
    const formattedAmount = amount > 0 ? `R$ ${(amount / 100).toFixed(2).replace('.', ',')}` : 'Identificado no Gateway'
    const formattedDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    logger.info({ clinicName, amount, paymentMethod, transactionId }, '[OWNER_NOTIF] Disparando alerta de pagamento ao proprietário')

    // 1. Enviar E-mail Executivo para o Dono via 'system'
    try {
        await sendEmailMultiTenant({
            clinicId: 'system',
            to: ownerEmail,
            subject: `[CliniGo Financeiro] Pagamento Recebido - ${clinicName} (${formattedAmount})`,
            html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #013727; padding: 24px; text-align: left;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">CliniGo Plataforma</h1>
                        <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 13px;">Notificação Executiva de Recebimento de Assinatura</p>
                    </div>
                    <div style="padding: 24px;">
                        <h2 style="color: #0f172a; font-size: 16px; margin-top: 0;">Novo Pagamento Confirmado</h2>
                        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                            O sistema identificou automaticamente a liquidação de um pagamento referente à assinatura de uma clínica parceira.
                        </p>
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
                                <tr>
                                    <td style="padding: 6px 0; font-weight: 600;">Clínica:</td>
                                    <td style="padding: 6px 0; text-align: right; font-weight: 600; color: #013727;">${clinicName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Gestor Responsável:</td>
                                    <td style="padding: 6px 0; text-align: right;">${adminName || 'Não informado'} (${adminEmail || 'N/A'})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Plano:</td>
                                    <td style="padding: 6px 0; text-align: right; font-weight: 600;">${planType}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Método:</td>
                                    <td style="padding: 6px 0; text-align: right;">${paymentMethod}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Valor Liquidado:</td>
                                    <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #059669;">${formattedAmount}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">ID / Nosso Número:</td>
                                    <td style="padding: 6px 0; text-align: right; font-family: monospace;">${transactionId}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Data de Liquidação:</td>
                                    <td style="padding: 6px 0; text-align: right;">${formattedDate}</td>
                                </tr>
                                ${dueDate ? `
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;">Próximo Vencimento:</td>
                                    <td style="padding: 6px 0; text-align: right;">${dueDate}</td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                        <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                            Este alerta foi gerado automaticamente pelo núcleo de faturamento do CliniGo.
                        </p>
                    </div>
                </div>
            `
        })
        logger.info({ ownerEmail }, '[OWNER_NOTIF] E-mail executivo entregue com sucesso para o proprietário')
    } catch (emailErr: any) {
        logger.warn({ error: emailErr.message }, '[OWNER_NOTIF] Falha ao enviar e-mail executivo ao proprietário (não-bloqueante)')
    }

    // 2. Gravar registro em notifications com clinic_id: null (Super Admin)
    try {
        const supabase = createServiceRoleClient()
        await supabase.from('notifications').insert({
            clinic_id: clinicId || null,
            type: 'OWNER_PAYMENT_ALERT',
            status: 'SENT',
            recipient_email: ownerEmail,
            subject: `Pagamento Recebido: ${clinicName} (${formattedAmount})`,
            body: `Pagamento via ${paymentMethod} no valor de ${formattedAmount} referente ao plano ${planType}. ID: ${transactionId}`,
            sent_at: new Date().toISOString(),
        })
    } catch (dbErr: any) {
        logger.warn({ error: dbErr.message }, '[OWNER_NOTIF] Falha ao registrar notificação no banco de dados')
    }
}
