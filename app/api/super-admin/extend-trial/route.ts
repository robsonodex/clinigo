/**
 * POST /api/super-admin/extend-trial - Extend clinic trial period (Super Admin only)
 * Activates the clinic and sets a new trial expiration date (default +7 days)
 * Sends notification emails to all registered clinic users
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/utils/errors'

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem estender períodos de teste')
        }

        const body = await request.json()
        const { clinicId, days = 7 } = body

        if (!clinicId) {
            throw new BadRequestError('Informe o clinicId')
        }

        const supabase = createServiceRoleClient()

        // Verify if clinic exists and get email
        const { data: clinic, error: fetchError } = await supabase
            .from('clinics')
            .select('id, name, email')
            .eq('id', clinicId)
            .single()

        if (fetchError || !clinic) {
            throw new NotFoundError('Clínica não encontrada')
        }

        // Calculate new trial end date (today + X days)
        const newTrialEnd = new Date()
        newTrialEnd.setDate(newTrialEnd.getDate() + days)
        // Set to end of the day
        newTrialEnd.setHours(23, 59, 59, 999)

        const formattedDate = newTrialEnd.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })

        // Update clinic status
        const { error: updateError } = await supabase
            .from('clinics')
            .update({
                is_active: true,
                approval_status: 'trial',
                trial_ends_at: newTrialEnd.toISOString(),
                payment_confirmed: true // Allow access during the trial extension
            })
            .eq('id', clinicId)

        if (updateError) {
            throw new Error(`Erro ao atualizar clínica: ${updateError.message}`)
        }

        // ============================================================
        // EMAIL NOTIFICATIONS: Notify all clinic users about extension
        // ============================================================
        try {
            // Get all user emails from this clinic
            const { data: clinicUsers } = await supabase
                .from('users')
                .select('email, full_name')
                .eq('clinic_id', clinicId)

            // Collect all recipients (clinic email + user emails)
            const recipientEmails = new Set<string>()

            // Add clinic contact email
            if ((clinic as any).email) {
                recipientEmails.add((clinic as any).email)
            }

            // Add all user emails
            if (clinicUsers) {
                for (const user of clinicUsers) {
                    if (user.email) {
                        recipientEmails.add(user.email)
                    }
                }
            }

            if (recipientEmails.size > 0) {
                const nodemailer = await import('nodemailer')

                const transporter = nodemailer.default.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_PORT === '465',
                    auth: {
                        user: process.env.SMTP_USER || 'apikey',
                        pass: process.env.SMTP_PASSWORD || '',
                    },
                })

                // Send individual emails to each recipient (isolated, no one sees each other)
                for (const recipientEmail of recipientEmails) {
                    try {
                        await transporter.sendMail({
                            from: `"CliniGo" <${process.env.SMTP_FROM_EMAIL || 'contato@clinigo.app'}>`,
                            to: recipientEmail,
                            subject: `✅ CliniGo — Período de testes estendido por mais ${days} dias`,
                            html: `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                                        <h1 style="color: white; margin: 0; font-size: 24px;">✅ Ótima notícia!</h1>
                                        <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">Seu período de testes foi estendido</p>
                                    </div>
                                    
                                    <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
                                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
                                            Olá! Informamos que o período de testes da clínica 
                                            <strong>${(clinic as any).name}</strong> no CliniGo foi estendido.
                                        </p>
                                        
                                        <div style="background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #d1fae5;">
                                            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                                <span style="font-size: 28px; margin-right: 12px;">🗓️</span>
                                                <div>
                                                    <p style="margin: 0; color: #6b7280; font-size: 13px;">Novo prazo de testes</p>
                                                    <p style="margin: 4px 0 0 0; color: #059669; font-size: 22px; font-weight: bold;">${formattedDate}</p>
                                                </div>
                                            </div>
                                            <p style="margin: 0; color: #6b7280; font-size: 13px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                                                Você tem mais <strong>${days} dias</strong> para explorar todas as funcionalidades do sistema.
                                            </p>
                                        </div>
                                        
                                        <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                            <p style="margin: 0; color: #1e40af; font-size: 14px;">
                                                💡 <strong>Dica:</strong> Aproveite para configurar seus horários de atendimento, 
                                                cadastrar pacientes e explorar os recursos de prontuário eletrônico.
                                            </p>
                                        </div>
                                        
                                        <div style="text-align: center; margin-top: 25px;">
                                            <a href="https://www.clinigo.app/login" 
                                               style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); 
                                                      color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; 
                                                      font-weight: bold; font-size: 15px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                                                Acessar o CliniGo →
                                            </a>
                                        </div>
                                    </div>
                                    
                                    <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 11px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                                        <p style="margin: 0;">Este é um e-mail automático do CliniGo. Não é necessário responder.</p>
                                        <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} CliniGo — Gestão Inteligente de Clínicas</p>
                                    </div>
                                </div>
                            `
                        })

                        console.log(`[ExtendTrial] Email sent to: ${recipientEmail}`)
                    } catch (emailErr) {
                        console.error(`[ExtendTrial] Failed to send email to ${recipientEmail}:`, emailErr)
                    }
                }
            }
        } catch (emailError) {
            console.error('[ExtendTrial] Email notification error:', emailError)
            // Non-blocking — extension was applied successfully
        }

        // Create audit log
        try {
            const { createAuditLog } = await import('@/lib/services/audit')
            await createAuditLog({
                action: `Período de teste estendido em ${days} dias para a clínica ${(clinic as any).name}`,
                entityType: 'clinics',
                entityId: clinicId,
                severity: 'WARNING',
                metadata: {
                    clinic_name: (clinic as any).name,
                    extended_by: 'SUPER_ADMIN',
                    days,
                    new_expiration: newTrialEnd.toISOString()
                }
            })
        } catch (auditError) {
            console.error('Erro ao criar log de auditoria:', auditError)
        }

        return NextResponse.json({
            success: true,
            message: `Clínica "${(clinic as any).name}" ativada e período de testes estendido por mais ${days} dias (Expira em: ${formattedDate})`,
            newExpirationDate: newTrialEnd.toISOString()
        })

    } catch (error) {
        return handleApiError(error)
    }
}
