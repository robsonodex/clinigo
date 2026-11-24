import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TasksService } from '@/lib/services/tasks-service'
import { sanitizeNullableUuid } from '@/lib/tasks/task-helpers'

const MANAGER_ROLES = new Set(['CLINIC_ADMIN', 'SUPER_ADMIN', 'COORDINATOR'])

async function getAuthContext(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return { error: 'Não autorizado', status: 401 }
    }

    const headerClinicId = request.headers.get('x-clinic-id')
    const headerUserRole = request.headers.get('x-user-role')
    let clinicId = headerClinicId
    let userRole = headerUserRole

    if (!clinicId || !userRole) {
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        clinicId = (userData as any)?.clinic_id
        userRole = (userData as any)?.role
    }

    if (!clinicId) {
        return { error: 'Clínica não encontrada', status: 400 }
    }

    return { user, clinicId, userRole: String(userRole || 'STAFF').toUpperCase() }
}

export const PATCH = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await context.params
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        // Valida permissão de edição: gestores editam qualquer tarefa da clínica; demais apenas atribuídas/criadas por si
        if (!MANAGER_ROLES.has(auth.userRole)) {
            const ownTasks = await TasksService.getTasks({
                clinicId: auth.clinicId,
                userId: auth.user.id,
                userRole: auth.userRole,
                viewMode: 'my_tasks',
            })
            if (!ownTasks.some((t) => t.id === id)) {
                return NextResponse.json({ error: 'Sem permissão para editar esta tarefa' }, { status: 403 })
            }
        }

        const body = await request.json()
        const payload = {
            ...body,
            ...(body.project_id !== undefined ? { project_id: sanitizeNullableUuid(body.project_id) } : {}),
            ...(body.patient_id !== undefined ? { patient_id: sanitizeNullableUuid(body.patient_id) } : {}),
            ...(body.assigned_to !== undefined ? { assigned_to: sanitizeNullableUuid(body.assigned_to) } : {}),
        }
        const updated = await TasksService.updateTask(auth.clinicId, id, payload)

        if (!updated) {
            return NextResponse.json({ error: 'Tarefa não encontrada ou não atualizada' }, { status: 404 })
        }

        return NextResponse.json({ data: updated })
    } catch (error: any) {
        request.log.error('tasks/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Tasks [id]] Erro ao atualizar tarefa:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar tarefa' }, { status: 500 })
    }
})

export const DELETE = withAxiom(async (request: AxiomRequest, context: { params: Promise<{ id: string }> }) => {
    try {
        const { id } = await context.params
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        if (!MANAGER_ROLES.has(auth.userRole)) {
            const ownTasks = await TasksService.getTasks({
                clinicId: auth.clinicId,
                userId: auth.user.id,
                userRole: auth.userRole,
                viewMode: 'my_tasks',
            })
            if (!ownTasks.some((t) => t.id === id)) {
                return NextResponse.json({ error: 'Sem permissão para excluir esta tarefa' }, { status: 403 })
            }
        }

        const success = await TasksService.deleteTask(auth.clinicId, id)
        if (!success) {
            return NextResponse.json({ error: 'Tarefa não encontrada para exclusão' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'Tarefa excluída com sucesso' })
    } catch (error: any) {
        request.log.error('tasks/[id]', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Tasks [id]] Erro ao excluir tarefa:', error)
        return NextResponse.json({ error: 'Erro interno ao excluir tarefa' }, { status: 500 })
    }
})

