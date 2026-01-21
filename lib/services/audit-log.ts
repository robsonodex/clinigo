/**
 * Audit Log Service - CliniGo v3.0
 * 
 * Logs all sensitive data access for LGPD compliance
 * Tracks: prontuário views, patient data access, admin actions
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export type AuditAction =
    | 'VIEW'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'EXPORT'
    | 'LOGIN'
    | 'LOGOUT'
    | 'PAYMENT_RECONCILED'
    | 'CONSENT_ACCEPTED'
    | 'CONSENT_REVOKED'

export type ResourceType =
    | 'PRONTUARIO'
    | 'APPOINTMENT'
    | 'PATIENT'
    | 'DOCTOR'
    | 'CLINIC'
    | 'FINANCIAL'
    | 'USER'
    | 'TELECONSULTA'
    | 'RECORDING'

interface AuditLogEntry {
    userId: string
    clinicId: string
    action: AuditAction
    resourceType: ResourceType
    resourceId: string
    metadata?: Record<string, any>
}

/**
 * Log an audit event
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
    try {
        const supabase = createServiceRoleClient()
        const headersList = await headers()

        const ipAddress = headersList.get('x-forwarded-for') ||
            headersList.get('x-real-ip') ||
            'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        await supabase.from('audit_logs').insert({
            user_id: entry.userId,
            clinic_id: entry.clinicId,
            action: entry.action,
            resource_type: entry.resourceType,
            resource_id: entry.resourceId,
            ip_address: ipAddress,
            user_agent: userAgent,
            metadata: entry.metadata || {},
            created_at: new Date().toISOString()
        })
    } catch (error) {
        // Don't fail the main operation if audit logging fails
        console.error('[AUDIT] Failed to log:', error)
    }
}

/**
 * Log prontuário access (critical for LGPD)
 */
export async function logProntuarioAccess(
    userId: string,
    clinicId: string,
    consultationId: string,
    patientId: string,
    action: 'VIEW' | 'CREATE' | 'UPDATE' = 'VIEW'
): Promise<void> {
    await logAudit({
        userId,
        clinicId,
        action,
        resourceType: 'PRONTUARIO',
        resourceId: consultationId,
        metadata: {
            patient_id: patientId,
            accessed_at: new Date().toISOString()
        }
    })
}

/**
 * Log patient data export
 */
export async function logDataExport(
    userId: string,
    clinicId: string,
    patientId: string,
    exportType: 'PDF' | 'JSON' | 'CSV'
): Promise<void> {
    await logAudit({
        userId,
        clinicId,
        action: 'EXPORT',
        resourceType: 'PATIENT',
        resourceId: patientId,
        metadata: {
            export_type: exportType,
            exported_at: new Date().toISOString()
        }
    })
}

/**
 * Log teleconsulta recording access
 */
export async function logRecordingAccess(
    userId: string,
    clinicId: string,
    appointmentId: string,
    action: 'VIEW' | 'CREATE' | 'DELETE'
): Promise<void> {
    await logAudit({
        userId,
        clinicId,
        action,
        resourceType: 'RECORDING',
        resourceId: appointmentId,
        metadata: {
            recording_action: action,
            accessed_at: new Date().toISOString()
        }
    })
}

/**
 * Log consent changes
 */
export async function logConsentChange(
    userId: string,
    clinicId: string,
    patientId: string,
    consentType: string,
    accepted: boolean
): Promise<void> {
    await logAudit({
        userId,
        clinicId,
        action: accepted ? 'CONSENT_ACCEPTED' : 'CONSENT_REVOKED',
        resourceType: 'PATIENT',
        resourceId: patientId,
        metadata: {
            consent_type: consentType,
            accepted,
            changed_at: new Date().toISOString()
        }
    })
}

/**
 * Get audit logs for a specific resource
 */
export async function getAuditLogs(
    clinicId: string,
    resourceType: ResourceType,
    resourceId: string,
    limit: number = 50
): Promise<any[]> {
    const supabase = createServiceRoleClient()

    const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit)

    return data || []
}

/**
 * Get user activity log
 */
export async function getUserActivity(
    clinicId: string,
    userId: string,
    days: number = 30
): Promise<any[]> {
    const supabase = createServiceRoleClient()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

    return data || []
}
