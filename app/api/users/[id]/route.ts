import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json()
        const { name, role } = body

        const supabaseClient = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminClient = createServiceRoleClient() as any
        const { data: reqUser } = await adminClient.from('users').select('clinic_id, role').eq('id', currentUser.id).single()
        if (!reqUser) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = reqUser.role || request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Check clinic match if not super admin
        if (userRole === 'CLINIC_ADMIN') {
            const { data: targetUser } = await adminClient.from('users').select('clinic_id').eq('id', id).single()

            if (!targetUser || reqUser.clinic_id !== targetUser.clinic_id) {
                return NextResponse.json({ error: 'Usuário não pertence à sua clínica' }, { status: 403 })
            }
        }

        const { error: updateError } = await adminClient
            .from('users')
            .update({ full_name: name, role })
            .eq('id', id)

        if (updateError) throw updateError

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Erro ao atualizar usuário' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params

        const supabaseClient = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        if (currentUser.id === id) {
            return NextResponse.json({ error: 'Você não pode excluir sua própria conta' }, { status: 400 })
        }

        const adminClient = createServiceRoleClient() as any
        const { data: reqUser } = await adminClient.from('users').select('clinic_id, role').eq('id', currentUser.id).single()
        if (!reqUser) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 })
        }

        const userRole = reqUser.role || request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        // Check clinic match if not super admin
        if (userRole === 'CLINIC_ADMIN') {
            const { data: targetUser } = await adminClient.from('users').select('clinic_id').eq('id', id).single()

            if (!targetUser) {
                return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
            }

            if (reqUser.clinic_id !== targetUser.clinic_id) {
                return NextResponse.json({ error: 'Usuário não pertence à sua clínica' }, { status: 403 })
            }
        }

        const { permanentlyDeleteUser } = await import('@/lib/services/user-cleanup')
        const result = await permanentlyDeleteUser(adminClient, id)

        if (!result.success) {
            return NextResponse.json({ error: result.error || 'Erro ao excluir usuário em definitivo' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Usuário excluído em definitivo com sucesso' })
    } catch (error: any) {
        console.error('[DELETE /api/users/[id]] Erro:', error)
        return NextResponse.json({ error: error.message || 'Erro interno ao excluir usuário' }, { status: 500 })
    }
}
