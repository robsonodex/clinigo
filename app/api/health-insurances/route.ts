/**
 * API: Health Insurances (Operadoras)
 * GET /api/health-insurances - Listar operadoras
 * POST /api/health-insurances - Criar operadora
 */

import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import {
    createHealthInsuranceSchema,
    listHealthInsurancesQuerySchema
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
        const query = listHealthInsurancesQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        // Use service role for admins
        const supabase = (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN')
            ? createServiceRoleClient()
            : await createClient()

        let queryBuilder = supabase
            .from('health_insurances')
            .select('*', { count: 'exact' })
            .is('deleted_at', null)

        // Filter by clinic
        if (userRole !== 'SUPER_ADMIN') {
            if (!userClinicId) {
                throw new ForbiddenError('Clínica não identificada')
            }
            queryBuilder = queryBuilder.eq('clinic_id', userClinicId)
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

        // Add plans count for each insurance
        const insurancesWithCounts = await Promise.all(
            (data || []).map(async (insurance: any) => {
                const { count: plansCount } = await supabase
                    .from('health_insurance_plans')
                    .select('*', { count: 'exact', head: true })
                    .eq('health_insurance_id', insurance.id)
                    .eq('status', 'ACTIVE')
                    .is('deleted_at', null)

                return {
                    ...insurance,
                    plans_count: plansCount || 0
                }
            })
        )

        return paginatedResponse(
            buildPaginatedData(insurancesWithCounts, count || 0, page, pageSize)
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
            throw new ForbiddenError('Apenas administradores podem criar operadoras')
        }

        const body = await request.json()
        const validatedData = createHealthInsuranceSchema.parse(body)

        // Determine clinic_id
        let clinicId = userClinicId
        if (userRole === 'SUPER_ADMIN' && body.clinic_id) {
            clinicId = body.clinic_id
        }

        if (!clinicId) {
            throw new BadRequestError('Clínica não identificada')
        }

        const supabase = createServiceRoleClient()

        // Check for duplicate name in the same clinic
        const { data: existing } = await supabase
            .from('health_insurances')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('name', validatedData.name)
            .is('deleted_at', null)
            .single()

        if (existing) {
            throw new BadRequestError('Já existe uma operadora com este nome nesta clínica')
        }

        // Create the health insurance
        const { data, error } = await supabase
            .from('health_insurances')
            .insert({
                clinic_id: clinicId,
                name: validatedData.name,
                code: validatedData.code || null,
                phone: validatedData.phone || null,
                email: validatedData.email || null,
                notes: validatedData.notes || null,
                status: 'ACTIVE',
                tiss_version: validatedData.tiss_version || '4.01.00',
            } as any)
            .select()
            .single()

        if (error) throw error

        return successResponse(data, { status: 201 })
    } catch (error) {
        return handleApiError(error)
    }
}
