import { withAxiom, AxiomRequest } from 'next-axiom'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TasksService, TaskStatus, TrafficLightStatus } from '@/lib/services/tasks-service'

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
        return { error: 'Clínica não encontrada para o usuário', status: 400 }
    }

    return { user, clinicId, userRole }
}

export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const { searchParams } = new URL(request.url)
        const projectId = searchParams.get('project_id') || undefined
        const status = (searchParams.get('status') as TaskStatus) || undefined
        const assignedTo = searchParams.get('assigned_to') || undefined
        const trafficLight = (searchParams.get('traffic_light') as TrafficLightStatus) || undefined
        const viewMode = (searchParams.get('view_mode') as 'my_tasks' | 'all_clinic') || undefined
        const search = searchParams.get('search') || undefined

        const tasks = await TasksService.getTasks({
            clinicId: auth.clinicId,
            userId: auth.user.id,
            userRole: auth.userRole || 'STAFF',
            projectId,
            status,
            assignedTo,
            trafficLight,
            viewMode,
            search,
        })

        return NextResponse.json({ data: tasks })
    } catch (error: any) {
        request.log.error('tasks', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Tasks] Erro ao listar tarefas:', error)
        return NextResponse.json({ error: 'Erro interno ao listar tarefas' }, { status: 500 })
    }
})

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const auth = await getAuthContext(request)
        if ('error' in auth) {
            return NextResponse.json({ error: auth.error }, { status: auth.status })
        }

        const body = await request.json()
        if (!body.title || !body.title.trim()) {
            return NextResponse.json({ error: 'O título da tarefa é obrigatório' }, { status: 400 })
        }

        const task = await TasksService.createTask({
            clinic_id: auth.clinicId,
            project_id: body.project_id || null,
            title: body.title.trim(),
            description: body.description || null,
            priority: body.priority || 'MEDIUM',
            due_date: body.due_date || null,
            due_time: body.due_time || null,
            assigned_to: body.assigned_to || auth.user.id,
            created_by: auth.user.id,
            patient_id: body.patient_id || null,
            recurrence: body.recurrence || 'NONE',
            tags: body.tags || [],
            checklists: body.checklists || [],
        })

        return NextResponse.json({ data: task }, { status: 201 })
    } catch (error: any) {
        request.log.error('tasks', { error: error instanceof Error ? error.message : String(error) })
        console.error('[API Tasks] Erro ao criar tarefa:', error)
        return NextResponse.json({ error: 'Erro interno ao criar tarefa' }, { status: 500 })
    }
})
