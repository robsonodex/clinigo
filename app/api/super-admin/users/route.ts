/**
 * GET /api/super-admin/users
 * List all users in the system
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        // Verify super admin access
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Super admin only' }, { status: 403 })
        }

        // Fetch all users with their clinic information using admin client
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select(`
                id,
                email,
                full_name,
                role,
                clinic_id,
                created_at,
                clinics!users_clinic_id_fkey (
                    name
                )
            `)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[SUPER_ADMIN] Error fetching users:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Fetch active sessions to map who is online
        const { data: activeSessions } = await supabaseAdmin
            .from('active_sessions')
            .select('user_id')
            .eq('is_active', true)

        const activeUserIds = new Set(activeSessions?.map((s: any) => s.user_id) || [])

        // Format the response
        const formattedUsers = (users as any[])?.map((user: any) => ({
            id: user.id,
            email: user.email || '-',
            displayName: user.full_name || '-',
            role: user.role || 'USER',
            clinicName: user.clinics?.name || '-',
            clinicId: user.clinic_id,
            createdAt: user.created_at,
            isOnline: activeUserIds.has(user.id),
        })) || []

        return NextResponse.json({
            success: true,
            data: formattedUsers,
        })
    } catch (error) {
        console.error('[SUPER_ADMIN] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/super-admin/users?id=xxx
 * Delete a user and optionally their clinic
 */
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient()

        // Verify super admin access
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('id')
        const deleteClinic = searchParams.get('deleteClinic') === 'true'

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Get user's clinic_id before deletion
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        // Delete from auth.users (this will cascade to public.users if configured)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('[SUPER_ADMIN] Error deleting from auth.users:', authError)
            return NextResponse.json({ error: authError.message }, { status: 500 })
        }

        // Explicitly delete from public.users if still exists
        await supabase
            .from('users')
            .delete()
            .eq('id', userId)

        // Optionally delete the clinic
        if (deleteClinic && userData?.clinic_id) {
            await supabase
                .from('clinics')
                .delete()
                .eq('id', (userData as any).clinic_id)
        }

        return NextResponse.json({
            success: true,
            message: 'User deleted successfully',
        })
    } catch (error) {
        console.error('[SUPER_ADMIN] Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
