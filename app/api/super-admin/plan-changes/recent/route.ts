/**
 * API: Recent Plan Changes (Super Admin)
 * GET /api/super-admin/plan-changes/recent
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            throw new ForbiddenError('Not authenticated')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Super admin only')
        }

        // Buscar mudanças recentes com dados da clínica
        const { data: changes, error } = await supabaseAdmin
            .from('clinic_plan_history')
            .select(`
        *,
        clinic:clinics(name)
      `)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) throw error

        return successResponse({
            changes: changes?.map((c: any) => ({
                ...c,
                clinic_name: c.clinic?.name || 'N/A',
            })) || [],
        })
    } catch (error) {
        return handleApiError(error)
    }
}
