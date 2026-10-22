import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
    email: z.string().email('Email inválido'),
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const body = await request.json()
        const { email } = forgotPasswordSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if user exists
        const { data: user } = await supabase
            .from('users')
            .select('id, email, full_name')
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .single()

        // Always return success to prevent email enumeration
        if (!user) {
            console.log('[ForgotPassword] Email not found:', email)
            return NextResponse.json({
                success: true,
                message: 'Se o email existir em nosso sistema, você receberá um link de recuperação.'
            })
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        // Invalidate any existing tokens for this user
        await supabase
            .from('password_reset_tokens')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .eq('used', false)

        // Create new token
        const { error: tokenError } = await supabase
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token,
                expires_at: expiresAt.toISOString()
            })

        if (tokenError) {
            console.error('[ForgotPassword] Token creation error:', tokenError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao processar solicitação. Tente novamente.' }
            }, { status: 500 })
        }

        // Send email
        const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/redefinir-senha/${token}`

        try {
            const { sendMail } = await import('@/lib/services/mail-service')

            await sendMail({
                to: user.email,
                subject: '🔐 Recuperação de Senha - CliniGo',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Recuperação de Senha</h1>
                        </div>
                        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Olá, <strong>${user.full_name}</strong>!</p>
                            <p style="color: #4b5563; line-height: 1.6;">Recebemos uma solicitação de recuperação de senha para sua conta no CliniGo.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                    👉 REDEFINIR SENHA
                                </a>
                            </div>
                            
                            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                                <p style="margin: 0; color: #92400e; font-size: 14px;">
                                    ⚠️ <strong>Este link expira em 1 hora.</strong>
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                                Se você não solicitou esta recuperação, ignore este e-mail. Sua senha permanecerá inalterada.
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                                Este e-mail foi enviado automaticamente pelo CliniGo.<br>
                                Não responda a este e-mail.
                            </p>
                        </div>
                    </div>
                `
            })

            // Log email
            await supabase
                .from('email_logs')
                .insert({
                    recipient: user.email,
                    subject: 'Recuperação de Senha - CliniGo',
                    template_used: 'PASSWORD_RESET',
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    user_id: user.id
                })

        } catch (emailError) {
        request.log.error('auth/forgot-password', { error: emailError instanceof Error ? emailError.message : String(emailError) })
            console.error('[ForgotPassword] Email error:', emailError)
            // Log failed email
            await supabase
                .from('email_logs')
                .insert({
                    recipient: user.email,
                    subject: 'Recuperação de Senha - CliniGo',
                    template_used: 'PASSWORD_RESET',
                    status: 'failed',
                    error_message: emailError instanceof Error ? emailError.message : 'Unknown error',
                    user_id: user.id
                })
        }

        return NextResponse.json({
            success: true,
            message: 'Se o email existir em nosso sistema, você receberá um link de recuperação.'
        })

    } catch (error) {
        request.log.error('auth/forgot-password', { error: error instanceof Error ? error.message : String(error) })
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[ForgotPassword] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
})
