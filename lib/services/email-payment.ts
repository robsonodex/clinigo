/**
 * Email Service - Payment Confirmation
 * 
 * Handles sending payment confirmation emails to clinics
 * Currently uses console logging as email service is a stub
 */

interface PaymentConfirmationEmailProps {
    to: string
    clinicName: string
    plan: string
    paymentMethod: string
    amount: number
}

const planNames: Record<string, string> = {
    'BASICO': 'Básico',
    'AVANCADO': 'Avançado',
    'PROFESSIONAL': 'Professional',
    'ENTERPRISE': 'Enterprise',
    'NETWORK': 'Network',
    // Legacy names
    'STARTER': 'Starter',
    'BASIC': 'Basic',
    'PRO': 'Pro',
}

const methodNames: Record<string, string> = {
    'credit_card': 'Cartão de Crédito',
    'CREDIT_CARD': 'Cartão de Crédito',
    'boleto': 'Boleto Bancário',
    'BOLETO': 'Boleto Bancário',
    'pix': 'PIX',
    'PIX': 'PIX',
    'debit_card': 'Cartão de Débito',
    'DEBIT_CARD': 'Cartão de Débito',
}

/**
 * Sends a payment confirmation email to the clinic
 * 
 * @note Currently logs to console as email service is disabled
 * @todo Enable actual email sending when @react-email is configured
 */
export async function sendPaymentConfirmationEmail({
    to,
    clinicName,
    plan,
    paymentMethod,
    amount
}: PaymentConfirmationEmailProps): Promise<void> {
    const planLabel = planNames[plan] || plan
    const methodLabel = methodNames[paymentMethod] || paymentMethod

    console.log('='.repeat(60))
    console.log('[EMAIL] 🎉 Pagamento Confirmado - Email would be sent')
    console.log('='.repeat(60))
    console.log(`📧 To: ${to}`)
    console.log(`🏥 Clínica: ${clinicName}`)
    console.log(`📋 Plano: CliniGo ${planLabel}`)
    console.log(`💳 Método: ${methodLabel}`)
    console.log(`💰 Valor: R$ ${amount.toFixed(2)}`)
    console.log(`✅ Status: Aprovado`)
    console.log('='.repeat(60))

    // TODO: When email service is enabled, implement actual sending:
    // const html = generatePaymentConfirmationHtml({ clinicName, plan: planLabel, paymentMethod: methodLabel, amount })
    // await transporter.sendMail({ from, to, subject: '🎉 Pagamento Confirmado - Bem-vindo ao CliniGo!', html })
}

/**
 * Generates HTML template for payment confirmation email
 * Ready to use when email service is enabled
 */
export function generatePaymentConfirmationHtml({
    clinicName,
    plan,
    paymentMethod,
    amount
}: {
    clinicName: string
    plan: string
    paymentMethod: string
    amount: number
}): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success-icon { width: 80px; height: 80px; margin: 0 auto 20px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1 style="margin: 0;">Pagamento Confirmado!</h1>
    </div>
    
    <div class="content">
      <p>Olá <strong>${clinicName}</strong>,</p>
      
      <p>Seu pagamento foi confirmado com sucesso! Agora você tem acesso completo ao CliniGo.</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0;">Detalhes do Pagamento</h3>
        <p><strong>Plano:</strong> CliniGo ${plan}</p>
        <p><strong>Método:</strong> ${paymentMethod}</p>
        <p><strong>Valor:</strong> R$ ${amount.toFixed(2)}</p>
        <p><strong>Status:</strong> <span style="color: #10b981;">✓ Aprovado</span></p>
      </div>
      
      <p><strong>O que fazer agora?</strong></p>
      <ol>
        <li>Acesse o sistema usando suas credenciais</li>
        <li>Configure sua clínica</li>
        <li>Adicione médicos e pacientes</li>
        <li>Comece a agendar consultas!</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="https://www.clinigo.app/login" class="button">
          Acessar o CliniGo
        </a>
      </div>
      
      <div class="footer">
        <p>Precisa de ajuda? Entre em contato: <a href="mailto:contato@clinigo.app">contato@clinigo.app</a></p>
        <p style="color: #999; font-size: 12px;">CliniGo - Sistema de Gestão para Clínicas Médicas</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}
