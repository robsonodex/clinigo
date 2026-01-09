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

            if ((user as any)?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado a esta clínica')
            }

            // Hide sensitive data for non-super-admins
            delete (clinic as any).mercadopago_access_token
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

            if ((user as any)?.clinic_id !== clinicId) {
                throw new ForbiddenError('Acesso negado a esta clínica')
            }

            // CLINIC_ADMIN cannot change certain fields
            delete validatedData.plan_type
            delete validatedData.plan_limits
            delete validatedData.is_active
            delete validatedData.addons
        }

        const { data: clinic, error } = await (supabase
            .from('clinics') as any)
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
        const { searchParams } = new URL(request.url)
        const hardDelete = searchParams.get('hard') === 'true'

        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Apenas super administradores podem excluir clínicas')
        }

        const supabase = await createClient()

        // Get clinic info first for audit log
        const { data: clinicData } = await supabase
            .from('clinics')
            .select('id, name, slug, email')
            .eq('id', clinicId)
            .single()

        const clinic = clinicData as { id: string; name: string; slug: string; email: string } | null

        if (!clinic) {
            throw new NotFoundError('Clínica')
        }

        if (hardDelete) {
            // ============================================
            // HARD DELETE: Remove clinic and all associated data
            // ============================================

            // 1. Get all users associated with this clinic
            const { data: clinicUsers } = await (supabase as any)
                .from('users')
                .select('id, email, full_name')
                .eq('clinic_id', clinicId)

            const userCount = clinicUsers?.length || 0
            const userEmails = clinicUsers?.map((u: any) => u.email) || []

            console.log(`[DELETE /api/clinics/${clinicId}] Hard delete: ${userCount} users to remove`)

            // 2. Use service role to delete users from auth.users
            // NOTE: The database trigger will also attempt this, but we do it here
            // for better error handling and rollback capability
            const { createServiceRoleClient } = await import('@/lib/supabase/server')
            const supabaseAdmin = createServiceRoleClient()

            const deletedAuthUsers: string[] = []
            const failedAuthUsers: string[] = []

            for (const user of (clinicUsers || [])) {
                try {
                    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
                    if (authDeleteError) {
                        console.error(`Failed to delete auth user ${user.id}:`, authDeleteError)
                        failedAuthUsers.push(user.email)
                    } else {
                        deletedAuthUsers.push(user.email)
                        console.log(`Deleted auth user: ${user.email}`)
                    }
                } catch (err) {
                    console.error(`Error deleting auth user ${user.id}:`, err)
                    failedAuthUsers.push(user.email)
                }
            }

            // 3. Delete users from public.users table
            const { error: usersDeleteError } = await (supabaseAdmin as any)
                .from('users')
                .delete()
                .eq('clinic_id', clinicId)

            if (usersDeleteError) {
                console.error('Failed to delete users from public.users:', usersDeleteError)
                // Continue anyway - auth users are already deleted
            }

            // 4. Delete the clinic itself
            const { error: clinicDeleteError } = await (supabaseAdmin as any)
                .from('clinics')
                .delete()
                .eq('id', clinicId)

            if (clinicDeleteError) {
                console.error('Failed to delete clinic:', clinicDeleteError)
                throw new Error(`Falha ao excluir clínica: ${clinicDeleteError.message}`)
            }

            // 5. Create audit log
            try {
                const { createAuditLog } = await import('@/lib/services/audit')
                await createAuditLog({
                    action: `Clínica [${clinicId}] e usuários vinculados foram excluídos permanentemente`,
                    entityType: 'clinics',
                    entityId: clinicId,
                    severity: 'CRITICAL',
                    metadata: {
                        clinic_name: clinic.name,
                        clinic_slug: clinic.slug,
                        clinic_email: clinic.email,
                        users_deleted: deletedAuthUsers.length,
                        users_failed: failedAuthUsers.length,
                        deleted_user_emails: deletedAuthUsers,
                        failed_user_emails: failedAuthUsers,
                        deleted_at: new Date().toISOString(),
                    }
                })
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError)
                // Don't throw - deletion was successful
            }

            console.log(`[DELETE /api/clinics/${clinicId}] Hard delete complete: ${deletedAuthUsers.length} users deleted`)

            return NextResponse.json({
                success: true,
                message: 'Clínica e usuários excluídos permanentemente',
                details: {
                    clinic_id: clinicId,
                    clinic_name: clinic.name,
                    users_deleted: deletedAuthUsers.length,
                    users_failed: failedAuthUsers.length,
                }
            })

        } else {
            // ============================================
            // SOFT DELETE: Just deactivate
            // ============================================
            const { error } = await (supabase as any)
                .from('clinics')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('id', clinicId)

            if (error) throw error

            // Create audit log for soft delete
            try {
                const { createAuditLog } = await import('@/lib/services/audit')
                await createAuditLog({
                    action: `Clínica [${clinicId}] desativada`,
                    entityType: 'clinics',
                    entityId: clinicId,
                    severity: 'WARNING',
                    metadata: {
                        clinic_name: clinic.name,
                        clinic_slug: clinic.slug,
                    }
                })
            } catch (auditError) {
                console.error('Failed to create audit log:', auditError)
            }

            return noContentResponse()
        }
    } catch (error) {
        return handleApiError(error)
    }
}

