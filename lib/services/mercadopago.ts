/**
 * Mercado Pago Integration Service
 */
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import crypto from 'crypto'

// Initialize Mercado Pago client
const getClient = (accessToken?: string) => {
    return new MercadoPagoConfig({
        accessToken: accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
}

export interface CreatePreferenceData {
    appointment_id: string
    amount: number
    patient_email: string
    patient_name: string
    description: string
    clinic_name: string
    clinic_access_token?: string
}

export interface PreferenceResult {
    preference_id: string
    init_point: string
    sandbox_init_point: string
}

/**
 * Create a payment preference for checkout
 */
export async function createPaymentPreference(
    data: CreatePreferenceData
): Promise<PreferenceResult> {
    const client = getClient(data.clinic_access_token)
    const preference = new Preference(client)

    const expirationDate = new Date()
    expirationDate.setHours(expirationDate.getHours() + 24)

    const result = await preference.create({
        body: {
            items: [
                {
                    id: data.appointment_id,
                    title: data.description,
                    description: `Consulta - ${data.clinic_name}`,
                    quantity: 1,
                    unit_price: data.amount,
                    currency_id: 'BRL',
                },
            ],
            payer: {
                email: data.patient_email,
                name: data.patient_name,
            },
            external_reference: data.appointment_id,
            notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
            back_urls: {
                success: `${process.env.NEXT_PUBLIC_APP_URL}/agendamento/sucesso?appointment_id=${data.appointment_id}`,
                failure: `${process.env.NEXT_PUBLIC_APP_URL}/agendamento/falha?appointment_id=${data.appointment_id}`,
                pending: `${process.env.NEXT_PUBLIC_APP_URL}/agendamento/pendente?appointment_id=${data.appointment_id}`,
            },
            auto_return: 'approved',
            expires: true,
            expiration_date_to: expirationDate.toISOString(),
            statement_descriptor: data.clinic_name.slice(0, 22),
        },
    })

    return {
        preference_id: result.id!,
        init_point: result.init_point!,
        sandbox_init_point: result.sandbox_init_point!,
    }
}

export interface PaymentInfo {
    id: string
    status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
    status_detail: string
    transaction_amount: number
    payment_method_id: string
    payment_type_id: string
    external_reference: string
    date_approved: string | null
    payer_email: string
}

/**
 * Get payment status from Mercado Pago
 */
export async function getPaymentStatus(
    paymentId: string,
    accessToken?: string
): Promise<PaymentInfo> {
    const client = getClient(accessToken)
    const payment = new Payment(client)

    const result = await payment.get({ id: paymentId })

    return {
        id: result.id?.toString() || '',
        status: result.status as PaymentInfo['status'],
        status_detail: result.status_detail || '',
        transaction_amount: result.transaction_amount || 0,
        payment_method_id: result.payment_method_id || '',
        payment_type_id: result.payment_type_id || '',
        external_reference: result.external_reference || '',
        date_approved: result.date_approved || null,
        payer_email: result.payer?.email || '',
    }
}

export interface RefundResult {
    refund_id: string
    status: string
    amount: number
}

/**
 * Create a refund for a payment
 */
export async function createRefund(
    paymentId: string,
    amount?: number,
    accessToken?: string
): Promise<RefundResult> {
    const client = getClient(accessToken)
    const payment = new Payment(client)

    // Get original payment to determine amount if not specified
    const originalPayment = await payment.get({ id: paymentId })
    const refundAmount = amount || originalPayment.transaction_amount || 0

    // Create refund via API directly (SDK doesn't have direct refund support)
    const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}/refunds`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN}`,
            },
            body: JSON.stringify({
                amount: refundAmount,
            }),
        }
    )

    if (!response.ok) {
        const error = await response.json()
        throw new Error(`Refund failed: ${error.message || 'Unknown error'}`)
    }

    const result = await response.json()

    return {
        refund_id: result.id.toString(),
        status: result.status,
        amount: result.amount,
    }
}

/**
 * Validate Mercado Pago webhook signature
 */
export function validateWebhookSignature(
    xSignature: string,
    xRequestId: string,
    dataId: string
): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET

    if (!secret) {
        console.warn('MERCADOPAGO_WEBHOOK_SECRET not configured')
        return true // Skip validation if not configured (development)
    }

    // Parse x-signature header
    const parts = xSignature.split(',')
    let ts = ''
    let v1 = ''

    for (const part of parts) {
        const [key, value] = part.split('=')
        if (key.trim() === 'ts') {
            ts = value.trim()
        } else if (key.trim() === 'v1') {
            v1 = value.trim()
        }
    }

    if (!ts || !v1) {
        return false
    }

    // Build the manifest string
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`

    // Calculate expected signature
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(manifest)
    const expectedSignature = hmac.digest('hex')

    // Compare signatures
    return crypto.timingSafeEqual(
        Buffer.from(v1),
        Buffer.from(expectedSignature)
    )
}

/**
 * Map Mercado Pago status to our payment status
 */
export function mapPaymentStatus(
    mpStatus: string
): 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' {
    switch (mpStatus) {
        case 'approved':
            return 'PAID'
        case 'pending':
        case 'in_process':
        case 'authorized':
            return 'PENDING'
        case 'refunded':
        case 'charged_back':
            return 'REFUNDED'
        case 'rejected':
        case 'cancelled':
        default:
            return 'FAILED'
    }
}

/**
 * Map Mercado Pago payment method to our enum
 */
export function mapPaymentMethod(
    mpMethod: string
): 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | null {
    if (mpMethod === 'pix') {
        return 'PIX'
    }
    if (['credit_card', 'prepaid_card'].includes(mpMethod)) {
        return 'CREDIT_CARD'
    }
    if (mpMethod === 'debit_card') {
        return 'DEBIT_CARD'
    }
    return null
}

