/**
 * API: Doctor Health Insurance by ID
 * GET /api/doctors/[doctorId]/health-insurances/[id] - Detalhes do vínculo
 * PATCH /api/doctors/[doctorId]/health-insurances/[id] - Atualizar vínculo
 * DELETE /api/doctors/[doctorId]/health-insurances/[id] - Remover vínculo (soft delete)
 */

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateDoctorHealthInsuranceSchema } from '@/lib/validations/health-insurance'

interface RouteParams {
    params: Promise<{ doctorId: string; id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId, id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const supabase = createServiceRoleClient()

        const { data, error } = await supabase
            .from('doctor_health_insurances')
            .select(`
                *,
                doctor:doctors(id, clinic_id, user_id),
                plan:health_insurance_plans(
                    *,
                    health_insurance:health_insurances(*)
                )
            `)
            .eq('id', id)
            .eq('doctor_id', doctorId)
            .is('deleted_at', null)
            .single()

        if (error || !data) {
            throw new NotFoundError('Vínculo de convênio')
        }

        // Check access
        if (userRole !== 'SUPER_ADMIN') {
            if (userRole === 'DOCTOR' && (data.doctor as any)?.user_id !== userId) {
                throw new ForbiddenError('Acesso negado')
            }
            if (userRole === 'CLINIC_ADMIN' && (data.doctor as any)?.clinic_id !== userClinicId) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        return successResponse(data)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId, id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem editar vínculos')
        }

        const body = await request.json()
        const validatedData = updateDoctorHealthInsuranceSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if link exists
        const { data: existing, error: fetchError } = await supabase
            .from('doctor_health_insurances')
            .select(`
                id,
                doctor:doctors(clinic_id)
            `)
            .eq('id', id)
            .eq('doctor_id', doctorId)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Vínculo de convênio')
        }

        if (userRole !== 'SUPER_ADMIN' && (existing.doctor as any)?.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado')
        }

        // Update
        const { data, error } = await supabase
            .from('doctor_health_insurances')
            .update(validatedData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse(data, 'Vínculo atualizado com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId, id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem remover vínculos')
        }

        const supabase = createServiceRoleClient()

        // Check if link exists
        const { data: existing, error: fetchError } = await supabase
            .from('doctor_health_insurances')
            .select(`
                id,
                doctor:doctors(clinic_id)
            `)
            .eq('id', id)
            .eq('doctor_id', doctorId)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Vínculo de convênio')
        }

        if (userRole !== 'SUPER_ADMIN' && (existing.doctor as any)?.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado')
        }

        // Soft delete
        const { error } = await supabase
            .from('doctor_health_insurances')
            .update({
                deleted_at: new Date().toISOString(),
                status: 'INACTIVE'
            })
            .eq('id', id)

        if (error) throw error

        return successResponse(null, 'Vínculo removido com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}
