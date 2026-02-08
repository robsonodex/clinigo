/**
 * Partner Validation Schemas - CliniGo
 * Zod schemas for partner registration and validation
 */

import { z } from 'zod'

// CPF validation helper
function isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '')

    if (cleaned.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cleaned)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i)
    }
    let remainder = sum % 11
    let digit1 = remainder < 2 ? 0 : 11 - remainder

    if (digit1 !== parseInt(cleaned.charAt(9))) return false

    sum = 0
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i)
    }
    remainder = sum % 11
    let digit2 = remainder < 2 ? 0 : 11 - remainder

    return digit2 === parseInt(cleaned.charAt(10))
}

// CNPJ validation helper
function isValidCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '')

    if (cleaned.length !== 14) return false
    if (/^(\d)\1{13}$/.test(cleaned)) return false

    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    let sum = 0
    for (let i = 0; i < 12; i++) {
        sum += parseInt(cleaned.charAt(i)) * weights1[i]
    }
    let remainder = sum % 11
    let digit1 = remainder < 2 ? 0 : 11 - remainder

    if (digit1 !== parseInt(cleaned.charAt(12))) return false

    sum = 0
    for (let i = 0; i < 13; i++) {
        sum += parseInt(cleaned.charAt(i)) * weights2[i]
    }
    remainder = sum % 11
    let digit2 = remainder < 2 ? 0 : 11 - remainder

    return digit2 === parseInt(cleaned.charAt(13))
}

// Pix key type enum
export const PixKeyTypeSchema = z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM'])

// Partner registration schema
export const partnerRegistrationSchema = z.object({
    full_name: z.string()
        .min(3, 'Nome completo deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),

    email: z.string()
        .email('Email inválido')
        .max(255, 'Email muito longo'),

    cpf: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 11, 'CPF deve ter 11 dígitos')
        .refine(isValidCPF, 'CPF inválido'),

    phone: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length >= 10 && val.length <= 11, 'Telefone inválido'),

    pix_key_type: PixKeyTypeSchema,

    pix_key: z.string()
        .min(1, 'Chave Pix obrigatória')
        .max(100, 'Chave Pix muito longa'),

    // Optional CNPJ fields
    cnpj: z.string()
        .transform(val => val ? val.replace(/\D/g, '') : '')
        .refine(val => val === '' || val.length === 14, 'CNPJ deve ter 14 dígitos')
        .refine(val => val === '' || isValidCNPJ(val), 'CNPJ inválido')
        .optional()
        .nullable(),

    company_name: z.string()
        .max(100, 'Nome da empresa muito longo')
        .optional()
        .nullable(),

    // Password fields - REQUIRED for login
    password: z.string()
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(100, 'Senha muito longa'),

    confirm_password: z.string()
        .min(1, 'Confirme sua senha'),

    // Terms acceptance - REQUIRED
    terms_accepted: z.boolean()
        .refine(val => val === true, 'Você deve aceitar os termos de parceria para continuar')
}).refine(data => data.password === data.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password']
})

// Referral code validation schema
export const referralCodeSchema = z.object({
    code: z.string()
        .min(1, 'Código obrigatório')
        .max(20, 'Código inválido')
        .transform(val => val.toUpperCase().trim())
})

// Payment marking schema
export const markPaymentSchema = z.object({
    commission_ids: z.array(z.string().uuid()).min(1, 'Selecione pelo menos uma comissão'),
    proof_url: z.string().url('URL inválida').optional().nullable(),
    notes: z.string().max(500, 'Notas muito longas').optional().nullable()
})

// Export types
export type PartnerRegistrationData = z.infer<typeof partnerRegistrationSchema>
export type ReferralCodeData = z.infer<typeof referralCodeSchema>
export type MarkPaymentData = z.infer<typeof markPaymentSchema>
