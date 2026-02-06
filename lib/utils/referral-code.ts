/**
 * Referral Code Utilities - CliniGo
 * Helper functions for referral code generation and formatting
 */

/**
 * Format a referral code for display
 */
export function formatReferralCode(code: string): string {
    return code.toUpperCase().trim()
}

/**
 * Validate referral code format (NOME-XXXX)
 */
export function isValidReferralCodeFormat(code: string): boolean {
    if (!code || code.length < 6) return false

    // Pattern: 1-8 letters, dash, 4 digits
    const pattern = /^[A-Z]{1,8}-\d{4}$/
    return pattern.test(code.toUpperCase().trim())
}

/**
 * Generate a shareable referral link
 */
export function generateReferralLink(referralCode: string, baseUrl?: string): string {
    const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'
    return `${url}/cadastro?ref=${referralCode}`
}

/**
 * Extract referral code from URL
 */
export function extractReferralCodeFromUrl(url: string): string | null {
    try {
        const urlObj = new URL(url)
        return urlObj.searchParams.get('ref')?.toUpperCase() || null
    } catch {
        return null
    }
}

/**
 * Clean a referral code input
 */
export function cleanReferralCode(input: string): string {
    return input.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
}
