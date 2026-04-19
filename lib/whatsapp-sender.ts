/**
 * WhatsApp Sender Utility (Client-Side)
 * Unified function for sending WhatsApp messages with dual mode:
 * - If clinic has connected session → sends automatically via Baileys microservice
 * - If not connected → returns error with "não conectado" message
 *
 * Used by all WhatsApp send buttons throughout the dashboard
 */

import { formatPhoneForWhatsApp } from '@/lib/utils/whatsapp-share'

export interface SendWhatsappParams {
  to: string              // Phone number (international format without +, e.g. "5521999999999")
  message: string
  fileUrl?: string        // URL of any file to send (PDF, image, etc.)
  filename?: string       // Original filename
  mimetype?: string       // MIME type (e.g. "application/pdf", "image/jpeg")
  clinicId?: string       // Clinic ID (auto-extracted from auth on server)
  triggerContext: string   // Context identifier (e.g. "agendamento_confirmacao", "holerite_pdf")
}

export interface SendWhatsappResult {
  success: boolean
  method: 'automatic' | 'not_connected' | 'error'
  error?: string
}

/**
 * Checks if the clinic's WhatsApp session is connected
 */
export async function checkWhatsappConnection(): Promise<{
  connected: boolean
  phone?: string
}> {
  try {
    const response = await fetch('/api/whatsapp-session/status')
    if (!response.ok) return { connected: false }
    const data = await response.json()
    return {
      connected: data.connected === true,
      phone: data.phone,
    }
  } catch {
    return { connected: false }
  }
}

/**
 * Send a WhatsApp message — automatic via Baileys session only
 *
 * Usage:
 * ```ts
 * const result = await sendWhatsappMessage({
 *   to: '5521999999999',
 *   message: 'Olá! Sua consulta foi confirmada.',
 *   triggerContext: 'agendamento_confirmacao',
 * })
 *
 * if (!result.success) {
 *   toast.error(result.error)
 * }
 * ```
 */
export async function sendWhatsappMessage(
  params: SendWhatsappParams
): Promise<SendWhatsappResult> {
  const { to, message, fileUrl, filename, mimetype, triggerContext } = params

  // Format phone number
  const formattedPhone = formatPhoneForWhatsApp(to)

  // 1. Check if session is connected
  const { connected } = await checkWhatsappConnection()

  if (!connected) {
    return {
      success: false,
      method: 'not_connected',
      error: 'WhatsApp não conectado. Acesse Configurações → WhatsApp para conectar.',
    }
  }

  // 2. Session connected — send automatically
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: formattedPhone,
        message,
        file_url: fileUrl,
        filename,
        mimetype,
        trigger_context: triggerContext,
      }),
    })

    const data = await response.json()

    if (data.success) {
      return {
        success: true,
        method: 'automatic',
      }
    }

    return {
      success: false,
      method: 'error',
      error: data.error || 'Falha ao enviar mensagem via WhatsApp.',
    }
  } catch {
    return {
      success: false,
      method: 'error',
      error: 'Serviço WhatsApp indisponível. Verifique se o microserviço está rodando.',
    }
  }
}
