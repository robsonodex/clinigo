/**
 * Financial API Validation Schemas
 * Zod schemas for validating financial operations
 */

import { z } from 'zod'

// Payment Methods Enum
export const PaymentMethodEnum = z.enum([
    'pix',
    'credit_card',
    'debit_card',
    'cash',
    'transfer',
    'insurance'
])

// Payment Categories Enum
export const PaymentCategoryEnum = z.enum([
    'consultation',
    'exam',
    'procedure',
    'medicine',
    'other'
])

// Create Payment Schema
export const createPaymentSchema = z.object({
    patient_id: z.string().uuid('Invalid patient ID format'),
    amount: z.number()
        .positive('Amount must be positive')
        .max(1000000, 'Amount exceeds maximum allowed value'),
    payment_method: PaymentMethodEnum,
    category: PaymentCategoryEnum,
    description: z.string()
        .max(500, 'Description too long')
        .optional(),
    appointment_id: z.string().uuid('Invalid appointment ID format').optional()
})

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>

// List Payments Query Schema
export const listPaymentsQuerySchema = z.object({
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    payment_method: PaymentMethodEnum.optional(),
    category: PaymentCategoryEnum.optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string()
        .regex(/^\d+$/)
        .transform(Number)
        .refine(val => val <= 100, 'Limit cannot exceed 100')
        .optional()
})

export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>

// Cancel Payment Schema
export const cancelPaymentSchema = z.object({
    payment_id: z.string().uuid('Invalid payment ID format'),
    cancellation_reason: z.string()
        .min(10, 'Cancellation reason must be at least 10 characters')
        .max(500, 'Cancellation reason too long')
})

export type CancelPaymentInput = z.infer<typeof cancelPaymentSchema>

// Financial Dashboard Query Schema
export const financialDashboardQuerySchema = z.object({
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    clinic_id: z.string().uuid('Invalid clinic ID format').optional()
})

export type FinancialDashboardQuery = z.infer<typeof financialDashboardQuerySchema>

// Update Payment Schema
export const updatePaymentSchema = z.object({
    payment_id: z.string().uuid('Invalid payment ID format'),
    amount: z.number().positive().max(1000000).optional(),
    payment_method: PaymentMethodEnum.optional(),
    category: PaymentCategoryEnum.optional(),
    description: z.string().max(500).optional(),
    payment_proof_url: z.string().url('Invalid proof URL').optional()
})

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
