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
                await transporter.verify()
                return successResponse({ success: true, message: 'Conexão SMTP verificada com sucesso!' })
            } catch (err: any) {
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
            })

        if (error) throw error

        return successResponse({ message: 'Configuração salva com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}
