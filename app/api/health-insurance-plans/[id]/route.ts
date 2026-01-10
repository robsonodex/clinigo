/**
 * API: Health Insurance Plan by ID
 * GET /api/health-insurance-plans/[id] - Detalhes do plano
 * PATCH /api/health-insurance-plans/[id] - Atualizar plano
 * DELETE /api/health-insurance-plans/[id] - Desativar plano (soft delete)
 */

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateHealthInsurancePlanSchema } from '@/lib/validations/health-insurance'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const supabase = createServiceRoleClient()

        const { data, error } = await supabase
            .from('health_insurance_plans')
            .select(`
                *,
                health_insurance:health_insurances(*)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (error || !data) {
            throw new NotFoundError('Plano')
        }

        // Check clinic access
        if (userRole !== 'SUPER_ADMIN' && data.health_insurance?.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a este plano')
        }

        return successResponse(data)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem editar planos')
        }

        const body = await request.json()
        const validatedData = updateHealthInsurancePlanSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if plan exists
        const { data: existing, error: fetchError } = await supabase
            .from('health_insurance_plans')
            .select(`
                id, 
                health_insurance_id,
                health_insurance:health_insurances(clinic_id)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Plano')
        }

        if (userRole !== 'SUPER_ADMIN' && (existing.health_insurance as any)?.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a este plano')
        }

        // Check for duplicate name if changing
        if (validatedData.name) {
            const { data: duplicate } = await supabase
                .from('health_insurance_plans')
                .select('id')
                .eq('health_insurance_id', existing.health_insurance_id)
                .eq('name', validatedData.name)
                .neq('id', id)
                .is('deleted_at', null)
                .single()

            if (duplicate) {
                throw new BadRequestError('Já existe outro plano com este nome nesta operadora')
            }
        }

        // Update
        const { data, error } = await supabase
            .from('health_insurance_plans')
            .update(validatedData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse(data, 'Plano atualizado com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem remover planos')
        }

        const supabase = createServiceRoleClient()

        // Check if plan exists
        const { data: existing, error: fetchError } = await supabase
            .from('health_insurance_plans')
            .select(`
                id,
                health_insurance:health_insurances(clinic_id)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Plano')
        }

        if (userRole !== 'SUPER_ADMIN' && (existing.health_insurance as any)?.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a este plano')
        }

        // Check if has active doctor links
        const { count: activeDoctorsCount } = await supabase
            .from('doctor_health_insurances')
            .select('*', { count: 'exact', head: true })
            .eq('health_insurance_plan_id', id)
            .eq('status', 'ACTIVE')
            .is('deleted_at', null)

        if (activeDoctorsCount && activeDoctorsCount > 0) {
            throw new BadRequestError(
                `Não é possível remover este plano pois está vinculado a ${activeDoctorsCount} médico(s). Remova os vínculos primeiro.`
            )
        }

        // Soft delete
        const { error } = await supabase
            .from('health_insurance_plans')
            .update({
                deleted_at: new Date().toISOString(),
                status: 'INACTIVE'
            })
            .eq('id', id)

        if (error) throw error

        return successResponse(null, 'Plano removido com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}
