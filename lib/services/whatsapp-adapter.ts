/**
 * WhatsApp Adapter - Multi-Provedor
 * Envia mensagens usando as credenciais configuradas por cada clínica
 * 
 * Suporte: Z-API, Evolution API, WhatsApp Oficial (Meta), Twilio
 */

import { createClient } from '@/lib/supabase/client'
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface WhatsAppConfig {
    provider: 'NONE' | 'ZAPI' | 'EVOLUTION' | 'OFFICIAL' | 'TWILIO'
    api_key: string
    instance_id: string
    business_id?: string
    enabled: boolean
}

export interface SendMessageParams {
    to: string
    message: string
    templateId?: string
    templateData?: Record<string, string | number | boolean>
}

export interface SendResult {
    success: boolean
    messageId?: string
    error?: string
}

/**
 * Busca configuração de WhatsApp da clínica
 */
export async function getClinicWhatsAppConfig(clinicId: string): Promise<WhatsAppConfig | null> {
    const supabase = createClient()

    // Type for clinic WhatsApp columns (not all in generated types)
    interface ClinicWhatsAppData {
        whatsapp_provider: string | null
        whatsapp_api_key: string | null
        whatsapp_instance_id: string | null
        whatsapp_business_id: string | null
        whatsapp_enabled: boolean | null
        plan_type: string
    }

    const { data: clinic, error } = await supabase
        .from('clinics')
        .select('whatsapp_provider, whatsapp_api_key, whatsapp_instance_id, whatsapp_business_id, whatsapp_enabled, plan_type')
        .eq('id', clinicId)
        .single()

    if (error || !clinic) {
        console.error('[WhatsApp Adapter] Clinic not found:', clinicId)
        return null
    }

    // Type assertion for columns not in generated types
    const clinicData = clinic as unknown as ClinicWhatsAppData

    // WhatsApp access: BASIC+ for manual, PROFESSIONAL+ for automation
    // STARTER has no WhatsApp access
    const allowedPlans = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK']
    if (!allowedPlans.includes(clinicData.plan_type)) {
        console.warn('[WhatsApp Adapter] Plan does not support WhatsApp:', clinicData.plan_type)
        return null
    }

    return {
        provider: clinicData.whatsapp_provider as WhatsAppConfig['provider'],
        api_key: clinicData.whatsapp_api_key || '',
        instance_id: clinicData.whatsapp_instance_id || '',
        business_id: clinicData.whatsapp_business_id || undefined,
        enabled: clinicData.whatsapp_enabled || false,
    }
}

/**
 * Envia mensagem WhatsApp usando provedor configurado pela clínica
 */
export async function sendWhatsAppMessage(
    clinicId: string,
    params: SendMessageParams
): Promise<SendResult> {
    const config = await getClinicWhatsAppConfig(clinicId)

    if (!config || config.provider === 'NONE' || !config.enabled) {
        console.warn('[WhatsApp Adapter] WhatsApp not configured for clinic:', clinicId)
        return { success: false, error: 'WhatsApp não configurado' }
    }

    const { to, message, templateId, templateData } = params
    const phone = formatPhoneNumber(to)

    try {
        switch (config.provider) {
            case 'ZAPI':
                return await sendViaZAPI(config, phone, message)

            case 'EVOLUTION':
                return await sendViaEvolution(config, phone, message)

            case 'OFFICIAL':
                return await sendViaOfficialAPI(config, phone, message, templateId, templateData)

            case 'TWILIO':
                return await sendViaTwilio(config, phone, message)

            default:
                return { success: false, error: 'Provedor não suportado' }
        }
    } catch (error) {
        const err = error as Error
        console.error('[WhatsApp Adapter] Send error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Formata número de telefone para padrão internacional
 */
function formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '')

    // Adiciona código do Brasil se não tiver
    if (cleaned.length === 11 || cleaned.length === 10) {
        cleaned = '55' + cleaned
    }

    return cleaned
}

/**
 * Z-API - https://z-api.io
 */
async function sendViaZAPI(
    config: WhatsAppConfig,
    phone: string,
    message: string
): Promise<SendResult> {
    const url = `https://api.z-api.io/instances/${config.instance_id}/token/${config.api_key}/send-text`

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            phone,
            message,
        }),
    })

    const data = await response.json()

    if (response.ok && data.zapiMessageId) {
        return { success: true, messageId: data.zapiMessageId }
    }

    return { success: false, error: data.error || 'Erro Z-API' }
}

/**
 * Evolution API - Self-hosted
 */
async function sendViaEvolution(
    config: WhatsAppConfig,
    phone: string,
    message: string
): Promise<SendResult> {
    const baseUrl = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080'
    const url = `${baseUrl}/message/sendText/${config.instance_id}`

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': config.api_key,
        },
        body: JSON.stringify({
            number: phone,
            text: message,
        }),
    })

    const data = await response.json()

    if (response.ok && data.key?.id) {
        return { success: true, messageId: data.key.id }
    }

    return { success: false, error: data.message || 'Erro Evolution API' }
}

/**
 * WhatsApp Business API Oficial (Meta/Facebook)
 */
async function sendViaOfficialAPI(
    config: WhatsAppConfig,
    phone: string,
    message: string,
    templateId?: string,
    templateData?: Record<string, string | number | boolean>
): Promise<SendResult> {
    const url = `https://graph.facebook.com/v18.0/${config.instance_id}/messages`

    let body: Record<string, unknown>

    if (templateId) {
        // Enviar via template (necessário para iniciar conversa)
        body = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: templateId,
                language: { code: 'pt_BR' },
                components: templateData ? [{
                    type: 'body',
                    parameters: Object.entries(templateData).map(([_, value]) => ({
                        type: 'text',
                        text: String(value),
                    })),
                }] : undefined,
            },
        }
    } else {
        // Mensagem de texto simples (apenas em conversa ativa)
        body = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: message },
        }
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.api_key}`,
        },
        body: JSON.stringify(body),
    })

    const data = await response.json()

    if (response.ok && data.messages?.[0]?.id) {
        return { success: true, messageId: data.messages[0].id }
    }

    return { success: false, error: data.error?.message || 'Erro WhatsApp Oficial' }
}

/**
 * Twilio WhatsApp
 */
async function sendViaTwilio(
    config: WhatsAppConfig,
    phone: string,
    message: string
): Promise<SendResult> {
    const accountSid = config.instance_id // Usando instance_id para Account SID
    const authToken = config.api_key
    const fromNumber = config.business_id || process.env.TWILIO_WHATSAPP_NUMBER

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('From', `whatsapp:${fromNumber}`)
    formData.append('To', `whatsapp:+${phone}`)
    formData.append('Body', message)

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: formData,
    })

    const data = await response.json()

    if (response.ok && data.sid) {
        return { success: true, messageId: data.sid }
    }

    return { success: false, error: data.message || 'Erro Twilio' }
}

/**
 * Testa conexão com provedor WhatsApp
 */
export async function testWhatsAppConnection(
    provider: string,
    apiKey: string,
    instanceId: string
): Promise<{ connected: boolean; error?: string }> {
    try {
        switch (provider) {
            case 'ZAPI': {
                const res = await fetch(
                    `https://api.z-api.io/instances/${instanceId}/token/${apiKey}/status`
                )
                const data = await res.json()
                return { connected: res.ok && data.connected === true }
            }

            case 'EVOLUTION': {
                const baseUrl = process.env.EVOLUTION_BASE_URL || 'http://localhost:8080'
                const res = await fetch(
                    `${baseUrl}/instance/connectionStatus/${instanceId}`,
                    { headers: { 'apikey': apiKey } }
                )
                const data = await res.json()
                return { connected: data.instance?.state === 'open' }
            }

            case 'OFFICIAL': {
                const res = await fetch(
                    `https://graph.facebook.com/v18.0/${instanceId}`,
                    { headers: { 'Authorization': `Bearer ${apiKey}` } }
                )
                return { connected: res.ok }
            }

            case 'TWILIO': {
                const res = await fetch(
                    `https://api.twilio.com/2010-04-01/Accounts/${instanceId}.json`,
                    {
                        headers: {
                            'Authorization': 'Basic ' + Buffer.from(`${instanceId}:${apiKey}`).toString('base64'),
                        },
                    }
                )
                return { connected: res.ok }
            }

            default:
                return { connected: false, error: 'Provedor não suportado' }
        }
    } catch (error) {
        return { connected: false, error: (error as Error).message }
    }
}

/**
 * Wrapper para compatibilidade com código existente
 */
export async function sendWhatsAppMessageLegacy(params: {
    phone: string
    message: string
    templateId?: string
    templateData?: Record<string, string | number | boolean>
}): Promise<boolean> {
    // Fallback: usa provedor global da plataforma
    console.warn('[WhatsApp] Using legacy global provider')

    // Implementação de fallback aqui se necessário
    return false
}

