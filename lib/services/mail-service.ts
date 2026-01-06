import nodemailer from 'nodemailer'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
}

/**
 * Gets the SMTP transporter configured in the database, 
 * or falls back to environment variables if not found.
 */
export async function getTransporter() {
    const supabase = createServiceRoleClient()
    const { data: settingsData } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'smtp_settings')
        .single()

    const smtp = settingsData?.value as any

    if (smtp && smtp.host && smtp.user && smtp.password) {
        return {
            transporter: nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.secure,
                auth: {
                    user: smtp.user,
                    pass: smtp.password,
                },
            }),
            from: `"${smtp.from_name || 'CliniGo'}" <${smtp.from_email || smtp.user}>`
        }
    }

    // Fallback or Error
    return null
}

/**
 * Sends an email using the dynamic SMTP configuration.
 */
export async function sendMail(options: EmailOptions) {
    try {
        const config = await getTransporter()

        if (!config) {
            console.error('[MailService] SMTP not configured. Check system_settings table.')
            return { success: false, error: 'SMTP not configured' }
        }

        const { transporter, from } = config

        const info = await transporter.sendMail({
            from: options.from || from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        })

        console.log('[MailService] Email sent:', info.messageId)
        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('[MailService] Failed to send email:', error)
        return { success: false, error: error.message }
    }
}
