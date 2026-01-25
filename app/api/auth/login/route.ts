/**
 * POST /api/auth/login
 * Login with email and password
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const loginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = loginSchema.parse(body)

        const supabase = await createClient() as any

        // Authenticate user ONLY - no profile fetch to avoid timeout
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('[LOGIN] Auth error:', error)
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Email ou senha incorretos',
                        code: 'INVALID_CREDENTIALS',
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

        // Return minimal user data - frontend will fetch full profile separately
        return successResponse({
            user: {
                id: data.user.id,
                email: data.user.email,
                role: data.user.user_metadata?.role || null,
                full_name: data.user.user_metadata?.full_name || null,
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        })
    } catch (error) {
        console.error('[LOGIN] Unexpected error:', error)
        return handleApiError(error)
    }
}

