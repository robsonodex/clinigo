/**
 * API endpoint for medical record access audit logs (LGPD)
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

/**
 * GET - List access logs for the clinic (admin only)
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores podem ver logs de auditoria')
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const pageSize = parseInt(searchParams.get('pageSize') || '50')
        const action = searchParams.get('action')
        const patientId = searchParams.get('patientId')
        const dateFrom = searchParams.get('dateFrom')
        const dateTo = searchParams.get('dateTo')

        const supabase = await createClient() as any

        // Get user's clinic
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (!user?.clinic_id && userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Clínica não encontrada')
        }

        // Build query with joins to get patient name
        let query = supabase
            .from('medical_record_access_log')
            .select(`
                id,
                medical_record_id,
                patient_id,
                patients(full_name),
                accessed_by,
                accessed_by_name,
                accessed_by_role,
                action,
                ip_address,
                user_agent,
                justification,
                accessed_at
            `, { count: 'exact' })
            .order('accessed_at', { ascending: false })

        // Filter by clinic
        if (user?.clinic_id) {
            query = query.eq('clinic_id', user.clinic_id)
        }

        // Apply filters
        if (action && action !== 'ALL') {
            query = query.eq('action', action)
        }
        if (patientId) {
            query = query.eq('patient_id', patientId)
        }
        if (dateFrom) {
            query = query.gte('accessed_at', dateFrom)
        }
        if (dateTo) {
            query = query.lte('accessed_at', dateTo)
        }

        // Pagination
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1
        query = query.range(from, to)

        const { data: logs, error, count } = await query

        if (error) throw error

        // Transform data to include patient_name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (logs || []).map((log: any) => ({
            ...log,
            patient_name: log.patients?.full_name || 'N/A',
        }))

        return successResponse({
            items,
            total: count || 0,
            page,
            pageSize,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * POST - Manually log an access (for VIEW actions)
 */
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            throw new ForbiddenError('Autenticação necessária')
        }

        const body = await request.json()
        const { medical_record_id, patient_id, action, justification } = body

        if (!patient_id || !action) {
            throw new ForbiddenError('Dados incompletos')
        }

        const supabase = await createClient() as any

        // Get user details
        const { data: user } = await supabase
            .from('users')
            .select('clinic_id, full_name')
            .eq('id', userId)
            .single()

        if (!user?.clinic_id) {
            throw new ForbiddenError('Usuário não associado a uma clínica')
        }

        // Insert log
        const { error } = await supabase.from('medical_record_access_log').insert({
            medical_record_id,
            patient_id,
            clinic_id: user.clinic_id,
            accessed_by: userId,
            accessed_by_name: user.full_name || 'Usuário',
            accessed_by_role: userRole || 'DOCTOR',
            action,
            justification,
            ip_address: request.headers.get('x-forwarded-for') || '0.0.0.0',
            user_agent: request.headers.get('user-agent'),
        })

        if (error) throw error

        return successResponse({ message: 'Acesso registrado' })
    } catch (error) {
        return handleApiError(error)
    }
}

