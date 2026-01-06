/**
 * GET /api/clinics - List all clinics (SUPER_ADMIN only)
 * POST /api/clinics - Create new clinic (SUPER_ADMIN only)
 */
import { type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, ConflictError } from '@/lib/utils/errors'
import { successResponse, paginatedResponse, parsePaginationParams, buildPaginatedData } from '@/lib/utils/responses'
import { createClinicSchema, listClinicsQuerySchema } from '@/lib/validations/clinic'

export async function GET(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')
        const userId = request.headers.get('x-user-id')

        console.log('[GET /api/clinics] User Role:', userRole, 'User ID:', userId)

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem listar clínicas')
        }

        const { searchParams } = new URL(request.url)
        const query = listClinicsQuerySchema.parse(Object.fromEntries(searchParams))
        const { page, pageSize, offset } = parsePaginationParams(searchParams)

        const supabase = userRole === 'SUPER_ADMIN'
            ? createServiceRoleClient()
            : await createClient()

        console.log('[GET /api/clinics] Using client:', userRole === 'SUPER_ADMIN' ? 'SERVICE_ROLE' : 'AUTHENTICATED')

        let queryBuilder = supabase
            .from('clinics')
            .select('*', { count: 'exact' })

        // Apply filters
        if (query.is_active !== undefined) {
            queryBuilder = queryBuilder.eq('is_active', query.is_active)
        } else {
            // Default to active only
            queryBuilder = queryBuilder.eq('is_active', true)
        }

        if (query.plan_type) {
            queryBuilder = queryBuilder.eq('plan_type', query.plan_type)
        }

        if (query.search) {
            queryBuilder = queryBuilder.or(
                `name.ilike.%${query.search}%,email.ilike.%${query.search}%,slug.ilike.%${query.search}%`
            )
        }

        // Apply pagination
        queryBuilder = queryBuilder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1)

        const { data: clinics, count, error } = await queryBuilder

        console.log('[GET /api/clinics] Found clinics:', clinics?.length, 'Total count:', count)

        if (error) throw error

        return paginatedResponse(
            buildPaginatedData(clinics || [], count || 0, page, pageSize)
        )
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem criar clínicas')
        }

        const body = await request.json()
        const validatedData = createClinicSchema.parse(body)

        const supabase = createServiceRoleClient()

        // 1. Check for active clinic with same slug
        const { data: existingSlug } = await supabase
            .from('clinics')
            .select('id, name')
            .eq('slug', validatedData.slug)
            .eq('is_active', true)
            .returns<{ id: string; name: string }[]>()
            .maybeSingle()

        if (existingSlug) {
            return handleApiError(new ConflictError(`O slug "${validatedData.slug}" já está em uso por uma clínica ativa: ${existingSlug.name}`))
        }

        // 2. Check for active clinic with same CNPJ (if provided)
        if (validatedData.cnpj) {
            const { data: existingCnpj } = await supabase
                .from('clinics')
                .select('id, name')
                .eq('cnpj', validatedData.cnpj)
                .eq('is_active', true)
                .returns<{ id: string; name: string }[]>()
                .maybeSingle()

            if (existingCnpj) {
                return handleApiError(new ConflictError(`O CNPJ "${validatedData.cnpj}" já está em uso pela clínica: ${existingCnpj.name}`))
            }
        }

        // 3. Create clinic
        const { data: clinic, error: clinicError } = await (supabase
            .from('clinics')
            .insert({
                name: validatedData.name,
                slug: validatedData.slug,
                email: validatedData.email,
                cnpj: validatedData.cnpj,
                phone: validatedData.phone,
                address: validatedData.address || {},
                plan_type: validatedData.plan_type,
            } as any) as any)
            .select()
            .single()

        if (clinicError) {
            // If we still get a duplicate error (race condition or index violation)
            if (clinicError.code === '23505') {
                return handleApiError(new ConflictError('Já existe uma clínica ativa com este slug ou CNPJ.'))
            }
            throw clinicError
        }

        // If admin credentials provided, create admin user
        if (validatedData.admin_email && validatedData.admin_password && validatedData.admin_name) {
            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: validatedData.admin_email,
                password: validatedData.admin_password,
                email_confirm: true,
                user_metadata: {
                    full_name: validatedData.admin_name,
                    role: 'CLINIC_ADMIN',
                },
            })

            if (authError) {
                console.error('Failed to create admin user:', authError)
            } else {
                // Create user profile
                await (supabase.from('users').insert({
                    id: authData.user.id,
                    email: validatedData.admin_email,
                    full_name: validatedData.admin_name,
                    role: 'CLINIC_ADMIN',
                    clinic_id: (clinic as any).id,
                } as any) as any)
            }
        }

        return successResponse(
            {
                clinic_id: (clinic as any).id,
                slug: (clinic as any).slug,
                message: 'Clínica criada com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}
