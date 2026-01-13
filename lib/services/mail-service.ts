import nodemailer from 'nodemailer'

export interface EmailOptions {
    to: string
    subject: string
    html: string
    text?: string
    from?: string
}

/**
 * SMTP Configuration from Environment Variables
 * Set these in .env.local and Vercel:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASSWORD
 * - SMTP_FROM_NAME
 * - SMTP_FROM_EMAIL
 * - SMTP_SECURE (true/false)
 */
function getSmtpConfig() {
    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT || '587')
    const user = process.env.SMTP_USER
    const password = process.env.SMTP_PASSWORD
    const secure = process.env.SMTP_SECURE === 'true'
    const fromName = process.env.SMTP_FROM_NAME || 'CliniGo'
    const fromEmail = process.env.SMTP_FROM_EMAIL || user

    if (!host || !user || !password) {
        return null
    }

    return {
        host,
        port,
        secure,
        user,
        password,
        fromName,
        fromEmail
    }
}

/**
 * Gets the SMTP transporter using environment variables
 */
export function getTransporter() {
    const config = getSmtpConfig()

    if (!config) {
        console.error('[MailService] SMTP not configured. Check environment variables:')
        console.error('  Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD')
        console.error('  Optional: SMTP_PORT (default 587), SMTP_SECURE, SMTP_FROM_NAME, SMTP_FROM_EMAIL')
        return null
    }

    return {
        transporter: nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.password,
            },
        }),
        from: `"${config.fromName}" <${config.fromEmail}>`
    }
}

/**
 * Sends an email using SMTP configuration from environment variables
 */
export async function sendMail(options: EmailOptions) {
    try {
        const config = getTransporter()

        if (!config) {
            return { success: false, error: 'SMTP not configured. Check environment variables.' }
        }

        const { transporter, from } = config

        const info = await transporter.sendMail({
            from: options.from || from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        })

        console.log('[MailService] Email sent:', info.messageId, 'to:', options.to)
        return { success: true, messageId: info.messageId }
    } catch (error: any) {
        console.error('[MailService] Failed to send email:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Check if SMTP is properly configured
 */
export function isSmtpConfigured(): boolean {
    return getSmtpConfig() !== null
}

/**
 * Get SMTP status for debugging (hides password)
 */
export function getSmtpStatus() {
    const config = getSmtpConfig()
    if (!config) {
        return {
            configured: false,
            message: 'SMTP not configured'
        }
    }
    return {
        configured: true,
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        fromName: config.fromName,
        fromEmail: config.fromEmail
    }
}
