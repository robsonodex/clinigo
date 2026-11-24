'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    CheckSquare,
    Clock,
    Copy,
    Download,
    Edit3,
    FolderCog,
    FolderPlus,
    Kanban,
    ListFilter,
    Loader2,
    MoreVertical,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Shield,
    Trash2,
    User as UserIcon,
    X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import {
    buildTasksCsv,
    formatTeamMemberOption,
    formatTeamRoleLabel,
    sanitizeProjectName,
} from '@/lib/tasks/task-helpers'

interface TaskProject {
    id: string
    name: string
    color: string
    description?: string | null
}

interface ChecklistItem {
    id: string
    title: string
    is_completed: boolean
    position?: number
}

interface ClinicTask {
    id: string
    clinic_id: string
    project_id?: string | null
    title: string
    description?: string | null
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    due_date?: string | null
    due_time?: string | null
    assigned_to?: string | null
    created_by?: string | null
    patient_id?: string | null
    recurrence?: string
    completed_at?: string | null
    position: number
    tags?: string[]
    created_at: string
    project?: TaskProject | null
    assigned_user?: { id: string; full_name: string; email: string; role: string } | null
    patient?: { id: string; full_name: string } | null
    checklists: ChecklistItem[]
    traffic_light: {
        status: 'RED' | 'AMBER' | 'GREEN' | 'COMPLETED' | 'NONE'
        label: string
        days_diff: number
    }
}

interface TeamMember {
    id: string
    full_name: string
    role: string
    email: string
}

const PRIORITY_CONFIG = {
    LOW: { label: 'Baixa', badge: 'bg-slate-50 text-slate-600 border-slate-200' },
    MEDIUM: { label: 'Média', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
    HIGH: { label: 'Alta', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
    URGENT: { label: 'Urgente', badge: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold' },
}

const PROJECT_COLORS = ['#10b981', '#0284c7', '#6366f1', '#f59e0b', '#ec4899', '#64748b']

export default function TarefasProjetosPage() {
    const { role, isClinicAdmin, isSuperAdmin, isCoordinator } = useRole()
    const { profile } = useAuth()
    const isManager = isClinicAdmin || isSuperAdmin || isCoordinator
    const professionalLabel = (profile as any)?.clinic?.professional_label || null
    const canLinkPatient = role !== 'FINANCIAL' && role !== 'READONLY'

    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [tasks, setTasks] = useState<ClinicTask[]>([])
    const [projects, setProjects] = useState<TaskProject[]>([])
    const [team, setTeam] = useState<TeamMember[]>([])
    const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([])
    const [loading, setLoading] = useState(true)

    // Filtros e controles
    const [viewLayout, setViewLayout] = useState<'kanban' | 'list'>('kanban')
    const [viewMode, setViewMode] = useState<'my_tasks' | 'all_clinic'>('all_clinic')
    const [filterProject, setFilterProject] = useState<string>('all')
    const [filterTraffic, setFilterTraffic] = useState<string>('all')
    const [filterPriority, setFilterPriority] = useState<string>('all')
    const [filterAssignee, setFilterAssignee] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        if (role) {
            if (isManager || role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN') {
                setViewMode('all_clinic')
            } else {
                setViewMode('my_tasks')
            }
        }
    }, [isManager, role])

    // Modais e confirmações
    const [newTaskModalOpen, setNewTaskModalOpen] = useState(false)
    const [projectsModalOpen, setProjectsModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<ClinicTask | null>(null)
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
    const [confirmDeleteTask, setConfirmDeleteTask] = useState<ClinicTask | null>(null)
    const [confirmArchiveProject, setConfirmArchiveProject] = useState<TaskProject | null>(null)
    const [saving, setSaving] = useState(false)

    // Formulário de Nova Tarefa
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        project_id: '',
        assigned_to: '',
        priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '18:00',
        patient_id: 'none',
        checklists: [''],
    })

    // Formulário de Projeto (Criar ou Editar)
    const [projectForm, setProjectForm] = useState({
        name: '',
        color: '#10b981',
        description: '',
    })

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                if (data?.id) setCurrentUserId(data.id)
            })
            .catch(() => {})
    }, [])

    const loadMetadata = useCallback(async () => {
        try {
            const requests: Promise<Response>[] = [
                fetch('/api/tasks/projects'),
                fetch('/api/tasks/team'),
            ]
            if (canLinkPatient) {
                requests.push(fetch('/api/patients?pageSize=100'))
            }

            const [projRes, teamRes, patRes] = await Promise.all(requests)

            if (projRes?.ok) {
                const pj = await projRes.json()
                const cleanProjects = (pj.data || []).map((p: TaskProject) => ({
                    ...p,
                    name: sanitizeProjectName(p.name),
                }))
                setProjects(cleanProjects)
            }
            if (teamRes?.ok) {
                const tm = await teamRes.json()
                setTeam(tm.data || [])
            }
            if (patRes?.ok) {
                const pt = await patRes.json()
                setPatients(pt.data || pt.patients || [])
            }
        } catch (err) {
            console.error('Erro ao carregar dados auxiliares:', err)
        }
    }, [canLinkPatient])

    const fetchTasks = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (viewMode) params.append('view_mode', viewMode)
            if (filterProject !== 'all') params.append('project_id', filterProject)
            if (filterTraffic !== 'all') params.append('traffic_light', filterTraffic)
            if (filterAssignee !== 'all') params.append('assigned_to', filterAssignee)
            if (searchQuery.trim()) params.append('search', searchQuery.trim())

            const res = await fetch(`/api/tasks?${params.toString()}`)
            if (res.ok) {
                const json = await res.json()
                setTasks(json.data || [])
            } else {
                toast.error('Erro ao carregar tarefas')
            }
        } catch {
            toast.error('Falha de conexão com o servidor')
        } finally {
            setLoading(false)
        }
    }, [viewMode, filterProject, filterTraffic, filterAssignee, searchQuery])

    useEffect(() => {
        loadMetadata()
    }, [loadMetadata])

    useEffect(() => {
        fetchTasks()
    }, [fetchTasks])

    const visibleTasks = useMemo(() => {
        if (filterPriority === 'all') return tasks
        return tasks.filter((t) => t.priority === filterPriority)
    }, [tasks, filterPriority])

    const hasActiveFilters = Boolean(
        searchQuery.trim() ||
            filterProject !== 'all' ||
            filterTraffic !== 'all' ||
            filterPriority !== 'all' ||
            filterAssignee !== 'all'
    )

    const handleClearFilters = () => {
        setSearchQuery('')
        setFilterProject('all')
        setFilterTraffic('all')
        setFilterPriority('all')
        setFilterAssignee('all')
    }

    const kpis = useMemo(() => {
        const pending = visibleTasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')
        const overdue = pending.filter((t) => t.traffic_light.status === 'RED').length
        const dueSoon = pending.filter((t) => t.traffic_light.status === 'AMBER').length
        const onTrack = pending.filter((t) => t.traffic_light.status === 'GREEN').length
        const completed = visibleTasks.filter((t) => t.status === 'DONE').length

        return {
            total_pending: pending.length,
            overdue,
            dueSoon,
            onTrack,
            completed,
        }
    }, [visibleTasks])

    const handleToggleKpiFilter = (target: 'RED' | 'AMBER' | 'GREEN' | 'COMPLETED') => {
        setFilterTraffic((prev) => (prev === target ? 'all' : target))
    }

    const handleMoveStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })

            if (!res.ok) {
                toast.error('Não foi possível mover a tarefa')
                fetchTasks()
            } else {
                const actionLabel = newStatus === 'DONE' ? 'concluída' : 'atualizada'
                toast.success(`Tarefa ${actionLabel}`)
                fetchTasks()
            }
        } catch {
            toast.error('Erro ao comunicar com o servidor')
            fetchTasks()
        }
    }

    const handleToggleChecklist = (itemIdx: number) => {
        if (!editingTask) return
        const updatedChecklists = editingTask.checklists.map((item, idx) =>
            idx === itemIdx ? { ...item, is_completed: !item.is_completed } : item
        )
        setEditingTask({ ...editingTask, checklists: updatedChecklists })
    }

    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) {
            toast.error('Informe o título da tarefa')
            return
        }

        setSaving(true)
        try {
            const validChecklists = taskForm.checklists.map((c) => c.trim()).filter(Boolean)
            const payload = {
                title: taskForm.title.trim(),
                description: taskForm.description.trim() || null,
                project_id: taskForm.project_id && taskForm.project_id !== 'none' ? taskForm.project_id : null,
                assigned_to: taskForm.assigned_to || currentUserId,
                priority: taskForm.priority,
                due_date: taskForm.due_date || null,
                due_time: taskForm.due_time || null,
                patient_id: taskForm.patient_id && taskForm.patient_id !== 'none' ? taskForm.patient_id : null,
                checklists: validChecklists,
            }

            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                const json = await res.json()
                toast.success('Tarefa cadastrada com sucesso')
                setNewTaskModalOpen(false)
                if (json?.data) {
                    setTasks((prev) => [json.data, ...prev])
                }
                setTaskForm({
                    title: '',
                    description: '',
                    project_id: projects[0]?.id || '',
                    assigned_to: currentUserId || '',
                    priority: 'MEDIUM',
                    due_date: new Date().toISOString().split('T')[0],
                    due_time: '18:00',
                    patient_id: 'none',
                    checklists: [''],
                })
                fetchTasks()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err.error || 'Erro ao criar tarefa')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    const handleDuplicateTask = async (source: ClinicTask) => {
        setSaving(true)
        try {
            const payload = {
                title: `${source.title} (Cópia)`,
                description: source.description || null,
                project_id: source.project_id || null,
                assigned_to: source.assigned_to || currentUserId,
                priority: source.priority,
                due_date: source.due_date || null,
                due_time: source.due_time || null,
                patient_id: source.patient_id || null,
                checklists: (source.checklists || []).map((c) => c.title).filter(Boolean),
            }
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (res.ok) {
                toast.success('Tarefa duplicada com sucesso')
                fetchTasks()
            } else {
                toast.error('Não foi possível duplicar a tarefa')
            }
        } catch {
            toast.error('Falha de conexão ao duplicar tarefa')
        } finally {
            setSaving(false)
        }
    }

    const handleSaveEditTask = async () => {
        if (!editingTask) return
        if (!editingTask.title.trim()) {
            toast.error('O título da tarefa é obrigatório')
            return
        }
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${editingTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingTask.title.trim(),
                    description: editingTask.description || null,
                    priority: editingTask.priority,
                    due_date: editingTask.due_date || null,
                    due_time: editingTask.due_time || null,
                    assigned_to: editingTask.assigned_to || null,
                    project_id:
                        editingTask.project_id && editingTask.project_id !== 'none'
                            ? editingTask.project_id
                            : null,
                    patient_id:
                        editingTask.patient_id && editingTask.patient_id !== 'none'
                            ? editingTask.patient_id
                            : null,
                    status: editingTask.status,
                    checklists: (editingTask.checklists || [])
                        .map((c, idx) => ({
                            id: c.id,
                            title: String(c.title || '').trim(),
                            is_completed: Boolean(c.is_completed),
                            position: idx,
                        }))
                        .filter((c) => c.title.length > 0),
                }),
            })

            if (res.ok) {
                toast.success('Alterações salvas')
                setEditingTask(null)
                fetchTasks()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err.error || 'Erro ao atualizar tarefa')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmDeleteTask = async () => {
        if (!confirmDeleteTask) return
        const targetId = confirmDeleteTask.id
        setConfirmDeleteTask(null)
        setTasks((prev) => prev.filter((t) => t.id !== targetId))
        try {
            const res = await fetch(`/api/tasks/${targetId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Tarefa excluída com sucesso')
                if (editingTask?.id === targetId) setEditingTask(null)
                fetchTasks()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err.error || 'Erro ao excluir tarefa')
                fetchTasks()
            }
        } catch {
            toast.error('Falha de conexão')
            fetchTasks()
        }
    }

    const handleSaveProject = async () => {
        const cleanName = sanitizeProjectName(projectForm.name)
        if (!cleanName) {
            toast.error('Informe o nome do projeto')
            return
        }

        setSaving(true)
        try {
            const isEdit = Boolean(editingProjectId)
            const res = await fetch('/api/tasks/projects', {
                method: isEdit ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    isEdit
                        ? {
                              id: editingProjectId,
                              name: cleanName,
                              color: projectForm.color,
                              description: projectForm.description.trim() || null,
                          }
                        : {
                              name: cleanName,
                              color: projectForm.color,
                              description: projectForm.description.trim() || null,
                          }
                ),
            })

            if (res.ok) {
                toast.success(isEdit ? 'Projeto atualizado com sucesso' : 'Projeto criado com sucesso')
                setEditingProjectId(null)
                setProjectForm({ name: '', color: '#10b981', description: '' })
                await loadMetadata()
                fetchTasks()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err.error || 'Erro ao salvar projeto')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    const handleConfirmArchiveProject = async () => {
        if (!confirmArchiveProject) return
        const target = confirmArchiveProject
        setConfirmArchiveProject(null)
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/projects?id=${encodeURIComponent(target.id)}`, {
                method: 'DELETE',
            })
            if (res.ok) {
                toast.success('Projeto arquivado com sucesso')
                if (filterProject === target.id) setFilterProject('all')
                if (editingProjectId === target.id) {
                    setEditingProjectId(null)
                    setProjectForm({ name: '', color: '#10b981', description: '' })
                }
                await loadMetadata()
                fetchTasks()
            } else {
                const err = await res.json().catch(() => ({}))
                toast.error(err.error || 'Erro ao arquivar projeto')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    const handleExportCsv = () => {
        if (visibleTasks.length === 0) {
            toast.info('Não há tarefas para exportar com os filtros atuais.')
            return
        }
        const csv = buildTasksCsv(visibleTasks, professionalLabel)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `tarefas-clinica-${new Date().toISOString().slice(0, 10)}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success(`${visibleTasks.length} tarefa(s) exportada(s) em CSV.`)
    }

    const renderTrafficBadge = (traffic: ClinicTask['traffic_light']) => {
        switch (traffic.status) {
            case 'RED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        {traffic.label}
                    </span>
                )
            case 'AMBER':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        {traffic.label}
                    </span>
                )
            case 'GREEN':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {traffic.label}
                    </span>
                )
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200/70">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                        Concluído
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200/70">
                        Sem prazo
                    </span>
                )
        }
    }

    const kanbanColumns = useMemo(() => {
        return {
            TODO: visibleTasks.filter((t) => t.status === 'TODO'),
            IN_PROGRESS: visibleTasks.filter((t) => t.status === 'IN_PROGRESS'),
            DONE: visibleTasks.filter((t) => t.status === 'DONE'),
        }
    }, [visibleTasks])

    return (
        <div className="space-y-6 pb-12">
            {/* Cabeçalho Corporativo */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-800/10 text-emerald-800 border border-emerald-800/20">
                            <CheckSquare className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Gestão de Tarefas e Projetos
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Controle operacional, delegação de rotinas clínicas e acompanhamento de prazos da equipe.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchTasks}
                        disabled={loading}
                        className="gap-1.5 min-h-[44px] sm:min-h-[38px] text-xs font-medium"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportCsv}
                        disabled={visibleTasks.length === 0}
                        className="gap-1.5 min-h-[44px] sm:min-h-[38px] text-xs font-medium border-slate-200 text-slate-700"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exportar CSV
                    </Button>

                    {isManager && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setEditingProjectId(null)
                                setProjectForm({ name: '', color: '#10b981', description: '' })
                                setProjectsModalOpen(true)
                            }}
                            className="gap-1.5 min-h-[44px] sm:min-h-[38px] text-xs font-medium border-slate-200 text-slate-700"
                        >
                            <FolderCog className="h-3.5 w-3.5" />
                            Projetos ({projects.length})
                        </Button>
                    )}

                    <Button
                        size="sm"
                        onClick={() => {
                            setTaskForm((prev) => ({
                                ...prev,
                                project_id: projects[0]?.id || '',
                                assigned_to: currentUserId || '',
                                patient_id: 'none',
                            }))
                            setNewTaskModalOpen(true)
                        }}
                        className="gap-1.5 min-h-[44px] sm:min-h-[38px] text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Tarefa
                    </Button>
                </div>
            </div>

            {/* Indicadores Executivos de SLA (clicáveis como filtro rápido) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    type="button"
                    onClick={() => handleToggleKpiFilter('RED')}
                    className={`text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-xs transition-colors min-h-[44px] ${
                        filterTraffic === 'RED'
                            ? 'border-rose-500 ring-1 ring-rose-500/30 bg-rose-50/30'
                            : 'border-border hover:border-slate-300'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Em Atraso</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{kpis.overdue}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Atenção prioritária</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleToggleKpiFilter('AMBER')}
                    className={`text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-xs transition-colors min-h-[44px] ${
                        filterTraffic === 'AMBER'
                            ? 'border-amber-500 ring-1 ring-amber-500/30 bg-amber-50/30'
                            : 'border-border hover:border-slate-300'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Próximas (48h)</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{kpis.dueSoon}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Vencimento próximo</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                        <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleToggleKpiFilter('GREEN')}
                    className={`text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-xs transition-colors min-h-[44px] ${
                        filterTraffic === 'GREEN'
                            ? 'border-emerald-600 ring-1 ring-emerald-600/30 bg-emerald-50/30'
                            : 'border-border hover:border-slate-300'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">No Prazo</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{kpis.onTrack}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Cronograma regular</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => handleToggleKpiFilter('COMPLETED')}
                    className={`text-left rounded-xl border bg-white p-4 flex items-center justify-between shadow-xs transition-colors min-h-[44px] ${
                        filterTraffic === 'COMPLETED'
                            ? 'border-slate-500 ring-1 ring-slate-500/30 bg-slate-50'
                            : 'border-border hover:border-slate-300'
                    }`}
                >
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Concluídas</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{kpis.completed}</h3>
                        <p className="text-[11px] text-slate-500 font-medium">Rotinas finalizadas</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                        <CheckSquare className="h-4 w-4 text-slate-600" />
                    </div>
                </button>
            </div>

            {/* Barra de Filtros e Controles de Visualização */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            {isManager ? (
                                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('my_tasks')}
                                        className={`px-3 py-1.5 rounded-md transition-colors min-h-[36px] ${
                                            viewMode === 'my_tasks'
                                                ? 'bg-white text-slate-900 font-semibold shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Minhas Tarefas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('all_clinic')}
                                        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 min-h-[36px] ${
                                            viewMode === 'all_clinic'
                                                ? 'bg-white text-slate-900 font-semibold shadow-sm'
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        <Shield className="h-3 w-3 text-emerald-800" />
                                        Visão Geral da Clínica
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                                    <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                                    Visualizando: Minhas Tarefas Atribuídas
                                </div>
                            )}

                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Limpar filtros
                                </Button>
                            )}
                        </div>

                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium self-start lg:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewLayout('kanban')}
                                className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 min-h-[36px] ${
                                    viewLayout === 'kanban'
                                        ? 'bg-white text-slate-900 font-semibold shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Kanban className="h-3.5 w-3.5" />
                                Quadro Kanban
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewLayout('list')}
                                className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 min-h-[36px] ${
                                    viewLayout === 'list'
                                        ? 'bg-white text-slate-900 font-semibold shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <ListFilter className="h-3.5 w-3.5" />
                                Lista Tabela
                            </button>
                        </div>
                    </div>

                    {/* Filtros Granulares */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Buscar por título, descrição ou paciente..."
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs h-9 bg-white"
                            />
                        </div>

                        <Select value={filterProject} onValueChange={setFilterProject}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                                <SelectValue placeholder="Todos os Projetos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Projetos</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {sanitizeProjectName(p.name)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterTraffic} onValueChange={setFilterTraffic}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                                <SelectValue placeholder="Status do Prazo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Prazos</SelectItem>
                                <SelectItem value="RED">Em Atraso</SelectItem>
                                <SelectItem value="AMBER">Próximas de Vencer (48h)</SelectItem>
                                <SelectItem value="GREEN">No Prazo</SelectItem>
                                <SelectItem value="COMPLETED">Concluídas</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                                <SelectValue placeholder="Todas as Prioridades" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Prioridades</SelectItem>
                                <SelectItem value="URGENT">Urgente</SelectItem>
                                <SelectItem value="HIGH">Alta</SelectItem>
                                <SelectItem value="MEDIUM">Média</SelectItem>
                                <SelectItem value="LOW">Baixa</SelectItem>
                            </SelectContent>
                        </Select>

                        {isManager && viewMode === 'all_clinic' ? (
                            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                                <SelectTrigger className="text-xs h-9 bg-white">
                                    <SelectValue placeholder="Todos os Responsáveis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Responsáveis</SelectItem>
                                    {team.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {formatTeamMemberOption(m, professionalLabel)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center text-xs text-slate-500 px-2">
                                <span className="truncate">{visibleTasks.length} tarefa(s) encontrada(s)</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Conteúdo Principal: Quadro Kanban ou Lista Tabela */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-800 mb-2" />
                    <p className="text-sm font-medium">Carregando painel de tarefas...</p>
                </div>
            ) : viewLayout === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Coluna 1: A Fazer */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[420px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">A Fazer</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 tabular-nums">
                                {kanbanColumns.TODO.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.TODO.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma pendência inicial
                                </div>
                            ) : (
                                kanbanColumns.TODO.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        professionalLabel={professionalLabel}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onDuplicate={() => handleDuplicateTask(task)}
                                        onAdvance={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                        onDelete={() => setConfirmDeleteTask(task)}
                                        advanceLabel="Iniciar"
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Coluna 2: Em Andamento */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[420px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Em Andamento</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 tabular-nums">
                                {kanbanColumns.IN_PROGRESS.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.IN_PROGRESS.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma tarefa em execução
                                </div>
                            ) : (
                                kanbanColumns.IN_PROGRESS.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        professionalLabel={professionalLabel}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onDuplicate={() => handleDuplicateTask(task)}
                                        onBack={() => handleMoveStatus(task.id, 'TODO')}
                                        onAdvance={() => handleMoveStatus(task.id, 'DONE')}
                                        onDelete={() => setConfirmDeleteTask(task)}
                                        advanceLabel="Concluir"
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Coluna 3: Concluído */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[420px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Concluído</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 tabular-nums">
                                {kanbanColumns.DONE.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.DONE.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma tarefa finalizada
                                </div>
                            ) : (
                                kanbanColumns.DONE.map((task) => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        professionalLabel={professionalLabel}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onDuplicate={() => handleDuplicateTask(task)}
                                        onBack={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                        onDelete={() => setConfirmDeleteTask(task)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <Card className="border-border shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">Prazo / SLA</th>
                                        <th className="py-3 px-4">Título e Descrição</th>
                                        <th className="py-3 px-4">Projeto</th>
                                        <th className="py-3 px-4">Responsável</th>
                                        <th className="py-3 px-4">Prioridade</th>
                                        <th className="py-3 px-4">Data Limite</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleTasks.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-slate-400">
                                                Nenhuma tarefa correspondente aos filtros aplicados.
                                            </td>
                                        </tr>
                                    ) : (
                                        visibleTasks.map((task) => {
                                            const totalChk = task.checklists?.length || 0
                                            const doneChk =
                                                task.checklists?.filter((c) => c.is_completed).length || 0
                                            return (
                                                <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {renderTrafficBadge(task.traffic_light)}
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingTask(task)}
                                                            className="text-left hover:text-emerald-800 transition-colors"
                                                        >
                                                            <div className="truncate font-semibold">{task.title}</div>
                                                        </button>
                                                        {task.description && (
                                                            <div className="text-[11px] text-slate-500 truncate">
                                                                {task.description}
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                            {task.patient && (
                                                                <span className="text-[10px] text-emerald-800 font-medium">
                                                                    Paciente: {task.patient.full_name}
                                                                </span>
                                                            )}
                                                            {totalChk > 0 && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    Checklist: {doneChk}/{totalChk}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {task.project ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="text-[11px] font-normal border-slate-200 gap-1.5"
                                                            >
                                                                <span
                                                                    className="h-2 w-2 rounded-full shrink-0"
                                                                    style={{ backgroundColor: task.project.color || '#10b981' }}
                                                                />
                                                                {sanitizeProjectName(task.project.name)}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-slate-400">Sem projeto</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                                                        {task.assigned_user ? (
                                                            <div>
                                                                <div className="font-medium text-slate-800">
                                                                    {task.assigned_user.full_name}
                                                                </div>
                                                                <div className="text-[10px] text-slate-500">
                                                                    {formatTeamRoleLabel(
                                                                        task.assigned_user.role,
                                                                        professionalLabel
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            'Não atribuído'
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${PRIORITY_CONFIG[task.priority]?.badge}`}
                                                        >
                                                            {PRIORITY_CONFIG[task.priority]?.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 tabular-nums">
                                                        {task.due_date
                                                            ? task.due_date.split('-').reverse().join('/')
                                                            : '-'}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <Select
                                                            value={task.status}
                                                            onValueChange={(val: string) =>
                                                                handleMoveStatus(task.id, val as any)
                                                            }
                                                        >
                                                            <SelectTrigger className="h-8 text-[11px] w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="TODO">A Fazer</SelectItem>
                                                                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                                                                <SelectItem value="DONE">Concluído</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setEditingTask(task)}
                                                                className="h-8 w-8 p-0"
                                                                title="Editar tarefa"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDuplicateTask(task)}
                                                                className="h-8 w-8 p-0 text-slate-600"
                                                                title="Duplicar tarefa"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setConfirmDeleteTask(task)}
                                                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                                title="Excluir tarefa"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Modal de Criação de Tarefa */}
            <Dialog open={newTaskModalOpen} onOpenChange={setNewTaskModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Plus className="h-4 w-4 text-emerald-800" />
                            Cadastrar Nova Tarefa
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Defina prazo, prioridade, responsável e checklist de acompanhamento operacional.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div>
                            <Label className="text-xs">Título da Tarefa *</Label>
                            <Input
                                placeholder="Ex: Solicitar autorização de guia TISS ou Elaborar laudo..."
                                value={taskForm.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setTaskForm({ ...taskForm, title: e.target.value })
                                }
                                className="h-9 text-xs mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Projeto / Categoria</Label>
                                <Select
                                    value={taskForm.project_id || 'none'}
                                    onValueChange={(v: string) =>
                                        setTaskForm({ ...taskForm, project_id: v === 'none' ? '' : v })
                                    }
                                >
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="Selecione o projeto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem projeto</SelectItem>
                                        {projects.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {sanitizeProjectName(p.name)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-xs">Responsável</Label>
                                <Select
                                    value={taskForm.assigned_to}
                                    onValueChange={(v: string) => setTaskForm({ ...taskForm, assigned_to: v })}
                                >
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="Atribuir a..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {team.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {formatTeamMemberOption(m, professionalLabel)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Data de Vencimento</Label>
                                <Input
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setTaskForm({ ...taskForm, due_date: e.target.value })
                                    }
                                    className="h-9 text-xs mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Prioridade</Label>
                                <Select
                                    value={taskForm.priority}
                                    onValueChange={(v: any) => setTaskForm({ ...taskForm, priority: v })}
                                >
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Baixa</SelectItem>
                                        <SelectItem value="MEDIUM">Média</SelectItem>
                                        <SelectItem value="HIGH">Alta</SelectItem>
                                        <SelectItem value="URGENT">Urgente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {canLinkPatient && (
                            <div>
                                <Label className="text-xs">Paciente Vinculado (Opcional)</Label>
                                <Select
                                    value={taskForm.patient_id || 'none'}
                                    onValueChange={(v: string) => setTaskForm({ ...taskForm, patient_id: v })}
                                >
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="Nenhum paciente selecionado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Nenhum</SelectItem>
                                        {patients.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label className="text-xs">Descrição / Instruções</Label>
                            <Textarea
                                placeholder="Detalhes da pendência, observações ou orientações..."
                                value={taskForm.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setTaskForm({ ...taskForm, description: e.target.value })
                                }
                                rows={3}
                                className="text-xs mt-1 resize-none"
                            />
                        </div>

                        {/* Checklist Inicial */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label className="text-xs">Checklist de Sub-etapas</Label>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setTaskForm({ ...taskForm, checklists: [...taskForm.checklists, ''] })
                                    }
                                    className="text-[11px] text-emerald-800 hover:underline font-semibold"
                                >
                                    + Adicionar item
                                </button>
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                {taskForm.checklists.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5">
                                        <Input
                                            placeholder={`Sub-etapa ${idx + 1}`}
                                            value={item}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const copy = [...taskForm.checklists]
                                                copy[idx] = e.target.value
                                                setTaskForm({ ...taskForm, checklists: copy })
                                            }}
                                            className="h-8 text-xs"
                                        />
                                        {taskForm.checklists.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const copy = taskForm.checklists.filter((_, i) => i !== idx)
                                                    setTaskForm({ ...taskForm, checklists: copy })
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1.5"
                                                title="Remover sub-etapa"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewTaskModalOpen(false)}
                            className="text-xs min-h-[40px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateTask}
                            disabled={saving}
                            className="text-xs min-h-[40px] bg-emerald-800 hover:bg-emerald-900 text-white"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            Salvar Tarefa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Detalhes / Edição de Tarefa */}
            <Dialog open={!!editingTask} onOpenChange={(open: boolean) => !open && setEditingTask(null)}>
                {editingTask && (
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center justify-between pr-4">
                                <DialogTitle className="text-base font-bold">
                                    Detalhes da Tarefa
                                </DialogTitle>
                                {renderTrafficBadge(editingTask.traffic_light)}
                            </div>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div>
                                <Label className="text-xs">Título *</Label>
                                <Input
                                    value={editingTask.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setEditingTask({ ...editingTask, title: e.target.value })
                                    }
                                    className="h-9 text-xs mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                        value={editingTask.status}
                                        onValueChange={(val: any) =>
                                            setEditingTask({ ...editingTask, status: val })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TODO">A Fazer</SelectItem>
                                            <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                                            <SelectItem value="DONE">Concluído</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs">Prioridade</Label>
                                    <Select
                                        value={editingTask.priority}
                                        onValueChange={(val: any) =>
                                            setEditingTask({ ...editingTask, priority: val })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOW">Baixa</SelectItem>
                                            <SelectItem value="MEDIUM">Média</SelectItem>
                                            <SelectItem value="HIGH">Alta</SelectItem>
                                            <SelectItem value="URGENT">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Projeto / Categoria</Label>
                                    <Select
                                        value={editingTask.project_id || 'none'}
                                        onValueChange={(val: string) =>
                                            setEditingTask({
                                                ...editingTask,
                                                project_id: val === 'none' ? null : val,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs mt-1">
                                            <SelectValue placeholder="Sem projeto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sem projeto</SelectItem>
                                            {projects.map((p) => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {sanitizeProjectName(p.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs">Responsável</Label>
                                    <Select
                                        value={editingTask.assigned_to || ''}
                                        onValueChange={(val: string) =>
                                            setEditingTask({ ...editingTask, assigned_to: val })
                                        }
                                    >
                                        <SelectTrigger className="h-9 text-xs mt-1">
                                            <SelectValue placeholder="Responsável..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {team.map((m) => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {formatTeamMemberOption(m, professionalLabel)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Data de Vencimento</Label>
                                    <Input
                                        type="date"
                                        value={editingTask.due_date || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            setEditingTask({ ...editingTask, due_date: e.target.value || null })
                                        }
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>

                                {canLinkPatient && (
                                    <div>
                                        <Label className="text-xs">Paciente Vinculado</Label>
                                        <Select
                                            value={editingTask.patient_id || 'none'}
                                            onValueChange={(val: string) =>
                                                setEditingTask({
                                                    ...editingTask,
                                                    patient_id: val === 'none' ? null : val,
                                                })
                                            }
                                        >
                                            <SelectTrigger className="h-9 text-xs mt-1">
                                                <SelectValue placeholder="Nenhum" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {patients.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.full_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-xs">Descrição</Label>
                                <Textarea
                                    value={editingTask.description || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        setEditingTask({ ...editingTask, description: e.target.value })
                                    }
                                    rows={3}
                                    className="text-xs mt-1 resize-none"
                                />
                            </div>

                            {/* Checklist completo na Edição (marcar, editar, adicionar e remover) */}
                            <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                                        Checklist (
                                        {(editingTask.checklists || []).filter((c) => c.is_completed).length}/
                                        {(editingTask.checklists || []).length})
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setEditingTask({
                                                ...editingTask,
                                                checklists: [
                                                    ...(editingTask.checklists || []),
                                                    {
                                                        id: `new-${Date.now()}`,
                                                        title: '',
                                                        is_completed: false,
                                                        position: (editingTask.checklists || []).length,
                                                    },
                                                ],
                                            })
                                        }
                                        className="text-[11px] text-emerald-800 hover:underline font-semibold"
                                    >
                                        + Adicionar item
                                    </button>
                                </div>

                                {(editingTask.checklists || []).length === 0 ? (
                                    <p className="text-[11px] text-slate-400">
                                        Nenhuma sub-etapa cadastrada. Clique em &quot;+ Adicionar item&quot; para incluir.
                                    </p>
                                ) : (
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {editingTask.checklists.map((chk, idx) => (
                                            <div key={chk.id || idx} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={chk.is_completed}
                                                    onChange={() => handleToggleChecklist(idx)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-800 shrink-0 cursor-pointer"
                                                />
                                                <Input
                                                    value={chk.title}
                                                    placeholder={`Sub-etapa ${idx + 1}`}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                        const copy = editingTask.checklists.map((item, i) =>
                                                            i === idx ? { ...item, title: e.target.value } : item
                                                        )
                                                        setEditingTask({ ...editingTask, checklists: copy })
                                                    }}
                                                    className={`h-8 text-xs bg-white ${
                                                        chk.is_completed ? 'line-through text-slate-400' : 'text-slate-800'
                                                    }`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const copy = editingTask.checklists.filter(
                                                            (_, i) => i !== idx
                                                        )
                                                        setEditingTask({ ...editingTask, checklists: copy })
                                                    }}
                                                    className="text-slate-400 hover:text-rose-600 p-1.5 shrink-0"
                                                    title="Remover item"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-between w-full gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                type="button"
                                onClick={() => setConfirmDeleteTask(editingTask)}
                                className="text-xs gap-1.5 min-h-[40px]"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                            </Button>
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => setEditingTask(null)}
                                    className="text-xs min-h-[40px]"
                                >
                                    Fechar
                                </Button>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={handleSaveEditTask}
                                    disabled={saving}
                                    className="text-xs min-h-[40px] bg-emerald-800 hover:bg-emerald-900 text-white"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* Modal de Gestão de Projetos (Criar, Editar e Arquivar — Apenas Gestores) */}
            <Dialog open={projectsModalOpen} onOpenChange={setProjectsModalOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <FolderPlus className="h-4 w-4 text-emerald-800" />
                            Gerenciar Projetos e Categorias
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Crie, renomeie ou arquive categorias para organizar as rotinas operacionais da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Lista de Projetos Ativos */}
                        <div className="space-y-1.5">
                            <Label className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                Projetos Ativos ({projects.length})
                            </Label>
                            <div className="divide-y divide-slate-100 border rounded-lg bg-slate-50/60 max-h-44 overflow-y-auto">
                                {projects.length === 0 ? (
                                    <p className="p-3 text-slate-400 text-center">Nenhum projeto ativo.</p>
                                ) : (
                                    projects.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between gap-2 px-3 py-2 bg-white/80"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: p.color || '#10b981' }}
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-800 truncate">
                                                        {sanitizeProjectName(p.name)}
                                                    </div>
                                                    {p.description && (
                                                        <div className="text-[10px] text-slate-500 truncate">
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingProjectId(p.id)
                                                        setProjectForm({
                                                            name: sanitizeProjectName(p.name),
                                                            color: p.color || '#10b981',
                                                            description: p.description || '',
                                                        })
                                                    }}
                                                    className="h-7 w-7 p-0 text-slate-600"
                                                    title="Editar projeto"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setConfirmArchiveProject(p)}
                                                    className="h-7 w-7 p-0 text-amber-700 hover:bg-amber-50"
                                                    title="Arquivar projeto"
                                                >
                                                    <Archive className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Formulário Criar / Editar Projeto */}
                        <div className="border-t border-slate-200 pt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-slate-800">
                                    {editingProjectId ? 'Editando Projeto Selecionado' : 'Adicionar Novo Projeto'}
                                </Label>
                                {editingProjectId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingProjectId(null)
                                            setProjectForm({ name: '', color: '#10b981', description: '' })
                                        }}
                                        className="text-[11px] text-slate-500 hover:text-slate-800 underline"
                                    >
                                        Cancelar edição
                                    </button>
                                )}
                            </div>

                            <div>
                                <Label className="text-xs">Nome do Projeto *</Label>
                                <Input
                                    placeholder="Ex: Recepção e Autorizações, Laudos Terapêuticos..."
                                    value={projectForm.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setProjectForm({ ...projectForm, name: e.target.value })
                                    }
                                    className="h-9 text-xs mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Cor Temática</Label>
                                <div className="flex items-center gap-2 mt-1">
                                    {PROJECT_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setProjectForm({ ...projectForm, color })}
                                            className={`h-7 w-7 rounded-full border-2 transition-transform ${
                                                projectForm.color === color
                                                    ? 'border-slate-900 scale-110'
                                                    : 'border-transparent'
                                            }`}
                                            style={{ backgroundColor: color }}
                                            aria-label={`Selecionar cor ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Descrição / Objetivo</Label>
                                <Textarea
                                    placeholder="Descreva o escopo deste projeto..."
                                    value={projectForm.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        setProjectForm({ ...projectForm, description: e.target.value })
                                    }
                                    rows={2}
                                    className="text-xs mt-1 resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setProjectsModalOpen(false)}
                            className="text-xs min-h-[40px]"
                        >
                            Fechar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveProject}
                            disabled={saving}
                            className="text-xs min-h-[40px] bg-emerald-800 hover:bg-emerald-900 text-white"
                        >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                            {editingProjectId ? 'Atualizar Projeto' : 'Salvar Novo Projeto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão de Tarefa */}
            <Dialog
                open={!!confirmDeleteTask}
                onOpenChange={(open: boolean) => !open && setConfirmDeleteTask(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
                            <AlertTriangle className="h-4 w-4" />
                            Confirmar Exclusão
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 pt-1">
                            Tem certeza que deseja excluir a tarefa{' '}
                            <strong className="text-slate-900">
                                {confirmDeleteTask?.title}
                            </strong>
                            ? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmDeleteTask(null)}
                            className="text-xs min-h-[40px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleConfirmDeleteTask}
                            className="text-xs min-h-[40px]"
                        >
                            Excluir Permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Arquivamento de Projeto */}
            <Dialog
                open={!!confirmArchiveProject}
                onOpenChange={(open: boolean) => !open && setConfirmArchiveProject(null)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-800">
                            <Archive className="h-4 w-4" />
                            Arquivar Projeto
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 pt-1">
                            Deseja arquivar o projeto{' '}
                            <strong className="text-slate-900">
                                {sanitizeProjectName(confirmArchiveProject?.name)}
                            </strong>
                            ? Ele deixará de aparecer nas listas ativas, mas as tarefas vinculadas serão preservadas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmArchiveProject(null)}
                            className="text-xs min-h-[40px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmArchiveProject}
                            className="text-xs min-h-[40px] bg-amber-700 hover:bg-amber-800 text-white"
                        >
                            Arquivar Projeto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function TaskCard({
    task,
    professionalLabel,
    renderTrafficBadge,
    onEdit,
    onDuplicate,
    onAdvance,
    onBack,
    onDelete,
    advanceLabel,
}: {
    task: ClinicTask
    professionalLabel: string | null
    renderTrafficBadge: (t: ClinicTask['traffic_light']) => React.ReactNode
    onEdit: () => void
    onDuplicate: () => void
    onAdvance?: () => void
    onBack?: () => void
    onDelete?: () => void
    advanceLabel?: string
}) {
    const totalChecklist = task.checklists?.length || 0
    const completedChecklist = task.checklists?.filter((c) => c.is_completed).length || 0

    return (
        <Card className="border-border shadow-xs hover:shadow-md transition-shadow bg-white text-xs">
            <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {renderTrafficBadge(task.traffic_light)}
                        <Badge
                            variant="outline"
                            className={`text-[9px] py-0 px-1.5 ${PRIORITY_CONFIG[task.priority]?.badge}`}
                        >
                            {PRIORITY_CONFIG[task.priority]?.label}
                        </Badge>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700"
                                aria-label="Ações da tarefa"
                            >
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                                <Edit3 className="h-3.5 w-3.5" /> Ver e editar detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDuplicate} className="gap-2 cursor-pointer">
                                <Copy className="h-3.5 w-3.5" /> Duplicar tarefa
                            </DropdownMenuItem>
                            {onDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={onDelete}
                                        className="gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Excluir tarefa
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="cursor-pointer" onClick={onEdit}>
                    <h4 className="font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-emerald-800 transition-colors">
                        {task.title}
                    </h4>
                    {task.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                            {task.description}
                        </p>
                    )}
                </div>

                {task.project && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80">
                        <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: task.project.color || '#10b981' }}
                        />
                        <span className="truncate">{sanitizeProjectName(task.project.name)}</span>
                    </div>
                )}

                {task.patient && (
                    <div className="text-[10px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                        Paciente: {task.patient.full_name}
                    </div>
                )}

                {totalChecklist > 0 && (
                    <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>Checklist</span>
                            <span className="tabular-nums">
                                {completedChecklist}/{totalChecklist}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-700 h-full transition-all"
                                style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {task.assigned_user?.full_name
                                ? task.assigned_user.full_name[0].toUpperCase()
                                : 'U'}
                        </div>
                        <div className="min-w-0">
                            <span className="block truncate text-[10px] font-medium text-slate-700">
                                {task.assigned_user ? task.assigned_user.full_name.split(' ')[0] : 'Geral'}
                            </span>
                            {task.assigned_user && (
                                <span className="block truncate text-[9px] text-slate-400">
                                    {formatTeamRoleLabel(task.assigned_user.role, professionalLabel)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {onBack && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBack}
                                className="h-7 px-2 text-[10px] text-slate-600"
                                title="Voltar etapa"
                            >
                                Voltar
                            </Button>
                        )}
                        {onAdvance && (
                            <Button
                                size="sm"
                                onClick={onAdvance}
                                className="h-7 px-2.5 text-[10px] bg-slate-800 hover:bg-slate-900 text-white font-medium"
                            >
                                {advanceLabel || 'Avançar'}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
