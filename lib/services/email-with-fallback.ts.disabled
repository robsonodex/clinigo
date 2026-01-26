/**
 * Enhanced Email Service with Fallback - CliniGo v3.0
 * 
 * Tries clinic's custom SMTP first, then falls back to global SMTP
 * Logs all attempts and notifies on failures
 */

import nodemailer from 'nodemailer'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'
import { render } from '@react-email/render'

interface EmailConfig {
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
    html?: string
    text?: string
    template?: React.ReactElement
}

interface SendEmailResult {
    success: boolean
    messageId?: string
    provider: 'CLINIC_SMTP' | 'GLOBAL_SMTP'
    error?: string
}

/**
 * Get global SMTP configuration
 */
function getGlobalSMTPConfig(): EmailConfig {
    return {
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || 'apikey',
        password: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@clinigo.app',
        fromName: process.env.SMTP_FROM_NAME || 'CliniGo',
        secure: process.env.SMTP_PORT === '465'
    }
}

/**
 * Get clinic's custom SMTP configuration
 */
async function getClinicSMTPConfig(clinicId: string): Promise<EmailConfig | null> {
    const supabase = createServiceRoleClient()

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('name, smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) return null

    const clinicData = clinic as any

    // Only PRO and ENTERPRISE can use custom SMTP
    const canUseCustomSMTP = ['PRO', 'PROFESSIONAL', 'ENTERPRISE'].includes(clinicData.plan_type || '')

    if (!clinicData.smtp_enabled || !canUseCustomSMTP || !clinicData.smtp_host || !clinicData.smtp_password) {
        return null
    }

    try {
        return {
            host: clinicData.smtp_host,
            port: clinicData.smtp_port || 587,
            user: clinicData.smtp_user || '',
            password: decrypt(clinicData.smtp_password),
            fromEmail: clinicData.smtp_from_email || '',
            fromName: clinicData.smtp_from_name || clinicData.name,
            secure: clinicData.smtp_port === 465
        }
    } catch {
        console.error('[EMAIL] Failed to decrypt clinic SMTP password')
        return null
    }
}

/**
 * Create nodemailer transporter from config
 */
function createTransporter(config: EmailConfig) {
    return nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.password
        }
    })
}

/**
 * Send email with fallback support
 */
export async function sendEmailWithFallback(params: SendEmailParams): Promise<SendEmailResult> {
    const { clinicId, to, subject, template } = params
    let html = params.html || ''
    const text = params.text

    const supabase = createServiceRoleClient()

    // Render React Email template if provided
    if (template) {
        html = await render(template)
    }

    // Try clinic's custom SMTP first
    const clinicConfig = await getClinicSMTPConfig(clinicId)

    if (clinicConfig) {
        try {
            const transporter = createTransporter(clinicConfig)

            const info = await transporter.sendMail({
                from: `"${clinicConfig.fromName}" <${clinicConfig.fromEmail}>`,
                to,
                subject,
                text: text || html.replace(/<[^>]*>/g, ''),
                html
            })

            // Log success
            await supabase.from('notifications').insert({
                clinic_id: clinicId,
                type: 'EMAIL',
                status: 'SENT',
                recipient_email: to,
                subject,
                external_id: info.messageId,
                sent_at: new Date().toISOString()
            })

            console.log(`[EMAIL] Sent via clinic SMTP to ${to}`)
            return { success: true, messageId: info.messageId, provider: 'CLINIC_SMTP' }

        } catch (error: any) {
            console.error(`[EMAIL] Clinic SMTP failed:`, error.message)

            // Notify clinic admin about SMTP failure
            await supabase.from('notifications').insert({
                clinic_id: clinicId,
                type: 'SMTP_ERROR',
                title: 'Falha no SMTP Customizado',
                message: `Erro ao enviar e-mail: ${error.message}. Usando SMTP global como fallback.`,
                severity: 'WARNING',
                action_url: '/dashboard/configuracoes/email'
            })
        }
    }

    // Fallback to global SMTP
    try {
        const globalConfig = getGlobalSMTPConfig()
        const transporter = createTransporter(globalConfig)

        // Get clinic name for "via" branding
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicId)
            .single()

        const fromName = clinic?.name ? `${clinic.name} via CliniGo` : 'CliniGo'

        const info = await transporter.sendMail({
            from: `"${fromName}" <${globalConfig.fromEmail}>`,
            to,
            subject,
            text: text || html.replace(/<[^>]*>/g, ''),
            html
        })

        // Log success
        await supabase.from('notifications').insert({
            clinic_id: clinicId,
            type: 'EMAIL',
            status: 'SENT',
            recipient_email: to,
            subject,
            external_id: info.messageId,
            sent_at: new Date().toISOString(),
            metadata: { provider: 'global', fallback: !!clinicConfig }
        })

        console.log(`[EMAIL] Sent via global SMTP (fallback) to ${to}`)
        return { success: true, messageId: info.messageId, provider: 'GLOBAL_SMTP' }

    } catch (error: any) {
        console.error(`[EMAIL] Global SMTP also failed:`, error.message)

        // Log failure
        await supabase.from('notifications').insert({
            clinic_id: clinicId,
            type: 'EMAIL',
            status: 'FAILED',
            recipient_email: to,
            subject,
            error_message: error.message
        })

        // Send critical alert to Slack
        if (process.env.SLACK_WEBHOOK_URL) {
            try {
                await fetch(process.env.SLACK_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: `🚨 *CRITICAL: Email delivery failed*\nClinic: ${clinicId}\nTo: ${to}\nError: ${error.message}`
                    })
                })
            } catch {
                // Ignore Slack errors
            }
        }

        return { success: false, provider: 'GLOBAL_SMTP', error: error.message }
    }
}

/**
 * Test SMTP configuration
 */
export async function testSMTPConfig(config: EmailConfig): Promise<{ success: boolean; error?: string }> {
    try {
        const transporter = createTransporter(config)
        await transporter.verify()
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
