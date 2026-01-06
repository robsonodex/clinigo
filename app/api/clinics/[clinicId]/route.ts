/**
 * GET /api/clinics/[clinicId] - Get clinic by ID
 * PATCH /api/clinics/[clinicId] - Update clinic
 * DELETE /api/clinics/[clinicId] - Soft delete clinic
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, NotFoundError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse, noContentResponse } from '@/lib/utils/responses'
import { updateClinicSchema } from '@/lib/validations/clinic'

interface RouteParams {
    params: Promise<{ clinicId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const supabase = await createClient()

        // Get clinic
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        if (error || !clinic) {
            throw new NotFoundError('Clínica')
        }

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            // Get user's clinic
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (user?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado a esta clínica')
            }

            // Hide sensitive data for non-super-admins
            delete clinic.mercadopago_access_token
        }

        return successResponse(clinic)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        const body = await request.json()
        const validatedData = updateClinicSchema.parse(body)

        const supabase = await createClient()

        // Check authorization
        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if (user?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado a esta clínica')
            }

            // CLINIC_ADMIN cannot change certain fields
            delete validatedData.plan_type
            delete validatedData.plan_limits
            delete validatedData.is_active
            delete validatedData.addons
        }

        const { data: clinic, error } = await supabase
            .from('clinics')
            .update(validatedData)
            .eq('id', clinicId)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError('Clínica')
            }
            throw error
        }

        return successResponse(clinic)
    } catch (error) {
        return handleApiError(error)
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userRole = request.headers.get('x-user-role')

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem excluir clínicas')
        }

        const supabase = await createClient()

        // Soft delete - just deactivate
        const { error } = await supabase
            .from('clinics')
            .update({ is_active: false })
            .eq('id', clinicId)

        if (error) throw error

        return noContentResponse()
    } catch (error) {
        return handleApiError(error)
    }
}
