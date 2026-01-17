'use client'

import { useState, useEffect, useCallback } from 'react'
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
    MessageSquare, Smartphone, Bell
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
    status: string
    total_recipients: number
    sent_count: number
    opened_count: number
    scheduled_at: string | null
    created_at: string
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
    const [showNewAutomation, setShowNewAutomation] = useState(false)
    const [showNewCampaign, setShowNewCampaign] = useState(false)
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
        target_all_patients: true
    })

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [autoRes, campRes, notesRes] = await Promise.all([
                fetch('/api/crm/automations'),
                fetch('/api/crm/campaigns'),
                fetch('/api/crm/notes?tasks_only=true&pending_only=true')
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
        } catch (error) {
            console.error('Error fetching CRM data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

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

    const handleCreateCampaign = async () => {
        if (!campaignForm.name || !campaignForm.content) {
            toast.error('Preencha nome e conteúdo')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/crm/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(campaignForm)
            })

            if (!res.ok) {
                toast.error('Erro ao criar campanha')
                return
            }

            toast.success('Campanha criada!')
            setShowNewCampaign(false)
            setCampaignForm({ name: '', type: 'WHATSAPP', content: '', subject: '', target_all_patients: true })
            fetchData()
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
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
            case 'SCHEDULED': return <Badge className="bg-blue-500">Agendada</Badge>
            case 'RUNNING': return <Badge className="bg-yellow-500">Em andamento</Badge>
            case 'COMPLETED': return <Badge className="bg-green-500">Concluída</Badge>
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
                                        <Button onClick={handleCreateCampaign} disabled={saving} className="w-full">
                                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                            Criar Campanha
                                        </Button>
                                    </div>
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
                                        <CardContent className="flex items-center justify-between py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                    {getCampaignTypeIcon(camp.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{camp.name}</h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {camp.total_recipients} destinatários
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right text-sm">
                                                    <p>{camp.sent_count} enviados</p>
                                                    <p className="text-muted-foreground">{camp.opened_count} abertos</p>
                                                </div>
                                                {getStatusBadge(camp.status)}
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

