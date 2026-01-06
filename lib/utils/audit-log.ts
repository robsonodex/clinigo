/**
 * Audit Log Utility
 * Records critical actions for compliance and debugging
 */
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sanitizeForLog } from '@/lib/utils/sanitize'

export interface AuditLogEntry {
    clinic_id?: string | null
    user_id?: string | null
    action: string
    entity_type: string
    entity_id?: string | null
    old_values?: Record<string, unknown> | null
    new_values?: Record<string, unknown> | null
    ip_address?: string | null
    user_agent?: string | null
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        const supabase = createServiceRoleClient()

        // Sanitize values before logging
        const sanitizedOld = entry.old_values ? sanitizeForLog(entry.old_values) : null
        const sanitizedNew = entry.new_values ? sanitizeForLog(entry.new_values) : null

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('audit_log').insert({
            clinic_id: entry.clinic_id,
            user_id: entry.user_id,
            action: entry.action,
            entity_type: entry.entity_type,
            entity_id: entry.entity_id,
            old_values: sanitizedOld,
            new_values: sanitizedNew,
            ip_address: entry.ip_address,
            user_agent: entry.user_agent,
        })
    } catch (error) {
        // Log failed audit shouldn't break the main flow
        console.error('[AuditLog] Failed to record audit event:', error)
    }
}

/**
 * Helper to extract request metadata for audit
 */
export function extractRequestMeta(request: Request): {
    ip_address: string | null
    user_agent: string | null
} {
    const headers = request.headers
    const forwardedFor = headers.get('x-forwarded-for')
    const realIp = headers.get('x-real-ip')
    const userAgent = headers.get('user-agent')

    return {
        ip_address: forwardedFor?.split(',')[0].trim() || realIp || null,
        user_agent: userAgent,
    }
}

/**
 * Pre-built audit actions
 */
export const AuditActions = {
    // User actions
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DELETED: 'USER_DELETED',

    // Doctor actions
    DOCTOR_CREATED: 'DOCTOR_CREATED',
    DOCTOR_UPDATED: 'DOCTOR_UPDATED',
    DOCTOR_DELETED: 'DOCTOR_DELETED',

    // Appointment actions
    APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
    APPOINTMENT_CONFIRMED: 'APPOINTMENT_CONFIRMED',
    APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
    APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',

    // Payment actions
    PAYMENT_CREATED: 'PAYMENT_CREATED',
    PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
    PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',

    // Clinic actions
    CLINIC_CREATED: 'CLINIC_CREATED',
    CLINIC_UPDATED: 'CLINIC_UPDATED',
    CLINIC_PLAN_CHANGED: 'CLINIC_PLAN_CHANGED',

    // Medical records
    MEDICAL_RECORD_CREATED: 'MEDICAL_RECORD_CREATED',
    MEDICAL_RECORD_UPDATED: 'MEDICAL_RECORD_UPDATED',
    MEDICAL_RECORD_SIGNED: 'MEDICAL_RECORD_SIGNED',

    // API Keys
    API_KEY_CREATED: 'API_KEY_CREATED',
    API_KEY_DELETED: 'API_KEY_DELETED',
    API_KEY_USED: 'API_KEY_USED',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]
