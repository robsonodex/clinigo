import axios from 'axios'
import { createServiceRoleClient } from '@/lib/supabase/server'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || ''
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || ''

interface SendMessageParams {
    clinicId: string
    to: string // phone number (5511999999999)
    template: string
    variables: Record<string, string>
}

// Templates pre-approved in Meta Business Manager
export const WhatsAppTemplates = {
    APPOINTMENT_CONFIRMED: 'agendamento_confirmado',
    REMINDER_24H: 'lembrete_24h',
    REMINDER_1H: 'lembrete_1h',
    VIDEO_LINK: 'link_consulta',
    CANCELLATION: 'cancelamento',
    PAYMENT_APPROVED: 'pagamento_aprovado',
}

/**
 * Check if WhatsApp is configured
 */
export function isWhatsAppConfigured(): boolean {
    return !!(PHONE_NUMBER_ID && ACCESS_TOKEN)
}

/**
 * Send WhatsApp message using configured templates
 */
export async function sendWhatsAppMessage({ clinicId, to, template, variables }: SendMessageParams) {
    if (!isWhatsAppConfigured()) {
        console.log('WhatsApp not configured, skipping message')
        return { success: false, reason: 'Not configured' }
    }

    try {
        const supabase = createServiceRoleClient()

        // Check if clinic has the WhatsApp Add-on active
        const { data: clinic, error: clinicError } = await supabase
            .from('clinics')
            .select('addons')
            .eq('id', clinicId)
            .single()

        if (clinicError || !(clinic as any)?.addons?.whatsapp) {
            console.log(`WhatsApp blocked for clinic ${clinicId}: Add-on not active.`)
            return { success: false, reason: 'Add-on not active' }
        }

        const response = await axios.post(
            `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: template,
                    language: { code: 'pt_BR' },
                    components: [
                        {
                            type: 'body',
                            parameters: Object.entries(variables).map(([, value]) => ({
                                type: 'text',
                                text: value
                            }))
                        }
                    ]
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        )

        return { success: true, messageId: response.data.messages[0].id }
    } catch (error) {
        console.error('WhatsApp send error:', error)
        return { success: false, reason: 'Send failed' }
    }
}

/**
 * Send appointment confirmation via WhatsApp
 */
export interface ConfirmationParams {
    clinicId: string
    patient_phone: string
    patient_name: string
    doctor_name: string
    clinic_name: string
    appointment_date: string
    appointment_time: string
    video_link: string
}

export async function sendAppointmentConfirmation(params: ConfirmationParams) {
    return sendWhatsAppMessage({
        clinicId: params.clinicId,
        to: params.patient_phone,
        template: WhatsAppTemplates.APPOINTMENT_CONFIRMED,
        variables: {
            '1': params.patient_name,
            '2': params.doctor_name,
            '3': params.appointment_date,
            '4': params.appointment_time,
            '5': params.video_link,
        }
    })
}

/**
 * Send cancellation notice via WhatsApp
 */
export interface CancellationParams {
    clinicId: string
    patient_phone: string
    patient_name: string
    doctor_name: string
    appointment_date: string
    appointment_time: string
    reason: string
    refund_status: 'refunded' | 'not_eligible' | 'pending'
}

export async function sendCancellationNotice(params: CancellationParams) {
    const refundText = params.refund_status === 'refunded'
        ? 'O reembolso será processado em até 10 dias úteis.'
        : params.refund_status === 'pending'
            ? 'O reembolso está sendo processado.'
            : ''

    return sendWhatsAppMessage({
        clinicId: params.clinicId,
        to: params.patient_phone,
        template: WhatsAppTemplates.CANCELLATION,
        variables: {
            '1': params.patient_name,
            '2': params.doctor_name,
            '3': params.appointment_date,
            '4': params.appointment_time,
            '5': params.reason,
            '6': refundText,
        }
    })
}

