/**
 * GET /api/appointments/overdue
 * List overdue appointments for current clinic
 */
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient() as any
        const { searchParams } = new URL(request.url)

        // 1. Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            throw new ForbiddenError('Não autorizado')
        }

        // Get user's clinic
        const { data: currentUser } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!currentUser?.clinic_id) {
            throw new ForbiddenError('Clínica não encontrada')
        }

        // 2. Query vw_overdue_appointments view
        let query = supabase
            .from('vw_overdue_appointments')
            .select('*')
            .eq('clinic_id', currentUser.clinic_id)
            .eq('is_overdue', true)
            .order('minutes_overdue', { ascending: false })

        // Optional filter by specific clinic (for admins managing multiple clinics)
        const clinicId = searchParams.get('clinic_id')
        if (clinicId && currentUser.role === 'CLINIC_ADMIN') {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: overdueAppointments, error } = await query

        if (error) {
            console.error('Error fetching overdue appointments:', error)
            throw error
        }

        return successResponse({
            success: true,
            overdue_count: overdueAppointments?.length || 0,
            appointments: overdueAppointments || [],
        })

    } catch (error) {
        return handleApiError(error)
    }
}
