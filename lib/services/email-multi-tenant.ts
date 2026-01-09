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
function decryptPassword(encrypted: string): string {
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
 * Get SMTP configuration for a clinic
 * Falls back to global SMTP if clinic doesn't have custom config
 */
async function getSMTPConfig(clinicId: string): Promise<SMTPConfig> {
    const supabase = createServiceRoleClient()

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('smtp_enabled, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email, smtp_from_name, plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        throw new Error(`Clinic not found: ${clinicId}`)
    }

    // Check if clinic can use custom SMTP (PRO or ENTERPRISE plans)
    const canUseCustomSMTP = ['PRO', 'ENTERPRISE'].includes(clinic.plan_type || '')

    if (clinic.smtp_enabled && canUseCustomSMTP && clinic.smtp_host && clinic.smtp_password) {
        // Use clinic's custom SMTP
        return {
            host: clinic.smtp_host,
            port: clinic.smtp_port || 587,
            user: clinic.smtp_user || '',
            password: decryptPassword(clinic.smtp_password),
            fromEmail: clinic.smtp_from_email || '',
            fromName: clinic.smtp_from_name || '',
            secure: clinic.smtp_port === 465,
        }
    }

    // Fall back to global SMTP configuration
    return {
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        user: process.env.SMTP_USER || 'apikey',
        password: process.env.SMTP_PASSWORD || '',
        fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@clinigo.com.br',
        fromName: process.env.SMTP_FROM_NAME || 'CliniGo Telemedicina',
        secure: process.env.SMTP_PORT === '465',
    }
}

/**
 * Send email using clinic's SMTP or global fallback
 */
export async function sendEmailMultiTenant({
    clinicId,
    to,
    subject,
    html,
    text,
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const config = await getSMTPConfig(clinicId)

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

        // Log notification
        const supabase = createServiceRoleClient()
        await supabase.from('notifications').insert({
            clinic_id: clinicId,
            type: 'EMAIL',
            status: 'SENT',
            recipient_email: to,
            subject,
            body: html,
            external_id: info.messageId,
            sent_at: new Date().toISOString(),
        })

        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Email send failed:', error)

        // Log failed notification
        const supabase = createServiceRoleClient()
        await supabase.from('notifications').insert({
            clinic_id: clinicId,
            type: 'EMAIL',
            status: 'FAILED',
            recipient_email: to,
            subject,
            body: html,
            error_message: error instanceof Error ? error.message : 'Unknown error',
        })

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to send email',
        }
    }
}

/**
 * Test SMTP connection without sending an email
 */
export async function testSMTPConnection(config: Partial<SMTPConfig>): Promise<{ success: boolean; error?: string }> {
    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port || 587,
            secure: config.port === 465,
            auth: {
                user: config.user,
                pass: config.password,
            },
        })

        await transporter.verify()
        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed',
        }
    }
}

