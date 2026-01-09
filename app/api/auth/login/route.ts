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

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
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

        // Get user profile
        const { data: profile } = await supabase
            .from('users')
            .select('*, clinic:clinics(id, name, slug)')
            .eq('id', data.user.id)
            .single()

        return successResponse({
            user: {
                id: data.user.id,
                email: data.user.email,
                role: profile?.role,
                full_name: profile?.full_name,
                clinic: profile?.clinic,
            },
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        })
    } catch (error) {
        return handleApiError(error)
    }
}

