/**
 * Zod Schemas for User Profile Validation
 */
import { z } from 'zod'

// ============================================
// GENERAL INFO SCHEMAS
// ============================================

export const generalInfoSchema = z.object({
    name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
    email: z.string().email('Email inválido'),
    phone: z.string()
        .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Formato: (00) 00000-0000')
        .optional()
        .or(z.literal('')),
    cpf: z.string()
        .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'Formato: 000.000.000-00')
        .optional()
        .or(z.literal('')),
    birth_date: z.string().optional().or(z.literal('')),
    gender: z.enum(['masculino', 'feminino', 'outro', 'prefiro_nao_dizer']).optional(),
    bio: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
})

export const addressSchema = z.object({
    address_zipcode: z.string()
        .regex(/^\d{5}-\d{3}$/, 'Formato: 00000-000')
        .optional()
        .or(z.literal('')),
    address_street: z.string().min(3, 'Mínimo 3 caracteres').optional().or(z.literal('')),
    address_number: z.string().optional().or(z.literal('')),
    address_complement: z.string().optional().or(z.literal('')),
    address_neighborhood: z.string().optional().or(z.literal('')),
    address_city: z.string().optional().or(z.literal('')),
    address_state: z.string().length(2, 'Use sigla do estado (ex: SP)').optional().or(z.literal('')),
})

export const doctorInfoSchema = z.object({
    crm: z.string().optional().or(z.literal('')),
    crm_uf: z.string().length(2).optional().or(z.literal('')),
    specialty: z.string().optional().or(z.literal('')),
    consultation_price: z.number().min(0).optional(),
    consultation_duration: z.number().min(15).max(180).optional(),
})

// ============================================
// SECURITY SCHEMAS
// ============================================

export const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z.string()
        .min(8, 'Mínimo 8 caracteres')
        .regex(/[A-Z]/, 'Deve conter ao menos 1 letra maiúscula')
        .regex(/[0-9]/, 'Deve conter ao menos 1 número')
        .regex(/[^A-Za-z0-9]/, 'Deve conter ao menos 1 caractere especial'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
})

export const mfaEnableSchema = z.object({
    secret: z.string().min(1),
})

export const mfaVerifySchema = z.object({
    code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d{6}$/, 'Apenas números'),
})

export const mfaDisableSchema = z.object({
    password: z.string().min(1, 'Senha obrigatória'),
})

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const notificationPreferencesSchema = z.object({
    // Canais
    email_enabled: z.boolean(),
    push_enabled: z.boolean(),
    sms_enabled: z.boolean(),
    whatsapp_enabled: z.boolean(),

    // Eventos - Agendamentos
    new_appointments: z.boolean(),
    appointment_cancellations: z.boolean(),
    appointment_reminder_24h: z.boolean(),
    appointment_reminder_2h: z.boolean(),
    appointment_reminder_30min: z.boolean(),

    // Eventos - Financeiro
    payments_received: z.boolean(),
    payment_failures: z.boolean(),
    invoices: z.boolean(),

    // Eventos - Comunicação
    patient_messages: z.boolean(),
    internal_messages: z.boolean(),

    // Eventos - Sistema
    system_updates: z.boolean(),
    security_alerts: z.boolean(),
    newsletter: z.boolean(),
    promotions: z.boolean(),

    // Avançado
    do_not_disturb_start: z.string().optional().nullable(),
    do_not_disturb_end: z.string().optional().nullable(),
    summary_frequency: z.enum(['immediate', 'daily', 'weekly']),
    sound_enabled: z.boolean(),
})

// ============================================
// PREFERENCES SCHEMAS
// ============================================

export const userPreferencesSchema = z.object({
    theme: z.enum(['light', 'dark', 'auto']),
    language: z.enum(['pt-BR', 'en-US', 'es-ES']),
    timezone: z.string(),
    date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
    time_format: z.enum(['24h', '12h']),
    week_start_day: z.number().min(0).max(6),
    default_view: z.enum(['day', 'week', 'month']),
    font_size: z.enum(['small', 'medium', 'large']),
    high_contrast: z.boolean(),
    reduce_animations: z.boolean(),
    screen_reader: z.boolean(),
})

// ============================================
// ACCOUNT DELETION SCHEMAS
// ============================================

export const deleteAccountSchema = z.object({
    reason: z.enum([
        'nao_uso_mais',
        'mudei_sistema',
        'problemas_tecnicos',
        'custo_alto',
        'outro',
    ], {
        errorMap: () => ({ message: 'Selecione um motivo' })
    }),
    feedback: z.string().max(1000).optional().or(z.literal('')),
    confirmText: z.literal('EXCLUIR', {
        errorMap: () => ({ message: 'Digite EXCLUIR para confirmar' })
    }),
    password: z.string().min(1, 'Senha obrigatória para confirmar'),
})

export const cancelDeletionSchema = z.object({
    password: z.string().min(1, 'Senha obrigatória'),
})

// ============================================
// UPLOAD SCHEMAS
// ============================================

export const avatarUploadSchema = z.object({
    file: z.instanceof(File)
        .refine(file => file.size <= 5 * 1024 * 1024, 'Arquivo deve ter no máximo 5MB')
        .refine(
            file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
            'Apenas JPG, PNG ou WebP são permitidos'
        ),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type GeneralInfoFormData = z.infer<typeof generalInfoSchema>
export type AddressFormData = z.infer<typeof addressSchema>
export type DoctorInfoFormData = z.infer<typeof doctorInfoSchema>
export type PasswordFormData = z.infer<typeof passwordSchema>
export type MfaEnableFormData = z.infer<typeof mfaEnableSchema>
export type MfaVerifyFormData = z.infer<typeof mfaVerifySchema>
export type MfaDisableFormData = z.infer<typeof mfaDisableSchema>
export type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>
export type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>
export type CancelDeletionFormData = z.infer<typeof cancelDeletionSchema>
export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>
