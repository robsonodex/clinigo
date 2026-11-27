/**
 * Motor SMTP comercial da CliniGO (otimizado para Hostinger / contato@clinigo.app).
 * - Lê credenciais de system_settings ('smtp_settings') com fallback em process.env.SMTP_*
 * - Corrige automaticamente divergência porta 587 vs secure:true (STARTTLS)
 * - Constrói HTML limpo de alta entregabilidade com assinatura corporativa do Diretor
 * - Suporta anexo PDF direto do Cofre (sales-vault) e link rastreável /apresentacao/[token]
 */
import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
    DEFAULT_DIRECTOR_SIGNATURE,
    type OutreachDeliveryMode,
} from './outreach-types'
import { normalizeWhatsappDigits } from './prospect-types'

const VAULT_BUCKET_ID = 'sales-vault'
const MAX_SMTP_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB limite seguro SMTP Hostinger

export interface ResolvedSmtpConfig {
    host: string
    port: number
    secure: boolean
    requireTLS: boolean
    user: string
    password: string
    fromEmail: string
    fromName: string
    source: 'database' | 'env'
}

export function normalizeHostingerTls(
    port: number,
    rawSecure: boolean | string | undefined
): { secure: boolean; requireTLS: boolean } {
    // Porta 465 sempre usa SSL/TLS implícito (secure: true).
    // Porta 587 / 2525 usa STARTTLS (secure: false + requireTLS: true), evitando ERR_SSL_WRONG_VERSION_NUMBER.
    if (port === 465) {
        return { secure: true, requireTLS: false }
    }
    if (port === 587 || port === 2525) {
        return { secure: false, requireTLS: true }
    }
    const boolSecure = rawSecure === true || rawSecure === 'true'
    return { secure: boolSecure, requireTLS: !boolSecure }
}

export async function resolveCommercialSmtpConfig(
    supabaseAdmin: SupabaseClient
): Promise<ResolvedSmtpConfig | null> {
    // 1. Tenta primeiro system_settings ('smtp_settings'), onde o Master Hub salva a conta Hostinger
    try {
        const { data: settingsRow } = await supabaseAdmin
            .from('system_settings' as any)
            .select('value')
            .eq('key', 'smtp_settings')
            .maybeSingle()

        const val = (settingsRow as { value?: Record<string, any> } | null)?.value
        if (val && val.host && val.user && val.password) {
            const port = Number(val.port) || 465
            const tls = normalizeHostingerTls(port, val.secure)
            return {
                host: String(val.host).trim(),
                port,
                secure: tls.secure,
                requireTLS: tls.requireTLS,
                user: String(val.user).trim(),
                password: String(val.password),
                fromEmail: String(val.from_email || val.user).trim(),
                fromName: String(val.from_name || 'Robson Oliveira | CliniGO').trim(),
                source: 'database',
            }
        }
    } catch (err) {
        console.warn('[OUTREACH_MAILER] Aviso ao ler system_settings:', err instanceof Error ? err.message : String(err))
    }

    // 2. Fallback para variáveis de ambiente da Vercel
    const host = process.env.SMTP_HOST?.trim()
    const user = process.env.SMTP_USER?.trim()
    const password = process.env.SMTP_PASSWORD
    if (host && user && password) {
        const port = parseInt(process.env.SMTP_PORT || '587', 10)
        const tls = normalizeHostingerTls(port, process.env.SMTP_SECURE)
        return {
            host,
            port,
            secure: tls.secure,
            requireTLS: tls.requireTLS,
            user,
            password,
            fromEmail: (process.env.SMTP_FROM_EMAIL || user).trim(),
            fromName: (process.env.SMTP_FROM_NAME || 'Robson Oliveira | CliniGO').trim(),
            source: 'env',
        }
    }

    return null
}

function escapeHtml(text: string): string {
    return (text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function formatBodyToHtmlParagraphs(bodyText: string): string {
    const blocks = (bodyText || '').trim().split(/\n\s*\n/)
    return blocks
        .map((block) => {
            const lines = block
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)

            const isBulletBlock = lines.length > 0 && lines.every((l) => /^[-•*]\s+/.test(l))
            if (isBulletBlock) {
                const items = lines
                    .map((l) => `<li style="margin:0 0 6px 0;padding:0;color:#1F2937;">${escapeHtml(l.replace(/^[-•*]\s+/, ''))}</li>`)
                    .join('')
                return `<ul style="margin:0 0 14px 18px;padding:0;line-height:1.55;">${items}</ul>`
            }

            const htmlLines = lines.map((l) => escapeHtml(l)).join('<br />')
            return `<p style="margin:0 0 14px 0;color:#1F2937;line-height:1.6;">${htmlLines}</p>`
        })
        .join('')
}

export interface BuildOutreachEmailParams {
    bodyText: string
    senderName?: string
    senderRole?: string
    senderPhone?: string
    senderEmail?: string
    deliveryMode: OutreachDeliveryMode
    attachmentFileName?: string | null
    presentationUrl?: string | null
    unsubscribeUrl?: string | null
    baseUrl?: string
}

export function buildDirectorSignatureHtml(params?: {
    senderName?: string
    senderRole?: string
    senderPhone?: string
    senderEmail?: string
    baseUrl?: string
}): string {
    const baseUrl = (params?.baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://clinigo.app').replace(/\/$/, '')
    const name = escapeHtml(params?.senderName || DEFAULT_DIRECTOR_SIGNATURE.name)
    const role = escapeHtml(params?.senderRole || DEFAULT_DIRECTOR_SIGNATURE.role)
    const phone = params?.senderPhone || DEFAULT_DIRECTOR_SIGNATURE.phone
    const phoneEscaped = escapeHtml(phone)
    const waDigits = normalizeWhatsappDigits(phone) || '5521966960684'
    const email = params?.senderEmail || DEFAULT_DIRECTOR_SIGNATURE.email
    const emailEscaped = escapeHtml(email)
    const logoUrl = `${baseUrl}/logo-clinigo-round.jpg`

    return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-top:1px solid #E5EAE7;padding-top:18px;font-family:Arial,Helvetica,sans-serif;max-width:560px;width:100%;">
  <tr>
    <td style="width:68px;vertical-align:top;padding-right:14px;">
      <img src="${logoUrl}" alt="CliniGO" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;border:1px solid #D6DDD9;object-fit:cover;" />
    </td>
    <td style="vertical-align:top;">
      <div style="font-size:15px;font-weight:700;color:#0F1F1B;line-height:1.25;">${name}</div>
      <div style="font-size:13px;font-weight:600;color:#155E4B;margin-top:2px;line-height:1.3;">${role} · CliniGO</div>
      <div style="font-size:11.5px;color:#5B6B65;margin-top:4px;line-height:1.4;">${escapeHtml(DEFAULT_DIRECTOR_SIGNATURE.tagline)}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        <tr>
          <td style="font-size:12.5px;color:#1F2937;line-height:1.6;">
            <a href="https://wa.me/${waDigits}" style="color:#155E4B;text-decoration:none;font-weight:600;">WhatsApp: ${phoneEscaped}</a>
            <span style="color:#CBD5D0;padding:0 6px;">|</span>
            <a href="mailto:${emailEscaped}" style="color:#1F2937;text-decoration:none;">${emailEscaped}</a>
            <span style="color:#CBD5D0;padding:0 6px;">|</span>
            <a href="https://clinigo.app" style="color:#155E4B;text-decoration:none;font-weight:600;">clinigo.app</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim()
}

export function buildOutreachEmailHtml(params: BuildOutreachEmailParams): {
    html: string
    text: string
} {
    const bodyHtml = formatBodyToHtmlParagraphs(params.bodyText)
    const showTrackedCard =
        Boolean(params.presentationUrl) &&
        (params.deliveryMode === 'TRACKED_LINK' || params.deliveryMode === 'BOTH')

    const attachmentNoteHtml =
        params.attachmentFileName &&
        (params.deliveryMode === 'ATTACHMENT' || params.deliveryMode === 'BOTH')
            ? `<p style="margin:0 0 14px 0;font-size:13px;color:#4B5B56;">Arquivo em anexo: <strong style="color:#0F1F1B;">${escapeHtml(params.attachmentFileName)}</strong></p>`
            : ''

    const presentationCardHtml = showTrackedCard
        ? `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 16px 0;background-color:#F4F8F6;border:1px solid #D6E4DE;border-radius:10px;width:100%;max-width:520px;">
  <tr>
    <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#155E4B;margin-bottom:4px;">Material Executivo CliniGO</div>
      <div style="font-size:14px;font-weight:600;color:#0F1F1B;margin-bottom:10px;">Visualize a apresentação completa direto no navegador ou celular</div>
      <a href="${escapeHtml(params.presentationUrl || '')}" style="display:inline-block;background-color:#155E4B;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:7px;">Abrir Apresentação Executiva</a>
    </td>
  </tr>
</table>`.trim()
        : ''

    const signatureHtml = buildDirectorSignatureHtml({
        senderName: params.senderName,
        senderRole: params.senderRole,
        senderPhone: params.senderPhone,
        senderEmail: params.senderEmail,
        baseUrl: params.baseUrl,
    })

    const unsubscribeHtml = params.unsubscribeUrl
        ? `<div style="margin-top:22px;padding-top:12px;border-top:1px solid #F0F3F1;font-size:11px;color:#7B8B85;line-height:1.5;">
            Enviado por ${escapeHtml(params.senderName || DEFAULT_DIRECTOR_SIGNATURE.name)} (${escapeHtml(params.senderEmail || DEFAULT_DIRECTOR_SIGNATURE.email)}). Caso prefira não receber novos contatos, <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#5B6B65;text-decoration:underline;">clique aqui para sair da lista</a>.
           </div>`
        : ''

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:14.5px;color:#1F2937;">
  <div style="max-width:600px;margin:0;padding:12px 6px;">
    ${bodyHtml}
    ${attachmentNoteHtml}
    ${presentationCardHtml}
    ${signatureHtml}
    ${unsubscribeHtml}
  </div>
</body>
</html>`

    const textParts = [params.bodyText.trim()]
    if (showTrackedCard && params.presentationUrl) {
        textParts.push(`Apresentação Executiva CliniGO: ${params.presentationUrl}`)
    }
    textParts.push(
        `--\n${params.senderName || DEFAULT_DIRECTOR_SIGNATURE.name}\n${params.senderRole || DEFAULT_DIRECTOR_SIGNATURE.role} · CliniGO\nWhatsApp: ${params.senderPhone || DEFAULT_DIRECTOR_SIGNATURE.phone} | ${params.senderEmail || DEFAULT_DIRECTOR_SIGNATURE.email} | https://clinigo.app`
    )
    if (params.unsubscribeUrl) {
        textParts.push(`Para não receber novos contatos: ${params.unsubscribeUrl}`)
    }

    return {
        html,
        text: textParts.join('\n\n'),
    }
}

export interface LoadedVaultAttachment {
    filename: string
    content: Buffer
    contentType: string
    sizeBytes: number
}

export async function loadVaultDocumentAttachment(
    supabaseAdmin: SupabaseClient,
    vaultDocumentId: string
): Promise<{ attachment: LoadedVaultAttachment | null; skippedReason?: string }> {
    const { data: doc, error } = await supabaseAdmin
        .from('sales_vault_documents' as any)
        .select('id, title, file_name, file_path, mime_type, file_size_bytes')
        .eq('id', vaultDocumentId)
        .maybeSingle()

    if (error || !doc) {
        return { attachment: null, skippedReason: 'Documento do cofre não encontrado.' }
    }

    const record = doc as unknown as {
        file_name: string
        file_path: string
        mime_type: string
        file_size_bytes: number
    }

    if (record.file_size_bytes > MAX_SMTP_ATTACHMENT_BYTES) {
        return {
            attachment: null,
            skippedReason: `Arquivo excede o limite de 10 MB para anexo SMTP (${(record.file_size_bytes / (1024 * 1024)).toFixed(1)} MB).`,
        }
    }

    const { data: blob, error: dlError } = await supabaseAdmin.storage
        .from(VAULT_BUCKET_ID)
        .download(record.file_path)

    if (dlError || !blob) {
        return { attachment: null, skippedReason: 'Não foi possível baixar o anexo do cofre.' }
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    return {
        attachment: {
            filename: record.file_name,
            content: buffer,
            contentType: record.mime_type || 'application/pdf',
            sizeBytes: buffer.length,
        },
    }
}

export async function sendCommercialOutreachEmail(params: {
    supabaseAdmin: SupabaseClient
    to: string
    subject: string
    bodyText: string
    deliveryMode: OutreachDeliveryMode
    senderName?: string
    senderRole?: string
    senderPhone?: string
    senderEmail?: string
    attachment?: LoadedVaultAttachment | null
    presentationUrl?: string | null
    unsubscribeUrl?: string | null
    inReplyToMessageId?: string | null
}): Promise<{ success: boolean; messageId?: string; error?: string; permanentBounce?: boolean }> {
    const smtp = await resolveCommercialSmtpConfig(params.supabaseAdmin)
    if (!smtp) {
        return {
            success: false,
            error: 'SMTP comercial (Hostinger) não configurado em system_settings nem nas variáveis de ambiente.',
        }
    }

    const senderDisplayName = params.senderName?.trim() || DEFAULT_DIRECTOR_SIGNATURE.name
    const senderAddress = params.senderEmail?.trim() || smtp.fromEmail

    const { html, text } = buildOutreachEmailHtml({
        bodyText: params.bodyText,
        senderName: senderDisplayName,
        senderRole: params.senderRole || DEFAULT_DIRECTOR_SIGNATURE.role,
        senderPhone: params.senderPhone || DEFAULT_DIRECTOR_SIGNATURE.phone,
        senderEmail: senderAddress,
        deliveryMode: params.deliveryMode,
        attachmentFileName: params.attachment?.filename || null,
        presentationUrl: params.presentationUrl,
        unsubscribeUrl: params.unsubscribeUrl,
    })

    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        requireTLS: smtp.requireTLS,
        auth: {
            user: smtp.user,
            pass: smtp.password,
        },
        connectionTimeout: 15000,
        greetingTimeout: 12000,
        socketTimeout: 25000,
    })

    const headers: Record<string, string> = {}
    if (params.unsubscribeUrl) {
        headers['List-Unsubscribe'] = `<${params.unsubscribeUrl}>`
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }
    if (params.inReplyToMessageId) {
        headers['In-Reply-To'] = params.inReplyToMessageId
        headers['References'] = params.inReplyToMessageId
    }

    const shouldAttach =
        Boolean(params.attachment) &&
        (params.deliveryMode === 'ATTACHMENT' || params.deliveryMode === 'BOTH')

    try {
        const info = await transporter.sendMail({
            from: `"${senderDisplayName} | CliniGO" <${senderAddress}>`,
            replyTo: senderAddress,
            to: params.to,
            subject: params.subject,
            text,
            html,
            headers,
            attachments:
                shouldAttach && params.attachment
                    ? [
                          {
                              filename: params.attachment.filename,
                              content: params.attachment.content,
                              contentType: params.attachment.contentType,
                          },
                      ]
                    : undefined,
        })

        return {
            success: true,
            messageId: info.messageId,
        }
    } catch (error: any) {
        const errMsg = error?.message || String(error)
        const responseCode = Number(error?.responseCode || 0)
        const permanentBounce =
            responseCode === 550 ||
            responseCode === 551 ||
            responseCode === 553 ||
            /user unknown|no such user|mailbox not found|does not exist|invalid recipient/i.test(errMsg)

        return {
            success: false,
            error: errMsg.slice(0, 500),
            permanentBounce,
        }
    }
}

