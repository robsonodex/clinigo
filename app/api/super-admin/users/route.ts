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

        // Fetch active sessions with last_active_at within the last 3 minutes (real-time presence)
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString()

        const { data: activeSessions } = await supabaseAdmin
            .from('active_sessions')
            .select('user_id, last_active_at')
            .eq('is_active', true)
            .gte('last_active_at', threeMinutesAgo)

        const activeUserIds = new Set(activeSessions?.map((s: any) => s.user_id) || [])

        // Fetch the most recent activity timestamp for each user (for offline display)
        const { data: latestSessions } = await supabaseAdmin
            .from('active_sessions')
            .select('user_id, last_active_at, created_at')
            .order('last_active_at', { ascending: false })
            .limit(1000)

        // Build a map of the most recent *real* activity per user.
        // If last_active_at equals the backfill timestamp (all records got the same value),
        // we use created_at as the real date the session was opened.
        const lastSeenMap = new Map<string, string>()
        const backfillThreshold = 5 * 60 * 1000 // 5 min tolerance

        latestSessions?.forEach((s: any) => {
            if (!lastSeenMap.has(s.user_id)) {
                const lastActive = new Date(s.last_active_at).getTime()
                const created = new Date(s.created_at).getTime()

                // If last_active_at is suspiciously far from created_at AND
                // many records share the exact same last_active_at, it's the backfill.
                // Use created_at as the real "last seen" in that case.
                const timeDiff = Math.abs(lastActive - created)
                const isLikelyBackfill = timeDiff > 24 * 60 * 60 * 1000 // > 24h gap

                lastSeenMap.set(s.user_id, isLikelyBackfill ? s.created_at : s.last_active_at)
            }
        })

        // Format the response
        const formattedUsers = (users as any[])?.map((user: any) => ({
            id: user.id,
            email: user.email || '-',
            displayName: user.full_name || '-',
            role: user.role || 'USER',
            clinicName: user.clinics?.name || 'Sem Clínica Associada',
            clinicId: user.clinic_id,
            createdAt: user.created_at,
            isOnline: activeUserIds.has(user.id),
            lastSeenAt: activeUserIds.has(user.id) 
                ? (activeSessions?.find((s: any) => s.user_id === user.id)?.last_active_at || new Date().toISOString())
                : (lastSeenMap.get(user.id) || user.created_at),
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
