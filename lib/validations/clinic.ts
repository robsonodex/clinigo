/**
 * Zod Validation Schemas for Clinics
 */
import { z } from 'zod'

const PLAN_TYPES = ['BASIC', 'PRO', 'ENTERPRISE'] as const

/**
 * Address schema
 */
export const addressSchema = z.object({
    street: z.string().max(200).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
    neighborhood: z.string().max(100).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2).optional(),
    zip: z.string().regex(/^\d{5}-?\d{3}$/).optional(),
})

/**
 * Create clinic schema (SUPER_ADMIN only)
 */
export const createClinicSchema = z.object({
    name: z
        .string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),
    slug: z
        .string()
        .min(3, 'Slug deve ter pelo menos 3 caracteres')
        .max(50, 'Slug muito longo')
        .regex(
            /^[a-z0-9-]+$/,
            'Slug deve conter apenas letras minúsculas, números e hífens'
        ),
    email: z
        .string()
        .email('Email inválido'),
    cnpj: z
        .string()
        .regex(
            /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
            'CNPJ inválido'
        )
        .optional()
        .nullable(),
    phone: z
        .string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos')
        .optional()
        .nullable(),
    address: addressSchema.optional(),
    plan_type: z
        .enum(PLAN_TYPES)
        .default('BASIC'),
    // Initial admin user
    admin_email: z
        .string()
        .email('Email do administrador inválido')
        .optional(),
    admin_name: z
        .string()
        .min(3)
        .max(100)
        .optional(),
    admin_password: z
        .string()
        .min(8)
        .optional(),
})

/**
 * Update clinic schema
 */
export const updateClinicSchema = z.object({
    name: z
        .string()
        .min(3)
        .max(100)
        .optional(),
    email: z
        .string()
        .email()
        .optional(),
    phone: z
        .string()
        .regex(/^\d{10,11}$/)
        .optional()
        .nullable(),
    address: addressSchema.optional(),
    is_active: z
        .boolean()
        .optional(),
    plan_type: z
        .enum(PLAN_TYPES)
        .optional(),
    plan_limits: z
        .object({
            max_doctors: z.number().int().nonnegative().optional(),
            max_appointments_month: z.number().int().nonnegative().optional(),
        })
        .optional(),
    addons: z
        .object({
            whatsapp: z.boolean().optional(),
            prepaid_booking: z.boolean().optional(),
            telemedicine: z.boolean().optional(),
            extra_doctors: z.number().int().nonnegative().optional(),
        })
        .optional(),
    mercadopago_access_token: z
        .string()
        .optional()
        .nullable(),
    mercadopago_public_key: z
        .string()
        .optional()
        .nullable(),
    logo_url: z
        .string()
        .url()
        .optional()
        .nullable(),
    primary_color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)')
        .optional(),
})

/**
 * List clinics query schema
 */
export const listClinicsQuerySchema = z.object({
    is_active: z
        .string()
        .transform((val) => val === 'true')
        .optional(),
    plan_type: z
        .enum(PLAN_TYPES)
        .optional(),
    search: z
        .string()
        .max(100)
        .optional(),
    page: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .optional(),
    pageSize: z
        .string()
        .regex(/^\d+$/)
        .transform(Number)
        .optional(),
})

// Type exports
export type CreateClinicData = z.infer<typeof createClinicSchema>
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>
export type ListClinicsQuery = z.infer<typeof listClinicsQuerySchema>

