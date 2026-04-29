/**
 * WhatsApp Provider Service — Multi-Provider Abstraction Layer
 * 
 * Suporta: Z-API, Evolution API, WhatsApp Business API (Oficial)
 * Cada clínica escolhe seu provedor e configura suas credenciais.
 * O serviço abstrai as diferenças entre provedores.
 */

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// ========== TYPES ==========

export type WhatsAppProvider = 'Z_API' | 'EVOLUTION' | 'OFFICIAL'

export interface WhatsAppProviderConfig {
  provider: WhatsAppProvider
  // Z-API
  instance_id?: string
  token?: string
  client_token?: string
  // Evolution API
  api_url?: string
  api_key?: string
  instance_name?: string
  // Official
  phone_number_id?: string
  access_token?: string
  business_id?: string
}

export interface WhatsAppSessionStatus {
  connected: boolean
  status: 'connected' | 'connecting' | 'disconnected' | 'error'
  phone_number?: string
  provider?: WhatsAppProvider
  error_message?: string
  last_check?: string
}

export interface WhatsAppQRResponse {
  qr_code?: string
  qr_code_base64?: string
  status: string
  instance_name?: string
}

export interface WhatsAppSendResult {
  success: boolean
  message_id?: string
  error?: string
}

// ========== PROVIDER IMPLEMENTATIONS ==========

/**
 * Z-API Provider
 * Docs: https://developer.z-api.io/
 */
async function zApiConnect(config: WhatsAppProviderConfig): Promise<WhatsAppQRResponse> {
  const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}`

  try {
    const res = await fetch(`${baseUrl}/qr-code`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      throw new Error(`Z-API QR error: ${res.status}`)
    }

    const data = await res.json()
    return {
      qr_code: data.value,
      qr_code_base64: data.value,
      status: 'connecting',
    }
  } catch (error: any) {
    console.error('[Z-API] Connect error:', error)
    throw new Error(`Erro ao conectar Z-API: ${error.message}`)
  }
}

async function zApiGetStatus(config: WhatsAppProviderConfig): Promise<WhatsAppSessionStatus> {
  const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}`

  try {
    const res = await fetch(`${baseUrl}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const data = await res.json()
    const isConnected = data.connected === true || data.status === 'CONNECTED'

    return {
      connected: isConnected,
      status: isConnected ? 'connected' : 'disconnected',
      phone_number: data.phone || data.smartphoneConnected,
      provider: 'Z_API',
    }
  } catch (error: any) {
    return {
      connected: false,
      status: 'error',
      provider: 'Z_API',
      error_message: error.message,
    }
  }
}

async function zApiSendMessage(config: WhatsAppProviderConfig, phone: string, message: string): Promise<WhatsAppSendResult> {
  const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}`

  try {
    const res = await fetch(`${baseUrl}/send-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.client_token ? { 'Client-Token': config.client_token } : {}),
      },
      body: JSON.stringify({
        phone: phone.replace(/\D/g, ''),
        message,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message || data.error || 'Erro Z-API' }
    }

    return { success: true, message_id: data.zapiMessageId || data.messageId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function zApiDisconnect(config: WhatsAppProviderConfig): Promise<boolean> {
  const baseUrl = `https://api.z-api.io/instances/${config.instance_id}/token/${config.token}`

  try {
    await fetch(`${baseUrl}/logout`, { method: 'POST' })
    return true
  } catch {
    return false
  }
}

/**
 * Evolution API Provider
 * Docs: https://doc.evolution-api.com/
 */
async function evolutionConnect(config: WhatsAppProviderConfig): Promise<WhatsAppQRResponse> {
  const baseUrl = config.api_url?.replace(/\/$/, '')

  try {
    // Try to create instance first
    const createRes = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key || '',
      },
      body: JSON.stringify({
        instanceName: config.instance_name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    })

    if (createRes.ok) {
      const createData = await createRes.json()
      if (createData.qrcode?.base64) {
        return {
          qr_code_base64: createData.qrcode.base64,
          status: 'connecting',
          instance_name: config.instance_name,
        }
      }
    }

    // Instance might already exist, try to get QR
    const qrRes = await fetch(`${baseUrl}/instance/connect/${config.instance_name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key || '',
      },
    })

    const qrData = await qrRes.json()

    return {
      qr_code: qrData.code || qrData.pairingCode,
      qr_code_base64: qrData.base64 || qrData.qrcode?.base64,
      status: 'connecting',
      instance_name: config.instance_name,
    }
  } catch (error: any) {
    console.error('[Evolution] Connect error:', error)
    throw new Error(`Erro ao conectar Evolution API: ${error.message}`)
  }
}

async function evolutionGetStatus(config: WhatsAppProviderConfig): Promise<WhatsAppSessionStatus> {
  const baseUrl = config.api_url?.replace(/\/$/, '')

  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${config.instance_name}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key || '',
      },
    })

    const data = await res.json()
    const state = data.instance?.state || data.state || ''
    const isConnected = state === 'open' || state === 'connected'

    return {
      connected: isConnected,
      status: isConnected ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
      phone_number: data.instance?.owner || undefined,
      provider: 'EVOLUTION',
    }
  } catch (error: any) {
    return {
      connected: false,
      status: 'error',
      provider: 'EVOLUTION',
      error_message: error.message,
    }
  }
}

async function evolutionSendMessage(config: WhatsAppProviderConfig, phone: string, message: string): Promise<WhatsAppSendResult> {
  const baseUrl = config.api_url?.replace(/\/$/, '')

  try {
    const cleanPhone = phone.replace(/\D/g, '')
    const res = await fetch(`${baseUrl}/message/sendText/${config.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.api_key || '',
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.message || data.error || 'Erro Evolution API' }
    }

    return { success: true, message_id: data.key?.id || data.messageId }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function evolutionDisconnect(config: WhatsAppProviderConfig): Promise<boolean> {
  const baseUrl = config.api_url?.replace(/\/$/, '')

  try {
    await fetch(`${baseUrl}/instance/logout/${config.instance_name}`, {
      method: 'DELETE',
      headers: { 'apikey': config.api_key || '' },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Official WhatsApp Business API (Meta Cloud API)
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
async function officialConnect(_config: WhatsAppProviderConfig): Promise<WhatsAppQRResponse> {
  // Official API doesn't use QR Code - it's pre-configured via Meta
  return {
    status: 'connected',
    qr_code: undefined,
  }
}

async function officialGetStatus(config: WhatsAppProviderConfig): Promise<WhatsAppSessionStatus> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}`,
      {
        headers: { Authorization: `Bearer ${config.access_token}` },
      }
    )

    const data = await res.json()

    return {
      connected: res.ok && !data.error,
      status: res.ok ? 'connected' : 'error',
      phone_number: data.display_phone_number,
      provider: 'OFFICIAL',
      error_message: data.error?.message,
    }
  } catch (error: any) {
    return {
      connected: false,
      status: 'error',
      provider: 'OFFICIAL',
      error_message: error.message,
    }
  }
}

async function officialSendMessage(config: WhatsAppProviderConfig, phone: string, message: string): Promise<WhatsAppSendResult> {
  try {
    const cleanPhone = phone.replace(/\D/g, '')
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.access_token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error?.message || 'Erro API Oficial' }
    }

    return { success: true, message_id: data.messages?.[0]?.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

async function officialDisconnect(_config: WhatsAppProviderConfig): Promise<boolean> {
  // Official API doesn't have disconnect
  return true
}

// ========== ROUTER — Direciona para o provedor correto ==========

const PROVIDER_HANDLERS = {
  Z_API: {
    connect: zApiConnect,
    getStatus: zApiGetStatus,
    sendMessage: zApiSendMessage,
    disconnect: zApiDisconnect,
  },
  EVOLUTION: {
    connect: evolutionConnect,
    getStatus: evolutionGetStatus,
    sendMessage: evolutionSendMessage,
    disconnect: evolutionDisconnect,
  },
  OFFICIAL: {
    connect: officialConnect,
    getStatus: officialGetStatus,
    sendMessage: officialSendMessage,
    disconnect: officialDisconnect,
  },
} as const

// ========== PUBLIC API ==========

/**
 * Busca a configuração do provedor WhatsApp de uma clínica
 */
export async function getClinicWhatsAppConfig(clinicId: string): Promise<WhatsAppProviderConfig | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data } = await supabase
    .from('clinic_integrations')
    .select('provider, config, is_active')
    .eq('clinic_id', clinicId)
    .eq('type', 'WHATSAPP')
    .eq('is_active', true)
    .single()

  if (!data) return null

  return {
    provider: data.provider as WhatsAppProvider,
    ...((data.config as Record<string, string>) || {}),
  }
}

/**
 * Conecta o WhatsApp — retorna QR Code se necessário
 */
export async function connectWhatsApp(clinicId: string, config: WhatsAppProviderConfig): Promise<WhatsAppQRResponse> {
  const handler = PROVIDER_HANDLERS[config.provider]
  if (!handler) throw new Error(`Provedor não suportado: ${config.provider}`)

  const result = await handler.connect(config)

  // Atualizar sessão no banco
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from('whatsapp_sessions').upsert({
    clinic_id: clinicId,
    provider: config.provider,
    status: result.status === 'connected' ? 'connected' : 'connecting',
    qr_code: result.qr_code_base64 || result.qr_code || null,
    qr_code_expires_at: new Date(Date.now() + 60 * 1000).toISOString(), // 60s
    instance_name: result.instance_name || config.instance_name || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'clinic_id',
    ignoreDuplicates: false,
  })

  return result
}

/**
 * Verifica status da conexão WhatsApp
 */
export async function getWhatsAppStatus(clinicId: string): Promise<WhatsAppSessionStatus> {
  const config = await getClinicWhatsAppConfig(clinicId)

  if (!config) {
    return {
      connected: false,
      status: 'disconnected',
      error_message: 'Nenhum provedor configurado',
    }
  }

  const handler = PROVIDER_HANDLERS[config.provider]
  if (!handler) {
    return {
      connected: false,
      status: 'error',
      error_message: `Provedor não suportado: ${config.provider}`,
    }
  }

  const status = await handler.getStatus(config)

  // Atualizar sessão no banco
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from('whatsapp_sessions').upsert({
    clinic_id: clinicId,
    provider: config.provider,
    status: status.status,
    phone_number: status.phone_number || null,
    connected_at: status.connected ? new Date().toISOString() : null,
    last_health_check: new Date().toISOString(),
    error_message: status.error_message || null,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'clinic_id',
    ignoreDuplicates: false,
  })

  return status
}

/**
 * Envia mensagem via WhatsApp — Função central de envio
 * 
 * ESTA É A FUNÇÃO QUE TODAS AS PARTES DO SISTEMA DEVEM USAR.
 * Se não houver provedor configurado, retorna falha com fallback_url para wa.me
 */
export async function sendWhatsAppMessage(
  clinicId: string,
  phone: string,
  message: string,
  context?: string
): Promise<WhatsAppSendResult & { fallback_url?: string }> {
  const config = await getClinicWhatsAppConfig(clinicId)

  // Fallback: gerar URL wa.me se não houver provedor
  const cleanPhone = phone.replace(/\D/g, '')
  const fallbackUrl = `https://wa.me/${cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(message)}`

  if (!config) {
    return {
      success: false,
      error: 'Nenhum provedor WhatsApp configurado',
      fallback_url: fallbackUrl,
    }
  }

  const handler = PROVIDER_HANDLERS[config.provider]
  if (!handler) {
    return {
      success: false,
      error: `Provedor não suportado: ${config.provider}`,
      fallback_url: fallbackUrl,
    }
  }

  const result = await handler.sendMessage(config, phone, message)

  // Log no banco
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from('whatsapp_messages_log').insert({
    clinic_id: clinicId,
    to_number: cleanPhone,
    message,
    status: result.success ? 'sent' : 'failed',
    error_message: result.error || null,
    trigger_context: context || 'api_send',
  })

  return {
    ...result,
    fallback_url: result.success ? undefined : fallbackUrl,
  }
}

/**
 * Desconecta WhatsApp
 */
export async function disconnectWhatsApp(clinicId: string): Promise<boolean> {
  const config = await getClinicWhatsAppConfig(clinicId)
  if (!config) return true

  const handler = PROVIDER_HANDLERS[config.provider]
  if (!handler) return false

  const result = await handler.disconnect(config)

  // Atualizar banco
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  await supabase.from('whatsapp_sessions').update({
    status: 'disconnected',
    disconnected_at: new Date().toISOString(),
    qr_code: null,
    updated_at: new Date().toISOString(),
  }).eq('clinic_id', clinicId)

  // Desativar integração
  await supabase.from('clinic_integrations').update({
    is_active: false,
    updated_at: new Date().toISOString(),
  }).eq('clinic_id', clinicId).eq('type', 'WHATSAPP')

  return result
}
