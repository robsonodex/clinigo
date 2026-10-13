'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Video,
    Calendar,
    Clock,
    User,
    Copy,
    Check,
    MessageCircle,
    Search,
    ExternalLink,
    Loader2,
    Shield,
    Phone,
    RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TeleconsultaItem {
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    appointment_type: string
    video_link?: string | null
    video_room?: {
        room_id: string
        patient_token: string
        doctor_token: string
    } | null
    patient?: {
        id: string
        full_name: string
        phone?: string | null
        email?: string | null
    }
    doctor?: {
        id: string
        specialty?: string | null
        user?: {
            full_name: string
        }
    }
}

export default function TeleconsultaDashboardPage() {
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState<'today' | 'upcoming' | 'all'>('today')
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [generatingId, setGeneratingId] = useState<string | null>(null)

    // Modal de Sala Rápida Avulsa
    const [quickModalOpen, setQuickModalOpen] = useState(false)
    const [quickPatientName, setQuickPatientName] = useState('')
    const [quickPatientPhone, setQuickPatientPhone] = useState('')
    const [quickGeneratedLinks, setQuickGeneratedLinks] = useState<{
        patientUrl: string
        doctorUrl: string
        roomId: string
    } | null>(null)
    const [generatingQuick, setGeneratingQuick] = useState(false)

    const todayStr = new Date().toISOString().split('T')[0]

    // Consulta de agendamentos online da clínica
    const { data: appointments, isLoading, refetch } = useQuery<TeleconsultaItem[]>({
        queryKey: ['teleconsultas-list', tab],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.set('appointment_type', 'online')
            params.set('page_size', '100')

            if (tab === 'today') {
                params.set('date_from', todayStr)
                params.set('date_to', todayStr)
            } else if (tab === 'upcoming') {
                params.set('date_from', todayStr)
            }

            const res = await fetch(`/api/appointments?${params.toString()}`)
            if (!res.ok) throw new Error('Falha ao carregar teleconsultas')
            const json = await res.json()
            return json.data || json || []
        }
    })

    const filtered = (appointments || []).filter(item => {
        const pName = item.patient?.full_name?.toLowerCase() || ''
        const dName = item.doctor?.user?.full_name?.toLowerCase() || ''
        const q = search.toLowerCase()
        return pName.includes(q) || dName.includes(q)
    })

    const getPatientLink = (item: TeleconsultaItem) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.clinigo.app'
        if (item.video_room) {
            return `${baseUrl}/video/${item.video_room.room_id}?role=patient&token=${item.video_room.patient_token}`
        }
        if (item.video_link && item.video_link.startsWith('http')) {
            return item.video_link
        }
        return `${baseUrl}/video/${item.id}`
    }

    const getDoctorLink = (item: TeleconsultaItem) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.clinigo.app'
        if (item.video_room) {
            return `${baseUrl}/video/${item.video_room.room_id}?role=doctor&token=${item.video_room.doctor_token}`
        }
        return `${baseUrl}/video/${item.id}?role=doctor`
    }

    const handleCopy = async (item: TeleconsultaItem) => {
        try {
            const link = getPatientLink(item)
            await navigator.clipboard.writeText(link)
            setCopiedId(item.id)
            toast.success('Link de atendimento copiado para a área de transferência.')
            setTimeout(() => setCopiedId(null), 2500)
        } catch {
            toast.error('Erro ao copiar link')
        }
    }

    const handleWhatsApp = (item: TeleconsultaItem) => {
        const link = getPatientLink(item)
        const patientName = item.patient?.full_name || 'Paciente'
        const doctorName = item.doctor?.user?.full_name || 'Profissional'

        const dateFormatted = item.appointment_date
            ? format(new Date(item.appointment_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })
            : ''
        const timeFormatted = item.appointment_time ? item.appointment_time.slice(0, 5) : ''

        const message =
            `Olá ${patientName}!\n\n` +
            `Segue o link para o seu atendimento online (teleconsulta):\n\n` +
            `${link}\n\n` +
            `Data: ${dateFormatted} às ${timeFormatted}\n` +
            `Profissional: Dr(a). ${doctorName}\n\n` +
            `Instruções de acesso:\n` +
            `- Acesse o link no horário marcado usando celular ou computador com câmera e microfone ativos.\n` +
            `- Não é necessário instalar nenhum aplicativo.`

        const rawPhone = item.patient?.phone || ''
        const cleanPhone = rawPhone.replace(/\D/g, '')
        const phoneWithCountry = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : ''
        const waUrl = phoneWithCountry
            ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`

        window.open(waUrl, '_blank')
    }

    const handleGenerateRoom = async (appointmentId: string) => {
        setGeneratingId(appointmentId)
        try {
            const res = await fetch(`/api/appointments/${appointmentId}/video-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao gerar sala virtual')
            toast.success('Sala virtual criada com sucesso!')
            refetch()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar sala de teleconsulta')
        } finally {
            setGeneratingId(null)
        }
    }

    const handleCreateQuickRoom = () => {
        setGeneratingQuick(true)
        try {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.clinigo.app'
            const uniqueId = `quick_${Date.now()}`
            const patientToken = `patient_${Math.random().toString(36).substring(2, 15)}`
            const doctorToken = `doctor_${Math.random().toString(36).substring(2, 15)}`

            const patientUrl = `${baseUrl}/video/${uniqueId}?role=patient&token=${patientToken}`
            const doctorUrl = `${baseUrl}/video/${uniqueId}?role=doctor&token=${doctorToken}`

            setQuickGeneratedLinks({
                patientUrl,
                doctorUrl,
                roomId: uniqueId
            })
            toast.success('Sala instantânea gerada com sucesso!')
        } catch {
            toast.error('Erro ao gerar sala instantânea')
        } finally {
            setGeneratingQuick(false)
        }
    }

    const handleQuickWhatsApp = () => {
        if (!quickGeneratedLinks) return
        const pName = quickPatientName.trim() || 'Paciente'
        const message =
            `Olá ${pName}!\n\n` +
            `Segue seu link de atendimento online imediato:\n\n` +
            `${quickGeneratedLinks.patientUrl}\n\n` +
            `Clique no link para iniciar a videochamada com o profissional.`

        const cleanPhone = quickPatientPhone.replace(/\D/g, '')
        const phoneWithCountry = cleanPhone ? (cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`) : ''
        const waUrl = phoneWithCountry
            ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`

        window.open(waUrl, '_blank')
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            {/* Header Corporativo */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                            <Video className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Central de Teleconsultas
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Gestão de atendimentos online, links de videochamada e emissão direta para pacientes
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="gap-2 text-xs font-semibold h-10"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Atualizar</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            setQuickGeneratedLinks(null)
                            setQuickPatientName('')
                            setQuickPatientPhone('')
                            setQuickModalOpen(true)
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2 text-xs font-semibold h-10 shadow-xs"
                    >
                        <Video className="w-3.5 h-3.5" />
                        <span>Gerar Sala Instantânea</span>
                    </Button>
                </div>
            </div>

            {/* Guia Rápido de Orientações */}
            <Card className="border-border bg-slate-50/70 dark:bg-slate-900/40">
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Shield className="w-4 h-4" />
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                            <p className="font-semibold text-foreground text-sm">Como funciona o envio do link de atendimento?</p>
                            <p className="mt-0.5">
                                1. Localize o agendamento na lista abaixo ou abra o card do paciente na Agenda.
                            </p>
                            <p>
                                2. Clique em <strong>WhatsApp</strong> para enviar a mensagem automática com o link exclusivo da sala, ou em <strong>Copiar Link</strong> para enviar por outro canal.
                            </p>
                            <p>
                                3. O paciente clica no link e entra na sala direto pelo navegador, sem necessidade de baixar aplicativos ou realizar login.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filtros e Abas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Tabs value={tab} onValueChange={(val: any) => setTab(val)} className="w-full sm:w-auto">
                    <TabsList className="grid grid-cols-3 w-full sm:w-80">
                        <TabsTrigger value="today">Hoje</TabsTrigger>
                        <TabsTrigger value="upcoming">Próximas</TabsTrigger>
                        <TabsTrigger value="all">Todas</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por paciente ou terapeuta..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10 text-xs"
                    />
                </div>
            </div>

            {/* Listagem de Teleconsultas */}
            {isLoading ? (
                <div className="flex justify-center items-center py-16 text-muted-foreground gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                    <span className="text-sm">Carregando teleconsultas...</span>
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground flex items-center justify-center mx-auto">
                            <Video className="w-6 h-6" />
                        </div>
                        <h3 className="font-semibold text-foreground">Nenhuma teleconsulta encontrada</h3>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Não há agendamentos online para o filtro selecionado. Novos atendimentos com modalidade online criados na agenda aparecerão automaticamente nesta lista.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((item) => {
                        const hasRoom = Boolean(item.video_room)
                        const pName = item.patient?.full_name || 'Paciente sem nome'
                        const dName = item.doctor?.user?.full_name || 'Profissional'
                        const specialty = item.doctor?.specialty || 'Especialidade clínica'

                        const dateFormatted = item.appointment_date
                            ? format(new Date(item.appointment_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })
                            : ''
                        const timeFormatted = item.appointment_time ? item.appointment_time.slice(0, 5) : ''

                        return (
                            <Card key={item.id} className="border-border hover:border-emerald-300/80 transition-all flex flex-col justify-between">
                                <CardHeader className="p-4 pb-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge
                                            variant="outline"
                                            className={
                                                item.status === 'CONFIRMED'
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : item.status === 'COMPLETED'
                                                    ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                                                    : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                            }
                                        >
                                            {item.status === 'CONFIRMED' ? 'Confirmado' : item.status === 'COMPLETED' ? 'Realizado' : item.status}
                                        </Badge>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{dateFormatted}</span>
                                            <Clock className="w-3.5 h-3.5 ml-1" />
                                            <span>{timeFormatted}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-foreground text-sm truncate" title={pName}>
                                            {pName}
                                        </h4>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                                            <User className="w-3.5 h-3.5 shrink-0" />
                                            <span>Dr(a). {dName} ({specialty})</span>
                                        </div>
                                    </div>

                                    {item.patient?.phone && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{item.patient.phone}</span>
                                        </div>
                                    )}
                                </CardHeader>

                                <CardContent className="p-4 pt-2 space-y-2 border-t border-border/60">
                                    {hasRoom ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleCopy(item)}
                                                className="text-xs font-semibold gap-1.5 h-9"
                                            >
                                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                <span>{copiedId === item.id ? 'Copiado' : 'Copiar Link'}</span>
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleWhatsApp(item)}
                                                className="text-xs font-semibold gap-1.5 h-9 text-emerald-700 hover:text-emerald-800 border-emerald-300"
                                            >
                                                <MessageCircle className="w-3.5 h-3.5" />
                                                <span>WhatsApp</span>
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={() => window.open(getDoctorLink(item), '_blank')}
                                                className="col-span-2 text-xs font-semibold gap-1.5 h-9 bg-emerald-700 hover:bg-emerald-800 text-white"
                                            >
                                                <Video className="w-3.5 h-3.5" />
                                                <span>Entrar na Sala de Atendimento</span>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            onClick={() => handleGenerateRoom(item.id)}
                                            disabled={generatingId === item.id}
                                            className="w-full text-xs font-semibold gap-2 h-9 bg-emerald-700 hover:bg-emerald-800 text-white"
                                        >
                                            {generatingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                            <span>{generatingId === item.id ? 'Gerando sala...' : 'Gerar Link de Teleconsulta'}</span>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Modal: Gerador de Sala Rápida Instantânea */}
            <Dialog open={quickModalOpen} onOpenChange={setQuickModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Video className="w-5 h-5 text-emerald-700" />
                            <span>Gerador de Sala Instantânea</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Crie um link de videochamada avulso para atendimentos rápidos sem necessidade de agendamento prévio na grade.
                        </DialogDescription>
                    </DialogHeader>

                    {!quickGeneratedLinks ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Nome do Paciente (Opcional)</Label>
                                <Input
                                    placeholder="Ex: Maria Eduarda"
                                    value={quickPatientName}
                                    onChange={(e) => setQuickPatientName(e.target.value)}
                                    className="h-10 text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Telefone WhatsApp (Opcional)</Label>
                                <Input
                                    placeholder="Ex: (15) 99999-9999"
                                    value={quickPatientPhone}
                                    onChange={(e) => setQuickPatientPhone(e.target.value)}
                                    className="h-10 text-xs"
                                />
                            </div>

                            <Button
                                onClick={handleCreateQuickRoom}
                                disabled={generatingQuick}
                                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold h-10 gap-2"
                            >
                                {generatingQuick ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                                <span>Gerar Links de Acesso</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-2">
                                <Label className="text-xs font-semibold text-emerald-950 dark:text-emerald-200 block">
                                    Link de Acesso do Paciente
                                </Label>
                                <Input
                                    value={quickGeneratedLinks.patientUrl}
                                    readOnly
                                    className="text-xs font-mono bg-white dark:bg-slate-900"
                                />
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                            await navigator.clipboard.writeText(quickGeneratedLinks.patientUrl)
                                            toast.success('Link do paciente copiado!')
                                        }}
                                        className="text-xs font-semibold gap-1.5"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copiar Link</span>
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleQuickWhatsApp}
                                        className="text-xs font-semibold gap-1.5 text-emerald-700 hover:text-emerald-800 border-emerald-300"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>WhatsApp</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
                                <Label className="text-xs font-semibold text-foreground block">
                                    Acesso do Terapeuta / Profissional
                                </Label>
                                <Button
                                    size="sm"
                                    onClick={() => window.open(quickGeneratedLinks.doctorUrl, '_blank')}
                                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold gap-2 h-9"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Entrar na Sala como Profissional</span>
                                </Button>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQuickGeneratedLinks(null)}
                                className="w-full text-xs text-muted-foreground"
                            >
                                Gerar outra sala
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
