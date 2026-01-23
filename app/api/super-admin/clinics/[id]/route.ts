/**
 * DELETE /api/super-admin/clinics/[id]
 * Delete a clinic (SUPER_ADMIN only)
 * WARNING: This will cascade delete all related data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params

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

        if (!userData || userData?.role !== 'SUPER_ADMIN') {
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

        if (!clinic) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404 }
            )
        }

        // Use service role client to delete (bypasses RLS)
        const serviceSupabase = createServiceRoleClient()

        // Delete clinic (CASCADE will handle related records)
        const { error: deleteError } = await serviceSupabase
            .from('clinics')
            .delete()
            .eq('id', clinicId)

        if (deleteError) {
            console.error('Error deleting clinic:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete clinic' },
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
                clinic_name: clinic.name,
                deleted_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinic.name}" deletada com sucesso`,
        })
    } catch (error) {
        console.error('Error deleting clinic:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
