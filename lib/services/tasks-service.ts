import { createServiceRoleClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TrafficLightStatus = 'RED' | 'AMBER' | 'GREEN' | 'COMPLETED' | 'NONE'

export interface TaskProject {
    id: string
    clinic_id: string
    name: string
    description?: string | null
    color: string
    is_archived: boolean
    created_by?: string | null
    created_at: string
    updated_at: string
    total_tasks?: number
    overdue_tasks?: number
}

export interface TaskChecklistItem {
    id: string
    task_id: string
    title: string
    is_completed: boolean
    position: number
    created_at: string
}

export interface ClinicTask {
    id: string
    clinic_id: string
    project_id?: string | null
    title: string
    description?: string | null
    status: TaskStatus
    priority: TaskPriority
    due_date?: string | null
    due_time?: string | null
    assigned_to?: string | null
    created_by?: string | null
    patient_id?: string | null
    recurrence?: string
    completed_at?: string | null
    position: number
    tags: string[]
    created_at: string
    updated_at: string
    project?: TaskProject | null
    assigned_user?: { id: string; full_name: string; email: string; role: string; avatar_url?: string | null } | null
    creator_user?: { id: string; full_name: string } | null
    patient?: { id: string; full_name: string } | null
    checklists: TaskChecklistItem[]
    traffic_light: {
        status: TrafficLightStatus
        label: string
        days_diff: number
    }
}

export function calculateTrafficLight(dueDate?: string | null, status: TaskStatus = 'TODO'): { status: TrafficLightStatus; label: string; days_diff: number } {
    if (status === 'DONE') {
        return { status: 'COMPLETED', label: 'Concluído', days_diff: 0 }
    }
    if (!dueDate) {
        return { status: 'NONE', label: 'Sem prazo', days_diff: 0 }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const parts = dueDate.split('-').map(Number)
    if (parts.length < 3) {
        return { status: 'NONE', label: 'Sem prazo', days_diff: 0 }
    }
    const target = new Date(parts[0], parts[1] - 1, parts[2])
    target.setHours(0, 0, 0, 0)

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays)
        return {
            status: 'RED',
            label: `${daysOverdue}d em atraso`,
            days_diff: diffDays,
        }
    }
    if (diffDays === 0) {
        return { status: 'AMBER', label: 'Vence hoje', days_diff: 0 }
    }
    if (diffDays <= 2) {
        return { status: 'AMBER', label: `Vence em ${diffDays}d`, days_diff: diffDays }
    }
    return { status: 'GREEN', label: `No prazo (${diffDays}d)`, days_diff: diffDays }
}

// Store persistente baseado em clinics.addons no Supabase (resiliente ao ambiente Serverless da Vercel)
interface ClinicTasksData {
    projects: TaskProject[]
    tasks: ClinicTask[]
    updated_at?: string
}

async function getClinicTasksStore(clinicId: string): Promise<ClinicTasksData> {
    const supabase = createServiceRoleClient()
    try {
        const { data: clinic, error } = await supabase
            .from('clinics')
            .select('addons')
            .eq('id', clinicId)
            .single()

        if (!error && clinic?.addons) {
            const tasksData = (clinic.addons as any)?.tasks_data
            if (tasksData && (Array.isArray(tasksData.projects) || Array.isArray(tasksData.tasks))) {
                return {
                    projects: Array.isArray(tasksData.projects) && tasksData.projects.length > 0
                        ? tasksData.projects
                        : DEFAULT_CLINIC_PROJECTS.map((p, idx) => ({
                            id: `proj-${idx + 1}-${clinicId.slice(0, 6)}`,
                            clinic_id: clinicId,
                            name: p.name,
                            color: p.color,
                            description: p.description,
                            is_archived: false,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })),
                    tasks: Array.isArray(tasksData.tasks) ? tasksData.tasks : [],
                    updated_at: tasksData.updated_at,
                }
            }
        }
    } catch (err) {
        console.error('[TasksService] Erro ao obter tasks_data de clinics.addons:', err)
    }

    // Inicialização na primeira utilização da clínica
    const now = new Date().toISOString()
    const initialProjects: TaskProject[] = DEFAULT_CLINIC_PROJECTS.map((p, idx) => ({
        id: `proj-${idx + 1}-${clinicId.slice(0, 6)}`,
        clinic_id: clinicId,
        name: p.name,
        color: p.color,
        description: p.description,
        is_archived: false,
        created_at: now,
        updated_at: now,
    }))

    const initialStore: ClinicTasksData = {
        projects: initialProjects,
        tasks: [],
        updated_at: now,
    }

    await saveClinicTasksStore(clinicId, initialStore)
    return initialStore
}

async function saveClinicTasksStore(clinicId: string, store: ClinicTasksData): Promise<void> {
    const supabase = createServiceRoleClient()
    try {
        const { data: clinic } = await supabase
            .from('clinics')
            .select('addons')
            .eq('id', clinicId)
            .single()

        const currentAddons = (clinic?.addons as Record<string, any>) || {}
        const updatedAddons = {
            ...currentAddons,
            tasks_data: {
                projects: store.projects,
                tasks: store.tasks,
                updated_at: new Date().toISOString(),
            },
        }

        const { error: updateError } = await supabase
            .from('clinics')
            .update({ addons: updatedAddons })
            .eq('id', clinicId)

        if (updateError) {
            console.error('[TasksService] Falha ao gravar no Supabase clinics.addons:', updateError)
        }
    } catch (err) {
        console.error('[TasksService] Exceção ao gravar no Supabase:', err)
    }
}

// Projetos padrões para novas clínicas
export const DEFAULT_CLINIC_PROJECTS = [
    { name: 'Rotinas Administrativas & Recepção', color: '#10b981', description: 'Atendimento, guias TISS, cadastros e recepção' },
    { name: 'Demandas Terapêuticas & Laudos', color: '#0284c7', description: 'Relatórios escolares, PEI, interconsultas e devoluções' },
    { name: 'Gestão Clínica & Coordenação', color: '#6366f1', description: 'Reuniões de equipe, supervisões e auditoria de prontuários' },
    { name: 'Infraestrutura & Materiais', color: '#f59e0b', description: 'Materiais pedagógicos, jogos e suprimentos da clínica' },
]

export class TasksService {
    // 1. Obter ou inicializar projetos da clínica
    static async getProjects(clinicId: string): Promise<TaskProject[]> {
        const supabase = createServiceRoleClient()

        try {
            const { data, error } = await supabase
                .from('task_projects')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('is_archived', false)
                .order('created_at', { ascending: true })

            if (!error && data && data.length > 0) {
                return data as TaskProject[]
            }

            if (!error && data && data.length === 0) {
                const toInsert = DEFAULT_CLINIC_PROJECTS.map(p => ({
                    clinic_id: clinicId,
                    name: p.name,
                    color: p.color,
                    description: p.description,
                    is_archived: false,
                }))
                const { data: inserted } = await supabase
                    .from('task_projects')
                    .insert(toInsert)
                    .select('*')
                if (inserted && inserted.length > 0) {
                    return inserted as TaskProject[]
                }
            }
        } catch {
            // Tabela não existe no banco; usa fallback Supabase clinics.addons
        }

        const store = await getClinicTasksStore(clinicId)
        return store.projects.filter(p => !p.is_archived)
    }

    // 2. Criar novo projeto
    static async createProject(clinicId: string, name: string, color: string, description?: string, userId?: string): Promise<TaskProject> {
        const supabase = createServiceRoleClient()

        try {
            const { data, error } = await supabase
                .from('task_projects')
                .insert({
                    clinic_id: clinicId,
                    name,
                    color: color || '#10b981',
                    description: description || null,
                    created_by: userId || null,
                })
                .select('*')
                .single()

            if (!error && data) {
                return data as TaskProject
            }
        } catch {
            // fallback
        }

        const store = await getClinicTasksStore(clinicId)
        const now = new Date().toISOString()
        const newProj: TaskProject = {
            id: `proj-${Date.now()}`,
            clinic_id: clinicId,
            name,
            color: color || '#10b981',
            description: description || null,
            is_archived: false,
            created_by: userId,
            created_at: now,
            updated_at: now,
        }
        store.projects.push(newProj)
        await saveClinicTasksStore(clinicId, store)
        return newProj
    }

    // 3. Buscar tarefas da clínica com filtros e controle de visibilidade
    static async getTasks(params: {
        clinicId: string
        userId: string
        userRole: string
        projectId?: string
        status?: TaskStatus
        assignedTo?: string
        trafficLight?: TrafficLightStatus
        viewMode?: 'my_tasks' | 'all_clinic'
        search?: string
    }): Promise<ClinicTask[]> {
        const { clinicId, userId, userRole, projectId, status, assignedTo, trafficLight, viewMode, search } = params
        const isClinicAdmin = userRole === 'CLINIC_ADMIN' || userRole === 'SUPER_ADMIN'

        const supabase = createServiceRoleClient()

        try {
            let query = supabase
                .from('clinic_tasks')
                .select(`
                    *,
                    project:task_projects(id, name, color),
                    assigned_user:users!clinic_tasks_assigned_to_fkey(id, full_name, email, role, avatar_url),
                    creator_user:users!clinic_tasks_created_by_fkey(id, full_name),
                    patient:patients(id, full_name),
                    checklists:clinic_task_checklists(*)
                `)
                .eq('clinic_id', clinicId)

            if (!isClinicAdmin || viewMode === 'my_tasks') {
                query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)
            } else if (assignedTo) {
                query = query.eq('assigned_to', assignedTo)
            }

            if (projectId) query = query.eq('project_id', projectId)
            if (status) query = query.eq('status', status)

            const { data, error } = await query.order('position', { ascending: true }).order('created_at', { ascending: false })

            if (!error && data) {
                let formatted = (data as any[]).map(t => ({
                    ...t,
                    checklists: t.checklists || [],
                    traffic_light: calculateTrafficLight(t.due_date, t.status),
                }))

                if (trafficLight) {
                    formatted = formatted.filter(t => t.traffic_light.status === trafficLight)
                }

                if (search && search.trim()) {
                    const term = search.toLowerCase().trim()
                    formatted = formatted.filter(t =>
                        t.title.toLowerCase().includes(term) ||
                        (t.description && t.description.toLowerCase().includes(term)) ||
                        (t.patient?.full_name && t.patient.full_name.toLowerCase().includes(term))
                    )
                }

                return formatted as ClinicTask[]
            }
        } catch {
            // fallback
        }

        // Persistência em clinics.addons
        const store = await getClinicTasksStore(clinicId)
        let clinicTasks = store.tasks || []

        // Enriquecer dados dos usuários e pacientes para exibição no Kanban / Lista
        try {
            const [usersRes, patientsRes] = await Promise.all([
                supabase.from('users').select('id, full_name, email, role, avatar_url').eq('clinic_id', clinicId),
                supabase.from('patients').select('id, full_name').eq('clinic_id', clinicId).limit(300)
            ])
            const usersMap = new Map((usersRes.data || []).map(u => [u.id, u]))
            const patientsMap = new Map((patientsRes.data || []).map(p => [p.id, p]))
            const projectsMap = new Map(store.projects.map(pr => [pr.id, pr]))

            clinicTasks = clinicTasks.map(t => {
                const project = t.project_id ? projectsMap.get(t.project_id) : t.project
                const assigned_user = t.assigned_to ? usersMap.get(t.assigned_to) : t.assigned_user
                const creator_user = t.created_by ? usersMap.get(t.created_by) : t.creator_user
                const patient = t.patient_id ? patientsMap.get(t.patient_id) : t.patient
                return {
                    ...t,
                    project: project || t.project || null,
                    assigned_user: assigned_user || t.assigned_user || null,
                    creator_user: creator_user || t.creator_user || null,
                    patient: patient || t.patient || null,
                }
            })
        } catch {
            // ignora erro no enriquecimento
        }

        // Aplica filtros no store
        let filtered = clinicTasks

        if (!isClinicAdmin || viewMode === 'my_tasks') {
            filtered = filtered.filter(t => t.assigned_to === userId || t.created_by === userId)
        } else if (assignedTo) {
            filtered = filtered.filter(t => t.assigned_to === assignedTo)
        }

        if (projectId) filtered = filtered.filter(t => t.project_id === projectId)
        if (status) filtered = filtered.filter(t => t.status === status)

        filtered = filtered.map(t => ({
            ...t,
            traffic_light: calculateTrafficLight(t.due_date, t.status),
        }))

        if (trafficLight) {
            filtered = filtered.filter(t => t.traffic_light.status === trafficLight)
        }

        if (search && search.trim()) {
            const term = search.toLowerCase().trim()
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(term) ||
                (t.description && t.description.toLowerCase().includes(term)) ||
                (t.patient?.full_name && t.patient.full_name.toLowerCase().includes(term))
            )
        }

        return filtered
    }

    // 4. Criar tarefa
    static async createTask(data: {
        clinic_id: string
        project_id?: string | null
        title: string
        description?: string | null
        priority?: TaskPriority
        due_date?: string | null
        due_time?: string | null
        assigned_to?: string | null
        created_by: string
        patient_id?: string | null
        recurrence?: string
        tags?: string[]
        checklists?: string[]
    }): Promise<ClinicTask> {
        const supabase = createServiceRoleClient()

        try {
            const { data: created, error } = await supabase
                .from('clinic_tasks')
                .insert({
                    clinic_id: data.clinic_id,
                    project_id: data.project_id || null,
                    title: data.title,
                    description: data.description || null,
                    priority: data.priority || 'MEDIUM',
                    due_date: data.due_date || null,
                    due_time: data.due_time || null,
                    assigned_to: data.assigned_to || null,
                    created_by: data.created_by,
                    patient_id: data.patient_id || null,
                    recurrence: data.recurrence || 'NONE',
                    tags: data.tags || [],
                    status: 'TODO',
                })
                .select(`
                    *,
                    project:task_projects(id, name, color),
                    assigned_user:users!clinic_tasks_assigned_to_fkey(id, full_name, email, role, avatar_url),
                    patient:patients(id, full_name)
                `)
                .single()

            if (!error && created) {
                if (data.checklists && data.checklists.length > 0) {
                    const checklistItems = data.checklists.map((title, idx) => ({
                        task_id: created.id,
                        title,
                        is_completed: false,
                        position: idx,
                    }))
                    await supabase.from('clinic_task_checklists').insert(checklistItems)
                }

                return {
                    ...created,
                    checklists: [],
                    traffic_light: calculateTrafficLight(created.due_date, created.status),
                } as ClinicTask
            }
        } catch {
            // fallback
        }

        // Persistência em clinics.addons
        const store = await getClinicTasksStore(data.clinic_id)
        const now = new Date().toISOString()
        const taskId = `task-${Date.now()}`

        const checklists: TaskChecklistItem[] = (data.checklists || []).map((title, idx) => ({
            id: `chk-${Date.now()}-${idx}`,
            task_id: taskId,
            title,
            is_completed: false,
            position: idx,
            created_at: now,
        }))

        const project = store.projects.find(p => p.id === data.project_id) || null

        // Enriquecer usuário atribuído e paciente
        let assigned_user = null
        let creator_user = null
        let patient = null
        try {
            if (data.assigned_to) {
                const { data: u } = await supabase.from('users').select('id, full_name, email, role, avatar_url').eq('id', data.assigned_to).single()
                if (u) assigned_user = u
            }
            if (data.created_by) {
                const { data: c } = await supabase.from('users').select('id, full_name').eq('id', data.created_by).single()
                if (c) creator_user = c
            }
            if (data.patient_id) {
                const { data: pt } = await supabase.from('patients').select('id, full_name').eq('id', data.patient_id).single()
                if (pt) patient = pt
            }
        } catch {
            // ignora
        }

        const newTask: ClinicTask = {
            id: taskId,
            clinic_id: data.clinic_id,
            project_id: data.project_id || null,
            title: data.title,
            description: data.description || null,
            status: 'TODO',
            priority: data.priority || 'MEDIUM',
            due_date: data.due_date || null,
            due_time: data.due_time || null,
            assigned_to: data.assigned_to || null,
            created_by: data.created_by,
            patient_id: data.patient_id || null,
            recurrence: data.recurrence || 'NONE',
            position: 0,
            tags: data.tags || [],
            created_at: now,
            updated_at: now,
            project,
            assigned_user,
            creator_user,
            patient,
            checklists,
            traffic_light: calculateTrafficLight(data.due_date, 'TODO'),
        }

        store.tasks.unshift(newTask)
        await saveClinicTasksStore(data.clinic_id, store)
        return newTask
    }

    // 5. Atualizar tarefa (mudança de status, responsável, checklist)
    static async updateTask(clinicId: string, taskId: string, updates: Partial<ClinicTask>): Promise<ClinicTask | null> {
        const supabase = createServiceRoleClient()

        try {
            const dbPayload: Record<string, any> = {
                updated_at: new Date().toISOString(),
            }
            if (updates.status !== undefined) {
                dbPayload.status = updates.status
                dbPayload.completed_at = updates.status === 'DONE' ? new Date().toISOString() : null
            }
            if (updates.title !== undefined) dbPayload.title = updates.title
            if (updates.description !== undefined) dbPayload.description = updates.description
            if (updates.priority !== undefined) dbPayload.priority = updates.priority
            if (updates.due_date !== undefined) dbPayload.due_date = updates.due_date
            if (updates.due_time !== undefined) dbPayload.due_time = updates.due_time
            if (updates.assigned_to !== undefined) dbPayload.assigned_to = updates.assigned_to
            if (updates.project_id !== undefined) dbPayload.project_id = updates.project_id
            if (updates.position !== undefined) dbPayload.position = updates.position

            const { data, error } = await supabase
                .from('clinic_tasks')
                .update(dbPayload)
                .eq('id', taskId)
                .eq('clinic_id', clinicId)
                .select(`
                    *,
                    project:task_projects(id, name, color),
                    assigned_user:users!clinic_tasks_assigned_to_fkey(id, full_name, email, role, avatar_url),
                    patient:patients(id, full_name),
                    checklists:clinic_task_checklists(*)
                `)
                .single()

            if (!error && data) {
                return {
                    ...data,
                    traffic_light: calculateTrafficLight(data.due_date, data.status),
                } as ClinicTask
            }
        } catch {
            // fallback
        }

        // Persistência em clinics.addons
        const store = await getClinicTasksStore(clinicId)
        const idx = store.tasks.findIndex(t => t.id === taskId)
        if (idx > -1) {
            const current = store.tasks[idx]
            const updated: ClinicTask = {
                ...current,
                ...updates,
                updated_at: new Date().toISOString(),
                completed_at: updates.status === 'DONE' ? new Date().toISOString() : (updates.status ? null : current.completed_at),
                traffic_light: calculateTrafficLight(updates.due_date || current.due_date, updates.status || current.status),
            }
            store.tasks[idx] = updated
            await saveClinicTasksStore(clinicId, store)
            return updated
        }
        return null
    }

    // 6. Excluir tarefa
    static async deleteTask(clinicId: string, taskId: string): Promise<boolean> {
        const supabase = createServiceRoleClient()

        try {
            const { error } = await supabase
                .from('clinic_tasks')
                .delete()
                .eq('id', taskId)
                .eq('clinic_id', clinicId)

            if (!error) return true
        } catch {
            // fallback
        }

        const store = await getClinicTasksStore(clinicId)
        const prevCount = store.tasks.length
        store.tasks = store.tasks.filter(t => t.id !== taskId)
        if (store.tasks.length !== prevCount) {
            await saveClinicTasksStore(clinicId, store)
            return true
        }
        return false
    }

    // 7. Resumo das métricas do Farol (KPIs)
    static async getSummary(clinicId: string, userId: string, userRole: string, viewMode?: string) {
        const tasks = await this.getTasks({
            clinicId,
            userId,
            userRole,
            viewMode: viewMode as any,
        })

        const pending = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
        const overdueRed = pending.filter(t => t.traffic_light.status === 'RED').length
        const dueSoonAmber = pending.filter(t => t.traffic_light.status === 'AMBER').length
        const onTrackGreen = pending.filter(t => t.traffic_light.status === 'GREEN').length
        const completedRecent = tasks.filter(t => t.status === 'DONE').length

        return {
            total_pending: pending.length,
            overdue_red: overdueRed,
            due_soon_amber: dueSoonAmber,
            on_track_green: onTrackGreen,
            completed_recent: completedRecent,
        }
    }
}
