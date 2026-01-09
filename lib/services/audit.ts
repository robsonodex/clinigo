import { createClient } from '@/lib/supabase/server'

interface AuditLogParams {
    action: string
    entityType?: string
    entityId?: string
    metadata?: Record<string, any>
    severity?: 'INFO' | 'WARNING' | 'CRITICAL'
}

/**
 * Creates an audit log entry in the database.
 * Uses the `create_audit_log` PostgreSQL function for automatic user context extraction.
 */
export async function createAuditLog({
    action,
    entityType,
    entityId,
    metadata,
    severity = 'INFO'
}: AuditLogParams) {
    try {
        const supabase = await createClient()

        // We use the SQL function which automatically handles:
        // - Extracting user_id, email, role from auth.jwt()
        // - Getting IP and User-Agent from headers

        // However, since we are in a server action/route, the Supabase client
        // might not have the request context fully populated for headers if not handled by middleware.
        // But for auth context it works.
        // The `create_audit_log` function signature:
        // create_audit_log(p_action text, p_entity_type text, p_entity_id text, p_severity text, p_metadata jsonb)

        const { error } = await (supabase as any).rpc('create_audit_log', {
            p_action: action,
            p_entity_type: entityType || null,
            p_entity_id: entityId || null,
            p_severity: severity,
            p_metadata: metadata || null
        })

        if (error) {
            console.error('Failed to create audit log:', error)
            // We don't throw here to avoid blocking the main action
        }
    } catch (err) {
        console.error('Unexpected error in createAuditLog:', err)
    }
}
