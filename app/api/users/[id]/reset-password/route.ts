import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * POST /api/users/[id]/reset-password
 * Permite que um CLINIC_ADMIN ou SUPER_ADMIN force a redefinição de senha
 * de um usuário da mesma clínica.
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: targetUserId } = await context.params
        const body = await request.json()
        const { password } = body

        if (!password || typeof password !== 'string' || password.length < 6) {
            return NextResponse.json(
                { error: 'A senha deve ter no mínimo 6 caracteres' },
                { status: 400 }
            )
        }

        // Validate caller role
        const userRole = request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json(
                { error: 'Acesso negado. Apenas administradores podem redefinir senhas.' },
                { status: 403 }
            )
        }

        // Verify caller is authenticated
        const supabase = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminClient = createServiceRoleClient()

        // Clinic isolation: ensure both users belong to the same clinic
        if (userRole === 'CLINIC_ADMIN') {
            const { data: callerProfile } = await adminClient
                .from('users')
                .select('clinic_id')
                .eq('id', currentUser.id)
                .single()

            const { data: targetProfile } = await adminClient
                .from('users')
                .select('clinic_id')
                .eq('id', targetUserId)
                .single()

            if (!callerProfile || !targetProfile) {
                return NextResponse.json(
                    { error: 'Usuário não encontrado' },
                    { status: 404 }
                )
            }

            if (callerProfile.clinic_id !== targetProfile.clinic_id) {
                return NextResponse.json(
                    { error: 'Usuário não pertence à sua clínica' },
                    { status: 403 }
                )
            }
        }

        // Force password update via Supabase Admin Auth
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
            targetUserId,
            { password }
        )

        if (updateError) {
            console.error('[reset-password] Supabase auth error:', updateError)
            return NextResponse.json(
                { error: updateError.message || 'Erro ao redefinir senha' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[reset-password] Unexpected error:', error)
        return NextResponse.json(
            { error: error.message || 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
