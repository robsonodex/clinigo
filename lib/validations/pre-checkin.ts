/**
 * Validação Zod para Pré-Check-in do CliniGo
 * Inclui validação de arquivos (PDF/Imagem, max 5MB)
 */
import { z } from 'zod'

// Constantes de validação
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_FILE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
]

// Validação de telefone brasileiro
const phoneRegex = /^\(?[1-9]{2}\)?\s?9?\d{4}[-\s]?\d{4}$/

/**
 * Schema de validação para arquivos
 */
export const fileSchema = z.object({
    name: z.string(),
    size: z.number().max(MAX_FILE_SIZE, 'Arquivo deve ter no máximo 5MB'),
    type: z.string().refine(
        (type) => ACCEPTED_FILE_TYPES.includes(type),
        'Formato aceito: PDF, JPEG, PNG ou WebP'
    ),
    url: z.string().url().optional(),
})

export type FileData = z.infer<typeof fileSchema>

/**
 * Schema de documento com tipo
 */
export const documentSchema = z.object({
    type: z.enum(['rg', 'cpf', 'cnh', 'carteirinha', 'exame', 'outro'], {
        errorMap: () => ({ message: 'Tipo de documento inválido' }),
    }),
    file: fileSchema,
})

export type DocumentData = z.infer<typeof documentSchema>

/**
 * Schema completo do Pré-Check-in
 */
export const preCheckinSchema = z.object({
    // === Dados de Contato ===
    phone: z
        .string()
        .min(10, 'Telefone deve ter pelo menos 10 dígitos')
        .max(15, 'Telefone inválido')
        .refine(
            (val) => phoneRegex.test(val.replace(/\D/g, '').padStart(11, '0')),
            'Formato de telefone inválido'
        ),

    // === Endereço ===
    address: z
        .string()
        .min(5, 'Endereço deve ter pelo menos 5 caracteres')
        .max(200, 'Endereço muito longo'),

    address_complement: z
        .string()
        .max(100, 'Complemento muito longo')
        .optional()
        .nullable(),

    // === Dados Médicos ===
    main_complaint: z
        .string()
        .min(5, 'Descreva sua queixa principal (mínimo 5 caracteres)')
        .max(500, 'Queixa muito longa (máximo 500 caracteres)'),

    symptoms_duration: z
        .string()
        .max(100, 'Descrição muito longa')
        .optional()
        .nullable(),

    medications: z
        .string()
        .max(500, 'Lista de medicamentos muito longa')
        .optional()
        .nullable(),

    medications_list: z
        .array(z.string().max(100))
        .max(20, 'Máximo de 20 medicamentos')
        .optional(),

    allergies: z
        .string()
        .max(300, 'Lista de alergias muito longa')
        .optional()
        .nullable(),

    allergies_list: z
        .array(z.string().max(100))
        .max(10, 'Máximo de 10 alergias')
        .optional(),

    has_allergies: z.boolean().optional().default(false),

    // === Sinais Vitais (opcionais, preenchidos pela recepção) ===
    blood_pressure: z
        .string()
        .regex(/^\d{2,3}\/\d{2,3}$/, 'Formato: 120/80')
        .optional()
        .nullable(),

    heart_rate: z
        .number()
        .int()
        .min(30, 'Frequência cardíaca inválida')
        .max(250, 'Frequência cardíaca inválida')
        .optional()
        .nullable(),

    temperature: z
        .number()
        .min(34, 'Temperatura inválida')
        .max(42, 'Temperatura inválida')
        .optional()
        .nullable(),

    weight: z
        .number()
        .positive('Peso deve ser positivo')
        .max(500, 'Peso inválido')
        .optional()
        .nullable(),

    height: z
        .number()
        .int()
        .min(50, 'Altura inválida')
        .max(250, 'Altura inválida')
        .optional()
        .nullable(),

    // === Contato de Emergência ===
    emergency_contact_name: z
        .string()
        .min(2, 'Nome do contato muito curto')
        .max(100, 'Nome do contato muito longo')
        .optional()
        .nullable(),

    emergency_contact_phone: z
        .string()
        .min(10, 'Telefone de emergência inválido')
        .max(15, 'Telefone de emergência inválido')
        .optional()
        .nullable(),

    emergency_contact_relationship: z
        .enum(['pai', 'mae', 'filho', 'filha', 'conjuge', 'irmao', 'irma', 'outro'])
        .optional()
        .nullable(),

    // === Convênio ===
    health_insurance: z
        .string()
        .max(100, 'Nome do convênio muito longo')
        .optional()
        .nullable(),

    health_insurance_number: z
        .string()
        .max(50, 'Número da carteirinha muito longo')
        .optional()
        .nullable(),

    health_insurance_validity: z
        .string()
        .optional()
        .nullable(),

    // === Documentos (máximo 5 arquivos, 5MB cada) ===
    documents: z
        .array(documentSchema)
        .max(5, 'Máximo de 5 documentos permitidos')
        .optional(),

    // === Consentimentos ===
    consent_treatment: z.boolean().refine((val) => val === true, {
        message: 'Você deve consentir com o tratamento médico',
    }),

    consent_data_usage: z.boolean().refine((val) => val === true, {
        message: 'Você deve autorizar o uso dos dados para a consulta',
    }),

    consent_telemedicine: z.boolean().optional().default(false),

    consent_whatsapp: z.boolean().optional().default(false),

    // === Observações ===
    observations: z
        .string()
        .max(1000, 'Observações muito longas')
        .optional()
        .nullable(),

    // === Prioridade ===
    priority_reason: z
        .enum(['normal', 'idoso', 'gestante', 'deficiente', 'emergencia', 'retorno_urgente'])
        .default('normal'),
})

export type PreCheckinFormData = z.infer<typeof preCheckinSchema>

/**
 * Schema parcial para salvar rascunho
 */
export const preCheckinDraftSchema = preCheckinSchema.partial().extend({
    phone: z.string().optional(),
    address: z.string().optional(),
    main_complaint: z.string().optional(),
    consent_treatment: z.boolean().optional(),
    consent_data_usage: z.boolean().optional(),
})

export type PreCheckinDraftData = z.infer<typeof preCheckinDraftSchema>

/**
 * Validar tamanho total dos arquivos
 */
export function validateTotalFileSize(files: FileData[], maxTotal: number = 25 * 1024 * 1024): boolean {
    const totalSize = files.reduce((acc, file) => acc + file.size, 0)
    return totalSize <= maxTotal
}

/**
 * Constantes exportadas para uso em componentes
 */
export const CHECKIN_VALIDATION = {
    MAX_FILE_SIZE,
    MAX_FILE_SIZE_MB: 5,
    MAX_DOCUMENTS: 5,
    MAX_TOTAL_SIZE: 25 * 1024 * 1024, // 25MB total
    ACCEPTED_FILE_TYPES,
    ACCEPTED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.webp'],
} as const

