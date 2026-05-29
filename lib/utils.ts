import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format currency to BRL
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value)
}

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 */
export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('pt-BR')
}

/**
 * Format time to HH:MM
 */
export function formatTime(time: string): string {
    return time.substring(0, 5)
}

/**
 * Format CPF with mask
 */
export function formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return cpf
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`
}

/**
 * Format phone with mask
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
}

/**
 * Get initials from name
 */
export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Dynamic premium avatar gradient using high-contrast inline styling to prevent Tailwind purging
 */
export function getAvatarGradient(name: string) {
    const cleanName = (name || '')
        .replace(/Joo/g, 'João')
        .replace(/Andr/g, 'André')
        .replace(/Antnio/g, 'Antônio')
        .replace(/Clavi\?o/g, 'Clavião')
        .replace(/Clavio/g, 'Clavião')
        .replace(/S\?o/g, 'São')
        .replace(/\uFFFD/g, 'a')
        .replace(/\?/g, 'ã')
        .trim();

    const gradients = [
        { from: '#4F46E5', to: '#06B6D4', text: '#FFFFFF' }, // Indigo to Cyan
        { from: '#0EA5E9', to: '#2563EB', text: '#FFFFFF' }, // Sky to Blue
        { from: '#10B981', to: '#059669', text: '#FFFFFF' }, // Emerald to Green
        { from: '#8B5CF6', to: '#D946EF', text: '#FFFFFF' }, // Purple to Fuchsia
        { from: '#F59E0B', to: '#EF4444', text: '#FFFFFF' }  // Amber to Red
    ]

    const charSum = cleanName ? cleanName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const theme = gradients[charSum % gradients.length];
    
    // Iniciais sanitizadas e garantidas
    const initials = cleanName
        ? cleanName.split(/\s+/).filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'PA';

    return {
        style: {
            background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
            color: theme.text
        },
        initials
    }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout
    return (...args: Parameters<T>) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
    }
}

