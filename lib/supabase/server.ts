/**
 * Supabase Server Client
 * Use this client in Server Components, Server Actions, and Route Handlers
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { getVerifiedUser, verifySupabaseToken } from '@/lib/auth/verify-token'

/**
 * Creates a Supabase client for server-side operations
 * Uses cookies for session management
 */
export async function createClient(options?: { sensitive?: boolean }) {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dlxakeejmyzhzdxzjgne.supabase.co'
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRseGFrZWVqbXl6aHpkeHpqZ25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDA1NzIsImV4cCI6MjA4MjYxNjU3Mn0.Y6qi1c9jNMe3_cNof8pAxDHKhpVZgbcXCq5tTMDZ-ac'

    const client = createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
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

    const originalGetUser = client.auth.getUser.bind(client.auth)
    ;(client.auth as any).getStrictUser = async () => originalGetUser()

    // Identifica rotas sensíveis que escrevem dados clínicos, financeiros ou de segurança
    let isSensitiveRoute = options?.sensitive === true
    if (!isSensitiveRoute) {
        try {
            const headerStore = await headers()
            const pathname = (headerStore.get('x-pathname') || '').toLowerCase()
            const method = (headerStore.get('x-method') || '').toUpperCase()
            const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

            const isSensitivePath =
                pathname.includes('/prontuario') ||
                pathname.includes('/prescri') ||
                pathname.includes('/evolucao') ||
                pathname.includes('/clinical') ||
                pathname.includes('/patient') ||
                pathname.includes('/paciente') ||
                pathname.includes('/financial') ||
                pathname.includes('/faturamento') ||
                pathname.includes('/billing') ||
                pathname.includes('/tiss') ||
                pathname.includes('/auth') ||
                pathname.includes('/security') ||
                pathname.includes('/super-admin')

            if (isWrite && isSensitivePath) {
                isSensitiveRoute = true
            }
        } catch {
            // Em contextos sem headers HTTP disponíveis, segue o padrão
        }
    }

    // Função resiliente para resolução de usuário com captura de concorrência em rotação de refresh token
    const safeGetUser = async (jwt?: string) => {
        // Se getUser(jwt) vier com token explícito, delega ao original com proteção
        if (jwt) {
            try {
                return await originalGetUser(jwt)
            } catch (err: any) {
                if (err?.code === 'refresh_token_already_used' || err?.message?.includes('Already Used')) {
                    const local = await verifySupabaseToken(cookieStore)
                    if (local.user) {
                        return { data: { user: local.user as any }, error: null }
                    }
                }
                throw err
            }
        }

        // 1. Tenta verificação criptográfica local jose (zero chamadas de rede)
        try {
            const local = await verifySupabaseToken(cookieStore)
            if (local.user && !local.needsRefresh) {
                return { data: { user: local.user as any }, error: null }
            }
        } catch {
            // Em caso de falha de validação local, segue para o original
        }

        // 2. Chama originalGetUser com proteção contra colisão de refresh token já consumido
        try {
            const res = await originalGetUser()
            if (res.error && ((res.error as any).code === 'refresh_token_already_used' || res.error.message?.includes('Already Used'))) {
                const local = await verifySupabaseToken(cookieStore)
                if (local.user) {
                    return { data: { user: local.user as any }, error: null }
                }
            }
            return res
        } catch (err: any) {
            if (err?.code === 'refresh_token_already_used' || err?.message?.includes('Already Used')) {
                const local = await verifySupabaseToken(cookieStore)
                if (local.user) {
                    return { data: { user: local.user as any }, error: null }
                }
            }
            return { data: { user: null }, error: err }
        }
    }

    client.auth.getUser = safeGetUser

    return client
}

/**
 * Creates a Supabase admin client with service role key
 * CAUTION: This bypasses RLS - use only for admin operations and webhooks
 */
export function createServiceRoleClient() {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    return createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey,
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
 * Uses cryptographic local verification first, falling back to network refresh only when required.
 */
export async function getCurrentUser() {
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { user } = await getVerifiedUser(supabase, cookieStore)

    return user
}

/**
 * Get the current user with their profile data
 */
export async function getCurrentUserWithProfile() {
    const cookieStore = await cookies()
    const supabase = await createClient()
    const { user } = await getVerifiedUser(supabase, cookieStore)

    if (!user) {
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

