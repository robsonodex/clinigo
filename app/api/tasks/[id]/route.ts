import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TasksService } from '@/lib/services/tasks-service'

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 }
    }

    const headerClinicId = request.headers.get('x-clinic-id')
    let clinicId = headerClinicId

    if (!clinicId) {
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        clinicId = (userData as any)?.clinic_id
    }

    if (!clinicId) {
        return { error: 'Clínica não encontrada', status: 400 }
    }

    return { user, clinicId }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const body = await request.json()
        const updated = await TasksService.updateTask(auth.clinicId, id, body)

        if (!updated) {
            return NextResponse.json({ error: 'Tarefa não encontrada ou não atualizada' }, { status: 404 })
        }

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        console.error('[API Tasks [id]] Erro ao atualizar tarefa:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar tarefa' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const success = await TasksService.deleteTask(auth.clinicId, id)
        if (!success) {
            return NextResponse.json({ error: 'Tarefa não encontrada para exclusão' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'Tarefa excluída com sucesso' })
    } catch (error: any) {
        console.error('[API Tasks [id]] Erro ao excluir tarefa:', error)
        return NextResponse.json({ error: 'Erro interno ao excluir tarefa' }, { status: 500 })
    }
}

