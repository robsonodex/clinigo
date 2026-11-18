'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api, type Appointment } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import {
    Video,
    Search,
    Phone,
    Eye,
    MessageCircle,
    Play,
    RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

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
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState('today')

    const today = new Date().toISOString().split('T')[0]

    const { data: appointments, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['appointments', tab],
        queryFn: () => {
            const params: Record<string, string> = {
                page_size: '50',
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

    const filteredAppointments =
        appointments?.filter(
            (a) =>
                a.patient.full_name.toLowerCase().includes(search.toLowerCase()) ||
                a.doctor?.user?.full_name?.toLowerCase().includes(search.toLowerCase())
        ) || []

    const openWhatsApp = (phone: string, patientName: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = `Olá ${patientName.split(' ')[0]}, aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4 py-2">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2 text-foreground">
                        <Video className="w-6 h-6 text-slate-600 shrink-0" />
                        <span>Consultas</span>
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Acompanhe os agendamentos e atendimentos realizados na clínica
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="h-9 min-h-[36px] px-3.5 gap-1.5 text-xs font-medium rounded-md shadow-none"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isFetching ? 'animate-spin' : ''}`} />
                        <span>Atualizar</span>
                    </Button>
                </div>
            </div>

            {/* Indicadores */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-none">
                    <CardContent className="pt-5">
                        <div className="text-2xl font-semibold tabular-nums">
                            {appointments?.filter((a) => a.appointment_date === today).length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Consultas hoje</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none">
                    <CardContent className="pt-5">
                        <div className="text-2xl font-semibold tabular-nums text-emerald-700">
                            {appointments?.filter((a) => a.status === 'CONFIRMED').length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Confirmadas</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none">
                    <CardContent className="pt-5">
                        <div className="text-2xl font-semibold tabular-nums text-amber-700">
                            {appointments?.filter((a) => a.status === 'PENDING_PAYMENT').length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Aguardando pagamento</p>
                    </CardContent>
                </Card>
                <Card className="shadow-none">
                    <CardContent className="pt-5">
                        <div className="text-2xl font-semibold tabular-nums text-blue-700">
                            {appointments?.filter((a) => a.status === 'COMPLETED').length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Concluídas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Busca */}
            <Card className="shadow-none">
                <CardContent className="pt-5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por paciente ou profissional..."
                            className="pl-9 h-10 text-base sm:text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Abas */}
            <Tabs value={tab} onValueChange={setTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="today">Hoje</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmadas</TabsTrigger>
                    <TabsTrigger value="completed">Concluídas</TabsTrigger>
                    <TabsTrigger value="all">Todas</TabsTrigger>
                </TabsList>

                <TabsContent value={tab} className="space-y-3">
                    {isLoading ? (
                        <Card className="shadow-none">
                            <CardContent className="py-12 text-center text-xs text-muted-foreground">
                                Carregando consultas...
                            </CardContent>
                        </Card>
                    ) : filteredAppointments.length > 0 ? (
                        filteredAppointments.map((appointment) => (
                            <Card key={appointment.id} className="shadow-none hover:border-slate-300 transition-colors">
                                <CardContent className="py-4">
                                    <div className="flex items-center justify-between flex-wrap gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center min-w-[80px] p-2.5 bg-primary/10 rounded-md">
                                                <p className="text-base font-semibold tabular-nums text-primary">
                                                    {appointment.appointment_time.substring(0, 5)}
                                                </p>
                                                <p className="text-[11px] tabular-nums text-muted-foreground">
                                                    {formatDate(appointment.appointment_date)}
                                                </p>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    {appointment.patient.full_name}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {appointment.doctor?.user?.full_name} • {appointment.doctor?.specialty}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 tabular-nums">
                                                    <Phone className="w-3 h-3 shrink-0" />
                                                    <span>{appointment.patient.phone}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={statusColors[appointment.status] as 'success' | 'warning'}>
                                                {statusLabels[appointment.status]}
                                            </Badge>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-9 min-h-[36px] w-9 p-0 rounded-md bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-none"
                                                aria-label={`Enviar mensagem WhatsApp para ${appointment.patient.full_name}`}
                                                onClick={() =>
                                                    openWhatsApp(
                                                        appointment.patient.phone,
                                                        appointment.patient.full_name
                                                    )
                                                }
                                            >
                                                <MessageCircle className="w-4 h-4 shrink-0" />
                                            </Button>

                                            <Button
                                                asChild
                                                variant="outline"
                                                className="h-9 min-h-[36px] px-3 gap-1.5 text-xs font-medium rounded-md shadow-none"
                                            >
                                                <Link href={`/dashboard/atendimentos/${appointment.id}`} prefetch={false}>
                                                    <Eye className="w-3.5 h-3.5 shrink-0" />
                                                    <span>Ver</span>
                                                </Link>
                                            </Button>

                                            {appointment.status === 'CONFIRMED' && appointment.video_link && (
                                                <Button
                                                    asChild
                                                    className="h-9 min-h-[36px] px-3 gap-1.5 text-xs font-medium rounded-md shadow-none"
                                                >
                                                    <Link href={`/dashboard/atendimentos/${appointment.id}`} prefetch={false}>
                                                        <Play className="w-3.5 h-3.5 shrink-0" />
                                                        <span>Iniciar</span>
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="shadow-none">
                            <CardContent className="py-12 text-center">
                                <Video className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                                <p className="text-sm font-medium text-foreground">Nenhuma consulta encontrada</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {tab === 'today'
                                        ? 'Não há consultas agendadas para hoje.'
                                        : 'Ajuste os filtros ou a busca para localizar atendimentos.'}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
