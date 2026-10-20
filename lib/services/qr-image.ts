import QRCode from 'qrcode'

export interface QRDataPayload {
    qrCodeImage?: string | null
    qr_code_image?: string | null
    checkinUrl?: string | null
    checkin_url?: string | null
    preRegistrationUrl?: string | null
    pre_registration_url?: string | null
    appointmentId?: string | null
    [key: string]: any
}

export interface QRGenerationOptions {
    width?: number
    margin?: number
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
}

const DEFAULT_QR_OPTIONS: QRCode.QRCodeToDataURLOptions = {
    width: 300,
    margin: 2,
    color: {
        dark: '#000000',
        light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M'
}

/**
 * Helper para leitura dupla de QR Code:
 * 1. Retorna a imagem Base64 persistida se existir (`qrCodeImage` ou `qr_code_image`).
 * 2. Se nao existir imagem gravada, gera dinamicamente a partir da URL informada
 *    (checkinUrl / preRegistrationUrl / fallbackUrl) com os mesmos parametros visuais dos gravadores.
 */
export async function resolveQrCodeImage(
    qrDataInput: QRDataPayload | string | null | undefined,
    fallbackUrl?: string | null,
    options?: QRGenerationOptions
): Promise<string | null> {
    if (!qrDataInput && !fallbackUrl) {
        return null
    }

    let parsedData: QRDataPayload | null = null

    if (typeof qrDataInput === 'string') {
        try {
            parsedData = JSON.parse(qrDataInput)
        } catch {
            // Se for uma string pura (ex: URL ou token), pode ser usada como URL se fallbackUrl nao vier
            if (!fallbackUrl && (qrDataInput.startsWith('http') || qrDataInput.startsWith('CLINIGO:'))) {
                fallbackUrl = qrDataInput
            }
        }
    } else if (typeof qrDataInput === 'object' && qrDataInput !== null) {
        parsedData = qrDataInput
    }

    // 1. Imagem salva previamente
    const existingImage = parsedData?.qrCodeImage || parsedData?.qr_code_image
    if (existingImage && typeof existingImage === 'string' && existingImage.startsWith('data:image')) {
        return existingImage
    }

    // 2. Resolver URL para geracao dinamica
    const targetUrl = parsedData?.checkinUrl ||
                      parsedData?.checkin_url ||
                      parsedData?.preRegistrationUrl ||
                      parsedData?.pre_registration_url ||
                      fallbackUrl

    if (!targetUrl || typeof targetUrl !== 'string') {
        return null
    }

    try {
        const qrConfig: QRCode.QRCodeToDataURLOptions = {
            ...DEFAULT_QR_OPTIONS,
            ...(options?.width ? { width: options.width } : {}),
            ...(options?.margin !== undefined ? { margin: options.margin } : {}),
            ...(options?.errorCorrectionLevel ? { errorCorrectionLevel: options.errorCorrectionLevel } : {})
        }

        return await QRCode.toDataURL(targetUrl, qrConfig)
    } catch (error) {
        console.error('[QR Service] Falha ao gerar QR Code dinamicamente:', error)
        return null
    }
}
