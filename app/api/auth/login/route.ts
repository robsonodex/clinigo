/**
 * POST /api/auth/login
 * Login with email and password
 * Clears old session cookies before new login to prevent stale token errors
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { handleApiError } from '@/lib/utils/errors'
import { z } from 'zod'

// Super Admin email whitelist (same as middleware.ts)
const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = loginSchema.parse(body)

        const cookieStore = await cookies()

        // STEP 1: Clear any stale Supabase cookies before login
        const allCookies = cookieStore.getAll()
        for (const cookie of allCookies) {
            if (cookie.name.startsWith('sb-')) {
                cookieStore.delete(cookie.name)
            }
        }

        // Create Supabase client with proper cookie handling
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options)
                        })
                    },
                },
            }
        )

        // STEP 2: Sign out any existing session first (ignore errors)
        await supabase.auth.signOut().catch(() => { })

        // STEP 3: Authenticate user with fresh session
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('[LOGIN] Auth error:', error)
            console.error('[LOGIN] Email attempted:', email)
            console.error('[LOGIN] Error code:', error.code)
            console.error('[LOGIN] Error status:', error.status)
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email ou senha incorretos',
                        code: 'INVALID_CREDENTIALS',
                        debug: {
                            supabaseError: error.message,
                            supabaseCode: error.code
                        }
                    },
                },
                { status: 401 }
            )
        }

        if (!data.user || !data.session) {
            console.error('[LOGIN] No user or session returned')
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Erro ao criar sessão',
                        code: 'NO_SESSION',
                    },
                },
                { status: 500 }
            )
        }

        console.log('[LOGIN] Success for:', data.user.email)

        // Return success - cookies are automatically set by Supabase SSR
        return NextResponse.json({
            success: true,
            data: {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.user_metadata?.role || null,
                    full_name: data.user.user_metadata?.full_name || null,
                },
            },
        })
    } catch (error) {
        console.error('[LOGIN] Unexpected error:', error)
        return handleApiError(error)
    }
}
