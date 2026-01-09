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

/**
 * Log an AiA interaction for audit/compliance
 */
export async function logAiAInteraction(
    interaction: AiAInteraction
): Promise<{ success: boolean; auditId?: string; error?: string }> {
    try {
        const supabase = createServiceRoleClient() as any

        // Generate hashes for prompt and response
        const promptHash = await hashContent(interaction.prompt)
        const responseHash = await hashContent(interaction.response)

        // Store full content in separate table (encrypted in production)
        const { data: contentData, error: contentError } = await supabase
            .from('aia_interaction_content')
            .insert({
                clinic_id: interaction.clinicId,
                prompt_hash: promptHash,
                response_hash: responseHash,
                prompt_content: interaction.prompt,
                response_content: interaction.response,
                final_content: interaction.wasEdited ? interaction.finalVersion : null,
            })
            .select('id')
            .single()

        if (contentError) {
            console.error('AiA content storage error:', contentError)
        }

        // Store audit log entry (minimal data for compliance)
        const { data: auditData, error: auditError } = await supabase
            .from('aia_audit_log')
            .insert({
                clinic_id: interaction.clinicId,
                doctor_id: interaction.doctorId,
                patient_id: interaction.patientId,
                consultation_id: interaction.consultationId,
                interaction_type: interaction.type,
                prompt_hash: promptHash,
                response_hash: responseHash,
                model: interaction.model,
                tokens_input: interaction.tokensUsed.input,
                tokens_output: interaction.tokensUsed.output,
                tokens_total: interaction.tokensUsed.total,
                cost_brl: interaction.estimatedCostBRL,
                was_edited: interaction.wasEdited || false,
                content_id: contentData?.id,
                metadata: interaction.metadata,
            })
            .select('id')
            .single()

        if (auditError) {
            console.error('AiA audit log error:', auditError)
            return { success: false, error: auditError.message }
        }

        return { success: true, auditId: auditData?.id }
    } catch (error) {
        console.error('AiA audit error:', error)
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
            .from('aia_audit_log')
            .select('*')
            .eq('doctor_id', doctorId)
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
            console.error('Failed to fetch audit logs:', error)
            return []
        }

        return (data || []).map((log: any) => ({
            id: log.id,
            clinicId: log.clinic_id,
            doctorId: log.doctor_id,
            patientId: log.patient_id,
            consultationId: log.consultation_id,
            type: log.interaction_type,
            promptHash: log.prompt_hash,
            responseHash: log.response_hash,
            model: log.model,
            tokensTotal: log.tokens_total,
            costBRL: log.cost_brl,
            wasEdited: log.was_edited,
            createdAt: log.created_at,
        }))
    } catch (error) {
        console.error('Audit logs fetch error:', error)
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
            .from('aia_audit_log')
            .select('*')
            .eq('clinic_id', clinicId)
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

        const stats = {
            totalInteractions: data.length,
            totalTokens: 0,
            totalCostBRL: 0,
            byType: {} as Record<AiAInteractionType, number>,
            byDoctor: {} as Record<string, number>,
        }

        for (const log of data) {
            stats.totalTokens += log.tokens_total || 0
            stats.totalCostBRL += log.cost_brl || 0

            const type = log.interaction_type as AiAInteractionType
            stats.byType[type] = (stats.byType[type] || 0) + 1

            stats.byDoctor[log.doctor_id] = (stats.byDoctor[log.doctor_id] || 0) + 1
        }

        return stats
    } catch (error) {
        console.error('AiA stats error:', error)
        return {
            totalInteractions: 0,
            totalTokens: 0,
            totalCostBRL: 0,
            byType: {} as Record<AiAInteractionType, number>,
            byDoctor: {},
        }
    }
}
