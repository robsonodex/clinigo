/**
 * Health Insurance Validations
 * Schemas Zod para Sistema de Convênios Médicos
 */

import { z } from 'zod'

// =============================================================================
// ENUMS
// =============================================================================

export const healthInsuranceStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
export const healthInsurancePlanTypeSchema = z.enum(['INDIVIDUAL', 'EMPRESARIAL', 'COLETIVO'])
export const healthInsuranceCoverageTypeSchema = z.enum(['AMBULATORIAL', 'HOSPITALAR', 'COMPLETO'])
export const paymentTypeSchema = z.enum(['PARTICULAR', 'CONVENIO'])

// =============================================================================
// OPERADORA (Health Insurance)
// =============================================================================

export const createHealthInsuranceSchema = z.object({
    name: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
    code: z.string()
        .max(20, 'Código ANS deve ter no máximo 20 caracteres')
        .optional()
        .nullable(),
    phone: z.string()
        .regex(/^[\d\s\-\(\)]+$/, 'Telefone inválido')
        .max(20)
        .optional()
        .nullable(),
    email: z.string()
        .email('Email inválido')
        .max(100)
        .optional()
        .nullable(),
    notes: z.string()
        .max(500, 'Observações deve ter no máximo 500 caracteres')
        .optional()
        .nullable(),
    tiss_version: z.enum(['4.01.00', '4.02.00']).optional().nullable().default('4.01.00'),
})

export const updateHealthInsuranceSchema = createHealthInsuranceSchema.partial().extend({
    status: healthInsuranceStatusSchema.optional(),
})

export const listHealthInsurancesQuerySchema = z.object({
    status: healthInsuranceStatusSchema.optional(),
    search: z.string().optional(),
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
})

// =============================================================================
// PLANO (Health Insurance Plan)
// =============================================================================

export const createHealthInsurancePlanSchema = z.object({
    health_insurance_id: z.string().uuid('ID da operadora inválido'),
    name: z.string()
        .min(2, 'Nome deve ter pelo menos 2 caracteres')
        .max(100, 'Nome deve ter no máximo 100 caracteres'),
    code: z.string()
        .max(50, 'Código do plano deve ter no máximo 50 caracteres')
        .optional()
        .nullable(),
    type: healthInsurancePlanTypeSchema.optional().default('INDIVIDUAL'),
    coverage_type: healthInsuranceCoverageTypeSchema.optional().default('COMPLETO'),
    notes: z.string()
        .max(500, 'Observações deve ter no máximo 500 caracteres')
        .optional()
        .nullable(),
})

export const updateHealthInsurancePlanSchema = createHealthInsurancePlanSchema
    .omit({ health_insurance_id: true })
    .partial()
    .extend({
        status: healthInsuranceStatusSchema.optional(),
    })

export const listHealthInsurancePlansQuerySchema = z.object({
    insurance_id: z.string().uuid().optional(),
    status: healthInsuranceStatusSchema.optional(),
    search: z.string().optional(),
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
})

// =============================================================================
// VÍNCULO MÉDICO-CONVÊNIO (Doctor Health Insurance)
// =============================================================================

export const createDoctorHealthInsuranceSchema = z.object({
    health_insurance_plan_id: z.string().uuid('ID do plano inválido'),
    consultation_price: z.number()
        .min(0, 'Valor da consulta não pode ser negativo')
        .max(10000, 'Valor da consulta muito alto'),
    accepts_new_patients: z.boolean().optional().default(true),
    notes: z.string()
        .max(500, 'Observações deve ter no máximo 500 caracteres')
        .optional()
        .nullable(),
})

export const updateDoctorHealthInsuranceSchema = z.object({
    consultation_price: z.number()
        .min(0, 'Valor da consulta não pode ser negativo')
        .max(10000, 'Valor da consulta muito alto')
        .optional(),
    accepts_new_patients: z.boolean().optional(),
    notes: z.string()
        .max(500, 'Observações deve ter no máximo 500 caracteres')
        .optional()
        .nullable(),
    status: healthInsuranceStatusSchema.optional(),
})

export const listDoctorHealthInsurancesQuerySchema = z.object({
    status: healthInsuranceStatusSchema.optional(),
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    pageSize: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
})

// =============================================================================
// APPOINTMENT INSURANCE FIELDS
// =============================================================================

export const appointmentInsuranceSchema = z.object({
    payment_type: paymentTypeSchema,
    health_insurance_plan_id: z.string().uuid().optional().nullable(),
    insurance_card_number: z.string()
        .regex(/^[\d\.\-\/]+$/, 'Número da carteirinha inválido')
        .min(5, 'Número da carteirinha muito curto')
        .max(30, 'Número da carteirinha muito longo')
        .optional()
        .nullable(),
    insurance_card_validity: z.string()
        .refine((val) => {
            if (!val) return true
            const date = new Date(val)
            return date > new Date()
        }, 'A validade da carteirinha deve ser uma data futura')
        .optional()
        .nullable(),
}).refine((data) => {
    // Se for convênio, carteirinha é obrigatória
    if (data.payment_type === 'CONVENIO') {
        return !!data.health_insurance_plan_id && !!data.insurance_card_number
    }
    return true
}, {
    message: 'Para pagamento via convênio, selecione o plano e informe o número da carteirinha',
    path: ['health_insurance_plan_id'],
})

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateHealthInsuranceInput = z.infer<typeof createHealthInsuranceSchema>
export type UpdateHealthInsuranceInput = z.infer<typeof updateHealthInsuranceSchema>
export type ListHealthInsurancesQuery = z.infer<typeof listHealthInsurancesQuerySchema>

export type CreateHealthInsurancePlanInput = z.infer<typeof createHealthInsurancePlanSchema>
export type UpdateHealthInsurancePlanInput = z.infer<typeof updateHealthInsurancePlanSchema>
export type ListHealthInsurancePlansQuery = z.infer<typeof listHealthInsurancePlansQuerySchema>

export type CreateDoctorHealthInsuranceInput = z.infer<typeof createDoctorHealthInsuranceSchema>
export type UpdateDoctorHealthInsuranceInput = z.infer<typeof updateDoctorHealthInsuranceSchema>
export type ListDoctorHealthInsurancesQuery = z.infer<typeof listDoctorHealthInsurancesQuerySchema>

export type AppointmentInsuranceInput = z.infer<typeof appointmentInsuranceSchema>
