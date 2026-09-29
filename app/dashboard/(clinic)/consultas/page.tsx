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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { api, type Appointment } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import {
    Video,
    Search,
    Calendar,
    Clock,
    User,
    Phone,
    Eye,
    MessageCircle,
    Play,
    CheckCircle2,
    XCircle,
    FileText,
    FileSpreadsheet,
    Loader2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'
import type { HealthInsurance } from '@/lib/types/health-insurance'

const statusColors: Record<string, string> = {
    PENDING_PAYMENT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'destructive',
    COMPLETED: 'info',
    NO_SHOW: 'secondary',
}

const statusLabels: Record<string, string> = {
    PENDING_PAYMENT: 'Aguardando Pagamento',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    COMPLETED: 'Concluído',
    NO_SHOW: 'Não compareceu',
}

export default function ConsultasPage() {
    const { isDoctor, isClinicAdmin, isSuperAdmin, isReceptionist } = useRole()
    const canManageTiss = !isDoctor && (isClinicAdmin || isSuperAdmin || isReceptionist)

    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('today')

    // TISS Guide Generation States
    const [generatingGuideId, setGeneratingGuideId] = useState<string | null>(null)
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)
    const [batchDateFrom, setBatchDateFrom] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    })
    const [batchDateTo, setBatchDateTo] = useState(() => new Date().toISOString().split('T')[0])
    const [batchInsuranceId, setBatchInsuranceId] = useState<string>('all')
    const [isBatchLoading, setIsBatchLoading] = useState(false)

    const today = new Date().toISOString().split('T')[0]

    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments', tab],
        queryFn: () => {
            const params: Record<string, string> = {
                page_size: '50'
            }
            if (tab === 'today') {
                params.date_from = today
                params.date_to = today
            } else if (tab === 'confirmed') {
                params.status = 'CONFIRMED'
            } else if (tab === 'completed') {
                params.status = 'COMPLETED'
            }
            return api.get<Appointment[]>('/appointments', params)
        },
    })

    // Lista de operadoras para o modal em massa
    const { data: insurancesResponse } = useQuery({
        queryKey: ['health-insurances-batch-guide-list'],
        queryFn: () => api.getFull<HealthInsurance[]>('/health-insurances', { status: 'ACTIVE' }),
        enabled: isBatchModalOpen,
    })
    const insurances = insurancesResponse?.data || []

    const filteredAppointments = appointments?.filter((a) =>
        a.patient.full_name.toLowerCase().includes(search.toLowerCase()) ||
        a.doctor?.user?.full_name?.toLowerCase().includes(search.toLowerCase())
    ) || []

    const openWhatsApp = (phone: string, patientName: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = `Olá ${patientName.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // Gerar guia avulsa a partir do atendimento
    const handleGenerateGuide = async (appointmentId: string) => {
        setGeneratingGuideId(appointmentId)
        try {
            const res = await fetch('/api/tiss/guides/from-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointment_id: appointmentId })
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao gerar guia TISS')
            }
            if (data.anti_glosa_warnings && data.anti_glosa_warnings.length > 0) {
                toast.warning(`Guia TISS nº ${data.data.guide_number} gerada com avisos: ${data.anti_glosa_warnings.join('; ')}`)
            } else {
                toast.success(`Guia TISS nº ${data.data.guide_number} gerada com sucesso!`)
            }
        } catch (err: any) {
            toast.error(err.message || 'Erro ao emitir guia TISS')
        } finally {
            setGeneratingGuideId(null)
        }
    }

    // Gerar guias pendentes em massa
    const handleBatchGenerate = async () => {
        if (!batchDateFrom || !batchDateTo) {
            toast.error('Informe o período de datas')
            return
        }
        setIsBatchLoading(true)
        try {
            const res = await fetch('/api/tiss/guides/batch-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date_from: batchDateFrom,
                    date_to: batchDateTo,
                    health_insurance_id: batchInsuranceId && batchInsuranceId !== 'all' ? batchInsuranceId : undefined
                })
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro na geração em massa')
            }
            toast.success(`${data.data.created_count} guia(s) TISS gerada(s) com sucesso!`)
            if (data.data.errors && data.data.errors.length > 0) {
                toast.warning(`${data.data.errors.length} atendimento(s) com pendências`)
            }
            setIsBatchModalOpen(false)
        } catch (err: any) {
            toast.error(err.message || 'Erro ao gerar guias do período')
        } finally {
            setIsBatchLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header com Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Video className="w-7 h-7" />
                        Consultas
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie todas as consultas da clínica
                    </p>
                </div>
                {canManageTiss && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsBatchModalOpen(true)}
                            className="h-10 text-xs font-semibold min-h-[44px]"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-primary" />
                            Gerar Guias TISS do Período
                        </Button>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {appointments?.filter((a) => a.appointment_date === today).length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Consultas hoje</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {appointments?.filter((a) => a.status === 'CONFIRMED').length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Confirmadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">
                            {appointments?.filter((a) => a.status === 'PENDING_PAYMENT').length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Aguardando pagamento</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">
                            {appointments?.filter((a) => a.status === 'COMPLETED').length || 0}
                        </div>
                        <p className="text-sm text-muted-foreground">Concluídas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por paciente ou médico..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="today">Hoje</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
                    <TabsTrigger value="completed">Concluídas</TabsTrigger>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="space-y-4">
                    {isLoading ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                Carregando consultas...
                            </CardContent>
                        </Card>
                    ) : filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => (
                            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center min-w-[80px] p-3 bg-primary/10 rounded-lg">
                                                <p className="text-lg font-bold text-primary">
                                                    {appointment.appointment_time.substring(0, 5)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(appointment.appointment_date)}
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{appointment.patient.full_name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Dr. {appointment.doctor?.user?.full_name} • {appointment.doctor?.specialty}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <Phone className="w-3 h-3" />
                                                    {appointment.patient.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={statusColors[appointment.status] as 'success' | 'warning'}>
                                                {statusLabels[appointment.status]}
                                            </Badge>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-green-50 border-green-200 text-green-700 min-h-[44px] min-w-[44px]"
                                                onClick={() => openWhatsApp(
                                                    appointment.patient.phone,
                                                    appointment.patient.full_name
                                                )}
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </Button>

                                            <Link href={`/dashboard/atendimentos/${appointment.id}`}>
                                                <Button size="sm" variant="outline" className="min-h-[44px]">
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </Link>

                                            {appointment.status === 'CONFIRMED' && appointment.video_link && (
                                                <Link href={`/dashboard/atendimentos/${appointment.id}`}>
                                                    <Button size="sm" className="min-h-[44px]">
                                                        <Play className="w-4 h-4 mr-1" />
                                                        Iniciar
                                                    </Button>
                                                </Link>
                                            )}

                                            {/* Botão Gerar Guia TISS para atendimento concluído (apenas Faturamento, Recepção ou Admin) */}
                                            {canManageTiss && appointment.status === 'COMPLETED' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-850 dark:text-emerald-400 min-h-[44px] text-xs font-semibold"
                                                    disabled={generatingGuideId === appointment.id}
                                                    onClick={() => handleGenerateGuide(appointment.id)}
                                                >
                                                    {generatingGuideId === appointment.id ? (
                                                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                    ) : (
                                                        <FileText className="w-4 h-4 mr-1.5" />
                                                    )}
                                                    Gerar Guia TISS
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="font-medium">Nenhuma consulta encontrada</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {tab === 'today'
                                        ? 'Não há consultas agendadas para hoje'
                                        : 'Tente ajustar os filtros de busca'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Modal Geração de Guias em Massa */}
            <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-semibold">Gerar Guias TISS em Massa</DialogTitle>
                        <DialogDescription className="text-xs">
                            Crie guias automaticamente para todos os atendimentos concluídos no período
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold mb-1 block">Data Inicial *</Label>
                                <Input
                                    type="date"
                                    value={batchDateFrom}
                                    onChange={(e) => setBatchDateFrom(e.target.value)}
                                    className="h-10 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold mb-1 block">Data Final *</Label>
                                <Input
                                    type="date"
                                    value={batchDateTo}
                                    onChange={(e) => setBatchDateTo(e.target.value)}
                                    className="h-10 text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold mb-1 block">Filtrar por Operadora (Opcional)</Label>
                            <Select value={batchInsuranceId} onValueChange={setBatchInsuranceId}>
                                <SelectTrigger className="h-10 text-xs">
                                    <SelectValue placeholder="Todas as operadoras com atendimentos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as operadoras</SelectItem>
                                    {insurances.map(ins => (
                                        <SelectItem key={ins.id} value={ins.id}>{ins.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsBatchModalOpen(false)}
                            className="h-10 text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleBatchGenerate}
                            disabled={isBatchLoading}
                            className="h-10 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isBatchLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                            Gerar Guias
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
