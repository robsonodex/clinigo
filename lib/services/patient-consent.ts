/**
 * Patient Consent Service - CliniGo v3.0
 * 
 * Manages LGPD consent for data processing, teleconsulta recording, and data sharing
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { logConsentChange } from './audit-log'

export type ConsentType =
    | 'DATA_PROCESSING'          // Basic data processing consent
    | 'TELECONSULTA_RECORDING'   // Permission to record teleconsulta
    | 'DATA_SHARING'             // Share data with other providers
    | 'MARKETING'                // Receive marketing communications

export interface PatientConsent {
    id: string
    patient_id: string
    clinic_id: string
    consent_type: ConsentType
    consent_text: string
    version: string
    accepted: boolean
    accepted_at: string | null
    revoked_at: string | null
    ip_address: string
    user_agent: string
    created_at: string
}

const CURRENT_CONSENT_VERSIONS: Record<ConsentType, string> = {
    DATA_PROCESSING: '1.0',
    TELECONSULTA_RECORDING: '1.0',
    DATA_SHARING: '1.0',
    MARKETING: '1.0'
}

const CONSENT_TEXTS: Record<ConsentType, string> = {
    DATA_PROCESSING: `
TERMO DE CONSENTIMENTO PARA TRATAMENTO DE DADOS PESSOAIS

Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), 
autorizo a coleta, armazenamento e tratamento dos meus dados pessoais e de saúde 
pela clínica para as seguintes finalidades:

1. Prestação de serviços de saúde
2. Manutenção de prontuário eletrônico
3. Comunicação sobre agendamentos e tratamentos
4. Cumprimento de obrigações legais (CFM, ANS)

Estou ciente de que posso revogar este consentimento a qualquer momento.
    `.trim(),

    TELECONSULTA_RECORDING: `
TERMO DE AUTORIZAÇÃO PARA GRAVAÇÃO DE TELECONSULTA

Autorizo a gravação desta teleconsulta para fins exclusivamente médicos, ciente de que:

1. A gravação será armazenada por no mínimo 20 anos (CFM Resolução 1821/2007)
2. Acesso restrito ao médico responsável e equipe autorizada
3. Poderá ser utilizada para análise clínica e continuidade do tratamento
4. Será protegida segundo LGPD e normas do CFM
5. Posso revogar este consentimento a qualquer momento

Li e concordo com os termos acima.
    `.trim(),

    DATA_SHARING: `
TERMO DE AUTORIZAÇÃO PARA COMPARTILHAMENTO DE DADOS

Autorizo o compartilhamento dos meus dados de saúde com:

1. Outros profissionais de saúde para continuidade do tratamento
2. Operadoras de planos de saúde para faturamento
3. Laboratórios e clínicas de imagem para realização de exames

Estou ciente de que posso revogar esta autorização a qualquer momento.
    `.trim(),

    MARKETING: `
CONSENTIMENTO PARA COMUNICAÇÕES

Autorizo o recebimento de:

1. Informativos sobre saúde e bem-estar
2. Novidades sobre serviços da clínica
3. Promoções e campanhas de saúde

Posso cancelar a qualquer momento.
    `.trim()
}

/**
 * Check if patient has valid consent
 */
export async function hasValidConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType
): Promise<boolean> {
    const supabase = createServiceRoleClient()
    const currentVersion = CURRENT_CONSENT_VERSIONS[consentType]

    const { data } = await supabase
        .from('patient_consents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', consentType)
        .eq('version', currentVersion)
        .eq('accepted', true)
        .is('revoked_at', null)
        .single()

    return !!data
}

/**
 * Get all consents for a patient
 */
export async function getPatientConsents(
    patientId: string,
    clinicId: string
): Promise<PatientConsent[]> {
    const supabase = createServiceRoleClient()

    const { data } = await supabase
        .from('patient_consents')
        .select('*')
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })

    return (data || []) as PatientConsent[]
}

/**
 * Accept consent
 */
export async function acceptConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType,
    ipAddress: string,
    userAgent: string
): Promise<PatientConsent> {
    const supabase = createServiceRoleClient()

    // Revoke any existing consent of same type
    await supabase
        .from('patient_consents')
        .update({ revoked_at: new Date().toISOString() })
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', consentType)
        .is('revoked_at', null)

    // Create new consent
    const { data, error } = await supabase
        .from('patient_consents')
        .insert({
            patient_id: patientId,
            clinic_id: clinicId,
            consent_type: consentType,
            consent_text: CONSENT_TEXTS[consentType],
            version: CURRENT_CONSENT_VERSIONS[consentType],
            accepted: true,
            accepted_at: new Date().toISOString(),
            ip_address: ipAddress,
            user_agent: userAgent
        })
        .select()
        .single()

    if (error) throw error

    // Log consent
    await logConsentChange(patientId, clinicId, patientId, consentType, true)

    return data as PatientConsent
}

/**
 * Revoke consent
 */
export async function revokeConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType
): Promise<void> {
    const supabase = createServiceRoleClient()

    await supabase
        .from('patient_consents')
        .update({
            revoked_at: new Date().toISOString(),
            accepted: false
        })
        .eq('patient_id', patientId)
        .eq('clinic_id', clinicId)
        .eq('consent_type', consentType)
        .is('revoked_at', null)

    // Log revocation
    await logConsentChange(patientId, clinicId, patientId, consentType, false)
}

/**
 * Get consent text for display
 */
export function getConsentText(consentType: ConsentType): string {
    return CONSENT_TEXTS[consentType]
}

/**
 * Get current consent version
 */
export function getCurrentConsentVersion(consentType: ConsentType): string {
    return CURRENT_CONSENT_VERSIONS[consentType]
}

/**
 * Require consent before proceeding (throws if not consented)
 */
export async function requireConsent(
    patientId: string,
    clinicId: string,
    consentType: ConsentType
): Promise<void> {
    const hasConsent = await hasValidConsent(patientId, clinicId, consentType)

    if (!hasConsent) {
        throw new Error(`CONSENT_REQUIRED:${consentType}`)
    }
}
