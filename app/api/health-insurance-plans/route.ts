/**
 * API: Health Insurance Plans
 * GET /api/health-insurance-plans - Listar planos
 * POST /api/health-insurance-plans - Criar plano
 */

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import {
    createHealthInsurancePlanSchema,
    listHealthInsurancePlansQuerySchema
} from '@/lib/validations/health-insurance'

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const { searchParams } = new URL(request.url)
        const query = listHealthInsurancePlansQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = createServiceRoleClient()

        let queryBuilder = supabase
            .from('health_insurance_plans')
            .select(`
                *,
                health_insurance:health_insurances(id, name, code, clinic_id)
            `, { count: 'exact' })
            .is('deleted_at', null)

        // Filter by specific insurance
        if (query.insurance_id) {
            queryBuilder = queryBuilder.eq('health_insurance_id', query.insurance_id)
        }

        // Filter by clinic (via health_insurance)
        if (userRole !== 'SUPER_ADMIN') {
            if (!userClinicId) {
                throw new ForbiddenError('Clínica não identificada')
            }
            queryBuilder = queryBuilder.eq('health_insurance.clinic_id', userClinicId)
        }

        // Apply filters
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status)
        }

        if (query.search) {
            queryBuilder = queryBuilder.or(`name.ilike.%${query.search}%,code.ilike.%${query.search}%`)
        }

        // Order and paginate
        queryBuilder = queryBuilder
            .order('name', { ascending: true })
            .range(offset, offset + pageSize - 1)

        const { data, count, error } = await queryBuilder

        if (error) throw error

        // Filter out results without health_insurance (clinic mismatch)
        const filteredData = (data || []).filter((plan: any) => plan.health_insurance !== null)

        // Add doctors count
        const plansWithCounts = await Promise.all(
            filteredData.map(async (plan: any) => {
                const { count: doctorsCount } = await supabase
                    .from('doctor_health_insurances')
                    .select('*', { count: 'exact', head: true })
                    .eq('health_insurance_plan_id', plan.id)
                    .eq('status', 'ACTIVE')
                    .is('deleted_at', null)

                return {
                    ...plan,
                    doctors_count: doctorsCount || 0
                }
            })
        )

        return paginatedResponse(
            buildPaginatedData(plansWithCounts, filteredData.length, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem criar planos')
        }

        const body = await request.json()
        const validatedData = createHealthInsurancePlanSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Check if health insurance exists and belongs to clinic
        const { data: insurance, error: insuranceError } = await supabase
            .from('health_insurances')
            .select('id, clinic_id')
            .eq('id', validatedData.health_insurance_id)
            .is('deleted_at', null)
            .single()

        if (insuranceError || !insurance) {
            throw new NotFoundError('Operadora')
        }

        if (userRole !== 'SUPER_ADMIN' && insurance.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a esta operadora')
        }

        // Check for duplicate name within the same insurance
        const { data: existing } = await supabase
            .from('health_insurance_plans')
            .select('id')
            .eq('health_insurance_id', validatedData.health_insurance_id)
            .eq('name', validatedData.name)
            .is('deleted_at', null)
            .single()

        if (existing) {
            throw new BadRequestError('Já existe um plano com este nome nesta operadora')
        }

        // Create the plan
        const { data, error } = await supabase
            .from('health_insurance_plans')
            .insert({
                health_insurance_id: validatedData.health_insurance_id,
                name: validatedData.name,
                code: validatedData.code || null,
                type: validatedData.type || 'INDIVIDUAL',
                coverage_type: validatedData.coverage_type || 'COMPLETO',
                notes: validatedData.notes || null,
                status: 'ACTIVE',
            })
            .select(`
                *,
                health_insurance:health_insurances(id, name, code)
            `)
            .single()

        if (error) throw error

        return successResponse(data, 'Plano criado com sucesso', 201)
    } catch (error) {
        return handleApiError(error)
    }
}
