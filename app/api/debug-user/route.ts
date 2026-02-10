/**
 * GET /api/debug-user - Diagnóstico de usuário (TEMPORÁRIO)
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')
        const userPlan = request.headers.get('x-plan-type')

        const serviceClient = createServiceRoleClient()

        // Check auth.users
        let authUser = null
        if (userId) {
            const { data, error } = await serviceClient.auth.admin.getUserById(userId)
            authUser = data?.user ? {
                id: data.user.id,
                email: data.user.email,
                created_at: data.user.created_at,
            } : { error: error?.message || 'Not found' }
        }

        // Check public.users profile
        let userProfile = null
        if (userId) {
            const { data, error } = await (serviceClient as any)
                .from('users')
                .select('id, email, full_name, role, clinic_id, created_at')
                .eq('id', userId)
                .maybeSingle()
            userProfile = data || { error: error?.message || 'NOT FOUND' }
        }

        // Check clinic
        let clinicData = null
        const clinicId = userProfile?.clinic_id || userClinicId
        if (clinicId) {
            const { data, error } = await (serviceClient as any)
                .from('clinics')
                .select('id, name, slug, plan_type, is_active, payment_confirmed, created_at')
                .eq('id', clinicId)
                .maybeSingle()
            clinicData = data || { error: error?.message || 'NOT FOUND' }
        }

        // List ALL users
        const { data: allUsers } = await (serviceClient as any)
            .from('users')
            .select('id, email, full_name, role, clinic_id')
            .order('created_at', { ascending: false })
            .limit(20)

        return NextResponse.json({
            middleware_headers: {
                'x-user-id': userId,
                'x-user-role': userRole,
                'x-clinic-id': userClinicId,
                'x-plan-type': userPlan,
            },
            auth_user: authUser,
            user_profile: userProfile,
            clinic: clinicData,
            all_users_in_db: allUsers,
            diagnosis: !userId
                ? '❌ NOT AUTHENTICATED - middleware did not set x-user-id'
                : !userProfile?.id
                    ? '❌ PROFILE MISSING - user exists in auth but NOT in public.users'
                    : !userProfile?.clinic_id
                        ? '❌ NO CLINIC LINKED - profile exists but clinic_id is null'
                        : !clinicData?.id
                            ? '❌ CLINIC NOT FOUND'
                            : '✅ All data found'
        })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
