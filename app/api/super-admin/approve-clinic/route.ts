import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifySuperAdmin } from '@/lib/super-admin-middleware'
import { z } from 'zod'
import crypto from 'crypto'

const approveSchema = z.object({
    clinicId: z.string().uuid('ID da clínica inválido'),
})

export async function POST(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { clinicId } = approveSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Get clinic and admin info
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('*, users!users_clinic_id_fkey(id, email, full_name)')
            .eq('id', clinicId)
            .eq('approval_status', 'pending_approval')
            .single()

        if (clinicError || !clinic) {
            return NextResponse.json({
                success: false,
                error: { message: 'Clínica não encontrada ou já processada' }
            }, { status: 404 })
        }

        const adminUser = clinic.users?.[0]

        // Generate activation token
        const activationToken = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours

        // Create activation token
        if (adminUser) {
            await supabase
                .from('activation_tokens')
                .insert({
                    user_id: adminUser.id,
                    clinic_id: clinic.id,
                    email: adminUser.email,
                    token: activationToken,
                    type: 'clinic_activation',
                    expires_at: expiresAt.toISOString()
                })
        }

        // Update clinic status
        const { error: updateError } = await supabase
            .from('clinics')
            .update({
                approval_status: 'trial', // Start in trial mode
                approved_at: new Date().toISOString(),
                approved_by: authResult.userId,
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
            })
            .eq('id', clinicId)

        if (updateError) {
            console.error('[ApproveClinic] Update error:', updateError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao aprovar clínica' }
            }, { status: 500 })
        }

        // Send approval email with activation link
        if (adminUser) {
            const activationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ativar-conta/${activationToken}`

            try {
                const { sendMail } = await import('@/lib/services/mail-service')

                await sendMail({
                    to: adminUser.email,
                    subject: '🎉 Bem-vindo ao CliniGo! Seu acesso está liberado',
                    html: `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
                            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Cadastro Aprovado!</h1>
                            </div>
                            <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                                <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Parabéns, <strong>${adminUser.full_name}</strong>!</p>
                                <p style="color: #4b5563; line-height: 1.6;">Seu cadastro foi aprovado. Sua clínica <strong>${clinic.name}</strong> já está ativa no CliniGo!</p>
                                
                                <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0;">
                                    <h3 style="color: #166534; margin: 0 0 15px 0;">🔐 Dados de Acesso:</h3>
                                    <p style="margin: 5px 0; color: #374151;"><strong>Portal:</strong> clinigo.app/clinica</p>
                                    <p style="margin: 5px 0; color: #374151;"><strong>E-mail:</strong> ${adminUser.email}</p>
                                </div>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${activationLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 18px 50px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                        👉 CRIAR SUA SENHA
                                    </a>
                                </div>
                                
                                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                                        ⚠️ <strong>Este link expira em 48 horas.</strong>
                                    </p>
                                </div>
                                
                                <div style="background: #eff6ff; border-radius: 12px; padding: 20px; margin-top: 25px;">
                                    <h4 style="color: #1e40af; margin: 0 0 10px 0;">📋 Seu período de teste inclui:</h4>
                                    <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                                        <li>14 dias de acesso completo</li>
                                        <li>Dashboard Financeiro</li>
                                        <li>Gestão de Agenda</li>
                                        <li>Cadastro de Médicos</li>
                                        <li>Relatórios completos</li>
                                    </ul>
                                </div>
                                
                                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                                    Precisa de ajuda? Responda este e-mail ou fale conosco no WhatsApp.
                                </p>
                            </div>
                        </div>
                    `
                })

                // Log email
                await supabase
                    .from('email_logs')
                    .insert({
                        recipient: adminUser.email,
                        subject: 'Cadastro Aprovado - CliniGo',
                        template_used: 'CLINIC_APPROVED',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        clinic_id: clinic.id,
                        user_id: adminUser.id
                    })

            } catch (emailError) {
                console.error('[ApproveClinic] Email error:', emailError)
                // Log failed email
                await supabase
                    .from('email_logs')
                    .insert({
                        recipient: adminUser.email,
                        subject: 'Cadastro Aprovado - CliniGo',
                        template_used: 'CLINIC_APPROVED',
                        status: 'failed',
                        error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
                        clinic_id: clinic.id
                    })
            }
        }

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinic.name}" aprovada com sucesso!`
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[ApproveClinic] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}
