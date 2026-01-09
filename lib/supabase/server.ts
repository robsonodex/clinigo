/**
 * Supabase Server Client
 * Use this client in Server Components, Server Actions, and Route Handlers
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Creates a Supabase client for server-side operations
 * Uses cookies for session management
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing sessions.
                    }
                },
            },
        }
    )
}

/**
 * Creates a Supabase admin client with service role key
 * CAUTION: This bypasses RLS - use only for admin operations and webhooks
 */
export function createServiceRoleClient() {
    return createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
}

/**
 * Get the current user from server-side
 */
export async function getCurrentUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    return user
}

/**
 * Get the current user with their profile data
 */
export async function getCurrentUserWithProfile() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return null
    }

    const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*, clinic:clinics(*)')
        .eq('id', user.id)
        .single()

    if (profileError) {
        return null
    }

    return { ...user, profile }
}

