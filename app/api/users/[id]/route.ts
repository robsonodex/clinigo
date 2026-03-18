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

        const userRole = request.headers.get('x-user-role')
        if (userRole !== 'SUPER_ADMIN' && userRole !== 'CLINIC_ADMIN') {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
        }

        const supabaseClient = await createClient()
        const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser()

        if (!currentUser || authError) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const adminClient = createServiceRoleClient() as any

        // Check clinic match if not super admin
        if (userRole === 'CLINIC_ADMIN') {
            const { data: reqUser } = await adminClient.from('users').select('clinic_id').eq('id', currentUser.id).single()
            const { data: targetUser } = await adminClient.from('users').select('clinic_id').eq('id', id).single()

            if (!reqUser || !targetUser || reqUser.clinic_id !== targetUser.clinic_id) {
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
