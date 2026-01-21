/**
 * Crypto Service - CliniGo v3.0
 * 
 * AES-256-GCM encryption for sensitive data (LGPD compliance)
 * Used for: prontuário data, SMTP passwords, patient PII
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

/**
 * Get encryption key from environment
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY
    if (!key) {
        throw new Error('ENCRYPTION_KEY not configured in environment')
    }

    // If key is hex string (64 chars = 32 bytes in hex)
    if (key.length === 64) {
        return Buffer.from(key, 'hex')
    }

    // If key is plain string, derive a key using PBKDF2
    const salt = crypto.createHash('sha256').update('clinigo-salt').digest()
    return crypto.pbkdf2Sync(key, salt, 100000, 32, 'sha256')
}

/**
 * Encrypt data using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all in hex)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8')
    encrypted = Buffer.concat([encrypted, cipher.final()])

    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt data encrypted with AES-256-GCM
 * Expects format: iv:authTag:encryptedData (all in hex)
 */
export function decrypt(ciphertext: string): string {
    const key = getEncryptionKey()
    const parts = ciphertext.split(':')

    if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format')
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = Buffer.from(parts[2], 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
}

/**
 * Encrypt sensitive medical data (prontuário)
 */
export function encryptMedicalData(data: {
    diagnosis?: string
    symptoms?: string
    prescription?: string
    anamnesis?: string
    physical_exam?: string
    [key: string]: any
}): string {
    return encrypt(JSON.stringify(data))
}

/**
 * Decrypt sensitive medical data
 */
export function decryptMedicalData<T = Record<string, any>>(ciphertext: string): T {
    return JSON.parse(decrypt(ciphertext))
}

/**
 * Hash sensitive data (one-way, for lookup)
 */
export function hashData(data: string): string {
    const salt = process.env.ENCRYPTION_KEY || 'fallback-salt'
    return crypto.createHash('sha256').update(data + salt).digest('hex')
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
}

/**
 * Verify if encryption is properly configured
 */
export function isEncryptionConfigured(): boolean {
    try {
        const testData = 'test-encryption'
        const encrypted = encrypt(testData)
        const decrypted = decrypt(encrypted)
        return decrypted === testData
    } catch {
        return false
    }
}
