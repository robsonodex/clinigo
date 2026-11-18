'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Zap, Send, StickyNote, Plus, Loader2,
    Calendar, CheckCircle, Clock, Pause, Mail,
    MessageSquare, Bell, Trash2, RefreshCw,
    RotateCcw, Edit3, Wifi, WifiOff, ExternalLink,
    TrendingUp, Check, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRole } from '@/lib/hooks/use-auth'

interface Automation {
    id: string
    name: string
    description: string | null
    trigger: string
    actions: Array<{ type: string; template?: string }>
    is_active: boolean
    total_triggered: number
    last_triggered_at: string | null
}

interface Campaign {
    id: string
    name: string
    type: string
    sector?: string
    content?: string
    subject?: string
    status: string
    target_all_patients?: boolean
    total_recipients: number
    sent_count: number
    opened_count: number
    error_count?: number
    scheduled_at: string | null
    created_at: string
}

interface WhatsAppSessionItem {
    sector: string
    status: string
    phone_number: string | null
    connected: boolean
}

interface Note {
    id: string
    content: string
    note_type: string
    is_task: boolean
    task_due_date: string | null
    task_completed_at: string | null
    priority: string
    created_at: string
    patient: { id: string; full_name: string } | null
}

const SECTOR_OPTIONS = [
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'default', label: 'Principal' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'clinico', label: 'Clínico' },
]

const TRIGGER_LABELS: Record<string, string> = {
    APPOINTMENT_CREATED: 'Agendamento criado',
    APPOINTMENT_CONFIRMED: 'Agendamento confirmado',
    APPOINTMENT_REMINDER_24H: 'Lembrete 24h',
    APPOINTMENT_REMINDER_1H: 'Lembrete 1h',
    APPOINTMENT_COMPLETED: 'Consulta concluída',
    APPOINTMENT_CANCELLED: 'Cancelamento',
    APPOINTMENT_NO_SHOW: 'Não compareceu',
    PATIENT_CREATED: 'Novo paciente',
    PATIENT_BIRTHDAY: 'Aniversário',
    PATIENT_INACTIVE_30D: 'Inativo 30 dias',
    PATIENT_INACTIVE_90D: 'Inativo 90 dias',
    PAYMENT_CONFIRMED: 'Pagamento confirmado',
    FOLLOW_UP_DUE: 'Retorno',
}

const PRIORITY_META: Record<string, { label: string; className: string }> = {
    low: { label: 'Baixa', className: 'bg-slate-100 text-slate-600 border-slate-200' },
    normal: { label: 'Normal', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    high: { label: 'Alta', className: 'bg-amber-50 text-amber-800 border-amber-200' },
    urgent: { label: 'Urgente', className: 'bg-rose-50 text-rose-700 border-rose-200' },
}

const EMPTY_AUTOMATION_FORM = {
    name: '',
    description: '',
    trigger: '',
    action_type: 'send_whatsapp',
    action_template: '',
}

const EMPTY_CAMPAIGN_FORM = {
    name: '',
    type: 'WHATSAPP',
    content: '',
    subject: '',
    sector: 'financeiro',
    target_all_patients: true,
}

const EMPTY_TASK_FORM = {
    content: '',
    note_type: 'task',
    priority: 'normal',
    task_due_date: '',
}

export default function CRMPage() {
    const router = useRouter()
    const { isClinicAdmin, isSuperAdmin, loading: roleLoading } = useRole()
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [automations, setAutomations] = useState<Automation[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSessionItem[]>([])

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [taskFilter, setTaskFilter] = useState<'pending' | 'completed' | 'all'>('pending')

    // Dialogs state
    const [showAutomationDialog, setShowAutomationDialog] = useState(false)
    const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null)
    const [showNewCampaign, setShowNewCampaign] = useState(false)
    const [showEditCampaign, setShowEditCampaign] = useState(false)
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
    const [showTaskDialog, setShowTaskDialog] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Forms
    const [automationForm, setAutomationForm] = useState(EMPTY_AUTOMATION_FORM)
    const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN_FORM)
    const [taskForm, setTaskForm] = useState(EMPTY_TASK_FORM)
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)
    const [togglingAutomationId, setTogglingAutomationId] = useState<string | null>(null)
    const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null)

    const getSectorStatus = (sectorName: string = 'financeiro') => {
        const s = whatsappSessions.find(item => item.sector === sectorName)
        return {
            connected: s?.connected || false,
            status: s?.status || 'disconnected',
            phone: s?.phone_number || null,
        }
    }

    const fetchData = useCallback(async (silent = false) => {
        if (!isClinicAdmin && !isSuperAdmin) {
            setLoading(false)
            return
        }
        if (!silent) {
            setLoading(true)
        } else {
            setRefreshing(true)
        }
        try {
            const [autoRes, campRes, notesRes, waRes] = await Promise.all([
                fetch('/api/crm/automations'),
                fetch('/api/crm/campaigns'),
                fetch('/api/crm/notes?tasks_only=true'),
                fetch('/api/whatsapp/status?sector=all').catch(() => null),
            ])

            if (autoRes.ok) {
                const data = await autoRes.json()
                setAutomations(data.rules || [])
            }

            if (campRes.ok) {
                const data = await campRes.json()
                setCampaigns(data.campaigns || [])
            }

            if (notesRes.ok) {
                const data = await notesRes.json()
                setNotes(data.notes || [])
            }

            if (waRes && waRes.ok) {
                const waData = await waRes.json()
                if (Array.isArray(waData.sessions)) {
                    setWhatsappSessions(waData.sessions.map((s: any) => ({
                        sector: s.sector || 'default',
                        status: s.status || 'disconnected',
                        phone_number: s.phone_number || null,
                        connected: s.status === 'connected',
                    })))
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do CRM:', error)
            if (!silent) toast.error('Erro ao carregar dados do CRM')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [isClinicAdmin, isSuperAdmin])

    useEffect(() => {
        if (!roleLoading) {
            if (isClinicAdmin || isSuperAdmin) {
                fetchData()
            } else {
                setLoading(false)
                router.replace('/dashboard?error=unauthorized_role')
            }
        }
    }, [roleLoading, isClinicAdmin, isSuperAdmin, fetchData, router])

    useEffect(() => {
        const hasRunning = campaigns.some(c => c.status === 'RUNNING')
        if (!hasRunning) return

        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) return
            fetchData(true)
        }, 30000)

        return () => clearInterval(interval)
    }, [campaigns, fetchData])

    // ── Automações CRUD ──────────────────────────────────────────────────────
    const handleOpenNewAutomation = () => {
        setEditingAutomationId(null)
        setAutomationForm(EMPTY_AUTOMATION_FORM)
        setShowAutomationDialog(true)
    }

    const handleOpenEditAutomation = (auto: Automation) => {
        const firstAction = Array.isArray(auto.actions) && auto.actions[0] ? auto.actions[0] : { type: 'send_whatsapp', template: '' }
        setEditingAutomationId(auto.id)
        setAutomationForm({
            name: auto.name || '',
            description: auto.description || '',
            trigger: auto.trigger || '',
            action_type: firstAction.type || 'send_whatsapp',
            action_template: firstAction.template || '',
        })
        setShowAutomationDialog(true)
    }

    const handleSaveAutomation = async () => {
        if (!automationForm.name.trim() || !automationForm.trigger) {
            toast.error('Preencha nome e gatilho da automação')
            return
        }

        setSaving(true)
        try {
            const payload = {
                ...(editingAutomationId ? { id: editingAutomationId } : {}),
                name: automationForm.name.trim(),
                description: automationForm.description.trim(),
                trigger: automationForm.trigger,
                actions: [{
                    type: automationForm.action_type,
                    template: automationForm.action_template,
                }],
            }

            const res = await fetch('/api/crm/automations', {
                method: editingAutomationId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao salvar automação')
                return
            }

            toast.success(editingAutomationId ? 'Automação atualizada com sucesso' : 'Automação criada com sucesso')
            setShowAutomationDialog(false)
            setEditingAutomationId(null)
            setAutomationForm(EMPTY_AUTOMATION_FORM)
            fetchData(true)
        } catch {
            toast.error('Erro ao conectar ao servidor')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleAutomation = async (auto: Automation) => {
        setTogglingAutomationId(auto.id)
        try {
            const res = await fetch('/api/crm/automations', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: auto.id, is_active: !auto.is_active }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao alterar status da automação')
                return
            }
            setAutomations(prev => prev.map(item => item.id === auto.id ? { ...item, is_active: !auto.is_active } : item))
            toast.success(!auto.is_active ? 'Automação ativada' : 'Automação pausada')
        } catch {
            toast.error('Erro ao atualizar automação')
        } finally {
            setTogglingAutomationId(null)
        }
    }

    const handleDeleteAutomation = async (auto: Automation) => {
        if (!confirm(`Tem certeza que deseja excluir a automação "${auto.name}"? Esta ação não pode ser desfeita.`)) {
            return
        }

        try {
            const res = await fetch(`/api/crm/automations?id=${auto.id}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao excluir automação')
                return
            }
            setAutomations(prev => prev.filter(item => item.id !== auto.id))
            toast.success('Automação excluída com sucesso')
        } catch {
            toast.error('Erro ao excluir automação')
        }
    }

    // ── Campanhas CRUD ───────────────────────────────────────────────────────
    const handleCreateCampaign = async (andSend: boolean = false) => {
        if (!campaignForm.name.trim() || !campaignForm.content.trim()) {
            toast.error('Preencha nome e conteúdo da mensagem')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignForm),
            })

            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao criar campanha')
                return
            }

            toast.success('Campanha criada com sucesso')
            setShowNewCampaign(false)
            setCampaignForm(EMPTY_CAMPAIGN_FORM)
            fetchData(true)

            if (andSend && data.campaign) {
                setTimeout(() => {
                    handleSendCampaign(data.campaign)
                }, 300)
            }
        } catch {
            toast.error('Erro ao salvar campanha')
        } finally {
            setSaving(false)
        }
    }

    const handleSendCampaign = async (camp: Campaign) => {
        if (camp.type === 'WHATSAPP') {
            const sectorName = camp.sector || 'financeiro'
            const secStatus = getSectorStatus(sectorName)

            if (!secStatus.connected) {
                const secLabel = SECTOR_OPTIONS.find(o => o.value === sectorName)?.label || sectorName
                toast.error(`O WhatsApp do setor "${secLabel}" está desconectado. Conecte o WhatsApp em Menu > WhatsApp antes de disparar.`, {
                    action: {
                        label: 'Conectar WhatsApp',
                        onClick: () => { window.location.href = '/dashboard/whatsapp' },
                    },
                    duration: 8000,
                })
                return
            }
        }

        if (!confirm(`Deseja disparar a campanha "${camp.name}" para os ${camp.total_recipients} destinatários cadastrados via WhatsApp?\n\nO envio será realizado de forma segura e cadenciada.`)) {
            return
        }

        setSendingCampaignId(camp.id)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    campaign_id: camp.id,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao disparar campanha')
                return
            }

            toast.success(data.message || `Disparo iniciado (${camp.total_recipients} destinatários)`)
            fetchData(true)
        } catch {
            toast.error('Erro ao conectar ao servidor para disparo')
        } finally {
            setSendingCampaignId(null)
        }
    }

    const handleOpenEditCampaign = (camp: Campaign) => {
        setEditingCampaign({ ...camp })
        setShowEditCampaign(true)
    }

    const handleSaveEditCampaign = async () => {
        if (!editingCampaign) return
        if (!editingCampaign.name.trim() || !(editingCampaign.content || '').trim()) {
            toast.error('Preencha nome e conteúdo da mensagem')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingCampaign.id,
                    name: editingCampaign.name,
                    content: editingCampaign.content,
                    subject: editingCampaign.subject,
                    sector: editingCampaign.sector,
                    target_all_patients: editingCampaign.target_all_patients,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao atualizar campanha')
                return
            }
            toast.success('Campanha atualizada com sucesso')
            setShowEditCampaign(false)
            setEditingCampaign(null)
            fetchData(true)
        } catch {
            toast.error('Erro ao conectar ao servidor para atualizar campanha')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!confirm(`Tem certeza que deseja excluir a campanha "${campaignName}"? Esta ação não pode ser desfeita.`)) {
            return
        }

        try {
            const res = await fetch(`/api/crm/campaigns?id=${campaignId}`, {
                method: 'DELETE',
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                toast.error(data.error || 'Erro ao excluir campanha')
                return
            }

            toast.success('Campanha excluída com sucesso')
            fetchData(true)
        } catch {
            toast.error('Erro ao excluir campanha')
        }
    }

    const handleResetCampaign = async (camp: Campaign) => {
        if (!confirm(`Deseja interromper ou redefinir a campanha "${camp.name}" para rascunho? Você poderá dispará-la novamente depois.`)) {
            return
        }

        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reset',
                    campaign_id: camp.id,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao redefinir campanha')
                return
            }

            toast.success('Campanha redefinida para rascunho')
            fetchData(true)
        } catch {
            toast.error('Erro ao conectar ao servidor para redefinir campanha')
        }
    }

    // ── Tarefas e Notas CRUD ─────────────────────────────────────────────────
    const handleOpenNewTask = () => {
        setEditingTaskId(null)
        setTaskForm(EMPTY_TASK_FORM)
        setShowTaskDialog(true)
    }

    const handleOpenEditTask = (note: Note) => {
        setEditingTaskId(note.id)
        setTaskForm({
            content: note.content || '',
            note_type: note.note_type || 'task',
            priority: note.priority || 'normal',
            task_due_date: note.task_due_date ? note.task_due_date.slice(0, 10) : '',
        })
        setShowTaskDialog(true)
    }

    const handleSaveTask = async () => {
        if (!taskForm.content.trim()) {
            toast.error('Descreva a tarefa antes de salvar')
            return
        }

        setSaving(true)
        try {
            const payload = {
                ...(editingTaskId ? { id: editingTaskId } : {}),
                content: taskForm.content.trim(),
                note_type: taskForm.note_type,
                priority: taskForm.priority,
                is_task: true,
                task_due_date: taskForm.task_due_date || null,
            }

            const res = await fetch('/api/crm/notes', {
                method: editingTaskId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao salvar tarefa')
                return
            }

            toast.success(editingTaskId ? 'Tarefa atualizada com sucesso' : 'Tarefa criada com sucesso')
            setShowTaskDialog(false)
            setEditingTaskId(null)
            setTaskForm(EMPTY_TASK_FORM)
            fetchData(true)
        } catch {
            toast.error('Erro ao salvar tarefa')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleTaskComplete = async (note: Note) => {
        const willComplete = !note.task_completed_at
        setTogglingTaskId(note.id)
        try {
            const res = await fetch('/api/crm/notes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: note.id, complete_task: willComplete }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao atualizar tarefa')
                return
            }
            if (data.note) {
                setNotes(prev => prev.map(n => n.id === note.id ? data.note : n))
            } else {
                fetchData(true)
            }
            toast.success(willComplete ? 'Tarefa concluída' : 'Tarefa reaberta')
        } catch {
            toast.error('Erro ao atualizar tarefa')
        } finally {
            setTogglingTaskId(null)
        }
    }

    const handleDeleteTask = async (note: Note) => {
        if (!confirm(`Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.`)) {
            return
        }

        try {
            const res = await fetch(`/api/crm/notes?id=${note.id}`, { method: 'DELETE' })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                toast.error(data.error || 'Erro ao excluir tarefa')
                return
            }
            setNotes(prev => prev.filter(n => n.id !== note.id))
            toast.success('Tarefa excluída com sucesso')
        } catch {
            toast.error('Erro ao excluir tarefa')
        }
    }

    const getCampaignTypeIcon = (type: string) => {
        switch (type) {
            case 'EMAIL': return <Mail className="h-4 w-4" />
            case 'WHATSAPP': return <MessageSquare className="h-4 w-4" />
            case 'PUSH': return <Bell className="h-4 w-4" />
            default: return <Send className="h-4 w-4" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline">Rascunho</Badge>
            case 'SCHEDULED': return <Badge className="bg-blue-600 text-white">Agendada</Badge>
            case 'RUNNING': return <Badge className="bg-amber-500 text-white">Em andamento</Badge>
            case 'COMPLETED': return <Badge className="bg-emerald-600 text-white">Concluída</Badge>
            case 'FAILED': return <Badge variant="destructive">Com falha</Badge>
            case 'CANCELLED': return <Badge variant="destructive">Cancelada</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    const queryLower = searchTerm.trim().toLowerCase()
    const filteredAutomations = queryLower
        ? automations.filter(a => a.name.toLowerCase().includes(queryLower) || (TRIGGER_LABELS[a.trigger] || a.trigger).toLowerCase().includes(queryLower))
        : automations
    const filteredCampaigns = queryLower
        ? campaigns.filter(c => c.name.toLowerCase().includes(queryLower))
        : campaigns
    const filteredNotes = notes.filter(n => {
        if (taskFilter === 'pending' && n.task_completed_at) return false
        if (taskFilter === 'completed' && !n.task_completed_at) return false
        if (queryLower) {
            const matchContent = n.content.toLowerCase().includes(queryLower)
            const matchPatient = (n.patient?.full_name || '').toLowerCase().includes(queryLower)
            return matchContent || matchPatient
        }
        return true
    })

    const activeAutomationsCount = automations.filter(a => a.is_active).length
    const pendingTasksCount = notes.filter(n => !n.task_completed_at).length
    const connectedWhatsAppCount = whatsappSessions.filter(s => s.connected).length

    return (
        <div className="container mx-auto py-6 px-4 space-y-6 max-w-7xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Médico</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Automações, campanhas e tarefas de relacionamento com pacientes
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar no CRM..."
                            className="pl-9 h-9 w-48 sm:w-56 text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="h-9 rounded-md gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button asChild size="sm" className="h-9 rounded-md gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
                        <Link href="/dashboard/crm/pipeline">
                            <TrendingUp className="h-4 w-4" />
                            Pipeline Kanban
                        </Link>
                    </Button>
                </div>
            </div>

            {loading || roleLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                </div>
            ) : !isClinicAdmin && !isSuperAdmin ? null : (
                <>
                    {/* KPI Summary Bar */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="border-slate-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Automações Ativas</p>
                                    <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                                        {activeAutomationsCount} <span className="text-xs font-normal text-muted-foreground">/ {automations.length}</span>
                                    </p>
                                </div>
                                <div className="p-2 rounded-md bg-emerald-50 text-emerald-700">
                                    <Zap className="h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Campanhas</p>
                                    <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{campaigns.length}</p>
                                </div>
                                <div className="p-2 rounded-md bg-blue-50 text-blue-700">
                                    <Send className="h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Tarefas Pendentes</p>
                                    <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{pendingTasksCount}</p>
                                </div>
                                <div className="p-2 rounded-md bg-amber-50 text-amber-700">
                                    <StickyNote className="h-4 w-4" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-slate-200">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">WhatsApp Conectado</p>
                                    <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                                        {connectedWhatsAppCount} <span className="text-xs font-normal text-muted-foreground">setor(es)</span>
                                    </p>
                                </div>
                                <div className={`p-2 rounded-md ${connectedWhatsAppCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {connectedWhatsAppCount > 0 ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="automations">
                        <TabsList className="grid w-full grid-cols-3 lg:w-[440px]">
                            <TabsTrigger value="automations" className="gap-2 rounded-md">
                                <Zap className="h-4 w-4" />
                                Automações
                            </TabsTrigger>
                            <TabsTrigger value="campaigns" className="gap-2 rounded-md">
                                <Send className="h-4 w-4" />
                                Campanhas
                            </TabsTrigger>
                            <TabsTrigger value="tasks" className="gap-2 rounded-md">
                                <StickyNote className="h-4 w-4" />
                                Tarefas ({pendingTasksCount})
                            </TabsTrigger>
                        </TabsList>

                        {/* Automations Tab */}
                        <TabsContent value="automations" className="space-y-4">
                            <div className="flex justify-between items-center gap-3 flex-wrap">
                                <p className="text-sm text-muted-foreground">
                                    {filteredAutomations.length} automação(ões) configurada(s)
                                </p>
                                <Button size="sm" onClick={handleOpenNewAutomation} className="h-9 rounded-md gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Nova Automação
                                </Button>
                            </div>

                            {/* Create / Edit Automation Dialog */}
                            <Dialog open={showAutomationDialog} onOpenChange={setShowAutomationDialog}>
                                <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                                    <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                                        <DialogTitle>{editingAutomationId ? 'Editar Automação' : 'Nova Automação'}</DialogTitle>
                                        <DialogDescription>Configure o gatilho e a ação automática para o relacionamento</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Nome *</Label>
                                            <Input
                                                value={automationForm.name}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Ex: Lembrete de consulta 24h"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Quando Executar (Gatilho) *</Label>
                                                <Select
                                                    value={automationForm.trigger}
                                                    onValueChange={(v) => setAutomationForm(f => ({ ...f, trigger: v }))}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Ação</Label>
                                                <Select
                                                    value={automationForm.action_type}
                                                    onValueChange={(v) => setAutomationForm(f => ({ ...f, action_type: v }))}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="send_whatsapp">Enviar via WhatsApp</SelectItem>
                                                        <SelectItem value="send_email">Enviar Email</SelectItem>
                                                        <SelectItem value="create_task">Criar Tarefa</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Descrição</Label>
                                            <Input
                                                value={automationForm.description}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="Resumo objetivo desta automação"
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Mensagem / Template</Label>
                                            <Textarea
                                                value={automationForm.action_template}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, action_template: e.target.value }))}
                                                placeholder="Olá {{patient_name}}, lembramos da sua consulta na {{clinic_name}}."
                                                rows={3}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Variáveis disponíveis: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                            </p>
                                        </div>
                                    </div>
                                    <DialogFooter className="px-5 py-3 border-t bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAutomationDialog(false)}
                                            disabled={saving}
                                            className="h-9 rounded-md"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveAutomation}
                                            disabled={saving}
                                            className="h-9 rounded-md gap-1.5"
                                        >
                                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                            {editingAutomationId ? 'Salvar Alterações' : 'Criar Automação'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {filteredAutomations.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Zap className="h-10 w-10 text-muted-foreground mb-3" />
                                        <h3 className="font-medium text-slate-900">Nenhuma automação encontrada</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Crie sua primeira regra de automação para agilizar o atendimento</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-3">
                                    {filteredAutomations.map((auto) => (
                                        <Card key={auto.id} className="border-slate-200">
                                            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                                                <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-md shrink-0 ${auto.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Zap className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-slate-900 truncate">{auto.name}</h3>
                                                        <p className="text-xs text-muted-foreground">
                                                            Gatilho: {TRIGGER_LABELS[auto.trigger] || auto.trigger}
                                                            {auto.description ? ` • ${auto.description}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
                                                    <div className="text-right text-xs text-muted-foreground mr-1">
                                                        <p className="font-medium text-slate-700">{auto.total_triggered || 0} execuções</p>
                                                        {auto.last_triggered_at && (
                                                            <p>
                                                                Última: {formatDistanceToNow(new Date(auto.last_triggered_at), { addSuffix: true, locale: ptBR })}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            checked={auto.is_active}
                                                            disabled={togglingAutomationId === auto.id}
                                                            onCheckedChange={() => handleToggleAutomation(auto)}
                                                            aria-label={auto.is_active ? 'Desativar automação' : 'Ativar automação'}
                                                        />
                                                        <Badge variant={auto.is_active ? 'default' : 'secondary'}>
                                                            {auto.is_active ? 'Ativa' : 'Inativa'}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleOpenEditAutomation(auto)}
                                                        className="h-9 rounded-md gap-1.5"
                                                        title="Editar automação"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleDeleteAutomation(auto)}
                                                        className="h-9 w-9 p-0 rounded-md text-red-600 border-red-200 hover:bg-red-50"
                                                        title="Excluir automação"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Campaigns Tab */}
                        <TabsContent value="campaigns" className="space-y-4">
                            <div className="flex justify-between items-center gap-3 flex-wrap">
                                <p className="text-sm text-muted-foreground">
                                    {filteredCampaigns.length} campanha(s)
                                </p>
                                <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
                                    <DialogTrigger asChild>
                                        <Button size="sm" className="h-9 rounded-md gap-1.5">
                                            <Plus className="h-4 w-4" />
                                            Nova Campanha
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                                        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                                            <DialogTitle>Nova Campanha</DialogTitle>
                                            <DialogDescription>Crie uma campanha de comunicação para os pacientes da clínica</DialogDescription>
                                        </DialogHeader>
                                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">Nome *</Label>
                                                    <Input
                                                        value={campaignForm.name}
                                                        onChange={(e) => setCampaignForm(f => ({ ...f, name: e.target.value }))}
                                                        placeholder="Ex: Campanha de Retorno"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">Canal</Label>
                                                    <Select
                                                        value={campaignForm.type}
                                                        onValueChange={(v) => setCampaignForm(f => ({ ...f, type: v }))}
                                                    >
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                                            <SelectItem value="EMAIL">Email</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {campaignForm.type === 'EMAIL' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">Assunto</Label>
                                                    <Input
                                                        value={campaignForm.subject}
                                                        onChange={(e) => setCampaignForm(f => ({ ...f, subject: e.target.value }))}
                                                        placeholder="Assunto do email"
                                                        className="h-9"
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Mensagem *</Label>
                                                <Textarea
                                                    value={campaignForm.content}
                                                    onChange={(e) => setCampaignForm(f => ({ ...f, content: e.target.value }))}
                                                    placeholder="Olá {{patient_name}}..."
                                                    rows={3}
                                                />
                                                <p className="text-[11px] text-muted-foreground">
                                                    Variáveis: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between py-1">
                                                <Label className="text-xs font-medium">Enviar para todos os pacientes ativos</Label>
                                                <Switch
                                                    checked={campaignForm.target_all_patients}
                                                    onCheckedChange={(v) => setCampaignForm(f => ({ ...f, target_all_patients: v }))}
                                                />
                                            </div>
                                            {campaignForm.type === 'WHATSAPP' && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-medium">WhatsApp de Envio (Setor)</Label>
                                                    <Select
                                                        value={campaignForm.sector}
                                                        onValueChange={(v) => setCampaignForm(f => ({ ...f, sector: v }))}
                                                    >
                                                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {SECTOR_OPTIONS.map(opt => {
                                                                const status = getSectorStatus(opt.value)
                                                                return (
                                                                    <SelectItem key={opt.value} value={opt.value}>
                                                                        {opt.label} ({status.connected ? 'Conectado' : 'Desconectado'})
                                                                    </SelectItem>
                                                                )
                                                            })}
                                                        </SelectContent>
                                                    </Select>
                                                    {!getSectorStatus(campaignForm.sector).connected && (
                                                        <div className="flex items-center justify-between p-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                                                            <span>O setor selecionado está desconectado. Conecte antes de disparar.</span>
                                                            <Link href="/dashboard/whatsapp" className="text-blue-700 underline font-medium hover:text-blue-900 ml-2 shrink-0">
                                                                Conectar WhatsApp
                                                            </Link>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <DialogFooter className="px-5 py-3 border-t bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2 flex-wrap">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowNewCampaign(false)}
                                                disabled={saving}
                                                className="h-9 rounded-md"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCreateCampaign(false)}
                                                disabled={saving}
                                                className="h-9 rounded-md gap-1.5"
                                            >
                                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                                Salvar Rascunho
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => handleCreateCampaign(true)}
                                                disabled={saving}
                                                className="h-9 rounded-md gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                Salvar e Disparar
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {/* Edit Campaign Dialog */}
                                <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
                                    <DialogContent className="sm:max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                                        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                                            <DialogTitle>Editar Campanha</DialogTitle>
                                            <DialogDescription>Altere as configurações, setor de envio ou mensagem da campanha</DialogDescription>
                                        </DialogHeader>
                                        {editingCampaign && (
                                            <>
                                                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium">Nome *</Label>
                                                        <Input
                                                            value={editingCampaign.name}
                                                            onChange={(e) => setEditingCampaign(c => c ? { ...c, name: e.target.value } : null)}
                                                            placeholder="Nome da campanha"
                                                            className="h-9"
                                                        />
                                                    </div>
                                                    {editingCampaign.type === 'EMAIL' && (
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-medium">Assunto</Label>
                                                            <Input
                                                                value={editingCampaign.subject || ''}
                                                                onChange={(e) => setEditingCampaign(c => c ? { ...c, subject: e.target.value } : null)}
                                                                placeholder="Assunto do email"
                                                                className="h-9"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs font-medium">Mensagem *</Label>
                                                        <Textarea
                                                            value={editingCampaign.content || ''}
                                                            onChange={(e) => setEditingCampaign(c => c ? { ...c, content: e.target.value } : null)}
                                                            rows={3}
                                                        />
                                                        <p className="text-[11px] text-muted-foreground">
                                                            Variáveis: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center justify-between py-1">
                                                        <Label className="text-xs font-medium">Enviar para todos os pacientes ativos</Label>
                                                        <Switch
                                                            checked={editingCampaign.target_all_patients ?? true}
                                                            onCheckedChange={(v) => setEditingCampaign(c => c ? { ...c, target_all_patients: v } : null)}
                                                        />
                                                    </div>
                                                    {editingCampaign.type === 'WHATSAPP' && (
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-medium">WhatsApp de Envio (Setor)</Label>
                                                            <Select
                                                                value={editingCampaign.sector || 'financeiro'}
                                                                onValueChange={(v) => setEditingCampaign(c => c ? { ...c, sector: v } : null)}
                                                            >
                                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    {SECTOR_OPTIONS.map(opt => {
                                                                        const status = getSectorStatus(opt.value)
                                                                        return (
                                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                                {opt.label} ({status.connected ? 'Conectado' : 'Desconectado'})
                                                                            </SelectItem>
                                                                        )
                                                                    })}
                                                                </SelectContent>
                                                            </Select>
                                                            {!getSectorStatus(editingCampaign.sector || 'financeiro').connected && (
                                                                <div className="flex items-center justify-between p-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-xs">
                                                                    <span>O setor selecionado está desconectado. Conecte antes de disparar.</span>
                                                                    <Link href="/dashboard/whatsapp" className="text-blue-700 underline font-medium hover:text-blue-900 ml-2 shrink-0">
                                                                        Conectar WhatsApp
                                                                    </Link>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <DialogFooter className="px-5 py-3 border-t bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setShowEditCampaign(false)}
                                                        disabled={saving}
                                                        className="h-9 rounded-md"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={handleSaveEditCampaign}
                                                        disabled={saving}
                                                        className="h-9 rounded-md gap-1.5"
                                                    >
                                                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                                        Salvar Alterações
                                                    </Button>
                                                </DialogFooter>
                                            </>
                                        )}
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {filteredCampaigns.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Send className="h-10 w-10 text-muted-foreground mb-3" />
                                        <h3 className="font-medium text-slate-900">Nenhuma campanha encontrada</h3>
                                        <p className="text-muted-foreground text-sm mt-1">Crie sua primeira campanha para engajar pacientes</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-3">
                                    {filteredCampaigns.map((camp) => (
                                        <Card key={camp.id} className="border-slate-200">
                                            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="p-2 bg-blue-50 text-blue-700 rounded-md shrink-0">
                                                        {getCampaignTypeIcon(camp.type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-slate-900 truncate">{camp.name}</h3>
                                                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                                                            <span>{camp.total_recipients} destinatários</span>
                                                            {camp.type === 'WHATSAPP' && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>Setor: {SECTOR_OPTIONS.find(o => o.value === (camp.sector || 'financeiro'))?.label || camp.sector || 'Financeiro'}</span>
                                                                    {getSectorStatus(camp.sector || 'financeiro').connected ? (
                                                                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 text-[11px] gap-1 py-0 px-1.5 h-5">
                                                                            <Wifi className="h-2.5 w-2.5" /> WhatsApp Online
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50 text-[11px] gap-1 py-0 px-1.5 h-5">
                                                                            <WifiOff className="h-2.5 w-2.5" /> WhatsApp Desconectado
                                                                        </Badge>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                                                    <div className="text-right text-xs mr-1">
                                                        <p className="font-medium text-slate-800">{camp.sent_count} enviados de {camp.total_recipients}</p>
                                                        {camp.type === 'EMAIL' ? (
                                                            <p className="text-muted-foreground">{camp.opened_count} abertos</p>
                                                        ) : (camp.error_count ?? 0) > 0 ? (
                                                            <p className="text-red-600 font-medium">{camp.error_count} falha(s)</p>
                                                        ) : null}
                                                    </div>
                                                    {getStatusBadge(camp.status)}
                                                    {camp.type === 'WHATSAPP' && camp.status !== 'COMPLETED' && (
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-600 hover:bg-emerald-700 h-9 rounded-md gap-1.5 text-white"
                                                            onClick={() => handleSendCampaign(camp)}
                                                            disabled={sendingCampaignId === camp.id || camp.status === 'RUNNING'}
                                                        >
                                                            {sendingCampaignId === camp.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <Send className="h-3.5 w-3.5" />
                                                            )}
                                                            {camp.status === 'RUNNING' ? 'Enviando...' : (sendingCampaignId === camp.id ? 'Iniciando...' : (camp.status === 'FAILED' ? 'Tentar novamente' : 'Disparar WhatsApp'))}
                                                        </Button>
                                                    )}
                                                    {camp.status === 'FAILED' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-9 rounded-md gap-1.5"
                                                            onClick={() => handleResetCampaign(camp)}
                                                            title="Redefinir para rascunho e zerar falhas"
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            Redefinir
                                                        </Button>
                                                    )}
                                                    {(camp.status === 'DRAFT' || camp.status === 'FAILED') && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-slate-700 border-slate-200 hover:bg-slate-50 h-9 rounded-md gap-1.5"
                                                            onClick={() => handleOpenEditCampaign(camp)}
                                                            title="Editar campanha"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                            Editar
                                                        </Button>
                                                    )}
                                                    {camp.status === 'RUNNING' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-amber-700 border-amber-200 hover:bg-amber-50 h-9 rounded-md gap-1.5"
                                                            onClick={() => handleResetCampaign(camp)}
                                                            title="Interromper envio"
                                                        >
                                                            <Pause className="h-3.5 w-3.5" />
                                                            Interromper
                                                        </Button>
                                                    )}
                                                    {camp.type === 'WHATSAPP' && !getSectorStatus(camp.sector || 'financeiro').connected && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            asChild
                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50 h-9 rounded-md gap-1.5"
                                                        >
                                                            <Link href="/dashboard/whatsapp">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                                Conectar
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 border-red-200 hover:bg-red-50 h-9 w-9 p-0 rounded-md"
                                                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                                                        title="Excluir campanha"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Tasks Tab */}
                        <TabsContent value="tasks" className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                        variant={taskFilter === 'pending' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTaskFilter('pending')}
                                        className="h-8 rounded-md text-xs"
                                    >
                                        Pendentes ({pendingTasksCount})
                                    </Button>
                                    <Button
                                        variant={taskFilter === 'completed' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTaskFilter('completed')}
                                        className="h-8 rounded-md text-xs"
                                    >
                                        Concluídas ({notes.length - pendingTasksCount})
                                    </Button>
                                    <Button
                                        variant={taskFilter === 'all' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setTaskFilter('all')}
                                        className="h-8 rounded-md text-xs"
                                    >
                                        Todas ({notes.length})
                                    </Button>
                                </div>
                                <Button size="sm" onClick={handleOpenNewTask} className="h-9 rounded-md gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Nova Tarefa
                                </Button>
                            </div>

                            {/* Create / Edit Task Dialog */}
                            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                                <DialogContent className="sm:max-w-lg max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
                                    <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
                                        <DialogTitle>{editingTaskId ? 'Editar Tarefa' : 'Nova Tarefa do CRM'}</DialogTitle>
                                        <DialogDescription>Registre acompanhamentos, retornos e pendências da equipe</DialogDescription>
                                    </DialogHeader>
                                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Descrição da Tarefa *</Label>
                                            <Textarea
                                                value={taskForm.content}
                                                onChange={e => setTaskForm(f => ({ ...f, content: e.target.value }))}
                                                placeholder="Ex: Ligar para confirmar retorno de avaliação..."
                                                rows={3}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Prioridade</Label>
                                                <Select
                                                    value={taskForm.priority}
                                                    onValueChange={v => setTaskForm(f => ({ ...f, priority: v }))}
                                                >
                                                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="low">Baixa</SelectItem>
                                                        <SelectItem value="normal">Normal</SelectItem>
                                                        <SelectItem value="high">Alta</SelectItem>
                                                        <SelectItem value="urgent">Urgente</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-medium">Prazo (opcional)</Label>
                                                <Input
                                                    type="date"
                                                    value={taskForm.task_due_date}
                                                    onChange={e => setTaskForm(f => ({ ...f, task_due_date: e.target.value }))}
                                                    className="h-9"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Categoria</Label>
                                            <Select
                                                value={taskForm.note_type}
                                                onValueChange={v => setTaskForm(f => ({ ...f, note_type: v }))}
                                            >
                                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="task">Tarefa Operacional</SelectItem>
                                                    <SelectItem value="follow_up">Retorno de Paciente</SelectItem>
                                                    <SelectItem value="financial">Financeiro</SelectItem>
                                                    <SelectItem value="clinical">Clínico</SelectItem>
                                                    <SelectItem value="general">Geral</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter className="px-5 py-3 border-t bg-slate-50/70 shrink-0 flex flex-row justify-end gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowTaskDialog(false)}
                                            disabled={saving}
                                            className="h-9 rounded-md"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleSaveTask}
                                            disabled={saving}
                                            className="h-9 rounded-md gap-1.5"
                                        >
                                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                            {editingTaskId ? 'Salvar Alterações' : 'Criar Tarefa'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {filteredNotes.length === 0 ? (
                                <Card>
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <CheckCircle className="h-10 w-10 text-emerald-600 mb-3" />
                                        <h3 className="font-medium text-slate-900">Tudo em dia</h3>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            {taskFilter === 'pending' ? 'Nenhuma tarefa pendente no momento' : 'Nenhuma tarefa encontrada neste filtro'}
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid gap-2.5">
                                    {filteredNotes.map((note) => {
                                        const isCompleted = Boolean(note.task_completed_at)
                                        const prio = PRIORITY_META[note.priority] || PRIORITY_META.normal
                                        const isOverdue = !isCompleted && note.task_due_date && new Date(note.task_due_date) < new Date()

                                        return (
                                            <Card key={note.id} className="border-slate-200">
                                                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5">
                                                    <div className="flex items-start gap-3 min-w-0">
                                                        <Button
                                                            type="button"
                                                            variant={isCompleted ? 'default' : 'outline'}
                                                            size="sm"
                                                            disabled={togglingTaskId === note.id}
                                                            onClick={() => handleToggleTaskComplete(note)}
                                                            className={`h-8 w-8 p-0 rounded-md shrink-0 mt-0.5 ${isCompleted ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                                            title={isCompleted ? 'Reabrir tarefa' : 'Marcar como concluída'}
                                                        >
                                                            {togglingTaskId === note.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : isCompleted ? (
                                                                <Check className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                            )}
                                                        </Button>
                                                        <div className="min-w-0">
                                                            <p className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-slate-900'}`}>
                                                                {note.content}
                                                            </p>
                                                            <div className="flex items-center gap-2 flex-wrap mt-1 text-xs text-muted-foreground">
                                                                {note.patient && (
                                                                    <Link
                                                                        href={`/dashboard/pacientes/${note.patient.id}`}
                                                                        className="text-blue-700 hover:underline font-medium"
                                                                    >
                                                                        {note.patient.full_name}
                                                                    </Link>
                                                                )}
                                                                <Badge variant="outline" className={`text-[11px] py-0 h-5 ${prio.className}`}>
                                                                    {prio.label}
                                                                </Badge>
                                                                {note.task_due_date && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[11px] py-0 h-5 gap-1 ${isOverdue ? 'border-rose-200 bg-rose-50 text-rose-700' : ''}`}
                                                                    >
                                                                        <Calendar className="h-3 w-3" />
                                                                        {new Date(note.task_due_date).toLocaleDateString('pt-BR')}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 justify-end shrink-0">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleOpenEditTask(note)}
                                                            className="h-8 rounded-md gap-1.5 text-xs"
                                                            title="Editar tarefa"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteTask(note)}
                                                            className="h-8 w-8 p-0 rounded-md text-red-600 border-red-200 hover:bg-red-50"
                                                            title="Excluir tarefa"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    )
}
