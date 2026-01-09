/**
 * AES-256-GCM Encryption Utility
 * Used for encrypting sensitive data like SMTP passwords, API tokens
 * 
 * IMPORTANT: Set ENCRYPTION_KEY environment variable (32-byte hex string)
 * Generate with: openssl rand -hex 32
 */
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits

/**
 * Get encryption key from environment
 */
function getKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY

    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is not set')
    }

    if (key.length !== 64) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte hex string (64 characters)')
    }

    return Buffer.from(key, 'hex')
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns: iv:authTag:encryptedData (all hex-encoded)
 */
export function encrypt(plaintext: string): string {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Return format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt ciphertext encrypted with AES-256-GCM
 * Input format: iv:authTag:encryptedData (all hex-encoded)
 */
export function decrypt(ciphertext: string): string {
    const key = getKey()

    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format. Expected iv:authTag:encrypted')
    }

    const [ivHex, authTagHex, encryptedHex] = parts

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')

    if (iv.length !== IV_LENGTH) {
        throw new Error('Invalid IV length')
    }

    if (authTag.length !== AUTH_TAG_LENGTH) {
        throw new Error('Invalid auth tag length')
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
}

/**
 * Check if a string is already encrypted (basic format check)
 */
export function isEncrypted(value: string): boolean {
    const parts = value.split(':')
    if (parts.length !== 3) return false

    // Check if all parts are valid hex strings
    const hexRegex = /^[0-9a-f]+$/i
    return parts.every(part => hexRegex.test(part))
}

/**
 * Safely encrypt a value only if not already encrypted
 */
export function encryptIfNeeded(value: string): string {
    if (isEncrypted(value)) {
        return value
    }
    return encrypt(value)
}

/**
 * Safely decrypt a value, returning original if decryption fails
 */
export function decryptSafe(value: string): string {
    try {
        return decrypt(value)
    } catch {
        // Return original value if decryption fails
        // This handles cases where value might not be encrypted
        return value
    }
}

/**
 * Hash a value using SHA-256 (one-way, for API key storage)
 */
export function hashSHA256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
    // Generate 32 random bytes
    const randomBytes = crypto.randomBytes(32)
    const key = `ck_${randomBytes.toString('base64url')}`
    const prefix = key.substring(0, 12) // First 12 chars for identification
    const hash = hashSHA256(key)

    return { key, prefix, hash }
}

