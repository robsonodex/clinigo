/**
 * API: Doctor Health Insurances
 * GET /api/doctors/[doctorId]/health-insurances - Listar convênios do médico
 * POST /api/doctors/[doctorId]/health-insurances - Vincular convênio ao médico
 */

import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, BadRequestError, NotFoundError, ConflictError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import {
    createDoctorHealthInsuranceSchema,
    listDoctorHealthInsurancesQuerySchema
} from '@/lib/validations/health-insurance'

interface RouteParams {
    params: Promise<{ doctorId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        const { searchParams } = new URL(request.url)
        const query = listDoctorHealthInsurancesQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = createServiceRoleClient()

        // Verify doctor exists and check access
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, clinic_id, user_id')
            .eq('id', doctorId)
            .single()

        if (doctorError || !doctor) {
            throw new NotFoundError('Médico')
        }

        // Check access: Clinic Admin can see doctors from their clinic, Doctor can see own
        if (userRole !== 'SUPER_ADMIN') {
            if (userRole === 'DOCTOR' && doctor.user_id !== userId) {
                throw new ForbiddenError('Acesso negado')
            }
            if (userRole === 'CLINIC_ADMIN' && doctor.clinic_id !== userClinicId) {
                throw new ForbiddenError('Acesso negado')
            }
        }

        // Get doctor's health insurances with full details
        let queryBuilder = supabase
            .from('doctor_health_insurances')
            .select(`
                id,
                doctor_id,
                health_insurance_plan_id,
                consultation_price,
                accepts_new_patients,
                notes,
                status,
                created_at,
                updated_at,
                plan:health_insurance_plans(
                    id,
                    name,
                    code,
                    type,
                    coverage_type,
                    health_insurance:health_insurances(
                        id,
                        name,
                        code
                    )
                )
            `, { count: 'exact' })
            .eq('doctor_id', doctorId)
            .is('deleted_at', null)

        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status)
        }

        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data, count, error } = await queryBuilder

        if (error) throw error

        // Transform data to flatten structure
        const flattenedData = (data || []).map((item: any) => ({
            ...item,
            plan_name: item.plan?.name,
            plan_code: item.plan?.code,
            plan_type: item.plan?.type,
            coverage_type: item.plan?.coverage_type,
            insurance_id: item.plan?.health_insurance?.id,
            insurance_name: item.plan?.health_insurance?.name,
            insurance_code: item.plan?.health_insurance?.code,
        }))

        return paginatedResponse(
            buildPaginatedData(flattenedData, count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { doctorId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem vincular convênios')
        }

        const body = await request.json()
        const validatedData = createDoctorHealthInsuranceSchema.parse(body)

        const supabase = createServiceRoleClient()

        // Verify doctor exists and belongs to clinic
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctorId)
            .single()

        if (doctorError || !doctor) {
            throw new NotFoundError('Médico')
        }

        if (userRole !== 'SUPER_ADMIN' && doctor.clinic_id !== userClinicId) {
            throw new ForbiddenError('Acesso negado a este médico')
        }

        // Verify plan exists and belongs to same clinic
        const { data: plan, error: planError } = await supabase
            .from('health_insurance_plans')
            .select(`
                id,
                health_insurance:health_insurances(clinic_id)
            `)
            .eq('id', validatedData.health_insurance_plan_id)
            .is('deleted_at', null)
            .single()

        if (planError || !plan) {
            throw new NotFoundError('Plano de convênio')
        }

        if ((plan.health_insurance as any)?.clinic_id !== doctor.clinic_id) {
            throw new BadRequestError('Este plano não pertence à mesma clínica do médico')
        }

        // Check if already linked
        const { data: existing } = await supabase
            .from('doctor_health_insurances')
            .select('id, deleted_at')
            .eq('doctor_id', doctorId)
            .eq('health_insurance_plan_id', validatedData.health_insurance_plan_id)
            .single()

        if (existing && !existing.deleted_at) {
            throw new ConflictError('Médico já possui vínculo com este plano')
        }

        // If was soft-deleted, reactivate
        if (existing && existing.deleted_at) {
            const { data, error } = await supabase
                .from('doctor_health_insurances')
                .update({
                    consultation_price: validatedData.consultation_price,
                    accepts_new_patients: validatedData.accepts_new_patients ?? true,
                    notes: validatedData.notes || null,
                    status: 'ACTIVE',
                    deleted_at: null,
                })
                .eq('id', existing.id)
                .select()
                .single()

            if (error) throw error

            return successResponse(data, 'Convênio reativado com sucesso', 200)
        }

        // Create new link
        const { data, error } = await supabase
            .from('doctor_health_insurances')
            .insert({
                doctor_id: doctorId,
                health_insurance_plan_id: validatedData.health_insurance_plan_id,
                consultation_price: validatedData.consultation_price,
                accepts_new_patients: validatedData.accepts_new_patients ?? true,
                notes: validatedData.notes || null,
                status: 'ACTIVE',
            })
            .select()
            .single()

        if (error) throw error

        return successResponse(data, 'Convênio vinculado com sucesso', 201)
    } catch (error) {
        return handleApiError(error)
    }
}
