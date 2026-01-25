/**
 * Plan Notification Service
 * Envia notificações sobre mudanças de plano
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendMail } from '@/lib/services/mail-service'

export class PlanNotificationService {
    private supabase = createServiceRoleClient()

    /**
     * Notifica clínica sobre upgrade
     */
    async notifyPlanChange(
        clinicId: string,
        previousPlan: string,
        newPlan: string,
        changeType: 'UPGRADE' | 'DOWNGRADE'
    ) {
        // Buscar dados da clínica e admin
        const { data: clinic } = await this.supabase
            .from('clinics')
            .select('name, email')
            .eq('id', clinicId)
            .single()

        if (!clinic) return

        // Buscar admin da clínica
        const { data: admin } = await this.supabase
            .from('users')
            .select('email, full_name')
            .eq('clinic_id', clinicId)
            .eq('role', 'CLINIC_ADMIN')
            .maybeSingle()

        const emailTo = admin?.email || clinic.email

        if (!emailTo) return

        // Enviar e-mail
        await sendMail({
            to: emailTo,
            subject: `${changeType === 'UPGRADE' ? 'Upgrade' : 'Downgrade'} de Plano - ${clinic.name}`,
            html: this.generateEmailHtml(
                admin?.full_name || clinic.name,
                previousPlan,
                newPlan,
                changeType
            ),
        })

        // Criar notificação in-app
        await this.supabase.from('notifications').insert({
            user_id: admin?.id,
            clinic_id: clinicId,
            type: 'PLAN_CHANGED',
            title: `${changeType === 'UPGRADE' ? '🎉 Upgrade' : '⚠️ Downgrade'} de Plano`,
            message: `Seu plano foi alterado de ${previousPlan} para ${newPlan}.`,
            data: {
                previous_plan: previousPlan,
                new_plan: newPlan,
                change_type: changeType,
            },
        })
    }

    private generateEmailHtml(
        userName: string,
        previousPlan: string,
        newPlan: string,
        changeType: 'UPGRADE' | 'DOWNGRADE'
    ): string {
        const isUpgrade = changeType === 'UPGRADE'

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${changeType} de Plano</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background-color: ${isUpgrade ? '#10b981' : '#f59e0b'}; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">
        ${isUpgrade ? '🎉 Parabéns!' : '⚠️ Atenção'}
      </h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">
        ${isUpgrade ? 'Seu plano foi atualizado' : 'Seu plano foi alterado'}
      </p>
    </div>
    
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px 0; font-size: 16px;">Olá, <strong>${userName}</strong>,</p>
      
      <p style="margin: 0 0 20px 0; line-height: 1.6;">
        ${isUpgrade
                ? 'Ficamos felizes em informar que seu plano foi atualizado com sucesso!'
                : 'Seu plano foi alterado. Veja abaixo os detalhes da mudança.'
            }
      </p>
      
      <div style="background-color: #f9fafb; border-left: 4px solid ${isUpgrade ? '#10b981' : '#f59e0b'}; padding: 15px; margin: 20px 0;">
        <div style="margin-bottom: 10px;">
          <span style="color: #6b7280;">Plano Anterior:</span>
          <strong style="color: #1f2937; margin-left: 10px;">${previousPlan}</strong>
        </div>
        <div>
          <span style="color: #6b7280;">Novo Plano:</span>
          <strong style="color: ${isUpgrade ? '#10b981' : '#f59e0b'}; margin-left: 10px;">${newPlan}</strong>
        </div>
      </div>
      
      <p style="margin: 20px 0; line-height: 1.6;">
        ${isUpgrade
                ? 'Todas as novas funcionalidades do seu plano já estão disponíveis e prontas para uso.'
                : 'Algumas funcionalidades podem ter sido removidas de acordo com o novo plano.'
            }
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
           style="display: inline-block; background-color: #007664; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Acessar Dashboard
        </a>
      </div>
      
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
        Se você tiver alguma dúvida, entre em contato com nosso suporte.
      </p>
    </div>
    
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
       © 2026 CliniGo - Gestão Inteligente para Clínicas
      </p>
    </div>
  </div>
</body>
</html>
    `
    }
}
