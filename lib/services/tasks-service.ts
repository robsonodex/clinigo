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

// Fallback Store (usado temporariamente se a tabela ainda não tiver sido criada no Supabase SQL Editor)
const FALLBACK_DIR = path.join(process.cwd(), '.cache')
const FALLBACK_FILE = path.join(FALLBACK_DIR, 'tasks_store.json')

interface FallbackStore {
    projects: Record<string, TaskProject[]>
    tasks: Record<string, ClinicTask[]>
}

function getFallbackStore(): FallbackStore {
    try {
        if (!fs.existsSync(FALLBACK_DIR)) {
            fs.mkdirSync(FALLBACK_DIR, { recursive: true })
        }
        if (fs.existsSync(FALLBACK_FILE)) {
            const data = fs.readFileSync(FALLBACK_FILE, 'utf-8')
            return JSON.parse(data)
        }
    } catch {
        // ignora erro de leitura
    }
    return { projects: {}, tasks: {} }
}

function saveFallbackStore(store: FallbackStore) {
    try {
        if (!fs.existsSync(FALLBACK_DIR)) {
            fs.mkdirSync(FALLBACK_DIR, { recursive: true })
        }
        fs.writeFileSync(FALLBACK_FILE, JSON.stringify(store, null, 2), 'utf-8')
    } catch {
        // ignora erro de escrita
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

            // Se tabela existir mas estiver vazia, cria os projetos padrão
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
            // Tabela não existe no banco; usa fallback local
        }

        // Fallback resiliente
        const store = getFallbackStore()
        if (!store.projects[clinicId] || store.projects[clinicId].length === 0) {
            const now = new Date().toISOString()
            store.projects[clinicId] = DEFAULT_CLINIC_PROJECTS.map((p, idx) => ({
                id: `proj-${idx + 1}-${clinicId.slice(0, 6)}`,
                clinic_id: clinicId,
                name: p.name,
                color: p.color,
                description: p.description,
                is_archived: false,
                created_at: now,
                updated_at: now,
            }))
            saveFallbackStore(store)
        }
        return store.projects[clinicId]
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

        const store = getFallbackStore()
        if (!store.projects[clinicId]) store.projects[clinicId] = []
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
        store.projects[clinicId].push(newProj)
        saveFallbackStore(store)
        return newProj
    }

    // 3. Buscar tarefas da clínica com filtros e controle estrito de visibilidade
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

            // Regra de Visibilidade Restrita por Perfil:
            // Se NÃO for Admin, ou se o usuário escolheu 'my_tasks':
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

        // Fallback resiliente
        const store = getFallbackStore()
        let clinicTasks = store.tasks[clinicId] || []

        // Se não houver tarefas, criar algumas amostras reais para homologação da equipe
        if (clinicTasks.length === 0) {
            const projects = await this.getProjects(clinicId)
            const projRec = projects[0]?.id
            const projTer = projects[1]?.id
            const todayStr = new Date().toISOString().split('T')[0]
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
            const overdueDate = new Date(Date.now() - 172800000).toISOString().split('T')[0]

            clinicTasks = [
                {
                    id: `task-sample-1-${clinicId.slice(0, 4)}`,
                    clinic_id: clinicId,
                    project_id: projRec,
                    title: 'Cobrar autorização de guia TISS do convênio Unimed',
                    description: 'Paciente realizou 8 de 10 sessões. Solicitar novo lote de guias para o próximo mês.',
                    status: 'TODO',
                    priority: 'HIGH',
                    due_date: todayStr,
                    due_time: '17:00',
                    assigned_to: userId,
                    created_by: userId,
                    recurrence: 'NONE',
                    position: 0,
                    tags: ['TISS', 'Convênio'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    project: projects[0],
                    checklists: [
                        { id: 'c1', task_id: 'task-sample-1', title: 'Verificar carteirinha no portal', is_completed: true, position: 0, created_at: new Date().toISOString() },
                        { id: 'c2', task_id: 'task-sample-1', title: 'Emitir anexo de solicitação', is_completed: false, position: 1, created_at: new Date().toISOString() },
                    ],
                    traffic_light: calculateTrafficLight(todayStr, 'TODO'),
                },
                {
                    id: `task-sample-2-${clinicId.slice(0, 4)}`,
                    clinic_id: clinicId,
                    project_id: projTer,
                    title: 'Finalizar relatório de reavaliação neuropsicomotora',
                    description: 'Entrega obrigatória para a neuropediatra e escola antes da consulta de sexta-feira.',
                    status: 'IN_PROGRESS',
                    priority: 'URGENT',
                    due_date: tomorrow,
                    due_time: '18:00',
                    assigned_to: userId,
                    created_by: userId,
                    recurrence: 'NONE',
                    position: 1,
                    tags: ['Laudo', 'Psicomotricidade'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    project: projects[1],
                    checklists: [
                        { id: 'c3', task_id: 'task-sample-2', title: 'Revisar testes motores e equilíbrio', is_completed: true, position: 0, created_at: new Date().toISOString() },
                        { id: 'c4', task_id: 'task-sample-2', title: 'Assinar digitalmente o PDF', is_completed: false, position: 1, created_at: new Date().toISOString() },
                    ],
                    traffic_light: calculateTrafficLight(tomorrow, 'IN_PROGRESS'),
                },
                {
                    id: `task-sample-3-${clinicId.slice(0, 4)}`,
                    clinic_id: clinicId,
                    project_id: projTer,
                    title: 'Auditoria de evoluções diárias pendentes da semana',
                    description: 'Verificar se todas as fichas de atendimento foram devidamente computadas e assinadas.',
                    status: 'TODO',
                    priority: 'HIGH',
                    due_date: overdueDate,
                    due_time: '12:00',
                    assigned_to: userId,
                    created_by: userId,
                    recurrence: 'WEEKLY',
                    position: 2,
                    tags: ['Conformidade', 'Prontuário'],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    project: projects[1],
                    checklists: [],
                    traffic_light: calculateTrafficLight(overdueDate, 'TODO'),
                },
            ]
            store.tasks[clinicId] = clinicTasks
            saveFallbackStore(store)
        }

        // Aplica filtros no fallback
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
                (t.description && t.description.toLowerCase().includes(term))
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

        // Fallback local
        const store = getFallbackStore()
        if (!store.tasks[data.clinic_id]) store.tasks[data.clinic_id] = []
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

        const projects = await this.getProjects(data.clinic_id)
        const project = projects.find(p => p.id === data.project_id) || null

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
            checklists,
            traffic_light: calculateTrafficLight(data.due_date, 'TODO'),
        }

        store.tasks[data.clinic_id].unshift(newTask)
        saveFallbackStore(store)
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

        // Fallback local
        const store = getFallbackStore()
        const list = store.tasks[clinicId] || []
        const idx = list.findIndex(t => t.id === taskId)
        if (idx > -1) {
            const current = list[idx]
            const updated: ClinicTask = {
                ...current,
                ...updates,
                updated_at: new Date().toISOString(),
                completed_at: updates.status === 'DONE' ? new Date().toISOString() : (updates.status ? null : current.completed_at),
                traffic_light: calculateTrafficLight(updates.due_date || current.due_date, updates.status || current.status),
            }
            list[idx] = updated
            saveFallbackStore(store)
            return updated
        }
        return null
    }

    // 6. Resumo das métricas do Farol (KPIs)
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
