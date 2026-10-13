'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    CheckSquare,
    Kanban,
    ListFilter,
    Calendar,
    AlertTriangle,
    Clock,
    Plus,
    Search,
    User as UserIcon,
    Folder,
    CheckCircle2,
    MoreVertical,
    Trash2,
    Edit3,
    ArrowRight,
    RefreshCw,
    SlidersHorizontal,
    Layers,
    Shield,
    Check,
    X,
    FolderPlus,
    Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'

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

export default function TarefasProjetosPage() {
    const { isClinicAdmin, isSuperAdmin } = useRole()
    const isManager = isClinicAdmin || isSuperAdmin

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
    const [filterAssignee, setFilterAssignee] = useState<string>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Sincroniza viewMode inicial para gestores
    useEffect(() => {
        if (profile?.role === 'CLINIC_ADMIN' || profile?.role === 'SUPER_ADMIN' || profile?.role === 'COORDINATOR') {
            setViewMode('all_clinic')
        }
    }, [profile?.role])

    // Modais
    const [newTaskModalOpen, setNewTaskModalOpen] = useState(false)
    const [newProjectModalOpen, setNewProjectModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<ClinicTask | null>(null)
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
        patient_id: '',
        checklists: [''],
    })

    // Formulário de Novo Projeto
    const [projectForm, setProjectForm] = useState({
        name: '',
        color: '#10b981',
        description: '',
    })

    // 1. Carregar usuário logado
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data?.id) setCurrentUserId(data.id)
            })
            .catch(() => {})
    }, [])

    // 2. Carregar projetos, membros da equipe e pacientes
    const loadMetadata = useCallback(async () => {
        try {
            const [projRes, teamRes, patRes] = await Promise.all([
                fetch('/api/tasks/projects'),
                fetch('/api/tasks/team'),
                fetch('/api/patients?pageSize=100'),
            ])

            if (projRes.ok) {
                const pj = await projRes.json()
                setProjects(pj.data || [])
            }
            if (teamRes.ok) {
                const tm = await teamRes.json()
                setTeam(tm.data || [])
            }
            if (patRes.ok) {
                const pt = await patRes.json()
                setPatients(pt.data || pt.patients || [])
            }
        } catch (err) {
            console.error('Erro ao carregar dados auxiliares:', err)
        }
    }, [])

    // 3. Carregar tarefas com base nos filtros
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

    // Métricas de SLA (KPIs)
    const kpis = useMemo(() => {
        const pending = tasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
        const overdue = pending.filter(t => t.traffic_light.status === 'RED').length
        const dueSoon = pending.filter(t => t.traffic_light.status === 'AMBER').length
        const onTrack = pending.filter(t => t.traffic_light.status === 'GREEN').length
        const completed = tasks.filter(t => t.status === 'DONE').length

        return {
            total_pending: pending.length,
            overdue,
            dueSoon,
            onTrack,
            completed,
        }
    }, [tasks])

    // Handler: Mudar Status / Coluna da Tarefa
    const handleMoveStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
        // Atualização otimista
        setTasks(prev =>
            prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
        )

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
            }
        } catch {
            toast.error('Erro ao comunicar com o servidor')
            fetchTasks()
        }
    }

    // Handler: Toggle Item de Checklist
    const handleToggleChecklist = (itemIdx: number) => {
        if (!editingTask) return
        const updatedChecklists = [...editingTask.checklists]
        updatedChecklists[itemIdx].is_completed = !updatedChecklists[itemIdx].is_completed
        setEditingTask({ ...editingTask, checklists: updatedChecklists })
    }

    // Handler: Criar Tarefa
    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) {
            toast.error('Informe o título da tarefa')
            return
        }

        setSaving(true)
        try {
            const validChecklists = taskForm.checklists.filter(c => c.trim().length > 0)
            const payload = {
                title: taskForm.title.trim(),
                description: taskForm.description.trim() || null,
                project_id: taskForm.project_id || null,
                assigned_to: taskForm.assigned_to || currentUserId,
                priority: taskForm.priority,
                due_date: taskForm.due_date || null,
                due_time: taskForm.due_time || null,
                patient_id: taskForm.patient_id || null,
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
                    setTasks(prev => [json.data, ...prev])
                }
                setTaskForm({
                    title: '',
                    description: '',
                    project_id: projects[0]?.id || '',
                    assigned_to: currentUserId || '',
                    priority: 'MEDIUM',
                    due_date: new Date().toISOString().split('T')[0],
                    due_time: '18:00',
                    patient_id: '',
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

    // Handler: Salvar Edição da Tarefa
    const handleSaveEditTask = async () => {
        if (!editingTask) return
        setSaving(true)
        try {
            const res = await fetch(`/api/tasks/${editingTask.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editingTask.title,
                    description: editingTask.description,
                    priority: editingTask.priority,
                    due_date: editingTask.due_date,
                    due_time: editingTask.due_time,
                    assigned_to: editingTask.assigned_to,
                    project_id: editingTask.project_id,
                    status: editingTask.status,
                }),
            })

            if (res.ok) {
                toast.success('Alterações salvas')
                setEditingTask(null)
                fetchTasks()
            } else {
                toast.error('Erro ao atualizar tarefa')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    // Handler: Excluir Tarefa
    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Deseja realmente excluir esta tarefa?')) return
        setTasks(prev => prev.filter(t => t.id !== taskId))
        try {
            const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
            if (res.ok) {
                toast.success('Tarefa excluída com sucesso')
                if (editingTask?.id === taskId) setEditingTask(null)
                fetchTasks()
            } else {
                toast.error('Erro ao excluir tarefa')
                fetchTasks()
            }
        } catch {
            toast.error('Falha de conexão')
            fetchTasks()
        }
    }

    // Handler: Criar Novo Projeto
    const handleCreateProject = async () => {
        if (!projectForm.name.trim()) {
            toast.error('Informe o nome do projeto')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/tasks/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectForm),
            })

            if (res.ok) {
                toast.success('Projeto criado com sucesso')
                setNewProjectModalOpen(false)
                setProjectForm({ name: '', color: '#10b981', description: '' })
                loadMetadata()
            } else {
                toast.error('Erro ao criar projeto')
            }
        } catch {
            toast.error('Falha de conexão')
        } finally {
            setSaving(false)
        }
    }

    // Helper: Badge de SLA / Prazo
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

    // Tarefas agrupadas para o Kanban
    const kanbanColumns = useMemo(() => {
        return {
            TODO: tasks.filter(t => t.status === 'TODO'),
            IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
            DONE: tasks.filter(t => t.status === 'DONE'),
        }
    }, [tasks])

    return (
        <div className="space-y-6 pb-12">
            {/* Header Corporativo Padrão Internacional */}
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
                        className="gap-1.5 min-h-[38px] text-xs font-medium"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    {isManager && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewProjectModalOpen(true)}
                            className="gap-1.5 min-h-[38px] text-xs font-medium border-slate-200 text-slate-700"
                        >
                            <FolderPlus className="h-3.5 w-3.5" />
                            Novo Projeto
                        </Button>
                    )}

                    <Button
                        size="sm"
                        onClick={() => {
                            setTaskForm(prev => ({
                                ...prev,
                                project_id: projects[0]?.id || '',
                                assigned_to: currentUserId || '',
                            }))
                            setNewTaskModalOpen(true)
                        }}
                        className="gap-1.5 min-h-[38px] text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Tarefa
                    </Button>
                </div>
            </div>

            {/* Indicadores Executivos de SLA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-border bg-white shadow-xs hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-rose-500" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Em Atraso</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpis.overdue}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Atenção prioritária</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-white shadow-xs hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Próximas (48h)</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpis.dueSoon}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Vencimento próximo</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-white shadow-xs hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">No Prazo</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpis.onTrack}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Cronograma regular</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-white shadow-xs hover:border-slate-300 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Concluídas</p>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{kpis.completed}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Rotinas finalizadas</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600 shrink-0">
                            <CheckSquare className="h-4 w-4 text-slate-600" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de Filtros e Controles de Visualização */}
            <Card className="border-border shadow-sm">
                <CardContent className="p-3 sm:p-4 space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Seletor: Minhas Tarefas vs Toda a Clínica (apenas Gestor) */}
                        <div className="flex items-center gap-2">
                            {isManager ? (
                                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('my_tasks')}
                                        className={`px-3 py-1.5 rounded-md transition-colors ${
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
                                        className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
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
                                <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
                                    <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                                    Visualizando: Minhas Tarefas Atribuídas
                                </div>
                            )}
                        </div>

                        {/* Alternador de Layout: Quadro vs Lista */}
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-medium self-start lg:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewLayout('kanban')}
                                className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
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
                                className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
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

                    {/* Linha de Filtros Granulares */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
                        {/* Busca textual */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Buscar por título ou descrição..."
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs h-9 bg-white"
                            />
                        </div>

                        {/* Filtro por Projeto */}
                        <Select value={filterProject} onValueChange={setFilterProject}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                                <SelectValue placeholder="Todos os Projetos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Projetos</SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filtro por Status do Prazo */}
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

                        {/* Filtro por Responsável (somente admin/gestor na visão geral) */}
                        {isManager && viewMode === 'all_clinic' ? (
                            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                                <SelectTrigger className="text-xs h-9 bg-white">
                                    <SelectValue placeholder="Todos os Responsáveis" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Responsáveis</SelectItem>
                                    {team.map(m => (
                                         <SelectItem key={m.id} value={m.id}>
                                             {m.full_name} ({m.role})
                                         </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center text-xs text-slate-500 px-2">
                                <span className="truncate">{tasks.length} tarefa(s) encontrada(s)</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Conteúdo Principal: Quadro Kanban ou Tabela */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-800 mb-2" />
                    <p className="text-sm font-medium">Carregando painel de tarefas...</p>
                </div>
            ) : viewLayout === 'kanban' ? (
                /* Quadro Kanban Corporativo */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Coluna 1: A Fazer */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">A Fazer</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                {kanbanColumns.TODO.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.TODO.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma pendência inicial
                                </div>
                            ) : (
                                kanbanColumns.TODO.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onAdvance={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                        onDelete={() => handleDeleteTask(task.id)}
                                        advanceLabel="Iniciar"
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Coluna 2: Em Andamento */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Em Andamento</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                {kanbanColumns.IN_PROGRESS.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.IN_PROGRESS.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma tarefa em execução
                                </div>
                            ) : (
                                kanbanColumns.IN_PROGRESS.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onBack={() => handleMoveStatus(task.id, 'TODO')}
                                        onAdvance={() => handleMoveStatus(task.id, 'DONE')}
                                        onDelete={() => handleDeleteTask(task.id)}
                                        advanceLabel="Concluir"
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* Coluna 3: Concluído */}
                    <div className="flex flex-col rounded-xl bg-slate-50/80 border border-slate-200/80 p-3 min-h-[500px]">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/70">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Concluído</h3>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                                {kanbanColumns.DONE.length}
                            </span>
                        </div>

                        <div className="space-y-3 flex-1 overflow-y-auto">
                            {kanbanColumns.DONE.length === 0 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                                    Nenhuma tarefa finalizada
                                </div>
                            ) : (
                                kanbanColumns.DONE.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        renderTrafficBadge={renderTrafficBadge}
                                        onEdit={() => setEditingTask(task)}
                                        onBack={() => handleMoveStatus(task.id, 'IN_PROGRESS')}
                                        onDelete={() => handleDeleteTask(task.id)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Visão Tabela / Lista */
                <Card className="border-border shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold">
                                <tr>
                                    <th className="py-3 px-4">Prazo / SLA</th>
                                    <th className="py-3 px-4">Título & Descrição</th>
                                    <th className="py-3 px-4">Projeto</th>
                                    <th className="py-3 px-4">Responsável</th>
                                    <th className="py-3 px-4">Prioridade</th>
                                    <th className="py-3 px-4">Data Limite</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            Nenhuma tarefa correspondente aos filtros aplicados.
                                        </td>
                                    </tr>
                                ) : (
                                    tasks.map(task => (
                                        <tr key={task.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {renderTrafficBadge(task.traffic_light)}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-slate-900 max-w-xs">
                                                <div className="truncate font-semibold">{task.title}</div>
                                                {task.description && (
                                                    <div className="text-[11px] text-slate-500 truncate">{task.description}</div>
                                                )}
                                                {task.patient && (
                                                    <div className="text-[10px] text-emerald-800 font-medium mt-0.5">
                                                        Paciente: {task.patient.full_name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                {task.project ? (
                                                    <Badge variant="outline" className="text-[11px] font-normal border-slate-200">
                                                        {task.project.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400">Sem projeto</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                                                {task.assigned_user ? task.assigned_user.full_name : 'Não atribuído'}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[10px] ${PRIORITY_CONFIG[task.priority]?.badge}`}>
                                                    {PRIORITY_CONFIG[task.priority]?.label}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                                                {task.due_date ? task.due_date.split('-').reverse().join('/') : '-'}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <Select
                                                    value={task.status}
                                                    onValueChange={(val: string) => handleMoveStatus(task.id, val as any)}
                                                >
                                                    <SelectTrigger className="h-7 text-[11px] w-28">
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
                                                        className="h-7 w-7 p-0"
                                                        title="Editar tarefa"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteTask(task.id)}
                                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Excluir tarefa"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            )}

            {/* Modal de Criação de Tarefa */}
            <Dialog open={newTaskModalOpen} onOpenChange={setNewTaskModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <Plus className="h-4 w-4 text-emerald-800" />
                            Cadastrar Nova Tarefa
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Defina o prazo, prioridade e checklist para acompanhamento operacional.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div>
                            <Label className="text-xs">Título da Tarefa *</Label>
                            <Input
                                placeholder="Ex: Solicitar autorização de guia TISS ou Elaborar laudo..."
                                value={taskForm.title}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskForm({ ...taskForm, title: e.target.value })}
                                className="h-9 text-xs mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Projeto / Categoria</Label>
                                <Select
                                    value={taskForm.project_id}
                                    onValueChange={(v: string) => setTaskForm({ ...taskForm, project_id: v })}
                                >
                                    <SelectTrigger className="h-9 text-xs mt-1">
                                        <SelectValue placeholder="Selecione o projeto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projects.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
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
                                        {team.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.full_name} ({m.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">Data de Vencimento</Label>
                                <Input
                                    type="date"
                                    value={taskForm.due_date}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTaskForm({ ...taskForm, due_date: e.target.value })}
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

                        <div>
                            <Label className="text-xs">Paciente Vinculado (Opcional)</Label>
                            <Select
                                value={taskForm.patient_id}
                                onValueChange={(v: string) => setTaskForm({ ...taskForm, patient_id: v })}
                            >
                                <SelectTrigger className="h-9 text-xs mt-1">
                                    <SelectValue placeholder="Nenhum paciente selecionado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {patients.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs">Descrição / Instruções</Label>
                            <Textarea
                                placeholder="Detalhes da pendência, observações clínicas ou orientações..."
                                value={taskForm.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTaskForm({ ...taskForm, description: e.target.value })}
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
                                    onClick={() => setTaskForm({ ...taskForm, checklists: [...taskForm.checklists, ''] })}
                                    className="text-[11px] text-emerald-800 hover:underline font-semibold"
                                >
                                    + Adicionar item
                                </button>
                            </div>
                            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
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
                                            className="h-7 text-xs"
                                        />
                                        {taskForm.checklists.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const copy = taskForm.checklists.filter((_, i) => i !== idx)
                                                    setTaskForm({ ...taskForm, checklists: copy })
                                                }}
                                                className="text-slate-400 hover:text-rose-600 p-1"
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
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateTask}
                            disabled={saving}
                            className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
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
                    <DialogContent className="max-w-lg">
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
                                <Label className="text-xs">Título</Label>
                                <Input
                                    value={editingTask.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, title: e.target.value })}
                                    className="h-9 text-xs mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Status</Label>
                                    <Select
                                        value={editingTask.status}
                                        onValueChange={(val: any) => setEditingTask({ ...editingTask, status: val })}
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
                                        onValueChange={(val: any) => setEditingTask({ ...editingTask, priority: val })}
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

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">Data de Vencimento</Label>
                                    <Input
                                        type="date"
                                        value={editingTask.due_date || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                                        className="h-9 text-xs mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-xs">Responsável</Label>
                                    <Select
                                        value={editingTask.assigned_to || ''}
                                        onValueChange={(val: string) => setEditingTask({ ...editingTask, assigned_to: val })}
                                    >
                                        <SelectTrigger className="h-9 text-xs mt-1">
                                            <SelectValue placeholder="Responsável..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {team.map(m => (
                                                <SelectItem key={m.id} value={m.id}>
                                                    {m.full_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Descrição</Label>
                                <Textarea
                                    value={editingTask.description || ''}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    rows={3}
                                    className="text-xs mt-1 resize-none"
                                />
                            </div>

                            {/* Checklist da Tarefa */}
                            {editingTask.checklists && editingTask.checklists.length > 0 && (
                                <div className="border rounded-lg p-2.5 bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                                        Checklist ({editingTask.checklists.filter(c => c.is_completed).length}/{editingTask.checklists.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {editingTask.checklists.map((chk, idx) => (
                                            <label
                                                key={chk.id || idx}
                                                className="flex items-center gap-2 text-xs cursor-pointer select-none"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={chk.is_completed}
                                                    onChange={() => handleToggleChecklist(idx)}
                                                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-800"
                                                />
                                                <span className={chk.is_completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                                                    {chk.title}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="flex items-center justify-between sm:justify-between w-full gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                type="button"
                                onClick={() => editingTask && handleDeleteTask(editingTask.id)}
                                className="text-xs gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    onClick={() => setEditingTask(null)}
                                    className="text-xs"
                                >
                                    Fechar
                                </Button>
                                <Button
                                    size="sm"
                                    type="button"
                                    onClick={handleSaveEditTask}
                                    disabled={saving}
                                    className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
                                >
                                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>

            {/* Modal de Criação de Projeto (Apenas Admin) */}
            <Dialog open={newProjectModalOpen} onOpenChange={setNewProjectModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold">
                            <FolderPlus className="h-4 w-4 text-emerald-800" />
                            Novo Projeto / Categoria
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Crie pastas temáticas para organizar as rotinas operacionais da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div>
                            <Label className="text-xs">Nome do Projeto *</Label>
                            <Input
                                placeholder="Ex: Recepção, Fonoaudiologia, Manutenção..."
                                value={projectForm.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectForm({ ...projectForm, name: e.target.value })}
                                className="h-9 text-xs mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Cor Temática</Label>
                            <div className="flex items-center gap-2 mt-1">
                                {['#10b981', '#0284c7', '#6366f1', '#f59e0b', '#ec4899', '#64748b'].map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setProjectForm({ ...projectForm, color })}
                                        className={`h-7 w-7 rounded-full border-2 transition-transform ${
                                            projectForm.color === color ? 'border-slate-900 scale-110' : 'border-transparent'
                                        }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Descrição / Objetivo</Label>
                            <Textarea
                                placeholder="Descreva o escopo deste projeto..."
                                value={projectForm.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProjectForm({ ...projectForm, description: e.target.value })}
                                rows={2}
                                className="text-xs mt-1 resize-none"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNewProjectModalOpen(false)}
                            className="text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreateProject}
                            disabled={saving}
                            className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white"
                        >
                            Salvar Projeto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// Subcomponente de Card da Tarefa para o Kanban
function TaskCard({
    task,
    renderTrafficBadge,
    onEdit,
    onAdvance,
    onBack,
    onDelete,
    advanceLabel,
}: {
    task: ClinicTask
    renderTrafficBadge: (t: ClinicTask['traffic_light']) => React.ReactNode
    onEdit: () => void
    onAdvance?: () => void
    onBack?: () => void
    onDelete?: () => void
    advanceLabel?: string
}) {
    const totalChecklist = task.checklists?.length || 0
    const completedChecklist = task.checklists?.filter(c => c.is_completed).length || 0

    return (
        <Card className="border-border shadow-xs hover:shadow-md transition-shadow bg-white text-xs">
            <CardContent className="p-3 space-y-2">
                {/* Header do Card */}
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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700">
                                <MoreVertical className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                                <Edit3 className="h-3 w-3" /> Ver detalhes
                            </DropdownMenuItem>
                            {onDelete && (
                                <DropdownMenuItem onClick={onDelete} className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <Trash2 className="h-3 w-3" /> Excluir tarefa
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Título */}
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

                {/* Paciente Vinculado */}
                {task.patient && (
                    <div className="text-[10px] text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-medium">
                        Paciente: {task.patient.full_name}
                    </div>
                )}

                {/* Checklist Progresso */}
                {totalChecklist > 0 && (
                    <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                            <span>Checklist</span>
                            <span>{completedChecklist}/{totalChecklist}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-700 h-full transition-all"
                                style={{ width: `${(completedChecklist / totalChecklist) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Footer do Card */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                        <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[9px] shrink-0">
                            {task.assigned_user?.full_name ? task.assigned_user.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <span className="truncate text-[10px] font-medium text-slate-700">
                            {task.assigned_user ? task.assigned_user.full_name.split(' ')[0] : 'Geral'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {onBack && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onBack}
                                className="h-6 px-1.5 text-[10px] text-slate-600"
                                title="Voltar etapa"
                            >
                                Voltar
                            </Button>
                        )}
                        {onAdvance && (
                            <Button
                                size="sm"
                                onClick={onAdvance}
                                className="h-6 px-2 text-[10px] bg-slate-800 hover:bg-slate-900 text-white font-medium"
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
