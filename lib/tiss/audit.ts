import { createClient } from '@/lib/supabase/server';

/**
 * CLINIGO - Helper Oficial de Auditoria TISS (B1.4)
 * Padroniza gravação e consulta da trilha de auditoria para Guia, Lote e Recursos.
 */

export interface WriteTissAuditParams {
    clinicId: string;
    userId: string;
    action: string;
    entityType: 'tiss_guide' | 'tiss_batch' | 'tiss_glosa' | 'tiss_glosa_contest' | 'clinic' | string;
    entityId: string;
    previousState?: any;
    newState?: any;
    reason?: string | null;
    ipAddress?: string | null;
    metadata?: Record<string, any>;
    customSupabase?: any;
}

export interface TissAuditEntry {
    id: string;
    user_id: string;
    user_name?: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
    metadata: {
        clinic_id?: string;
        previous_state?: any;
        new_state?: any;
        reason?: string;
        ip_address?: string;
        [key: string]: any;
    };
}

/**
 * Grava registro formal de auditoria na tabela audit_logs
 */
export async function writeTissAudit({
    clinicId,
    userId,
    action,
    entityType,
    entityId,
    previousState,
    newState,
    reason,
    ipAddress,
    metadata = {},
    customSupabase,
}: WriteTissAuditParams): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const supabase = customSupabase || (await createClient());

        const payload = {
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            metadata: {
                clinic_id: clinicId,
                previous_state: previousState !== undefined ? previousState : null,
                new_state: newState !== undefined ? newState : null,
                reason: reason || null,
                ip_address: ipAddress || null,
                recorded_at: new Date().toISOString(),
                ...metadata,
            },
        };

        const { data, error } = await supabase
            .from('audit_logs')
            .insert(payload)
            .select('id')
            .single();

        if (error) {
            console.error('[TissAudit] Erro ao gravar log de auditoria:', error);
            return { success: false, error: error.message };
        }

        return { success: true, id: data?.id };
    } catch (err: any) {
        console.error('[TissAudit] Falha na gravação de auditoria:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Consulta histórico de auditoria com suporte a filtros e paginação
 */
export async function getTissAuditHistory(params: {
    clinicId: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    limit?: number;
    offset?: number;
}): Promise<{ entries: TissAuditEntry[]; total: number }> {
    try {
        const supabase = await createClient();
        const limit = Math.min(params.limit || 50, 100);
        const offset = params.offset || 0;

        let query = supabase
            .from('audit_logs')
            .select(`
                id,
                user_id,
                action,
                entity_type,
                entity_id,
                created_at,
                metadata,
                user:users(full_name)
            `, { count: 'exact' })
            .order('created_at', { ascending: false });

        if (params.entityType) {
            query = query.eq('entity_type', params.entityType);
        }

        if (params.entityId) {
            query = query.eq('entity_id', params.entityId);
        }

        if (params.action) {
            query = query.eq('action', params.action);
        }

        // Filtro por clínica contido no jsonb de metadados
        query = query.contains('metadata', { clinic_id: params.clinicId });

        const { data, count, error } = await query.range(offset, offset + limit - 1);

        if (error || !data) {
            console.error('[TissAudit] Erro ao listar logs:', error);
            return { entries: [], total: 0 };
        }

        const entries: TissAuditEntry[] = data.map((row: any) => ({
            id: row.id,
            user_id: row.user_id,
            user_name: row.user?.full_name || 'Usuário do Sistema',
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            created_at: row.created_at,
            metadata: row.metadata || {},
        }));

        return { entries, total: count || entries.length };
    } catch (err) {
        console.error('[TissAudit] Falha ao recuperar histórico:', err);
        return { entries: [], total: 0 };
    }
}
