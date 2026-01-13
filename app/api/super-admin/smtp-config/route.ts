import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { verifySuperAdmin } from '@/lib/super-admin-middleware'
import { z } from 'zod'

const smtpConfigSchema = z.object({
    host: z.string().min(1, 'Servidor SMTP é obrigatório'),
    port: z.number().int().min(1).max(65535),
    secure: z.boolean(),
    user: z.string().min(1, 'Usuário é obrigatório'),
    password: z.string().min(1, 'Senha é obrigatória'),
    from_name: z.string().optional(),
    from_email: z.string().email().optional(),
    admin_notification_email: z.string().email().optional(),
})

// GET - Retrieve current SMTP configuration
export async function GET(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const supabase = createServiceRoleClient()

        const { data: settings, error } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'smtp_settings')
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('[SMTPConfig] Query error:', error)
            return NextResponse.json({
                success: false,
                error: { message: 'Erro ao buscar configurações' }
            }, { status: 500 })
        }

        // Mask password for security
        const config = settings?.value as any
        if (config?.password) {
            config.password = '••••••••'
        }

        return NextResponse.json({
            success: true,
            config: config || null,
            configured: !!config?.host
        })

    } catch (error) {
        console.error('[SMTPConfig] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}

// POST - Update SMTP configuration
export async function POST(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const config = smtpConfigSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if settings exist
        const { data: existing } = await supabase
            .from('system_settings')
            .select('id')
            .eq('key', 'smtp_settings')
            .single()

        if (existing) {
            // Check if password should be kept (masked value)
            if (config.password === '••••••••') {
                // Get existing password
                const { data: existingConfig } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'smtp_settings')
                    .single()

                if (existingConfig?.value) {
                    config.password = (existingConfig.value as any).password
                }
            }

            // Update existing
            const { error: updateError } = await supabase
                .from('system_settings')
                .update({
                    value: config,
                    updated_at: new Date().toISOString()
                })
                .eq('key', 'smtp_settings')

            if (updateError) {
                console.error('[SMTPConfig] Update error:', updateError)
                return NextResponse.json({
                    success: false,
                    error: { message: 'Erro ao atualizar configurações' }
                }, { status: 500 })
            }
        } else {
            // Insert new
            const { error: insertError } = await supabase
                .from('system_settings')
                .insert({
                    key: 'smtp_settings',
                    value: config,
                    description: 'SMTP email configuration'
                })

            if (insertError) {
                console.error('[SMTPConfig] Insert error:', insertError)
                return NextResponse.json({
                    success: false,
                    error: { message: 'Erro ao salvar configurações' }
                }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Configurações de SMTP salvas com sucesso!'
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[SMTPConfig] Unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}

// Test SMTP configuration
export async function PUT(request: NextRequest) {
    try {
        // Verify Super Admin access
        const authResult = await verifySuperAdmin(request)
        if (!authResult.authorized) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
        }

        const body = await request.json()
        const { testEmail } = z.object({ testEmail: z.string().email() }).parse(body)

        // Try to send test email
        try {
            const { sendMail } = await import('@/lib/services/mail-service')

            const result = await sendMail({
                to: testEmail,
                subject: '✅ Teste de Configuração SMTP - CliniGo',
                html: `
                    <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 16px; text-align: center;">
                            <h1 style="color: white; margin: 0;">✅ SMTP Configurado!</h1>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 16px; margin-top: 20px; border: 1px solid #e5e7eb;">
                            <p style="color: #374151; font-size: 16px;">
                                Parabéns! Suas configurações de SMTP estão funcionando corretamente.
                            </p>
                            <p style="color: #6b7280; font-size: 14px;">
                                Enviado em: ${new Date().toLocaleString('pt-BR')}
                            </p>
                        </div>
                    </div>
                `
            })

            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: { message: result.error || 'Falha ao enviar email de teste' }
                }, { status: 400 })
            }

            return NextResponse.json({
                success: true,
                message: `Email de teste enviado para ${testEmail}!`
            })

        } catch (emailError) {
            console.error('[SMTPConfig] Test email error:', emailError)
            return NextResponse.json({
                success: false,
                error: { message: emailError instanceof Error ? emailError.message : 'Erro ao enviar email de teste' }
            }, { status: 400 })
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({
                success: false,
                error: { message: error.errors[0].message }
            }, { status: 400 })
        }
        console.error('[SMTPConfig] Test unexpected error:', error)
        return NextResponse.json({
            success: false,
            error: { message: 'Erro interno do servidor' }
        }, { status: 500 })
    }
}
