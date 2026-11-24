/**
 * AiA Audit Service
 * Compliance CFM - Logs all AI-generated responses
 * 
 * Required for:
 * - CFM Resolution 2.227/2018 (Telemedicina)
 * - LGPD Art. 20 (Decisões automatizadas)
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface AiAInteraction {
    /** ID da clínica */
    clinicId: string
    /** ID do médico que solicitou */
    doctorId: string
    /** ID do paciente (se aplicável) */
    patientId?: string
    /** ID da consulta (se aplicável) */
    consultationId?: string
    /** Tipo de interação */
    type: AiAInteractionType
    /** Prompt/Input enviado */
    prompt: string
    /** Resposta da IA */
    response: string
    /** Modelo utilizado */
    model: string
    /** Tokens utilizados */
    tokensUsed: {
        input: number
        output: number
        total: number
    }
    /** Custo estimado (BRL) */
    estimatedCostBRL: number
    /** Se o médico editou a resposta */
    wasEdited?: boolean
    /** Versão final usada */
    finalVersion?: string
    /** Metadados adicionais */
    metadata?: Record<string, unknown>
}

export type AiAInteractionType =
    | 'DIAGNOSIS_SUGGESTION'
    | 'ANAMNESIS_SUMMARY'
    | 'PRESCRIPTION_DRAFT'
    | 'EXAM_ANALYSIS'
    | 'PATIENT_HISTORY_SUMMARY'
    | 'CLINICAL_NOTES'
    | 'GENERAL_QUERY'

export interface AuditLogEntry {
    id: string
    clinicId: string
    doctorId: string
    patientId?: string
    consultationId?: string
    type: AiAInteractionType
    promptHash: string
    responseHash: string
    model: string
    tokensTotal: number
    costBRL: number
    wasEdited: boolean
    createdAt: string
}

/**
 * Create SHA-256 hash for audit purposes
 */
async function hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Log an AiA interaction for audit/compliance using the real `public.audit_logs` table
 * (zero PII stored: only SHA-256 hashes of already-anonymized prompts/responses + telemetry).
 */
export async function logAiAInteraction(
    interaction: AiAInteraction
): Promise<{ success: boolean; auditId?: string; error?: string }> {
    try {
        const supabase = createServiceRoleClient() as any

        const promptHash = await hashContent(interaction.prompt)
        const responseHash = await hashContent(interaction.response)
        const entityId =
            interaction.patientId && UUID_REGEX.test(interaction.patientId)
                ? interaction.patientId
                : interaction.consultationId && UUID_REGEX.test(interaction.consultationId)
                  ? interaction.consultationId
                  : null

        const { data: auditData, error: auditError } = await supabase
            .from('audit_logs')
            .insert({
                clinic_id: UUID_REGEX.test(interaction.clinicId) ? interaction.clinicId : null,
                user_id: UUID_REGEX.test(interaction.doctorId) ? interaction.doctorId : null,
                action: 'CLINIGO_AI_INTERACTION',
                entity_type: 'clinigo_ai',
                entity_id: entityId,
                severity: 'info',
                details: {
                    interaction_type: interaction.type,
                    model: interaction.model,
                    tokens_input: interaction.tokensUsed.input,
                    tokens_output: interaction.tokensUsed.output,
                    tokens_total: interaction.tokensUsed.total,
                    cost_brl: interaction.estimatedCostBRL,
                    was_edited: interaction.wasEdited || false,
                    prompt_hash: promptHash,
                    response_hash: responseHash,
                },
                metadata: {
                    ...(interaction.metadata || {}),
                    lgpd_shielded: true,
                    prompt_hash: promptHash,
                    response_hash: responseHash,
                },
            })
            .select('id')
            .single()

        if (auditError) {
            return { success: false, error: auditError.message }
        }

        return { success: true, auditId: auditData?.id }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Get audit logs for a doctor (CFM compliance report)
 */
export async function getDoctorAuditLogs(
    doctorId: string,
    options?: {
        startDate?: string
        endDate?: string
        limit?: number
    }
): Promise<AuditLogEntry[]> {
    try {
        const supabase = createServiceRoleClient() as any

        let query = supabase
            .from('audit_logs')
            .select('id, clinic_id, user_id, entity_id, details, created_at')
            .eq('action', 'CLINIGO_AI_INTERACTION')
            .eq('user_id', doctorId)
            .order('created_at', { ascending: false })

        if (options?.startDate) {
            query = query.gte('created_at', options.startDate)
        }
        if (options?.endDate) {
            query = query.lte('created_at', options.endDate)
        }
        if (options?.limit) {
            query = query.limit(options.limit)
        }

        const { data, error } = await query

        if (error) {
            return []
        }

        return (data || []).map((log: any) => ({
            id: log.id,
            clinicId: log.clinic_id,
            doctorId: log.user_id,
            patientId: log.entity_id || undefined,
            type: (log.details?.interaction_type || 'GENERAL_QUERY') as AiAInteractionType,
            promptHash: log.details?.prompt_hash || '',
            responseHash: log.details?.response_hash || '',
            model: log.details?.model || '',
            tokensTotal: Number(log.details?.tokens_total || 0),
            costBRL: Number(log.details?.cost_brl || 0),
            wasEdited: Boolean(log.details?.was_edited),
            createdAt: log.created_at,
        }))
    } catch {
        return []
    }
}

/**
 * Get clinic-wide AI usage statistics
 */
export async function getClinicAiAStats(
    clinicId: string,
    period: 'day' | 'week' | 'month' = 'month'
): Promise<{
    totalInteractions: number
    totalTokens: number
    totalCostBRL: number
    byType: Record<AiAInteractionType, number>
    byDoctor: Record<string, number>
}> {
    try {
        const supabase = createServiceRoleClient() as any

        // Calculate date range
        const now = new Date()
        let startDate: Date
        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                break
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        const { data, error } = await supabase
            .from('audit_logs')
            .select('user_id, details')
            .eq('clinic_id', clinicId)
            .eq('action', 'CLINIGO_AI_INTERACTION')
            .gte('created_at', startDate.toISOString())

        if (error || !data) {
            return {
                totalInteractions: 0,
                totalTokens: 0,
                totalCostBRL: 0,
                byType: {} as Record<AiAInteractionType, number>,
                byDoctor: {},
            }
        }

        const byType = {} as Record<AiAInteractionType, number>
        const byDoctor: Record<string, number> = {}
        let totalTokens = 0
        let totalCostBRL = 0

        for (const row of data) {
            const type = (row.details?.interaction_type || 'GENERAL_QUERY') as AiAInteractionType
            byType[type] = (byType[type] || 0) + 1
            if (row.user_id) {
                byDoctor[row.user_id] = (byDoctor[row.user_id] || 0) + 1
            }
            totalTokens += Number(row.details?.tokens_total || 0)
            totalCostBRL += Number(row.details?.cost_brl || 0)
        }

        return {
            totalInteractions: data.length,
            totalTokens,
            totalCostBRL,
            byType,
            byDoctor,
        }
    } catch {
        return {
            totalInteractions: 0,
            totalTokens: 0,
            totalCostBRL: 0,
            byType: {} as Record<AiAInteractionType, number>,
            byDoctor: {},
        }
    }
}
