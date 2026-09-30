/**
 * Patient Intake Validations — Zod Schemas
 * Validação server-side para fichas de pré-cadastro
 */

import { z } from 'zod'

// CPF digit verification
function isValidCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '')
    if (digits.length !== 11) return false
    if (/^(\d)\1{10}$/.test(digits)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
    let remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    if (remainder !== parseInt(digits[9])) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    return remainder === parseInt(digits[10])
}

// Normalize BR phone: strip non-digits, ensure starts with country code
function normalizeBRPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('55') && digits.length >= 12) return digits
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`
    return digits
}

// Patient type: self (adult) or other (child/dependent)
export const PatientTypeSchema = z.enum(['self', 'other'])

// Billing modality
export const BillingTypeSchema = z.enum(['particular', 'convenio'])

// Guardian/responsible data (when patient is minor or dependent)
export const GuardianSchema = z.object({
    guardian_name: z.string().min(3, 'Nome do responsável deve ter pelo menos 3 caracteres'),
    guardian_cpf: z.string().refine(
        val => isValidCPF(val),
        'CPF do responsável inválido'
    ),
    guardian_relationship: z.string().min(2, 'Informe o parentesco'),
    guardian_phone: z.string().min(10, 'Telefone do responsável inválido'),
})

// Insurance data (when billing_type = 'convenio')
export const InsuranceDataSchema = z.object({
    health_insurance_id: z.string().uuid().optional(),
    health_insurance_other: z.string().optional(),
    insurance_card_number: z.string().min(1, 'Número da carteirinha obrigatório'),
    insurance_validity: z.string().optional(),
    insurance_plan_name: z.string().optional(),
    is_holder: z.boolean().default(true),
    holder_name: z.string().optional(),
    holder_cpf: z.string().optional(),
    // File references (submitted separately via upload)
    card_front_file_id: z.string().uuid().optional(),
    card_back_file_id: z.string().uuid().optional(),
})

// LGPD Consent
export const ConsentSchema = z.object({
    accepted: z.literal(true, {
        errorMap: () => ({ message: 'O aceite do consentimento LGPD é obrigatório' })
    }),
    consent_text: z.string().min(10),
    consent_version: z.string().min(1),
    accepted_at: z.string(),
    ip: z.string().optional(),
    user_agent: z.string().optional(),
    consent_hash: z.string().optional(),
})

// Full intake form schema
export const IntakeFormSchema = z.object({
    patient_type: PatientTypeSchema,
    // Patient data
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    date_of_birth: z.string().min(8, 'Data de nascimento obrigatória'),
    cpf: z.string().refine(
        val => !val || isValidCPF(val),
        'CPF inválido'
    ).optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone inválido').transform(normalizeBRPhone),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    // Guardian (conditional)
    guardian: GuardianSchema.optional(),
    // Billing
    billing_type: BillingTypeSchema,
    insurance: InsuranceDataSchema.optional(),
    // Complaint
    complaint: z.string().max(500).optional(),
    // Consent
    consent: ConsentSchema,
    // Honeypot anti-bot
    _hp_field: z.string().max(0, 'Spam detected').optional(),
}).refine(
    data => {
        // If patient_type is 'other', guardian must be provided
        if (data.patient_type === 'other' && !data.guardian) return false
        return true
    },
    { message: 'Dados do responsável são obrigatórios para menores ou dependentes', path: ['guardian'] }
).refine(
    data => {
        // If billing_type is 'convenio', insurance must be provided
        if (data.billing_type === 'convenio' && !data.insurance) return false
        return true
    },
    { message: 'Dados do convênio são obrigatórios', path: ['insurance'] }
)

export type IntakeFormData = z.infer<typeof IntakeFormSchema>
export type PatientType = z.infer<typeof PatientTypeSchema>
export type BillingType = z.infer<typeof BillingTypeSchema>
export type GuardianData = z.infer<typeof GuardianSchema>
export type InsuranceData = z.infer<typeof InsuranceDataSchema>
export type ConsentData = z.infer<typeof ConsentSchema>

// LGPD Consent text — versioned
export const INTAKE_CONSENT_TEXT = `TERMO DE CONSENTIMENTO PARA COLETA E TRATAMENTO DE DADOS PESSOAIS E SENSÍVEIS

Em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei 13.709/2018), ao preencher esta ficha de pré-cadastro, você autoriza a clínica a coletar, armazenar e tratar os dados pessoais e de saúde aqui informados para as seguintes finalidades:

1. Cadastro e identificação do paciente no sistema da clínica
2. Agendamento e gestão de consultas e atendimentos
3. Manutenção de prontuário eletrônico conforme legislação vigente (CFM, CRP, CRFa)
4. Comunicação sobre agendamentos, tratamentos e informações relevantes ao atendimento
5. Cumprimento de obrigações legais e regulatórias

Os dados fornecidos serão tratados com sigilo e segurança, acessíveis apenas à equipe autorizada da clínica. Você tem o direito de solicitar acesso, correção, exclusão ou portabilidade dos seus dados a qualquer momento, conforme previsto na LGPD.

Este consentimento pode ser revogado a qualquer momento mediante solicitação à clínica.`

export const INTAKE_CONSENT_VERSION = '1.0'

// Schema for creating a new link (internal, dashboard)
export const CreateLinkSchema = z.object({
    lead_name: z.string().optional(),
    lead_phone: z.string().optional(),
})

export type CreateLinkData = z.infer<typeof CreateLinkSchema>

// Utility: generate consent hash
export function generateConsentHash(consentText: string, timestamp: string): string {
    // Uses Web Crypto API compatible approach
    const data = `${consentText}|${timestamp}|${INTAKE_CONSENT_VERSION}`
    // Will be computed server-side with crypto.createHash
    return data
}

export { isValidCPF, normalizeBRPhone }
