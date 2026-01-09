/**
 * Zod validation schemas for frontend forms
 */
import { z } from 'zod'

/**
 * CPF validation
 */
function isValidCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i], 10) * (10 - i)
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleaned[9], 10)) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i], 10) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleaned[10], 10)) return false

    return true
}

/**
 * Patient booking form schema
 */
export const patientFormSchema = z.object({
    full_name: z
        .string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(100, 'Nome muito longo'),
    cpf: z
        .string()
        .min(11, 'CPF inválido')
        .max(14, 'CPF inválido')
        .refine(isValidCPF, { message: 'CPF inválido' }),
    email: z.string().email('Email inválido'),
    phone: z
        .string()
        .min(10, 'Telefone inválido')
        .max(15, 'Telefone inválido')
        .refine((val) => /^\d{10,11}$/.test(val.replace(/\D/g, '')), {
            message: 'Telefone deve ter 10 ou 11 dígitos',
        }),
    date_of_birth: z.string().optional(),
    terms: z.boolean().refine((val) => val === true, {
        message: 'Você deve aceitar os termos',
    }),
})

export type PatientFormData = z.infer<typeof patientFormSchema>

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

export type LoginFormData = z.infer<typeof loginFormSchema>

/**
 * Doctor creation form schema
 */
export const doctorFormSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    password: z
        .string()
        .min(8, 'Senha deve ter pelo menos 8 caracteres')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Senha deve conter letras maiúsculas, minúsculas e números'
        ),
    crm: z.string().min(4, 'CRM inválido').max(10, 'CRM muito longo'),
    crm_state: z.string().length(2, 'Estado inválido'),
    specialty: z.string().min(3, 'Especialidade inválida'),
    consultation_price: z
        .number()
        .positive('Preço deve ser positivo')
        .max(10000, 'Preço muito alto'),
    bio: z.string().max(1000, 'Biografia muito longa').optional(),
})

export type DoctorFormData = z.infer<typeof doctorFormSchema>

/**
 * Cancellation form schema
 */
export const cancellationFormSchema = z.object({
    reason: z.string().min(5, 'Motivo deve ter pelo menos 5 caracteres'),
})

export type CancellationFormData = z.infer<typeof cancellationFormSchema>

/**
 * Pre-Check-in form schema
 * Used for patient check-in before consultation
 */
export const preCheckinSchema = z.object({
    // Contact info
    phone: z.string()
        .min(10, 'Telefone deve ter pelo menos 10 dígitos')
        .max(15, 'Telefone inválido')
        .refine((val) => /^\d{10,11}$/.test(val.replace(/\D/g, '')), {
            message: 'Telefone deve ter 10 ou 11 dígitos',
        }),

    // Address
    address: z.string()
        .min(5, 'Endereço deve ter pelo menos 5 caracteres')
        .max(200, 'Endereço muito longo'),

    // Medical info
    main_complaint: z.string()
        .min(5, 'Queixa principal deve ter pelo menos 5 caracteres')
        .max(500, 'Queixa principal muito longa'),

    medications: z.string()
        .max(500, 'Lista de medicamentos muito longa')
        .optional()
        .nullable(),

    allergies: z.string()
        .max(300, 'Lista de alergias muito longa')
        .optional()
        .nullable(),

    // Additional info
    emergency_contact: z.string()
        .min(10, 'Contato de emergência inválido')
        .optional()
        .nullable(),

    emergency_contact_name: z.string()
        .min(2, 'Nome do contato de emergência inválido')
        .optional()
        .nullable(),

    health_insurance: z.string()
        .optional()
        .nullable(),

    health_insurance_number: z.string()
        .optional()
        .nullable(),

    // Consent
    consent: z.boolean().refine((val) => val === true, {
        message: 'Você deve concordar com os termos para continuar',
    }),

    consent_data_usage: z.boolean().refine((val) => val === true, {
        message: 'Você deve autorizar o uso dos dados para a consulta',
    }),
})

export type PreCheckinFormData = z.infer<typeof preCheckinSchema>

/**
 * Queue entry schema
 */
export const queueEntrySchema = z.object({
    appointment_id: z.string().uuid('ID do agendamento inválido'),
    priority_reason: z.enum(['normal', 'idoso', 'gestante', 'deficiente', 'emergencia', 'retorno_urgente']).default('normal'),
})

export type QueueEntryData = z.infer<typeof queueEntrySchema>


