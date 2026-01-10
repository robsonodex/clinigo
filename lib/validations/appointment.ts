/**
 * Zod Validation Schemas for Appointments
 */
import { z } from 'zod'
import { cpfRefinement } from '@/lib/utils/cpf'

/**
 * Patient data schema for booking
 */
export const patientSchema = z.object({
    cpf: z
        .string()
        .min(11, 'CPF deve ter 11 dígitos')
        .max(14, 'CPF inválido')
        .refine(cpfRefinement, { message: 'CPF inválido' }),
    full_name: z
        .string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),
    email: z
        .string()
        .email('Email inválido'),
    phone: z
        .string()
        .regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos'),
    date_of_birth: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
        .optional(),
})

/**
 * Create appointment schema (PUBLIC BOOKING)
 */
export const createAppointmentSchema = z
    .object({
        clinic_slug: z
            .string()
            .min(3, 'Slug da clínica inválido')
            .max(50, 'Slug da clínica muito longo')
            .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
        doctor_id: z
            .string()
            .uuid('ID do médico inválido'),
        appointment_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
        appointment_time: z
            .string()
            .regex(/^\d{2}:\d{2}$/, 'Hora deve estar no formato HH:MM'),
        patient: patientSchema,
        payment_type: z.enum(['PRIVATE', 'HEALTH_INSURANCE']).default('PRIVATE'),
        health_insurance_plan_id: z.string().uuid().optional().nullable(),
        insurance_card_number: z.string().optional().nullable(),
        insurance_card_validity: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida').optional().nullable(),
    })
    .superRefine((data, ctx) => {
        if (data.payment_type === 'HEALTH_INSURANCE') {
            if (!data.health_insurance_plan_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Selecione o plano de convênio',
                    path: ['health_insurance_plan_id'],
                })
            }
            if (!data.insurance_card_number) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Informe o número da carteirinha',
                    path: ['insurance_card_number'],
                })
            }
            if (!data.insurance_card_validity) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Informe a validade da carteirinha',
                    path: ['insurance_card_validity'],
                })
            }
        }
    })
    .refine(
        (data) => {
            const date = new Date(data.appointment_date)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            return date >= today
        },
        {
            message: 'Data do agendamento não pode ser no passado',
            path: ['appointment_date'],
        }
    )
    .refine(
        (data) => {
            const [hours] = data.appointment_time.split(':').map(Number)
            return hours >= 6 && hours < 22
        },
        {
            message: 'Horário de atendimento deve ser entre 06:00 e 22:00',
            path: ['appointment_time'],
        }
    )

/**
 * Update appointment schema
 */
export const updateAppointmentSchema = z.object({
    status: z
        .enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
        .optional(),
    video_link: z
        .string()
        .url('Link de vídeo inválido')
        .optional()
        .nullable(),
    reminder_sent_at: z
        .string()
        .datetime()
        .optional()
        .nullable(),
})

/**
 * Cancel appointment schema
 */
export const cancelAppointmentSchema = z.object({
    cancellation_reason: z
        .string()
        .min(5, 'Motivo do cancelamento deve ter pelo menos 5 caracteres')
        .max(500, 'Motivo do cancelamento muito longo'),
})

/**
 * Available slots query schema
 */
export const availableSlotsQuerySchema = z.object({
    doctor_id: z
        .string()
        .uuid('ID do médico inválido'),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
})

/**
 * List appointments query schema
 */
export const listAppointmentsQuerySchema = z.object({
    status: z
        .enum(['PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'])
        .optional(),
    doctor_id: z
        .string()
        .uuid()
        .optional(),
    patient_id: z
        .string()
        .uuid()
        .optional(),
    date_from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    date_to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
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
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>

