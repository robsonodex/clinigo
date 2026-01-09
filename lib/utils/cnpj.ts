/**
 * CNPJ Validation and Formatting Utilities
 */

/**
 * Remove all non-numeric characters from CNPJ
 */
export function cleanCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
}

/**
 * Format CNPJ to XX.XXX.XXX/XXXX-XX
 */
export function formatCNPJ(cnpj: string): string {
    const clean = cleanCNPJ(cnpj)

    if (clean.length !== 14) {
        return cnpj
    }

    return clean.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
    )
}

/**
 * Validate CNPJ using check digits algorithm
 */
export function validateCNPJ(cnpj: string): boolean {
    const clean = cleanCNPJ(cnpj)

    // CNPJ must have 14 digits
    if (clean.length !== 14) {
        return false
    }

    // Check if all digits are the same (invalid CNPJs)
    if (/^(\d)\1+$/.test(clean)) {
        return false
    }

    // Validate first check digit
    let sum = 0
    let weight = 5
    for (let i = 0; i < 12; i++) {
        sum += parseInt(clean.charAt(i)) * weight
        weight = weight === 2 ? 9 : weight - 1
    }
    let checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (checkDigit !== parseInt(clean.charAt(12))) {
        return false
    }

    // Validate second check digit
    sum = 0
    weight = 6
    for (let i = 0; i < 13; i++) {
        sum += parseInt(clean.charAt(i)) * weight
        weight = weight === 2 ? 9 : weight - 1
    }
    checkDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (checkDigit !== parseInt(clean.charAt(13))) {
        return false
    }

    return true
}

/**
 * Mask CNPJ input as user types
 */
export function maskCNPJ(value: string): string {
    const clean = cleanCNPJ(value)

    if (clean.length <= 2) {
        return clean
    } else if (clean.length <= 5) {
        return `${clean.slice(0, 2)}.${clean.slice(2)}`
    } else if (clean.length <= 8) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`
    } else if (clean.length <= 12) {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`
    } else {
        return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`
    }
}

