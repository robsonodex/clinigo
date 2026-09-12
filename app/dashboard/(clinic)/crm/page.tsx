'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
    Zap, Send, StickyNote, Users, Plus, Loader2,
    Calendar, CheckCircle, Clock, Play, Pause, Mail,
    MessageSquare, Smartphone, Bell, Trash2,
    RotateCcw, Edit3, Wifi, WifiOff, ExternalLink, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Automation {
    id: string
    name: string
    description: string
    trigger: string
    actions: any[]
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

const SECTOR_OPTIONS = [
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'default', label: 'Principal' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'clinico', label: 'Clínico' }
]

interface Note {
    id: string
    content: string
    note_type: string
    is_task: boolean
    task_due_date: string | null
    task_completed_at: string | null
    priority: string
    created_at: string
    patient: { full_name: string } | null
}

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
    FOLLOW_UP_DUE: 'Retorno'
}

export default function CRMPage() {
    const [loading, setLoading] = useState(true)
    const [automations, setAutomations] = useState<Automation[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [notes, setNotes] = useState<Note[]>([])
    const [whatsappSessions, setWhatsappSessions] = useState<WhatsAppSessionItem[]>([])
    const [showNewAutomation, setShowNewAutomation] = useState(false)
    const [showNewCampaign, setShowNewCampaign] = useState(false)
    const [showEditCampaign, setShowEditCampaign] = useState(false)
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
    const [saving, setSaving] = useState(false)

    // Automation form
    const [automationForm, setAutomationForm] = useState({
        name: '',
        description: '',
        trigger: '',
        action_type: 'send_whatsapp',
        action_template: ''
    })

    // Campaign form
    const [campaignForm, setCampaignForm] = useState({
        name: '',
        type: 'WHATSAPP',
        content: '',
        subject: '',
        sector: 'financeiro',
        target_all_patients: true
    })
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null)

    const getSectorStatus = (sectorName: string = 'financeiro') => {
        const s = whatsappSessions.find(item => item.sector === sectorName)
        return {
            connected: s?.connected || false,
            status: s?.status || 'disconnected',
            phone: s?.phone_number || null
        }
    }

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true)
        }
        try {
            const [autoRes, campRes, notesRes, waRes] = await Promise.all([
                fetch('/api/crm/automations'),
                fetch('/api/crm/campaigns'),
                fetch('/api/crm/notes?tasks_only=true&pending_only=true'),
                fetch('/api/whatsapp/status?sector=all').catch(() => null)
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
                        connected: s.status === 'connected'
                    })))
                }
            }
        } catch (error) {
            console.error('Error fetching CRM data:', error)
        } finally {
            if (!silent) {
                setLoading(false)
            }
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    useEffect(() => {
        const hasRunning = campaigns.some(c => c.status === 'RUNNING')
        if (!hasRunning) return

        const interval = setInterval(() => {
            fetchData(true)
        }, 3000)

        return () => clearInterval(interval)
    }, [campaigns, fetchData])

    const handleCreateAutomation = async () => {
        if (!automationForm.name || !automationForm.trigger) {
            toast.error('Preencha nome e gatilho')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/crm/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: automationForm.name,
                    description: automationForm.description,
                    trigger: automationForm.trigger,
                    actions: [{
                        type: automationForm.action_type,
                        template: automationForm.action_template
                    }]
                })
            })

            if (!res.ok) {
                toast.error('Erro ao criar automação')
                return
            }

            toast.success('Automação criada!')
            setShowNewAutomation(false)
            setAutomationForm({ name: '', description: '', trigger: '', action_type: 'send_whatsapp', action_template: '' })
            fetchData()
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const handleCreateCampaign = async (andSend: boolean = false) => {
        if (!campaignForm.name || !campaignForm.content) {
            toast.error('Preencha nome e conteúdo da mensagem')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignForm)
            })

            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao criar campanha')
                return
            }

            toast.success('Campanha criada com sucesso!')
            setShowNewCampaign(false)
            setCampaignForm({ name: '', type: 'WHATSAPP', content: '', subject: '', sector: 'financeiro', target_all_patients: true })
            fetchData()

            if (andSend && data.campaign) {
                setTimeout(() => {
                    handleSendCampaign(data.campaign)
                }, 300)
            }
        } catch (error) {
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
                        onClick: () => { window.location.href = '/dashboard/whatsapp' }
                    },
                    duration: 8000
                })
                return
            }
        }

        if (!confirm(`Deseja disparar a campanha "${camp.name}" para os ${camp.total_recipients} destinatários cadastrados via WhatsApp?\n\nO envio será realizado de forma segura e cadenciada para proteção do seu número.`)) {
            return
        }

        setSendingCampaignId(camp.id)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'send',
                    campaign_id: camp.id
                })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao disparar campanha')
                return
            }

            toast.success(data.message || `Disparo iniciado com sucesso! (${camp.total_recipients} destinatários)`)
            fetchData()
        } catch (error) {
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
        if (!editingCampaign.name || !editingCampaign.content) {
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
                    target_all_patients: editingCampaign.target_all_patients
                })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao atualizar campanha')
                return
            }
            toast.success('Campanha atualizada com sucesso!')
            setShowEditCampaign(false)
            setEditingCampaign(null)
            fetchData()
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
                method: 'DELETE'
            })
            if (!res.ok) {
                const data = await res.json()
                toast.error(data.error || 'Erro ao excluir campanha')
                return
            }

            toast.success('Campanha excluída com sucesso')
            fetchData()
        } catch (error) {
            toast.error('Erro ao excluir campanha')
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
                    campaign_id: camp.id
                })
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(data.error || 'Erro ao redefinir campanha')
                return
            }

            toast.success('Campanha redefinida para rascunho com sucesso!')
            fetchData()
        } catch (error) {
            toast.error('Erro ao conectar ao servidor para redefinir campanha')
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="outline">Rascunho</Badge>
            case 'SCHEDULED': return <Badge className="bg-blue-500">Agendada</Badge>
            case 'RUNNING': return <Badge className="bg-yellow-500">Em andamento</Badge>
            case 'COMPLETED': return <Badge className="bg-green-500">Concluída</Badge>
            case 'FAILED': return <Badge variant="destructive">Com falha</Badge>
            case 'CANCELLED': return <Badge variant="destructive">Cancelada</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">CRM Médico</h1>
                <p className="text-muted-foreground">
                    Automações, campanhas e relacionamento com pacientes
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <Tabs defaultValue="automations">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="automations" className="gap-2">
                            <Zap className="h-4 w-4" />
                            Automações
                        </TabsTrigger>
                        <TabsTrigger value="campaigns" className="gap-2">
                            <Send className="h-4 w-4" />
                            Campanhas
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="gap-2">
                            <StickyNote className="h-4 w-4" />
                            Tarefas
                        </TabsTrigger>
                    </TabsList>

                    {/* Automations Tab */}
                    <TabsContent value="automations" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                {automations.length} automação(ões) configurada(s)
                            </p>
                            <Dialog open={showNewAutomation} onOpenChange={setShowNewAutomation}>
                                <DialogTrigger asChild>
                                    <Button><Plus className="h-4 w-4 mr-2" />Nova Automação</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Nova Automação</DialogTitle>
                                        <DialogDescription>Configure uma ação automática</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input
                                                value={automationForm.name}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Ex: Lembrete de consulta"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Quando Executar (Gatilho)</Label>
                                            <Select
                                                value={automationForm.trigger}
                                                onValueChange={(v) => setAutomationForm(f => ({ ...f, trigger: v }))}
                                            >
                                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Ação</Label>
                                            <Select
                                                value={automationForm.action_type}
                                                onValueChange={(v) => setAutomationForm(f => ({ ...f, action_type: v }))}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="send_whatsapp">Compartilhar no WhatsApp</SelectItem>
                                                    <SelectItem value="send_email">Enviar Email</SelectItem>
                                                    <SelectItem value="create_task">Criar Tarefa</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Descrição</Label>
                                            <Textarea
                                                value={automationForm.description}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, description: e.target.value }))}
                                                placeholder="Descrição da automação..."
                                                rows={2}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mensagem / Template</Label>
                                            <Textarea
                                                value={automationForm.action_template}
                                                onChange={(e) => setAutomationForm(f => ({ ...f, action_template: e.target.value }))}
                                                placeholder="Olá {{patient_name}}, feliz aniversário! Desejamos muitas felicidades e saúde. Equipe {{clinic_name}}."
                                                rows={3}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Use: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                            </p>
                                        </div>
                                        <Button onClick={handleCreateAutomation} disabled={saving} className="w-full">
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Criar Automação
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {automations.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="font-medium">Nenhuma automação</h3>
                                    <p className="text-muted-foreground text-sm">Crie sua primeira automação</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {automations.map((auto) => (
                                    <Card key={auto.id}>
                                        <CardContent className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${auto.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                                                    <Zap className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{auto.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {TRIGGER_LABELS[auto.trigger] || auto.trigger}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right text-sm">
                                                    <p>{auto.total_triggered} execuções</p>
                                                    {auto.last_triggered_at && (
                                                        <p className="text-muted-foreground">
                                                            Última: {formatDistanceToNow(new Date(auto.last_triggered_at), { addSuffix: true, locale: ptBR })}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant={auto.is_active ? 'default' : 'secondary'}>
                                                    {auto.is_active ? 'Ativa' : 'Inativa'}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Campaigns Tab */}
                    <TabsContent value="campaigns" className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                {campaigns.length} campanha(s)
                            </p>
                            <Dialog open={showNewCampaign} onOpenChange={setShowNewCampaign}>
                                <DialogTrigger asChild>
                                    <Button><Plus className="h-4 w-4 mr-2" />Nova Campanha</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Nova Campanha</DialogTitle>
                                        <DialogDescription>Crie uma campanha de comunicação</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input
                                                value={campaignForm.name}
                                                onChange={(e) => setCampaignForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Ex: Promoção de Janeiro"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Canal</Label>
                                            <Select
                                                value={campaignForm.type}
                                                onValueChange={(v) => setCampaignForm(f => ({ ...f, type: v }))}
                                            >
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="WHATSAPP">WhatsApp (Compartilhar)</SelectItem>
                                                    <SelectItem value="EMAIL">Email</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {campaignForm.type === 'EMAIL' && (
                                            <div className="space-y-2">
                                                <Label>Assunto</Label>
                                                <Input
                                                    value={campaignForm.subject}
                                                    onChange={(e) => setCampaignForm(f => ({ ...f, subject: e.target.value }))}
                                                    placeholder="Assunto do email"
                                                />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label>Mensagem</Label>
                                            <Textarea
                                                value={campaignForm.content}
                                                onChange={(e) => setCampaignForm(f => ({ ...f, content: e.target.value }))}
                                                placeholder="Olá {{patient_name}}..."
                                                rows={4}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Use: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Enviar para todos os pacientes</Label>
                                            <Switch
                                                checked={campaignForm.target_all_patients}
                                                onCheckedChange={(v) => setCampaignForm(f => ({ ...f, target_all_patients: v }))}
                                            />
                                        </div>
                                        {campaignForm.type === 'WHATSAPP' && (
                                            <div className="space-y-2">
                                                <Label>WhatsApp de Envio (Setor)</Label>
                                                <Select
                                                    value={campaignForm.sector}
                                                    onValueChange={(v) => setCampaignForm(f => ({ ...f, sector: v }))}
                                                >
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                            <Button variant="outline" onClick={() => handleCreateCampaign(false)} disabled={saving} className="w-full min-h-[44px]">
                                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                                                Salvar Rascunho
                                            </Button>
                                            <Button onClick={() => handleCreateCampaign(true)} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 min-h-[44px]">
                                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                                Salvar e Disparar
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Edit Campaign Dialog */}
                            <Dialog open={showEditCampaign} onOpenChange={setShowEditCampaign}>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Editar Campanha</DialogTitle>
                                        <DialogDescription>Altere as configurações, setor de envio ou mensagem da campanha</DialogDescription>
                                    </DialogHeader>
                                    {editingCampaign && (
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Nome</Label>
                                                <Input
                                                    value={editingCampaign.name}
                                                    onChange={(e) => setEditingCampaign(c => c ? { ...c, name: e.target.value } : null)}
                                                    placeholder="Nome da campanha"
                                                />
                                            </div>
                                            {editingCampaign.type === 'EMAIL' && (
                                                <div className="space-y-2">
                                                    <Label>Assunto</Label>
                                                    <Input
                                                        value={editingCampaign.subject || ''}
                                                        onChange={(e) => setEditingCampaign(c => c ? { ...c, subject: e.target.value } : null)}
                                                        placeholder="Assunto do email"
                                                    />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                <Label>Mensagem</Label>
                                                <Textarea
                                                    value={editingCampaign.content || ''}
                                                    onChange={(e) => setEditingCampaign(c => c ? { ...c, content: e.target.value } : null)}
                                                    rows={4}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Use: {'{{patient_name}}'}, {'{{clinic_name}}'}, {'{{doctor_name}}'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Enviar para todos os pacientes</Label>
                                                <Switch
                                                    checked={editingCampaign.target_all_patients ?? true}
                                                    onCheckedChange={(v) => setEditingCampaign(c => c ? { ...c, target_all_patients: v } : null)}
                                                />
                                            </div>
                                            {editingCampaign.type === 'WHATSAPP' && (
                                                <div className="space-y-2">
                                                    <Label>WhatsApp de Envio (Setor)</Label>
                                                    <Select
                                                        value={editingCampaign.sector || 'financeiro'}
                                                        onValueChange={(v) => setEditingCampaign(c => c ? { ...c, sector: v } : null)}
                                                    >
                                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button variant="outline" onClick={() => setShowEditCampaign(false)} disabled={saving} className="min-h-[44px]">
                                                    Cancelar
                                                </Button>
                                                <Button onClick={handleSaveEditCampaign} disabled={saving} className="bg-primary hover:bg-primary/90 min-h-[44px]">
                                                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                    Salvar Alterações
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>

                        {campaigns.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Send className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="font-medium">Nenhuma campanha</h3>
                                    <p className="text-muted-foreground text-sm">Crie sua primeira campanha</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {campaigns.map((camp) => (
                                    <Card key={camp.id}>
                                        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                                                    {getCampaignTypeIcon(camp.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-base">{camp.name}</h3>
                                                    <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-0.5">
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
                                                <div className="text-right text-sm">
                                                    <p className="font-medium">{camp.sent_count} enviados de {camp.total_recipients}</p>
                                                    {camp.type === 'EMAIL' ? (
                                                        <p className="text-muted-foreground">{camp.opened_count} abertos</p>
                                                    ) : (
                                                        (camp.error_count ?? 0) > 0 ? (
                                                            <p className="text-red-500 font-medium">{camp.error_count} falha(s)</p>
                                                        ) : null
                                                    )}
                                                </div>
                                                {getStatusBadge(camp.status)}
                                                {camp.type === 'WHATSAPP' && camp.status !== 'COMPLETED' && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 min-h-[44px] gap-1.5 text-white"
                                                        onClick={() => handleSendCampaign(camp)}
                                                        disabled={sendingCampaignId === camp.id || camp.status === 'RUNNING'}
                                                    >
                                                        {sendingCampaignId === camp.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Send className="h-4 w-4" />
                                                        )}
                                                        {camp.status === 'RUNNING' ? 'Enviando...' : (sendingCampaignId === camp.id ? 'Iniciando...' : (camp.status === 'FAILED' ? 'Tentar novamente' : 'Disparar WhatsApp'))}
                                                    </Button>
                                                )}
                                                {camp.status === 'FAILED' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 min-h-[44px] gap-1.5"
                                                        onClick={() => handleResetCampaign(camp)}
                                                        title="Redefinir para rascunho e zerar falhas"
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                        Redefinir
                                                    </Button>
                                                )}
                                                {(camp.status === 'DRAFT' || camp.status === 'FAILED') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-slate-700 border-slate-200 hover:bg-slate-50 min-h-[44px] gap-1.5"
                                                        onClick={() => handleOpenEditCampaign(camp)}
                                                        title="Editar campanha"
                                                    >
                                                        <Edit3 className="h-4 w-4" />
                                                        Editar
                                                    </Button>
                                                )}
                                                {camp.status === 'RUNNING' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-amber-600 border-amber-200 hover:bg-amber-50 min-h-[44px] gap-1.5"
                                                        onClick={() => handleResetCampaign(camp)}
                                                        title="Interromper envio"
                                                    >
                                                        <Pause className="h-4 w-4" />
                                                        Interromper
                                                    </Button>
                                                )}
                                                {camp.type === 'WHATSAPP' && !getSectorStatus(camp.sector || 'financeiro').connected && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                        className="text-blue-600 border-blue-200 hover:bg-blue-50 min-h-[44px] gap-1.5"
                                                    >
                                                        <Link href="/dashboard/whatsapp">
                                                            <ExternalLink className="h-4 w-4" />
                                                            Conectar
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600 border-red-200 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                                                    onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                                                    title="Excluir campanha"
                                                >
                                                    <Trash2 className="h-4 w-4" />
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
                        <p className="text-sm text-muted-foreground">
                            {notes.filter(n => !n.task_completed_at).length} tarefa(s) pendente(s)
                        </p>

                        {notes.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                                    <h3 className="font-medium">Tudo em dia!</h3>
                                    <p className="text-muted-foreground text-sm">Nenhuma tarefa pendente</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-2">
                                {notes.map((note) => (
                                    <Card key={note.id}>
                                        <CardContent className="flex items-center justify-between py-3">
                                            <div className="flex items-center gap-3">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm">{note.content}</p>
                                                    {note.patient && (
                                                        <p className="text-xs text-muted-foreground">{note.patient.full_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            {note.task_due_date && (
                                                <Badge variant="outline">
                                                    <Calendar className="h-3 w-3 mr-1" />
                                                    {new Date(note.task_due_date).toLocaleDateString('pt-BR')}
                                                </Badge>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}

