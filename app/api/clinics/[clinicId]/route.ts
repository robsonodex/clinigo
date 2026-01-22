/**
 * GET /api/clinics/[clinicId] - Get clinic by ID
 * PATCH /api/clinics/[clinicId] - Update clinic
 * DELETE /api/clinics/[clinicId] - Soft delete clinic
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

interface RouteParams {
    params: Promise<{ clinicId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        console.log('[GET /api/clinics/[clinicId]] Debug:', {
            clinicId,
            userId,
            userRole,
            hasUserId: !!userId,
            hasUserRole: !!userRole,
            usingServiceRole: (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN')
        })

        // Require authentication
        if (!userId) {
            console.log('[GET /api/clinics/[clinicId]] Missing userId header')
            return NextResponse.json(
                { success: false, error: { message: 'Não autorizado', code: 'UNAUTHORIZED' } },
                { status: 401 }
            )
        }

        // SUPER_ADMIN and CLINIC_ADMIN use service role to bypass RLS
        const supabase = (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN')
            ? createServiceRoleClient()
            : await createClient()

        console.log('[GET /api/clinics/[clinicId]] Attempting to fetch clinic...', {
            clientType: (userRole === 'SUPER_ADMIN' || userRole === 'CLINIC_ADMIN') ? 'SERVICE_ROLE' : 'USER',
            clinicId
        })

        // Get clinic
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        console.log('[GET /api/clinics/[clinicId]] Result:', {
            found: !!clinic,
            error: error?.message,
            errorCode: error?.code,
            errorDetails: error?.details,
            clinicName: (clinic as any)?.name,
            clinicId: (clinic as any)?.id
        })

        if (error || !clinic) {
            console.error('[GET /api/clinics/[clinicId]] Clinic not found or error:', {
                error,
                clinicId,
                userRole,
                userId
            })
            return NextResponse.json(
                { success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND' } },
                { status: 404 }
            )
        }

        // Check authorization for non-super-admins
        if (userRole !== 'SUPER_ADMIN') {
            // Get user's clinic
            const { data: userProfile } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            // CLINIC_ADMIN can only see their own clinic
            const userClinicId = (userProfile as any)?.clinic_id
            if (userClinicId !== clinicId) {
                console.log('[GET /api/clinics/[clinicId]] Access denied:', { userClinicId, clinicId, userRole })
                return NextResponse.json(
                    { success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } },
                    { status: 403 }
                )
            }

            // Hide sensitive data for non-super-admins
            delete (clinic as any).mercadopago_access_token
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        console.error('[GET /api/clinics/[clinicId]] Error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')

        if (!userId) {
            return NextResponse.json(
                { success: false, error: { message: 'Não autorizado', code: 'UNAUTHORIZED' } },
                { status: 401 }
            )
        }

        const body = await request.json()
        const supabase = (userRole === 'SUPER_ADMIN')
            ? createServiceRoleClient()
            : await createClient()

        // Check authorization for non-super-admins
        if (userRole !== 'SUPER_ADMIN') {
            const { data: user } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', userId)
                .single()

            if ((user as any)?.clinic_id !== clinicId) {
                return NextResponse.json(
                    { success: false, error: { message: 'Acesso negado', code: 'FORBIDDEN' } },
                    { status: 403 }
                )
            }

            // CLINIC_ADMIN cannot change certain fields
            delete body.plan_type
            delete body.plan_limits
            delete body.is_active
            delete body.addons
        }

        const { data: clinic, error } = await (supabase
            .from('clinics') as any)
            .update({ ...body, updated_at: new Date().toISOString() })
            .eq('id', clinicId)
            .select()
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json(
                    { success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND' } },
                    { status: 404 }
                )
            }
            throw error
        }

        return NextResponse.json({ success: true, data: clinic })
    } catch (error) {
        console.error('[PATCH /api/clinics/[clinicId]] Error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { clinicId } = await params
        const userRole = request.headers.get('x-user-role')
        const { searchParams } = new URL(request.url)
        const hardDelete = searchParams.get('hard') === 'true'

        if (userRole !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { success: false, error: { message: 'Apenas super administradores podem excluir clínicas', code: 'FORBIDDEN' } },
                { status: 403 }
            )
        }

        const supabase = createServiceRoleClient()

        // Get clinic info first
        const { data: clinic } = await supabase
            .from('clinics')
            .select('id, name, slug, email')
            .eq('id', clinicId)
            .single()

        if (!clinic) {
            return NextResponse.json(
                { success: false, error: { message: 'Clínica não encontrada', code: 'NOT_FOUND' } },
                { status: 404 }
            )
        }

        if (hardDelete) {
            // Hard delete - cascade delete all related data first
            console.log('[DELETE /api/clinics] Hard deleting clinic:', clinicId)

            // Delete in order to respect foreign keys
            await supabase.from('medical_records').delete().eq('clinic_id', clinicId)
            await supabase.from('payments').delete().eq('clinic_id', clinicId)
            await supabase.from('appointments').delete().eq('clinic_id', clinicId)
            await supabase.from('doctors').delete().eq('clinic_id', clinicId)
            await supabase.from('patients').delete().eq('clinic_id', clinicId)
            await supabase.from('users').delete().eq('clinic_id', clinicId)

            // Finally delete the clinic
            const { error } = await (supabase as any)
                .from('clinics')
                .delete()
                .eq('id', clinicId)

            if (error) {
                console.error('[DELETE /api/clinics] Error:', error)
                throw error
            }

            return NextResponse.json({
                success: true,
                message: 'Clínica excluída permanentemente'
            })
        } else {
            // Soft delete (deactivate)
            const { error } = await (supabase as any)
                .from('clinics')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', clinicId)

            if (error) throw error

            return NextResponse.json({ success: true, message: 'Clínica desativada' }, { status: 200 })
        }
    } catch (error) {
        console.error('[DELETE /api/clinics/[clinicId]] Error:', error)
        return NextResponse.json(
            { success: false, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
            { status: 500 }
        )
    }
}
