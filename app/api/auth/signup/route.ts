/**
 * POST /api/auth/signup
 * Create new user account (internal use)
 */
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { z } from 'zod'

const signupSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    clinic_id: z.string().uuid().optional(),
    role: z.enum(['CLINIC_ADMIN', 'DOCTOR']).default('CLINIC_ADMIN'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, full_name, clinic_id, role } = signupSchema.parse(body)

        // Check authorization from middleware
        const userRole = request.headers.get('x-user-role')

        // Only SUPER_ADMIN or CLINIC_ADMIN can create users
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            throw new ForbiddenError('Apenas administradores podem criar usuários')
        }

        // CLINIC_ADMIN can only create users in their clinic
        if (userRole === 'CLINIC_ADMIN' && !clinic_id) {
            throw new ForbiddenError('ID da clínica é obrigatório')
        }

        const supabase = createServiceRoleClient()

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name,
                role,
            },
        })

        if (authError) {
            throw new Error(authError.message)
        }

        // Create profile in users table
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .insert({
                id: authData.user.id,
                email,
                full_name,
                role,
                clinic_id,
            })
            .select()
            .single()

        if (profileError) {
            // Rollback: delete auth user
            await supabase.auth.admin.deleteUser(authData.user.id)
            throw new Error(profileError.message)
        }

        return successResponse(
            {
                user_id: profile.id,
                email: profile.email,
                role: profile.role,
                message: 'Usuário criado com sucesso',
            },
            { status: 201 }
        )
    } catch (error) {
        return handleApiError(error)
    }
}
