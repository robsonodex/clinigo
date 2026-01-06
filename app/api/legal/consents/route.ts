/**
 * API endpoint for LGPD patient consents
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

// Consent text template
const CONSENT_TEXT_TEMPLATE = `
Autorização de Tratamento de Dados Pessoais (LGPD)

1. Autorizo o tratamento dos meus dados pessoais (nome, CPF, email, telefone, data de nascimento) para:
- Agendamento e realização de consultas
- Envio de confirmações e lembretes
- Processamento de pagamentos
- Cumprimento de obrigações legais

2. Autorizo a criação e armazenamento de prontuário eletrônico, protegido por sigilo médico.
Conforme Resolução CFM nº 1.821/2007 e LGPD Art. 11 (dados sensíveis).

3. Autorizo o recebimento de comunicações (confirmações, lembretes, links).

Direitos do Titular (LGPD Art. 18):
- Acesso, correção, exclusão e portabilidade de dados
- Revogação de consentimento a qualquer momento
`.trim()

/**
 * POST - Register patient consent
 * Public endpoint for booking flow
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            patient_id,
            clinic_id,
            data_treatment_consent,
            medical_record_consent,
            communications_consent,
        } = body

        if (!patient_id || !clinic_id) {
            return Response.json(
                { success: false, error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Check if patient already has active consent
        const { data: existingConsent } = await supabase
            .from('patient_consents')
            .select('id')
            .eq('patient_id', patient_id)
            .eq('clinic_id', clinic_id)
            .is('revoked_at', null)
            .single()

        if (existingConsent) {
            // Update existing consent
            const { error: updateError } = await supabase
                .from('patient_consents')
                .update({
                    data_treatment_consent,
                    medical_record_consent,
                    communications_consent,
                    consent_text: CONSENT_TEXT_TEMPLATE,
                    consent_version: '1.0',
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingConsent.id)

            if (updateError) throw updateError

            return successResponse({ message: 'Consentimento atualizado', id: existingConsent.id })
        }

        // Create new consent
        const { data: newConsent, error: insertError } = await supabase
            .from('patient_consents')
            .insert({
                patient_id,
                clinic_id,
                data_treatment_consent,
                medical_record_consent,
                communications_consent,
                consent_text: CONSENT_TEXT_TEMPLATE,
                consent_version: '1.0',
                ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0',
                user_agent: request.headers.get('user-agent'),
            })
            .select('id')
            .single()

        if (insertError) throw insertError

        return successResponse({
            message: 'Consentimento registrado',
            id: newConsent.id,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * GET - Check if patient has valid consent
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patientId')
        const clinicId = searchParams.get('clinicId')

        if (!patientId || !clinicId) {
            return Response.json(
                { success: false, error: 'Parâmetros obrigatórios: patientId, clinicId' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { data: consent } = await supabase
            .from('patient_consents')
            .select('*')
            .eq('patient_id', patientId)
            .eq('clinic_id', clinicId)
            .is('revoked_at', null)
            .single()

        return successResponse({
            hasConsent: !!consent,
            consent: consent || null,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * DELETE - Revoke consent (LGPD right to be forgotten)
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patientId')
        const reason = searchParams.get('reason') || 'Solicitação do titular'

        if (!patientId) {
            return Response.json(
                { success: false, error: 'patientId obrigatório' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        const { error } = await supabase
            .from('patient_consents')
            .update({
                revoked_at: new Date().toISOString(),
                revocation_reason: reason,
            })
            .eq('patient_id', patientId)
            .is('revoked_at', null)

        if (error) throw error

        return successResponse({ message: 'Consentimento revogado com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}
