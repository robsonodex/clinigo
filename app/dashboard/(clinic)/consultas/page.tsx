'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Video className="w-7 h-7" />
                    Consultas
                </h1>
                <p className="text-muted-foreground">
                    Gerencie todas as consultas da clínica
                </p>
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
                                    <div className="flex items-center justify-between">
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
                                        <div className="flex items-center gap-2">
                                            <Badge variant={statusColors[appointment.status] as 'success' | 'warning'}>
                                                {statusLabels[appointment.status]}
                                            </Badge>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-green-50 border-green-200 text-green-700"
                                                onClick={() => openWhatsApp(
                                                    appointment.patient.phone,
                                                    appointment.patient.full_name
                                                )}
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                            </Button>

                                            <Link href={`/dashboard/atendimentos/${appointment.id}`}>
                                                <Button size="sm" variant="outline">
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </Link>

                                            {appointment.status === 'CONFIRMED' && appointment.video_link && (
                                                <Link href={`/dashboard/atendimentos/${appointment.id}`}>
                                                    <Button size="sm">
                                                        <Play className="w-4 h-4 mr-1" />
                                                        Iniciar
                                                    </Button>
                                                </Link>
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
        </div>
    )
}

