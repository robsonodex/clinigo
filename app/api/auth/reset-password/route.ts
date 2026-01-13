import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token é obrigatório'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { token, password } = resetPasswordSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Find valid token
        const { data: tokenData, error: tokenError } = await supabase
            .from('password_reset_tokens')
            .select('*, users!inner(id, email, full_name)')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (tokenError || !tokenData) {
            console.log('[ResetPassword] Invalid or expired token')
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Link de recuperação inválido ou expirado. Por favor, solicite um novo link.',
                    code: 'INVALID_TOKEN'
                }
            }, { status: 400 })
        }

        // Update password in Supabase Auth
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            tokenData.user_id,
            { password }
        )

        if (updateError) {
            console.error('[ResetPassword] Password update error:', updateError)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao atualizar senha. Tente novamente.' }
            }, { status: 500 })
        }

        // Mark token as used
        await supabase
            .from('password_reset_tokens')
            .update({
                used: true,
                used_at: new Date().toISOString()
            })
            .eq('id', tokenData.id)

        // Invalidate all other tokens for this user
        await supabase
            .from('password_reset_tokens')
            .update({
                used: true,
                used_at: new Date().toISOString()
            })
            .eq('user_id', tokenData.user_id)
            .eq('used', false)

        // Send confirmation email
        try {
            const { sendMail } = await import('@/lib/services/mail-service')

            await sendMail({
                to: tokenData.users.email,
                subject: '✅ Senha Alterada com Sucesso - CliniGo',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8fafc;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Senha Alterada</h1>
                        </div>
                        <div style="background: white; padding: 40px 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">Olá, <strong>${tokenData.users.full_name}</strong>!</p>
                            <p style="color: #4b5563; line-height: 1.6;">Sua senha foi alterada com sucesso.</p>
                            
                            <div style="background: #d1fae5; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; color: #065f46; font-size: 16px;">
                                    ✓ Você já pode acessar sua conta com a nova senha.
                                </p>
                            </div>
                            
                            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                                Se você não realizou esta alteração, entre em contato conosco imediatamente.
                            </p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                                Este e-mail foi enviado automaticamente pelo CliniGo.
                            </p>
                        </div>
                    </div>
                `
            })
        } catch (emailError) {
            console.error('[ResetPassword] Confirmation email error:', emailError)
            // Don't fail the request if email fails
        }

        return NextResponse.json({
            success: true,
            message: 'Senha alterada com sucesso! Você já pode fazer login.'
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[ResetPassword] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}

// GET endpoint to validate token without using it
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json({
                valid: false,
                error: 'Token não fornecido'
            }, { status: 400 })
        }

        const supabase = createServiceRoleClient()

        const { data: tokenData, error } = await supabase
            .from('password_reset_tokens')
            .select('id, expires_at, users!inner(full_name)')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (error || !tokenData) {
            return NextResponse.json({
                valid: false,
                error: 'Token inválido ou expirado'
            })
        }

        return NextResponse.json({
            valid: true,
            userName: tokenData.users.full_name
        })

    } catch (error) {
        console.error('[ResetPassword] Token validation error:', error)
        return NextResponse.json({
            valid: false,
            error: 'Erro ao validar token'
        }, { status: 500 })
    }
}
