/**
 * Multi-tenant Email Service
 * Supports per-clinic SMTP configuration for white-label emails
 */
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/server'

interface SMTPConfig {
    host: string
    port: number
    user: string
    password: string
    fromEmail: string
    fromName: string
    secure: boolean
}

interface SendEmailParams {
    clinicId: string
    to: string
    subject: string
    html: string
    text?: string
}

/**
 * Decrypt SMTP password stored in database
 */
export function decryptPassword(encrypted: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured')
    }

    try {
        const [ivHex, authTagHex, encryptedHex] = encrypted.split(':')
        const iv = Buffer.from(ivHex, 'hex')
        const authTag = Buffer.from(authTagHex, 'hex')
        const encryptedText = Buffer.from(encryptedHex, 'hex')
        const key = Buffer.from(encryptionKey, 'hex')

        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
        decipher.setAuthTag(authTag)

        let decrypted = decipher.update(encryptedText)
        decrypted = Buffer.concat([decrypted, decipher.final()])

        return decrypted.toString('utf8')
    } catch {
        throw new Error('Failed to decrypt SMTP password')
    }
}

/**
 * Encrypt password before storing in database
 */
export function encryptPassword(password: string): string {
    const encryptionKey = process.env.ENCRYPTION_KEY
    if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured')
    }

    const key = Buffer.from(encryptionKey, 'hex')
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    let encrypted = cipher.update(password, 'utf8')
    encrypted = Buffer.concat([encrypted, cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Get SMTP configuration for a clinic or system
 * Returns null if the clinic does not have a configured and enabled SMTP server.
 * Only 'system' and 'global' use platform-level credentials.
 */
async function getSMTPConfig(clinicId: string): Promise<SMTPConfig | null> {
    if (!clinicId || clinicId === 'global' || clinicId === 'system') {
        // Credenciais globais do sistema CliniGo (usadas exclusivamente para alertas internos da plataforma/dono)
        if (!process.env.SMTP_HOST || !process.env.SMTP_PASSWORD) {
            return null
        }
        return {
            host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER || 'apikey',
            password: process.env.SMTP_PASSWORD || '',
            fromEmail: process.env.SMTP_FROM_EMAIL || 'contato@clinigo.app',
            fromName: process.env.SMTP_FROM_NAME || 'CliniGo',
            secure: process.env.SMTP_PORT === '465',
        }
    }

    const supabase = createServiceRoleClient()

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        console.warn(`[EmailMultiTenant] Clínica não encontrada: ${clinicId}`)
        return null
    }

    // Regra Estrita Multi-Tenant:
    // E-mails de clínica só devem ser disparados se a clínica estiver com SMTP conectado e ativo!
    // NUNCA fazer fallback para contato@clinigo.app ou credenciais globais da plataforma.
    if (!clinic.smtp_enabled || !clinic.smtp_host || !clinic.smtp_password) {
        return null
    }

    try {
        const decryptedPassword = decryptPassword(clinic.smtp_password)
        // Sanitização defensiva: se o usuário preencheu o campo host com um endereço de e-mail (ex: @gmail.com)
        let resolvedHost = (clinic.smtp_host || '').trim()
        if (resolvedHost.includes('@')) {
            if (resolvedHost.toLowerCase().endsWith('@gmail.com') || resolvedHost.toLowerCase() === 'gmail.com') {
                resolvedHost = 'smtp.gmail.com'
            } else if (resolvedHost.toLowerCase().endsWith('@hotmail.com') || resolvedHost.toLowerCase().endsWith('@outlook.com')) {
                resolvedHost = 'smtp.office365.com'
            } else {
                const domain = resolvedHost.split('@')[1]
                resolvedHost = domain ? `smtp.${domain}` : resolvedHost
            }
        }

        return {
            host: resolvedHost,
            port: clinic.smtp_port || 587,
            user: clinic.smtp_user || '',
            password: decryptedPassword,
            fromEmail: clinic.smtp_from_email || clinic.smtp_user || '',
            fromName: clinic.smtp_from_name || 'Clínica',
            secure: clinic.smtp_port === 465,
        }
    } catch (decErr) {
        console.warn(`[EmailMultiTenant:WARNING] Não foi possível descriptografar senha SMTP da clínica ${clinicId}:`, decErr)
        return null
    }
}

/**
 * Send email using clinic's SMTP (or global for system alerts)
 */
export async function sendEmailMultiTenant({
    clinicId,
    to,
    subject,
    html,
    text,
}: SendEmailParams): Promise<{ success: boolean; skipped?: boolean; messageId?: string; error?: string }> {
    try {
        const config = await getSMTPConfig(clinicId)

        if (!config) {
            console.info(`[EmailMultiTenant] Disparo cancelado: Clínica ${clinicId} não possui SMTP próprio conectado/ativo. Nenhum e-mail de plataforma foi enviado.`)
            return {
                success: false,
                skipped: true,
                error: 'CLINIC_SMTP_NOT_CONFIGURED: E-mails transacionais da clínica só são disparados quando a clínica possuir SMTP conectado.',
            }
        }

        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        })

        const info = await transporter.sendMail({
            from: `"${config.fromName}" <${config.fromEmail}>`,
            to,
            subject,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            html,
        })

        // Registrar log de envio com sucesso em email_logs de forma segura
        try {
            const supabase = createServiceRoleClient()
            const logClinicId = (clinicId && clinicId !== 'global' && clinicId !== 'system') ? clinicId : null
            await supabase.from('email_logs').insert({
                clinic_id: logClinicId,
                recipient: to,
                subject,
                template_used: 'MULTI_TENANT_CUSTOM',
                status: 'sent',
                sent_at: new Date().toISOString(),
                retry_count: 0,
            })
        } catch (logErr) {
            console.warn('[EmailMultiTenant] Falha silenciosa ao registrar log de sucesso:', logErr)
        }

        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isAuthError = error?.code === 'EAUTH' || 
                            error?.responseCode === 535 || 
                            errorMessage.includes('535') || 
                            errorMessage.includes('BadCredentials') ||
                            errorMessage.includes('Username and Password not accepted')

        if (isAuthError) {
            // Falha decorrente de credencial incorreta preenchida pela clinica (ex: Senha de App do Google expirada/invalida)
            // Logado como warn para nao disparar alarmes de infraestrutura ou quebrar observabilidade
            console.warn(`[EmailMultiTenant:TENANT_CONFIG_WARNING] Credenciais SMTP rejeitadas para clínica ${clinicId}: ${errorMessage}`)
        } else {
            console.warn(`[EmailMultiTenant:WARNING] Envio de e-mail não concluído para clínica ${clinicId}:`, errorMessage)
        }

        // Registrar falha na tabela apropriada (email_logs) sem estourar excecao no PostgreSQL
        try {
            const supabase = createServiceRoleClient()
            const logClinicId = (clinicId && clinicId !== 'global' && clinicId !== 'system') ? clinicId : null
            await supabase.from('email_logs').insert({
                clinic_id: logClinicId,
                recipient: to,
                subject,
                template_used: 'MULTI_TENANT_CUSTOM',
                status: 'failed',
                error_message: isAuthError 
                    ? 'Credenciais SMTP rejeitadas pelo provedor (535 BadCredentials / Senha de App incorreta)'
                    : errorMessage,
                retry_count: 0,
            })
        } catch (logErr) {
            console.warn('[EmailMultiTenant] Falha silenciosa ao registrar log de erro:', logErr)
        }

        return {
            success: false,
            error: errorMessage,
        }
    }
}

/**
 * Test SMTP connection and optionally send a test email
 */
export async function testSMTPConnection(config: Partial<SMTPConfig> & { testEmail?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port || 587,
            secure: config.port === 465,
            auth: {
                user: config.user,
                pass: config.password,
            },
            tls: {
                rejectUnauthorized: false, // Allow shared hosting certificates (e.g. Locaweb)
            },
        })

        // First verify the connection
        await transporter.verify()

        // If a test email is provided, send a real test message
        if (config.testEmail) {
            const fromEmail = config.fromEmail || config.user || 'noreply@clinigo.app'
            const fromName = config.fromName || 'CliniGo'
            const toEmail = config.testEmail.trim()

            console.log('[SMTP TEST] Sending test email to:', toEmail)

            if (!toEmail) {
                return { success: false, error: 'E-mail de destinatário vazio' }
            }

            await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: toEmail,
                subject: 'Teste de Configuracao SMTP - CliniGo',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #10b981;">Configuracao SMTP Funcionando</h2>
                        <p>Este e um e-mail de teste para confirmar que sua configuracao SMTP esta correta.</p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        <p style="color: #6b7280; font-size: 14px;">
                            <strong>Servidor:</strong> ${config.host}<br>
                            <strong>Porta:</strong> ${config.port || 587}<br>
                            <strong>Usuario:</strong> ${config.user}
                        </p>
                        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                            Este e-mail foi enviado automaticamente pelo CliniGo.
                        </p>
                    </div>
                `,
                text: `Configuracao SMTP Funcionando\n\nEste e um e-mail de teste para confirmar que sua configuracao SMTP esta correta.\n\nServidor: ${config.host}\nPorta: ${config.port || 587}\nUsuario: ${config.user}`,
            })
        }

        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed',
        }
    }
}

