/**
 * DELETE /api/super-admin/clinics/delete?id=xxx
 * Alternative route for deleting clinics (workaround for [id] routing issues)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function DELETE(request: NextRequest) {
    console.log('[DELETE /api/super-admin/clinics/delete] HIT')

    try {
        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get('id')

        console.log('[DELETE /api/super-admin/clinics/delete] clinicId:', clinicId)

        if (!clinicId) {
            return NextResponse.json(
                { error: 'clinic ID is required' },
                { status: 400 }
            )
        }

        // Check SUPER_ADMIN access
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || (userData as { role: string }).role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Super Admin only' },
                { status: 403 }
            )
        }

        // Get clinic name for audit log
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicId)
            .single()

        const clinicData = clinic as { name: string } | null
        if (!clinicData) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404 }
            )
        }

        // Use service role client to delete (bypasses RLS)  
        console.log('[DELETE CLINIC] Checking service role key...')
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[DELETE CLINIC] SUPABASE_SERVICE_ROLE_KEY is missing!')
            return NextResponse.json(
                { error: 'Server configuration error - missing service role key' },
                { status: 500 }
            )
        }

        const serviceSupabase = createServiceRoleClient()
        console.log('[DELETE CLINIC] Service role client created')

        // STEP 1: Get all user IDs from this clinic
        const { data: clinicUsers, error: usersError } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('clinic_id', clinicId)

        if (usersError) {
            console.error('Error fetching clinic users:', usersError)
        }

        // STEP 2: Delete users from auth.users (using Admin API)
        if (clinicUsers && clinicUsers.length > 0) {
            for (const clinicUser of clinicUsers) {
                try {
                    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(
                        clinicUser.id
                    )

                    if (authDeleteError) {
                        console.error(`Failed to delete auth user ${clinicUser.id}:`, authDeleteError)
                    }
                } catch (err) {
                    console.error(`Error deleting auth user ${clinicUser.id}:`, err)
                }
            }
        }

        // STEP 3: Delete clinic (CASCADE will handle related records)
        const { error: deleteError } = await serviceSupabase
            .from('clinics')
            .delete()
            .eq('id', clinicId)

        if (deleteError) {
            console.error('Error deleting clinic:', JSON.stringify(deleteError, null, 2))
            return NextResponse.json(
                {
                    error: 'Failed to delete clinic',
                    details: deleteError.message,
                    code: deleteError.code,
                    hint: deleteError.hint
                },
                { status: 500 }
            )
        }

        // Log deletion in audit_logs
        await serviceSupabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'CLINIC_DELETED',
            resource_type: 'CLINIC',
            resource_id: clinicId,
            metadata: {
                clinic_name: clinicData.name,
                deleted_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinicData.name}" deletada com sucesso`,
        })
    } catch (error) {
        console.error('Error deleting clinic:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'DELETE, OPTIONS',
            'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        },
    })
}
