/**
 * API: Health Insurance by ID
 * GET /api/health-insurances/[id] - Detalhes da operadora
 * PATCH /api/health-insurances/[id] - Atualizar operadora
 * DELETE /api/health-insurances/[id] - Desativar operadora (soft delete)
 */

import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { updateHealthInsuranceSchema } from '@/lib/validations/health-insurance'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            const authClient = await createClient()
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

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
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            const authClient = await createClient()
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST']
        if (!allowedRoles.includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores e recepcionistas podem editar operadoras')
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
                throw new BadRequestError('Já existe uma operadora com este nome')
            }
        }

        // Update the health insurance
        const { data, error } = await supabase
            .from('health_insurances')
            .update({
                ...validatedData,
                updated_at: new Date().toISOString()
            })
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
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            const authClient = await createClient()
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST']
        if (!allowedRoles.includes(userRole || '')) {
            throw new ForbiddenError('Apenas administradores e recepcionistas podem remover operadoras')
        }

        const { searchParams } = new URL(request.url)
        const unlinkPatients = searchParams.get('unlink_patients') === 'true'

        const supabase = createServiceRoleClient()

        // Check if insurance exists
        const { data: existing, error: fetchError } = await supabase
            .from('health_insurances')
            .select('id, clinic_id, name')
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

        // Check if has linked patients
        const { count: linkedPatientsCount } = await supabase
            .from('patients')
            .select('*', { count: 'exact', head: true })
            .eq('health_insurance_id', id)
            .is('deleted_at', null)

        if (linkedPatientsCount && linkedPatientsCount > 0) {
            if (!unlinkPatients) {
                throw new BadRequestError(
                    `Não é possível remover diretamente pois existem ${linkedPatientsCount} paciente(s) vinculado(s) a esta operadora. Você pode inativá-la ou confirmar a desvinculação dos pacientes para cobrança Particular.`
                )
            }

            // Desvincula os pacientes do convênio antes do soft delete
            const { error: unlinkError } = await supabase
                .from('patients')
                .update({
                    health_insurance_id: null,
                    billing_type: 'particular',
                    insurance_card_number: null,
                    insurance_validity: null,
                    insurance_plan_name: null,
                    updated_at: new Date().toISOString()
                })
                .eq('health_insurance_id', id)
                .eq('clinic_id', existing.clinic_id)

            if (unlinkError) throw unlinkError
        }

        // Soft delete
        const { error } = await supabase
            .from('health_insurances')
            .update({
                deleted_at: new Date().toISOString(),
                status: 'INACTIVE',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)

        if (error) throw error

        return successResponse(null, 'Operadora removida com sucesso')
    } catch (error) {
        return handleApiError(error)
    }
}
