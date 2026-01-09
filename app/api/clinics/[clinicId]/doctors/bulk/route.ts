/**
 * PATCH /api/clinics/[clinicId]/doctors/bulk - Bulk update doctors status
 * DELETE /api/clinics/[clinicId]/doctors/bulk - Bulk deactivate doctors
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, noContentResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const bulkDoctorUpdateSchema = z.object({
    ids: z.array(z.string().uuid()),
    is_accepting_appointments: z.boolean(),
})

const bulkDoctorDeleteSchema = z.object({
    ids: z.array(z.string().uuid()),
})

interface RouteParams {
    params: Promise<{ clinicId: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if ((user as any)?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        const body = await request.json()
        const { ids, is_accepting_appointments } = bulkDoctorUpdateSchema.parse(body)

        if (ids.length === 0) {
            throw new BadRequestError('Nenhum médico selecionado')
        }

        const { error } = await (supabase
            .from('doctors') as any)
            .update({ is_accepting_appointments })
            .in('id', ids)
            .eq('clinic_id', clinicId)

        if (error) throw error

        return successResponse({ message: `${ids.length} médicos atualizados com sucesso` })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()
        const adminClient = createServiceRoleClient()

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if ((user as any)?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        const body = await request.json()
        const { ids } = bulkDoctorDeleteSchema.parse(body)

        if (ids.length === 0) {
            throw new BadRequestError('Nenhum médico selecionado')
        }

        // Get user_ids to deactivate corresponding users
        const { data: doctors } = (await supabase
            .from('doctors')
            .select('user_id')
            .in('id', ids)
            .eq('clinic_id', clinicId)) as { data: { user_id: string }[] | null }

        const userIds = doctors?.map(d => d.user_id) || []

        // Deactivate doctors
        const { error: doctorError } = await (supabase
            .from('doctors') as any)
            .update({ is_accepting_appointments: false })
            .in('id', ids)
            .eq('clinic_id', clinicId)

        if (doctorError) throw doctorError

        // Deactivate users
        if (userIds.length > 0) {
            const { error: userError } = await (adminClient
                .from('users') as any)
                .update({ is_active: false })
                .in('id', userIds)

            if (userError) throw userError
        }

        return noContentResponse()
    } catch (error) {
        return handleApiError(error)
    }
}
