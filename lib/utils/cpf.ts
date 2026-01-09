/**
 * CPF Validation Utility
 * Validates Brazilian Individual Taxpayer Registry (CPF)
 */

/**
 * Remove non-numeric characters from CPF
 */
export function cleanCPF(cpf: string): string {
    return cpf.replace(/\D/g, '')
}

/**
 * Format CPF to XXX.XXX.XXX-XX
 */
export function formatCPF(cpf: string): string {
    const cleaned = cleanCPF(cpf)
    if (cleaned.length !== 11) return cpf

    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

/**
 * Validate CPF using the official algorithm
 */
export function isValidCPF(cpf: string): boolean {
    const cleaned = cleanCPF(cpf)

    // Must have 11 digits
    if (cleaned.length !== 11) {
        return false
    }

    // Reject known invalid CPFs (all same digits)
    if (/^(\d)\1{10}$/.test(cleaned)) {
        return false
    }

    // Validate first check digit
    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned[i], 10) * (10 - i)
    }

    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) {
        remainder = 0
    }

    if (remainder !== parseInt(cleaned[9], 10)) {
        return false
    }

    // Validate second check digit
    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned[i], 10) * (11 - i)
    }

    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) {
        remainder = 0
    }

    if (remainder !== parseInt(cleaned[10], 10)) {
        return false
    }

    return true
}

/**
 * Mask CPF for display (keep first 3 and last 2 digits visible)
 * Example: 123.456.789-10 -> 123.***.***-10
 */
export function maskCPF(cpf: string): string {
    const cleaned = cleanCPF(cpf)
    if (cleaned.length !== 11) return cpf

    return `${cleaned.slice(0, 3)}.***.***-${cleaned.slice(9, 11)}`
}

/**
 * Zod refinement function for CPF validation
 */
export function cpfRefinement(cpf: string): boolean {
    return isValidCPF(cpf)
}

