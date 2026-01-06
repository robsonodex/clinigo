/**
 * Log Sanitization Utility
 * Masks sensitive data for LGPD compliance
 * 
 * Use this before logging any user data to console or external services
 */

type SanitizableValue = string | number | boolean | null | undefined | object | SanitizableValue[]

/**
 * Fields that should always be masked
 */
const SENSITIVE_FIELDS = [
    'cpf',
    'password',
    'senha',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'apiKey',
    'secret',
    'credit_card',
    'card_number',
    'cvv',
    'smtp_password',
    'mercadopago_access_token',
]

/**
 * Fields that should be partially masked
 */
const PARTIAL_MASK_FIELDS = [
    'email',
    'phone',
    'telefone',
    'celular',
]

/**
 * Mask a CPF: 123.456.789-10 -> 123.***.***-10
 */
export function maskCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return '***.***.***-**'
    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9, 11)}`
}

/**
 * Mask an email: example@domain.com -> ex***@domain.com
 */
export function maskEmail(email: string): string {
    const parts = email.split('@')
    if (parts.length !== 2) return '***@***.***'

    const [local, domain] = parts
    const maskedLocal = local.length > 2
        ? `${local.substring(0, 2)}***`
        : '***'

    return `${maskedLocal}@${domain}`
}

/**
 * Mask a phone number: 11999999999 -> *******9999
 */
export function maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 4) return '****'
    return `${'*'.repeat(cleaned.length - 4)}${cleaned.slice(-4)}`
}

/**
 * Fully mask a sensitive value
 */
export function maskFully(value: string): string {
    if (!value || value.length === 0) return '****'
    return '*'.repeat(Math.min(value.length, 8))
}

/**
 * Determine how to mask a field based on its name
 */
function shouldMaskFully(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase()
    return SENSITIVE_FIELDS.some(field => lowerName.includes(field.toLowerCase()))
}

function shouldMaskPartially(fieldName: string): boolean {
    const lowerName = fieldName.toLowerCase()
    return PARTIAL_MASK_FIELDS.some(field => lowerName.includes(field.toLowerCase()))
}

/**
 * Recursively sanitize an object for logging
 */
export function sanitizeForLog(obj: SanitizableValue, parentKey = ''): SanitizableValue {
    if (obj === null || obj === undefined) {
        return obj
    }

    if (typeof obj === 'string') {
        // Check parent key to determine masking
        if (shouldMaskFully(parentKey)) {
            return maskFully(obj)
        }
        if (parentKey.toLowerCase().includes('cpf')) {
            return maskCPF(obj)
        }
        if (parentKey.toLowerCase().includes('email')) {
            return maskEmail(obj)
        }
        if (shouldMaskPartially(parentKey)) {
            return maskPhone(obj)
        }
        return obj
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj
    }

    if (Array.isArray(obj)) {
        return obj.map((item, index) => sanitizeForLog(item, `${parentKey}[${index}]`))
    }

    if (typeof obj === 'object') {
        const sanitized: Record<string, SanitizableValue> = {}

        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeForLog(value as SanitizableValue, key)
        }

        return sanitized
    }

    return obj
}

/**
 * Create a sanitized log message
 */
export function createSanitizedLog(message: string, data?: object): string {
    if (!data) {
        return message
    }

    const sanitized = sanitizeForLog(data)
    return `${message} ${JSON.stringify(sanitized)}`
}

/**
 * Sanitized console.log wrapper
 */
export function safeLog(message: string, data?: object): void {
    console.log(createSanitizedLog(message, data))
}

/**
 * Sanitized console.error wrapper
 */
export function safeError(message: string, error?: Error, data?: object): void {
    const sanitizedData = data ? sanitizeForLog(data) : undefined
    console.error(message, {
        error: error?.message,
        stack: error?.stack,
        data: sanitizedData,
    })
}
