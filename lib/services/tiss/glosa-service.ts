/**
 * TISS Glosa Service
 * Gerencia glosas e contestações
 */
// @ts-nocheck - Temporário até regenerar types do Supabase
import { createServiceRoleClient } from '@/lib/supabase/server'

export class GlosaService {
    private supabase = createServiceRoleClient()

    /**
     * Lista todas as glosas de uma clínica
     */
    async listGlosas(clinicId: string, filters?: {
        status?: string
        start_date?: string
        end_date?: string
    }) {
        let query = this.supabase
            .from('tiss_glosas')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('received_at', { ascending: false })

        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        if (filters?.start_date) {
            query = query.gte('received_at', filters.start_date)
        }

        if (filters?.end_date) {
            query = query.lte('received_at', filters.end_date)
        }

        const { data, error } = await query

        if (error) throw error
        return data || []
    }

    /**
     * Obtém métricas agregadas de glosas
     */
    async getMetrics(clinicId: string) {
        const { data, error } = await this.supabase
            .from('vw_glosa_metrics')
            .select('*')
            .eq('clinic_id', clinicId)
            .single()

        if (error) throw error
        return data
    }

    /**
     * Cria uma contestação
     */
    async createContest(glosaId: string, contestReason: string) {
        const { data, error } = await this.supabase
            .from('tiss_glosa_contests')
            .insert({
                glosa_id: glosaId,
                contest_reason: contestReason,
                contest_status: 'DRAFT'
            } as any)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Submete uma contestação
     */
    async submitContest(contestId: string) {
        const { data, error } = await this.supabase
            .from('tiss_glosa_contests')
            .update({
                contest_status: 'SUBMITTED',
                submitted_at: new Date().toISOString()
            } as any)
            .eq('id', contestId)
            .select()
            .single()

        if (error) throw error
        return data
    }
}
