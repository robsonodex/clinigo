/**
 * Slug Generation and Sanitization Utilities
 */

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        // Remove accents/diacritics
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Replace spaces and special chars with hyphens
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Sanitize slug to ensure it only contains valid characters
 */
export function sanitizeSlug(slug: string): string {
    return slug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Validate if a slug is valid
 */
export function isValidSlug(slug: string): boolean {
    // Must be lowercase, alphanumeric, and hyphens only
    // Must not start or end with hyphen
    // Must be at least 3 characters
    const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
    return slug.length >= 3 && slug.length <= 50 && slugRegex.test(slug)
}

/**
 * Generate unique slug by appending number if needed
 */
export function makeUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
    let slug = sanitizeSlug(baseSlug)
    let counter = 1

    while (existingSlugs.includes(slug)) {
        slug = `${sanitizeSlug(baseSlug)}-${counter}`
        counter++
    }

    return slug
}

