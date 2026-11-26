'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Bot,
    ArrowLeft,
    RefreshCw,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Users,
    MessageCircle,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    Phone,
    PauseCircle,
    PlayCircle,
    ExternalLink,
    FileText,
    Smartphone,
    Loader2,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface Metrics {
    totalSessions: number
    sessionsCompleted: number
    sessionsDropped: number
    sessionsTransferred: number
    totalLeads: number
    leadsConverted: number
    leadsNew: number
    conversionRate: number
    dropRate: number
}

interface Lead {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    source_page?: string | null
    plan_interest?: string | null
    clinic_size?: string | null
    status: string
    created_at: string
    updated_at?: string
    notes: string | null
}

interface SessionItem {
    id: string
    session_id: string
    channel: 'whatsapp' | 'web'
    phone: string | null
    visitor_name: string | null
    clinic_name: string | null
    plan_interest: string | null
    step: string
    status: string
    message_count: number
    bot_paused_until: string | null
    followup_2h_sent_at: string | null
    followup_24h_sent_at: string | null
    updated_at: string
}

const LEAD_STATUS_OPTIONS = [
    { value: 'new', label: 'Novo' },
    { value: 'qualified', label: 'Qualificado' },
    { value: 'contacted', label: 'Contatado' },
    { value: 'converted', label: 'Convertido' },
    { value: 'lost', label: 'Perdido' },
]

export default function ChatbotPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const [metrics, setMetrics] = useState<Metrics | null>(null)
    const [leads, setLeads] = useState<Lead[]>([])
    const [sessions, setSessions] = useState<SessionItem[]>([])
    const [stepBreakdown, setStepBreakdown] = useState<Record<string, number>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [sessionSearch, setSessionSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [days, setDays] = useState(30)
    const [busyId, setBusyId] = useState<string | null>(null)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch(`/api/super-admin/chatbot?days=${days}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Erro ao carregar dados do Bot Clin')
            const result = await res.json()
            setMetrics(result.data?.metrics || null)
            setLeads(result.data?.recentLeads || [])
            setSessions(result.data?.recentSessions || [])
            setStepBreakdown(result.data?.stepBreakdown || {})
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar')
        } finally {
            setIsLoading(false)
        }
    }, [days])

    useEffect(() => {
        loadData()
    }, [loadData])

    const handleTogglePause = async (session: SessionItem, currentlyPaused: boolean) => {
        setBusyId(session.session_id)
        setFeedback(null)
        try {
            const res = await fetch('/api/super-admin/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: currentlyPaused ? 'resume_session' : 'pause_session',
                    session_id: session.session_id,
                    hours: 24,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error?.message || 'Erro ao atualizar estado do Bot')
            setFeedback({
                type: 'ok',
                text: data.data?.message || (currentlyPaused ? 'Bot retomado.' : 'Bot pausado por 24h.'),
            })
            await loadData()
        } catch (err) {
            setFeedback({
                type: 'err',
                text: err instanceof Error ? err.message : 'Falha ao alterar pausa do Bot.',
            })
        } finally {
            setBusyId(null)
        }
    }

    const handleUpdateLeadStatus = async (leadId: string, nextStatus: string) => {
        setBusyId(leadId)
        setFeedback(null)
        try {
            const res = await fetch('/api/super-admin/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_lead',
                    lead_id: leadId,
                    status: nextStatus,
                }),
            })
            if (!res.ok) throw new Error('Erro ao atualizar status do lead')
            setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStatus } : l)))
            setFeedback({ type: 'ok', text: 'Status do lead atualizado.' })
        } catch (err) {
            setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Erro ao salvar' })
        } finally {
            setBusyId(null)
        }
    }

    const filteredLeads = useMemo(() => {
        const t = searchTerm.trim().toLowerCase()
        return leads.filter((l) => {
            if (statusFilter !== 'ALL' && l.status !== statusFilter) return false
            if (!t) return true
            return (
                l.name?.toLowerCase().includes(t) ||
                l.phone?.includes(t) ||
                l.email?.toLowerCase().includes(t) ||
                l.notes?.toLowerCase().includes(t) ||
                l.plan_interest?.toLowerCase().includes(t)
            )
        })
    }, [leads, searchTerm, statusFilter])

    const filteredSessions = useMemo(() => {
        const t = sessionSearch.trim().toLowerCase()
        return sessions.filter((s) => {
            if (!t) return true
            return (
                s.session_id.toLowerCase().includes(t) ||
                (s.phone || '').includes(t) ||
                (s.visitor_name || '').toLowerCase().includes(t) ||
                (s.clinic_name || '').toLowerCase().includes(t) ||
                s.step.toLowerCase().includes(t)
            )
        })
    }, [sessions, sessionSearch])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-80 bg-gray-200" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-24 bg-gray-200" />
                        ))}
                    </div>
                    <Skeleton className="h-96 bg-gray-200" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-[#E4E7E4]">
                    <CardContent className="pt-6 text-center space-y-4">
                        <AlertTriangle className="h-12 w-12 text-[#B91C1C] mx-auto" />
                        <p className="text-[#B91C1C] text-sm">{error}</p>
                        <Button onClick={loadData} variant="outline" className="min-h-[40px]">
                            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#0F1F1B] overflow-x-hidden pb-[max(2rem,env(safe-area-inset-bottom))]">
            <header className="bg-white border-b border-[#E4E7E4] px-4 sm:px-6 py-4 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#EEF5F2] border border-[#C5DDD3] flex items-center justify-center shrink-0">
                            <Bot className="h-5 w-5 text-[#155E4B]" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-semibold text-[#0F1F1B]">
                                Painel Bot Clin 2.0 — Conversão e Controle
                            </h1>
                            <p className="text-xs text-[#4B5B56]">
                                Funil de vendas, leads qualificados, follow-up automático 2h/24h e pausa humana por conversa
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="min-h-[38px] rounded-md border border-[#D8DFDC] bg-white px-3 text-sm text-[#0F1F1B]"
                        >
                            <option value={7}>7 dias</option>
                            <option value={30}>30 dias</option>
                            <option value={90}>90 dias</option>
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/system-master-hub/clin-whatsapp')}
                            className="min-h-[38px] border-[#D8DFDC]"
                        >
                            <Smartphone className="h-4 w-4 mr-1.5" /> Sentinela WhatsApp
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/system-master-hub/contratos-comerciais')}
                            className="min-h-[38px] border-[#D8DFDC]"
                        >
                            <FileText className="h-4 w-4 mr-1.5" /> Contratos
                        </Button>
                        <Button variant="outline" size="sm" onClick={loadData} className="min-h-[38px] border-[#D8DFDC]">
                            <RefreshCw className="h-4 w-4 mr-1.5" /> Atualizar
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/system-master-hub')}
                            className="min-h-[38px]"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {feedback && (
                    <div
                        className={`rounded-lg px-4 py-3 text-sm border flex items-center justify-between gap-3 ${
                            feedback.type === 'ok'
                                ? 'bg-[#EEF5F2] border-[#C5DDD3] text-[#155E4B]'
                                : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                        }`}
                    >
                        <span>{feedback.text}</span>
                        <button
                            type="button"
                            onClick={() => setFeedback(null)}
                            className="text-xs font-medium underline cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {/* Métricas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white border-[#E4E7E4]">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[#4B5B56]">Sessões ({days}d)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-semibold text-[#0F1F1B]">
                                    {metrics?.totalSessions || 0}
                                </span>
                                <MessageCircle className="h-6 w-6 text-[#155E4B]" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-[#E4E7E4]">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[#4B5B56]">Leads Captados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-semibold text-[#155E4B]">
                                    {metrics?.totalLeads || 0}
                                </span>
                                <Users className="h-6 w-6 text-[#155E4B]" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-[#E4E7E4]">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[#4B5B56]">Transferidos p/ Humano</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-semibold text-[#0F1F1B]">
                                    {metrics?.sessionsTransferred || 0}
                                </span>
                                <TrendingUp className="h-6 w-6 text-[#047857]" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-[#E4E7E4]">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-[#4B5B56]">Conversão</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-semibold text-[#047857]">
                                    {metrics?.conversionRate || 0}%
                                </span>
                                <TrendingDown className="h-6 w-6 text-[#6B7B76]" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Funil visual real */}
                <Card className="bg-white border-[#E4E7E4]">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#0F1F1B]">Etapas Atuais no Funil do Bot</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {Object.entries(stepBreakdown)
                                .sort(([, a], [, b]) => b - a)
                                .map(([step, count]) => (
                                    <div
                                        key={step}
                                        className="flex flex-col items-center min-w-[125px] p-3 bg-[#FAFAF8] rounded-lg border border-[#E4E7E4]"
                                    >
                                        <span className="text-2xl font-semibold text-[#0F1F1B]">{count}</span>
                                        <span className="text-[11px] text-[#4B5B56] text-center mt-1 font-mono">
                                            {step}
                                        </span>
                                    </div>
                                ))}
                            {Object.keys(stepBreakdown).length === 0 && (
                                <p className="text-sm text-[#6B7B76] py-4">Nenhum dado de etapas no período.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Tabs defaultValue="sessions">
                    <TabsList className="bg-white border border-[#E4E7E4] flex-wrap h-auto">
                        <TabsTrigger value="sessions">
                            Sessões WhatsApp e Pausa ({sessions.length})
                        </TabsTrigger>
                        <TabsTrigger value="leads">Leads Captados ({leads.length})</TabsTrigger>
                        <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                    </TabsList>

                    {/* TAB 1: SESSÕES COM CONTROLE DE PAUSA HUMANA */}
                    <TabsContent value="sessions" className="space-y-4 mt-4">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7B76]" />
                            <Input
                                placeholder="Buscar por telefone, clínica, nome ou etapa..."
                                value={sessionSearch}
                                onChange={(e) => setSessionSearch(e.target.value)}
                                className="pl-10 bg-white border-[#D8DFDC]"
                            />
                        </div>

                        <Card className="bg-white border-[#E4E7E4]">
                            <CardContent className="p-0 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Contato / Sessão</TableHead>
                                            <TableHead>Etapa / Contexto</TableHead>
                                            <TableHead>Follow-Up</TableHead>
                                            <TableHead>Estado do Bot</TableHead>
                                            <TableHead>Última Interação</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-10 text-sm text-[#6B7B76]">
                                                    Nenhuma sessão encontrada neste período.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSessions.map((session) => {
                                                const isPaused = Boolean(
                                                    session.bot_paused_until &&
                                                    new Date(session.bot_paused_until).getTime() > Date.now()
                                                )
                                                const isBusy = busyId === session.session_id
                                                return (
                                                    <TableRow key={session.id}>
                                                        <TableCell>
                                                            <div className="font-medium text-sm text-[#0F1F1B]">
                                                                {session.clinic_name || session.visitor_name || session.phone || session.session_id}
                                                            </div>
                                                            <div className="text-xs text-[#6B7B76] flex items-center gap-1.5 mt-0.5">
                                                                <Badge variant="outline" className="text-[10px]">
                                                                    {session.channel}
                                                                </Badge>
                                                                {session.phone && <span>+{session.phone}</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs font-mono text-[#0F1F1B]">{session.step}</div>
                                                            {session.plan_interest && (
                                                                <div className="text-[11px] text-[#155E4B] mt-0.5">
                                                                    {session.plan_interest}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col gap-1 text-[11px]">
                                                                {session.followup_2h_sent_at ? (
                                                                    <span className="text-[#155E4B]">2h enviado</span>
                                                                ) : (
                                                                    <span className="text-[#6B7B76]">2h pendente</span>
                                                                )}
                                                                {session.followup_24h_sent_at && (
                                                                    <span className="text-[#155E4B]">24h enviado</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {isPaused ? (
                                                                <Badge className="bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                                                                    Pausado até{' '}
                                                                    {format(new Date(session.bot_paused_until!), 'dd/MM HH:mm', {
                                                                        locale: ptBR,
                                                                    })}
                                                                </Badge>
                                                            ) : session.status === 'transferred' ? (
                                                                <Badge className="bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                                                    Transferido (Humano)
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-[#EEF5F2] text-[#155E4B] border border-[#C5DDD3]">
                                                                    Bot Ativo
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-[#4B5B56] whitespace-nowrap">
                                                            {format(new Date(session.updated_at), 'dd/MM/yyyy HH:mm', {
                                                                locale: ptBR,
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="inline-flex items-center gap-2 justify-end">
                                                                {session.phone && (
                                                                    <a
                                                                        href={`https://wa.me/${session.phone}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 text-xs font-medium rounded-md border border-[#155E4B] text-[#155E4B] hover:bg-[#EEF5F2]"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        WhatsApp
                                                                    </a>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    disabled={isBusy}
                                                                    onClick={() => handleTogglePause(session, isPaused)}
                                                                    className={`inline-flex items-center gap-1 min-h-[36px] px-2.5 py-1.5 text-xs font-semibold rounded-md border cursor-pointer disabled:opacity-50 ${
                                                                        isPaused
                                                                            ? 'border-[#155E4B] bg-[#155E4B] text-white hover:bg-[#0F493A]'
                                                                            : 'border-[#D8DFDC] bg-white text-[#0F1F1B] hover:bg-[#F3F5F4]'
                                                                    }`}
                                                                >
                                                                    {isBusy ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : isPaused ? (
                                                                        <PlayCircle className="w-3.5 h-3.5" />
                                                                    ) : (
                                                                        <PauseCircle className="w-3.5 h-3.5" />
                                                                    )}
                                                                    {isPaused ? 'Retomar Bot' : 'Pausar 24h'}
                                                                </button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* TAB 2: LEADS CAPTADOS */}
                    <TabsContent value="leads" className="space-y-4 mt-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B7B76]" />
                                <Input
                                    placeholder="Buscar lead por nome, telefone, plano ou notas..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white border-[#D8DFDC]"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="min-h-[40px] rounded-md border border-[#D8DFDC] bg-white px-3 text-sm text-[#0F1F1B]"
                            >
                                <option value="ALL">Todos os status</option>
                                {LEAD_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {filteredLeads.length === 0 ? (
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="py-12 text-center">
                                    <Bot className="h-10 w-10 text-[#9CA3AF] mx-auto mb-3" />
                                    <p className="text-sm text-[#4B5B56]">Nenhum lead encontrado para este filtro.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="p-0 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Lead / Contexto</TableHead>
                                                <TableHead>WhatsApp</TableHead>
                                                <TableHead>Plano / Equipe</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Data</TableHead>
                                                <TableHead className="text-right">Contato</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLeads.map((lead) => (
                                                <TableRow key={lead.id}>
                                                    <TableCell>
                                                        <div className="font-medium text-sm text-[#0F1F1B]">
                                                            {lead.name || 'Lead sem nome'}
                                                        </div>
                                                        {lead.notes && (
                                                            <div className="text-xs text-[#4B5B56] max-w-md truncate mt-0.5">
                                                                {lead.notes}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1 text-sm">
                                                            <Phone className="h-3.5 w-3.5 text-[#6B7B76]" />
                                                            {lead.phone || '—'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs text-[#0F1F1B]">
                                                            {lead.plan_interest || 'A definir'}
                                                        </div>
                                                        {lead.clinic_size && (
                                                            <div className="text-[11px] text-[#6B7B76]">
                                                                {lead.clinic_size} profissional(is)
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <select
                                                            value={lead.status || 'new'}
                                                            disabled={busyId === lead.id}
                                                            onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value)}
                                                            className="min-h-[34px] rounded border border-[#D8DFDC] bg-white px-2 text-xs text-[#0F1F1B]"
                                                        >
                                                            {LEAD_STATUS_OPTIONS.map((opt) => (
                                                                <option key={opt.value} value={opt.value}>
                                                                    {opt.label}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-[#4B5B56] whitespace-nowrap">
                                                        {format(new Date(lead.updated_at || lead.created_at), 'dd/MM/yyyy HH:mm', {
                                                            locale: ptBR,
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {lead.phone ? (
                                                            <a
                                                                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-md bg-[#155E4B] text-white hover:bg-[#0F493A]"
                                                            >
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                Abrir WhatsApp
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-[#9CA3AF]">—</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* TAB 3: ESTATÍSTICAS */}
                    <TabsContent value="stats" className="mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="pt-6 text-center">
                                    <CheckCircle2 className="h-7 w-7 text-[#155E4B] mx-auto mb-2" />
                                    <p className="text-2xl font-semibold text-[#0F1F1B]">
                                        {metrics?.sessionsCompleted || 0}
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">Sessões Completadas</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="pt-6 text-center">
                                    <XCircle className="h-7 w-7 text-[#B91C1C] mx-auto mb-2" />
                                    <p className="text-2xl font-semibold text-[#0F1F1B]">
                                        {metrics?.sessionsDropped || 0}
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">Sessões Abandonadas</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="pt-6 text-center">
                                    <Clock className="h-7 w-7 text-[#B45309] mx-auto mb-2" />
                                    <p className="text-2xl font-semibold text-[#0F1F1B]">
                                        {metrics?.sessionsTransferred || 0}
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">Transferidas para Especialista</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="pt-6 text-center">
                                    <Users className="h-7 w-7 text-[#155E4B] mx-auto mb-2" />
                                    <p className="text-2xl font-semibold text-[#0F1F1B]">
                                        {metrics?.leadsNew || 0}
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">Leads Novos / Qualificados</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-white border-[#E4E7E4]">
                                <CardContent className="pt-6 text-center">
                                    <TrendingUp className="h-7 w-7 text-[#047857] mx-auto mb-2" />
                                    <p className="text-2xl font-semibold text-[#0F1F1B]">
                                        {metrics?.leadsConverted || 0}
                                    </p>
                                    <p className="text-xs text-[#4B5B56]">Leads Convertidos</p>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
