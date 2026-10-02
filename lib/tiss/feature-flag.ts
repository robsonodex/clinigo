import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * CLINIGO - Faturamento Premium Feature Flag (R2)
 * 
 * Regra: Desligada por padrao. Clinicas atuais nao sao afetadas
 * ate que o administrador (CLINIC_ADMIN / SUPER_ADMIN) ative explicitamente.
 */

export interface FaturamentoPremiumStatus {
    enabled: boolean;
    enabled_at?: string;
    enabled_by?: string;
}

/**
 * Verifica se a clinica possui a feature flag faturamento_premium ativada
 */
export async function isFaturamentoPremiumEnabled(clinicId: string): Promise<boolean> {
    if (!clinicId) return false;

    try {
        const supabase = await createClient();
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('addons')
            .eq('id', clinicId)
            .single();

        if (error || !clinic) {
            return false;
        }

        const addons = (clinic.addons as Record<string, any>) || {};
        return Boolean(addons.faturamento_premium);
    } catch (err) {
        console.error('[FeatureFlag] Erro ao consultar faturamento_premium:', err);
        return false;
    }
}

/**
 * Atualiza o status da feature flag faturamento_premium para uma clinica
 */
export async function setFaturamentoPremiumStatus(
    clinicId: string,
    enabled: boolean,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    if (!clinicId) {
        return { success: false, error: 'Identificador da clínica inválido' };
    }

    try {
        let supabase: any;
        try {
            supabase = createServiceRoleClient();
        } catch {
            supabase = await createClient();
        }
        
        // Obter addons atuais
        const { data: clinic, error: fetchError } = await supabase
            .from('clinics')
            .select('addons')
            .eq('id', clinicId)
            .single();

        if (fetchError || !clinic) {
            return { success: false, error: 'Clínica não encontrada' };
        }

        const currentAddons = (clinic.addons as Record<string, any>) || {};
        const updatedAddons = {
            ...currentAddons,
            faturamento_premium: enabled,
            faturamento_premium_updated_at: new Date().toISOString(),
            faturamento_premium_updated_by: userId,
        };

        const { error: updateError } = await supabase
            .from('clinics')
            .update({ addons: updatedAddons })
            .eq('id', clinicId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        // Registrar auditoria
        await supabase.from('audit_logs').insert({
            user_id: userId,
            action: enabled ? 'FEATURE_FLAG_FATURAMENTO_PREMIUM_ENABLED' : 'FEATURE_FLAG_FATURAMENTO_PREMIUM_DISABLED',
            entity_type: 'clinic',
            entity_id: clinicId,
            metadata: {
                previous_state: Boolean(currentAddons.faturamento_premium),
                new_state: enabled,
            },
        });

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message || 'Erro interno ao atualizar feature flag' };
    }
}
