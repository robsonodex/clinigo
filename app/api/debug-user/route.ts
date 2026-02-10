/**
 * GET /api/debug-user - Diagnóstico de usuário (TEMPORÁRIO)
 * Retorna informações sobre o usuário logado para debug
 */
import { type NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient as createSupabaseMiddlewareClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // 1. Get authenticated user from middleware headers
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const userClinicId = request.headers.get('x-clinic-id')
        const userPlan = request.headers.get('x-plan-type')

        // 2. Use service role to bypass RLS and check what's in the DB
        const serviceClient = createServiceRoleClient()

        // 3. Check auth.users
        let authUser = null
        if (userId) {
            const { data, error } = await serviceClient.auth.admin.getUserById(userId)
            authUser = data?.user ? {
                id: data.user.id,
                email: data.user.email,
                created_at: data.user.created_at,
                email_confirmed: data.user.email_confirmed_at,
            } : { error: error?.message || 'Not found' }
        }

        // 4. Check public.users profile
        let userProfile = null
        if (userId) {
            const { data, error } = await (serviceClient as any)
                .from('users')
                .select('id, email, full_name, role, clinic_id, created_at')
                .eq('id', userId)
                .maybeSingle()
            userProfile = data || { error: error?.message || 'NOT FOUND - Profile missing!' }
        }

        // 5. Check clinic if profile has clinic_id
        let clinicData = null
        const clinicId = userProfile?.clinic_id || userClinicId
        if (clinicId) {
            const { data, error } = await (serviceClient as any)
                .from('clinics')
                .select('id, name, slug, plan_type, is_active, payment_confirmed, is_demo, created_at')
                .eq('id', clinicId)
                .maybeSingle()
            clinicData = data || { error: error?.message || 'NOT FOUND - Clinic missing!' }
        }

        // 6. Check RLS policies on users table
        const { data: policiesData } = await serviceClient.rpc('exec_sql' as any, {
            sql: `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'`
        }).catch(() => ({ data: null }))

        // 7. Check if RLS is enabled
        const { data: rlsData } = await serviceClient.rpc('exec_sql' as any, {
            sql: `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('users', 'clinics') AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
        }).catch(() => ({ data: null }))

        // 8. List ALL users in the system (service role bypasses RLS)
        const { data: allUsers } = await (serviceClient as any)
            .from('users')
            .select('id, email, full_name, role, clinic_id')
            .order('created_at', { ascending: false })
            .limit(20)

        return NextResponse.json({
            timestamp: new Date().toISOString(),
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
            rls_info: {
                policies: policiesData,
                rls_enabled: rlsData,
            },
            diagnosis: !userProfile?.id
                ? '❌ PROFILE MISSING: User exists in auth but NOT in public.users table'
                : !userProfile?.clinic_id
                    ? '❌ NO CLINIC LINKED: Profile exists but clinic_id is null'
                    : !clinicData?.id
                        ? '❌ CLINIC NOT FOUND: clinic_id exists but clinic record missing'
                        : '✅ All data found - issue may be RLS or client-side'
        })
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 5),
        }, { status: 500 })
    }
}
