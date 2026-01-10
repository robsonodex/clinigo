/**
 * API: Health Insurance by ID
 * GET /api/health-insurances/[id] - Detalhes da operadora
 * PATCH /api/health-insurances/[id] - Atualizar operadora
 * DELETE /api/health-insurances/[id] - Desativar operadora (soft delete)
 */

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateHealthInsuranceSchema } from '@/lib/validations/health-insurance'

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
            .from('health_insurances')
            .select(`
                *,
                health_insurance_plans(*)
            `)
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (error || !data) {
            throw new NotFoundError('Operadora')
        }

        // Check clinic access
        if (userRole !== 'SUPER_ADMIN' && data.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a esta operadora')
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
            throw new ForbiddenError('Apenas administradores podem editar operadoras')
        }

        const body = await request.json()
        const validatedData = updateHealthInsuranceSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if insurance exists and belongs to the clinic
        const { data: existing, error: fetchError } = await supabase
            .from('health_insurances')
            .select('id, clinic_id')
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Operadora')
        }

        if (userRole !== 'SUPER_ADMIN' && existing.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a esta operadora')
        }

        // Check for duplicate name if changing name
        if (validatedData.name) {
            const { data: duplicate } = await supabase
                .from('health_insurances')
                .select('id')
                .eq('clinic_id', existing.clinic_id)
                .eq('name', validatedData.name)
                .neq('id', id)
                .is('deleted_at', null)
                .single()

            if (duplicate) {
                throw new BadRequestError('Já existe outra operadora com este nome')
            }
        }

        // Update
        const { data, error } = await supabase
            .from('health_insurances')
            .update(validatedData)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return successResponse(data, 'Operadora atualizada com sucesso')
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
            throw new ForbiddenError('Apenas administradores podem remover operadoras')
        }

        const supabase = createServiceRoleClient()

        // Check if insurance exists
        const { data: existing, error: fetchError } = await supabase
            .from('health_insurances')
            .select('id, clinic_id')
            .eq('id', id)
            .is('deleted_at', null)
            .single()

        if (fetchError || !existing) {
            throw new NotFoundError('Operadora')
        }

        if (userRole !== 'SUPER_ADMIN' && existing.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a esta operadora')
        }

        // Check if has active plans
        const { count: activePlansCount } = await supabase
            .from('health_insurance_plans')
            .select('*', { count: 'exact', head: true })
            .eq('health_insurance_id', id)
            .eq('status', 'ACTIVE')
            .is('deleted_at', null)

        if (activePlansCount && activePlansCount > 0) {
            throw new BadRequestError(
                `Não é possível remover esta operadora pois possui ${activePlansCount} plano(s) ativo(s). Desative os planos primeiro.`
            )
        }

        // Soft delete
        const { error } = await supabase
            .from('health_insurances')
            .update({
                deleted_at: new Date().toISOString(),
                status: 'INACTIVE'
            })
            .eq('id', id)

        if (error) throw error

        return successResponse(null, 'Operadora removida com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}
