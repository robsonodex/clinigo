import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import nodemailer from 'nodemailer'

export async function GET(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Acesso restrito a administradores')
        }

        const supabase = createServiceRoleClient()
        const { data, error } = await supabase
            .from('system_settings')
            .select('*')

        if (error) throw error

        const settings = (data as any[]).reduce((acc: any, item: any) => {
            acc[item.key] = item.value
            return acc
        }, {})

        return successResponse(settings)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        const userId = request.headers.get('x-user-id')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Acesso restrito a administradores')
        }

        const body = await request.json()
        const { key, value, testConnection } = body

        if (testConnection && key === 'smtp_settings') {
            const transporter = nodemailer.createTransport({
                host: value.host,
                port: parseInt(value.port),
                secure: value.secure,
                auth: {
                    user: value.user,
                    pass: value.password,
                },
            })

            try {
                // First verify the connection
                await transporter.verify()

                // Then send a test email
                await transporter.sendMail({
                    from: `"${value.from_name || 'CliniGo'}" <${value.from_email || value.user}>`,
                    to: value.user, // Send to the SMTP user's email
                    subject: '✅ Teste de Conexão SMTP - CliniGo',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #10b981;">✅ Conexão SMTP Verificada!</h2>
                            <p>Este é um email de teste do sistema CliniGo.</p>
                            <p>Se você está recebendo este email, significa que a configuração SMTP está funcionando corretamente.</p>
                            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 12px;">
                                Configuração utilizada:<br>
                                • Host: ${value.host}<br>
                                • Porta: ${value.port}<br>
                                • Seguro: ${value.secure ? 'Sim' : 'Não'}<br>
                                • Remetente: ${value.from_email}
                            </p>
                            <p style="color: #6b7280; font-size: 12px;">
                                Enviado em: ${new Date().toLocaleString('pt-BR')}
                            </p>
                        </div>
                    `,
                })

                return successResponse({
                    success: true,
                    message: `Conexão SMTP verificada! Email de teste enviado para ${value.user}`
                })
            } catch (err: any) {
                console.error('[SMTP Test Error]', err)
                return successResponse({
                    success: false,
                    message: 'Falha na conexão SMTP: ' + (err.message || 'Erro desconhecido')
                }, { status: 400 })
            }
        }


        const supabase = createServiceRoleClient()
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString(),
                updated_by: userId
            } as any, { onConflict: 'key' })

        if (error) throw error

        return successResponse({ message: 'Configuração salva com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}

