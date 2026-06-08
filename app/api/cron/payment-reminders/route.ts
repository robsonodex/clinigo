import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmailMultiTenant } from '@/lib/services/email-multi-tenant'
import { PLANS, type PlanType } from '@/lib/constants/plans'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

// GET /api/cron/payment-reminders
// Envia e-mail de lembrete "Ainda não identificamos o pagamento..." após 24h de cadastro pendente
export async function GET(request: Request) {
    try {
        // Validate request comes from Vercel Cron or authorized system
        const authHeader = request.headers.get('authorization')
        const cronSecret = process.env.CRON_SECRET || process.env.CRON_SECRET_KEY
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            logger.warn('[CronPaymentReminders] Unauthorized access attempt')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const supabase = createServiceRoleClient() as any
        
        // Target registrations created more than 24 hours ago that are still PENDING
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        const { data: pendingRegistrations, error: fetchError } = await supabase
            .from('registration_pending')
            .select('*')
            .eq('status', 'PENDING')
            .lte('created_at', cutoffTime.toISOString())

        if (fetchError) {
            logger.error({ error: fetchError }, '[CronPaymentReminders] Error fetching pending registrations')
            return NextResponse.json({ error: 'Failed to fetch pending registrations' }, { status: 500 })
        }

        logger.info(`[CronPaymentReminders] Found ${pendingRegistrations?.length || 0} pending registrations eligible for reminder`)

        let sentCount = 0
        const processedEmails: string[] = []

        for (const reg of pendingRegistrations || []) {
            try {
                // Check if we already sent a payment reminder email to this recipient
                const { data: existingNotification, error: checkError } = await supabase
                    .from('notifications')
                    .select('id')
                    .eq('recipient_email', reg.email)
                    .eq('type', 'EMAIL')
                    .eq('status', 'SENT')
                    .ilike('subject', '%identificamos%')
                    .maybeSingle()

                if (checkError) {
                    logger.warn({ error: checkError, email: reg.email }, '[CronPaymentReminders] Error checking existing notifications')
                }

                if (existingNotification) {
                    // Already notified, skip
                    continue
                }

                // Retrieve plan details
                const plan = PLANS[reg.plan_type as PlanType] || PLANS.BASICO
                const planName = plan.name
                const planPrice = plan.price

                const subject = 'Ainda não identificamos o seu pagamento ⏳'
                const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; }
    .title { margin: 0; font-size: 24px; font-weight: bold; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; border-right: 1px solid #e5e7eb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Ainda não identificamos o seu pagamento ⏳</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${reg.full_name}</strong>,</p>
      
      <p>Notamos que já se passou 1 dia desde que você iniciou o seu pré-cadastro na plataforma <strong>CliniGo</strong> para a clínica <strong>${reg.clinic_name}</strong>, mas ainda não identificamos o pagamento do boleto gerado.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #dc2626;">Dados do Boleto</h3>
        <p><strong>Plano Escolhido:</strong> ${planName}</p>
        <p><strong>Valor:</strong> R$ ${planPrice.toFixed(2).replace('.', ',')}</p>
        <p><strong>Linha Digitável:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; word-break: break-all;">${reg.boleto_linha_digitavel || 'Não disponível'}</code></p>
      </div>

      <p>
        Caso precise visualizar ou realizar o download do boleto em PDF novamente, você pode fazer isso clicando no link abaixo:
      </p>

      ${reg.boleto_nosso_numero ? `
      <div style="text-align: center; margin: 25px 0;">
        <a href="https://clinigo.app/api/auth/boleto-pdf?nossoNumero=${reg.boleto_nosso_numero}" class="button" style="color: #ffffff;">
          📥 Baixar Boleto em PDF
        </a>
      </div>
      ` : ''}

      <p style="font-size: 14px; color: #666;">
        Assim que o pagamento for compensado pelo Banco Inter, suas credenciais de acesso exclusivas serão geradas e enviadas ao seu e-mail imediatamente. Caso já tenha realizado o pagamento, por favor, desconsidere esta mensagem (a compensação de boletos pode levar de 1 a 3 dias úteis).
      </p>
      
      <div class="footer">
        <p>Dúvidas ou problemas com o pagamento? Fale com nosso suporte: <a href="mailto:suporte@clinigo.app">suporte@clinigo.app</a></p>
        <p style="color: #999; font-size: 12px;">CliniGo · Tecnologia Inteligente para Clínicas e Consultórios</p>
      </div>
    </div>
  </div>
</body>
</html>
`

                logger.info({ email: reg.email }, '[CronPaymentReminders] Sending payment reminder email')
                
                await sendEmailMultiTenant({
                    clinicId: 'global',
                    to: reg.email,
                    subject,
                    html
                })

                sentCount++
                processedEmails.push(reg.email)

            } catch (err: any) {
                logger.error({ error: err.message, email: reg.email }, '[CronPaymentReminders] Failed to process reminder for registration')
            }
        }

        return NextResponse.json({
            success: true,
            total_eligible: pendingRegistrations?.length || 0,
            reminders_sent: sentCount,
            emails: processedEmails
        })

    } catch (error: any) {
        logger.error({ error: error.message }, '[CronPaymentReminders] Fatal error in cron job')
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
