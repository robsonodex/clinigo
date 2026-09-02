'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import { api, type Appointment } from '@/lib/api-client'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
    Calendar,
    Users,
    DollarSign,
    TrendingUp,
    Clock,
    ArrowRight,
    Video,
    MessageCircle,
    Phone,
    FileText,
    UserPlus,
    Settings,
    CreditCard,
    Building2,
    Layers,
    Shield,
    Activity,
    BarChart3,
    Plus,
    ExternalLink,
    Zap,
    Mail,
    CheckCircle2,
    LayoutList,
    LayoutGrid,
    Rows3,
    Megaphone,
    Pin,
    Trash2,
    Edit3,
    AlertTriangle,
    Loader2,
    X,
    AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { InitialSetup } from '@/components/dashboard/InitialSetup'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

const statusColors: Record<string, string> = {
    PENDING_PAYMENT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'destructive',
    COMPLETED: 'info',
    NO_SHOW: 'secondary',
}

const statusLabels: Record<string, string> = {
    PENDING_PAYMENT: 'Aguardando',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    COMPLETED: 'Concluído',
    NO_SHOW: 'Não compareceu',
}

function SuperAdminStats() {
    const { data: superData, isLoading } = useQuery({
        queryKey: ['super-admin-dashboard'],
        queryFn: async () => {
            const res = await fetch('/api/super-admin/dashboard')
            if (!res.ok) return null
            const result = await res.json()
            return result.data || result
        },
        staleTime: 1000 * 60 * 2,
    })

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/system-master-hub">
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-indigo-900">
                            Clínicas Ativas
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-indigo-900">
                                {superData?.metrics?.activeClinics ?? 0}
                            </div>
                        )}
                        <p className="text-xs text-indigo-700 mt-1">
                            de {superData?.metrics?.totalClinics ?? 0} cadastradas
                        </p>
                    </CardContent>
                </Card>
            </Link>

            <Link href="/system-master-hub">
                <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:shadow-lg transition-all cursor-pointer group">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-cyan-900">MRR</CardTitle>
                        <DollarSign className="h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-cyan-900">
                                R$ {(superData?.metrics?.mrr ?? 0).toLocaleString('pt-BR')}
                            </div>
                        )}
                        <p className="text-xs text-cyan-700 mt-1">Receita Mensal Recorrente</p>
                    </CardContent>
                </Card>
            </Link>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-900">Total Clínicas</CardTitle>
                    <Building2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <div className="text-2xl font-bold text-green-900">
                            {superData?.metrics?.totalClinics ?? 0}
                        </div>
                    )}
                    <p className="text-xs text-green-700 mt-1">Cadastradas na plataforma</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-amber-900">Churn Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <div className="text-2xl font-bold text-amber-900">
                            {(superData?.metrics?.churnRate ?? 0).toFixed(1)}%
                        </div>
                    )}
                    <p className="text-xs text-amber-700 mt-1">Meta: &lt; 5%</p>
                </CardContent>
            </Card>
        </div>
    )
}

export default function DashboardPage() {
    const { profile } = useAuth()
    const { role, isDoctor, isClinicAdmin, isSuperAdmin, isReceptionist, isImpersonating } = useRole()
    const profLabel = useProfessionalLabel()
    const [appointmentView, setAppointmentView] = useState<'list' | 'cards' | 'expanded'>('list')

    // Fetch stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0]
            const appointments = await api.get<Appointment[]>('/appointments', {
                date_from: today,
                date_to: today,
            })
            return {
                todayCount: appointments.length,
                confirmedCount: appointments.filter(a => a.status === 'CONFIRMED').length,
                pendingCount: appointments.filter(a => a.status === 'PENDING_PAYMENT').length,
            }
        },
    })

    // Fetch upcoming appointments
    const { data: upcomingAppointments, isLoading: appointmentsLoading } = useQuery({
        queryKey: ['upcoming-appointments'],
        queryFn: () => {
            const today = new Date().toISOString().split('T')[0]
            return api.get<Appointment[]>('/appointments', {
                date_from: today,
                status: 'CONFIRMED',
                page_size: '20',
            })
        },
    })

    // Fetch clinic info for plan checking
    const { data: clinicInfo } = useQuery({
        queryKey: ['clinic-info'],
        queryFn: () => api.get<{ plan_type: string }>('/billing/clinic-info'),
        enabled: !!profile?.clinic_id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    // Fetch bulletins para staff da clínica
    const { data: bulletinsData, isLoading: bulletinsLoading, refetch: refetchBulletins } = useQuery({
        queryKey: ['clinic-bulletins'],
        queryFn: async () => {
            const res = await fetch('/api/bulletins')
            if (!res.ok) throw new Error('Falha ao carregar mural')
            return res.json()
        },
        enabled: !!profile?.clinic_id && (isClinicAdmin || isDoctor || isReceptionist),
    })
    const bulletins = bulletinsData?.bulletins || []

    // Estados do Mural de Recados
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingBulletin, setEditingBulletin] = useState<any | null>(null)
    const [bulletinTitle, setBulletinTitle] = useState('')
    const [bulletinContent, setBulletinContent] = useState('')
    const [bulletinType, setBulletinType] = useState<'info' | 'warning' | 'alert' | 'success'>('info')
    const [bulletinTarget, setBulletinTarget] = useState<'internal' | 'patients' | 'all'>('internal')
    const [bulletinPinned, setBulletinPinned] = useState(false)
    const [isSubmittingBulletin, setIsSubmittingBulletin] = useState(false)
    const [isDeletingBulletin, setIsDeletingBulletin] = useState(false)

    // Salvar ou Editar Recado
    const handleSaveBulletin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bulletinTitle.trim() || !bulletinContent.trim()) return

        setIsSubmittingBulletin(true)
        try {
            const method = editingBulletin ? 'PUT' : 'POST'
            const payload = {
                id: editingBulletin?.id,
                title: bulletinTitle,
                content: bulletinContent,
                type: bulletinType,
                target: bulletinTarget,
                is_pinned: bulletinPinned,
            }

            const res = await fetch('/api/bulletins', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao salvar recado')
            }

            setIsCreateOpen(false)
            setEditingBulletin(null)
            setBulletinTitle('')
            setBulletinContent('')
            setBulletinType('info')
            setBulletinTarget('internal')
            setBulletinPinned(false)
            refetchBulletins()
        } catch (error: any) {
            alert(error.message || 'Erro ao salvar recado')
        } finally {
            setIsSubmittingBulletin(false)
        }
    }

    // Preparar Edição
    const handleStartEdit = (b: any) => {
        setEditingBulletin(b)
        setBulletinTitle(b.title)
        setBulletinContent(b.content)
        setBulletinType(b.type)
        setBulletinTarget(b.target)
        setBulletinPinned(b.is_pinned)
        setIsCreateOpen(true)
    }

    // Excluir Recado com Alerta
    const handleDeleteBulletin = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este recado? Esta ação não pode ser desfeita.')) return

        setIsDeletingBulletin(true)
        try {
            const res = await fetch(`/api/bulletins?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao excluir')
            }

            refetchBulletins()
        } catch (error: any) {
            alert(error.message || 'Erro ao excluir')
        } finally {
            setIsDeletingBulletin(false)
        }
    }

    // Alternar Pinagem Rápida
    const handleTogglePin = async (b: any) => {
        try {
            const res = await fetch('/api/bulletins', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...b,
                    id: b.id,
                    is_pinned: !b.is_pinned,
                }),
            })

            if (!res.ok) throw new Error('Erro ao fixar recado')
            refetchBulletins()
        } catch (error: any) {
            alert(error.message || 'Erro ao fixar')
        }
    }

    // Open WhatsApp
    const openWhatsApp = (phone: string, patientName: string, videoLink?: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = videoLink
            ? `Olá ${patientName.split(' ')[0]}! Lembrete da sua consulta. Acesse o link: ${videoLink}`
            : `Olá ${patientName.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // Group appointments by date for organized display
    const groupedAppointments = (() => {
        if (!upcomingAppointments || upcomingAppointments.length === 0) return []
        const groups: Record<string, Appointment[]> = {}
        for (const apt of upcomingAppointments) {
            const date = apt.appointment_date || 'unknown'
            if (!groups[date]) groups[date] = []
            groups[date].push(apt)
        }
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
    })()

    // Format date label (Hoje, Amanhã, or formatted date)
    const getDateLabel = (dateStr: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const date = new Date(dateStr + 'T00:00:00')
        if (date.getTime() === today.getTime()) return ' Hoje'
        if (date.getTime() === tomorrow.getTime()) return ' Amanhã'
        return ` ${formatDate(dateStr)}`
    }

    return (
        <div className="space-y-6" >
            {/* Welcome */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/10 p-4 rounded-xl border border-slate-200/60 shadow-sm w-full">
                {/* Lado Esquerdo: Mensagem de Boas-vindas */}
                <div className="flex-1 min-w-[250px]">
                    <h1 className="text-2xl font-bold">
                        Olá, {profile?.full_name?.split(' ')[0]}!
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isClinicAdmin && 'Gerencie sua clínica de forma eficiente.'}
                        {isDoctor && 'Acompanhe suas consultas e pacientes.'}
                        {isSuperAdmin && !isImpersonating && 'Monitore a plataforma CliniGo.'}
                        {isReceptionist && 'Gerencie a recepção e os agendamentos do dia.'}
                    </p>
                </div>

                {/* Centro (Área Vermelha): Cards Inline */}
                {isReceptionist && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-1">
                        <Link href="/dashboard/agenda" className="w-full sm:w-44">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all cursor-pointer group w-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
                                    <CardTitle className="text-[11px] font-bold text-blue-900">
                                        Consultas Hoje
                                    </CardTitle>
                                    <Calendar className="h-3.5 w-3.5 text-blue-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent className="pb-2.5 px-3">
                                    {statsLoading ? (
                                        <Skeleton className="h-6 w-12" />
                                    ) : (
                                        <div className="text-lg font-extrabold text-blue-900">{stats?.todayCount || 0}</div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/dashboard/agenda" className="w-full sm:w-44">
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all cursor-pointer group w-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
                                    <CardTitle className="text-[11px] font-bold text-green-900">Confirmadas</CardTitle>
                                    <TrendingUp className="h-3.5 w-3.5 text-green-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent className="pb-2.5 px-3">
                                    {statsLoading ? (
                                        <Skeleton className="h-6 w-12" />
                                    ) : (
                                        <div className="text-lg font-extrabold text-green-900">
                                            {stats?.confirmedCount || 0}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )}

                {/* Lado Direito: Badge de Cargo */}
                <div className="flex items-center justify-end shrink-0 min-w-[120px]">
                    <Badge variant="secondary" className="px-3 py-1">
                        {role === 'SUPER_ADMIN' && <Shield className="w-4 h-4 mr-1" />}
                        {role === 'CLINIC_ADMIN' && <Building2 className="w-4 h-4 mr-1" />}
                        {role === 'DOCTOR' && <UserPlus className="w-4 h-4 mr-1" />}
                        {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'CLINIC_ADMIN' ? 'Admin Clínica' : profLabel.singular}
                    </Badge>
                </div>
            </div>

            {/* Initial Setup - Only for Clinic Admins */}
            {
                isClinicAdmin && (
                    <InitialSetup />
                )
            }

             {/* Stats Cards - Clinic Admin & Doctor */}
            {
                (isClinicAdmin || isDoctor) && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Link href={isDoctor ? '/dashboard/minha-agenda' : '/dashboard/agenda'}>
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-blue-900">
                                        Consultas Hoje
                                    </CardTitle>
                                    <Calendar className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="text-2xl font-bold text-blue-900">{stats?.todayCount || 0}</div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href={isDoctor ? '/dashboard/minha-agenda?status=CONFIRMED' : '/dashboard/agenda'}>
                            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-green-900">Confirmadas</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-green-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="text-2xl font-bold text-green-900">
                                            {stats?.confirmedCount || 0}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/dashboard/pagamentos?status=PENDING">
                            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-all cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-amber-900">
                                        Aguardando Pagamento
                                    </CardTitle>
                                    <Clock className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="text-2xl font-bold text-amber-900">
                                            {stats?.pendingCount || 0}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link href="/dashboard/pagamentos">
                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all cursor-pointer group">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-purple-900">Faturamento</CardTitle>
                                    <DollarSign className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-purple-900">R$ 0</div>
                                </CardContent>
                            </Card>
                        </Link>
                    </div>
                )
            }

            {/* Stats Cards - Super Admin (only when NOT impersonating) */}
            {
                isSuperAdmin && !isImpersonating && (
                    <SuperAdminStats />
                )
            }

            {/* Upcoming Appointments - Compact Table with Day Grouping */}
            {
                (isClinicAdmin || isDoctor || isReceptionist) && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-lg">Próximas Consultas</CardTitle>
                                <CardDescription>
                                    {upcomingAppointments && upcomingAppointments.length > 0
                                        ? `${upcomingAppointments.length} consulta${upcomingAppointments.length > 1 ? 's' : ''} confirmada${upcomingAppointments.length > 1 ? 's' : ''}`
                                        : 'Consultas confirmadas para hoje e próximos dias'
                                    }
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center border rounded-lg p-0.5">
                                    <Button
                                        variant={appointmentView === 'list' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setAppointmentView('list')}
                                        title="Lista compacta"
                                    >
                                        <LayoutList className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant={appointmentView === 'cards' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setAppointmentView('cards')}
                                        title="Mini cards"
                                    >
                                        <LayoutGrid className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant={appointmentView === 'expanded' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() => setAppointmentView('expanded')}
                                        title="Visão detalhada"
                                    >
                                        <Rows3 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <Link href={isDoctor ? '/dashboard/minha-agenda' : '/dashboard/agenda'}>
                                    <Button variant="outline" size="sm">
                                        Ver todas
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {appointmentsLoading ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10" />
                                    ))}
                                </div>
                            ) : groupedAppointments.length > 0 ? (
                                <div className="max-h-[400px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                                    {groupedAppointments.map(([date, appointments], groupIdx) => (
                                        <div key={date} className={groupIdx > 0 ? 'mt-4' : ''}>
                                            {/* Day Header */}
                                            <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 px-2 mb-1.5 bg-muted/80 backdrop-blur-sm rounded-md border-b">
                                                <span className="text-sm font-semibold text-foreground">{getDateLabel(date)}</span>
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                    {appointments.length}
                                                </Badge>
                                            </div>

                                            {/* === VIEW: LIST (tabela compacta) === */}
                                            {appointmentView === 'list' && (
                                                <div className="divide-y divide-border/50">
                                                    {appointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            className="flex items-center gap-3 py-2 px-2 hover:bg-muted/30 rounded-sm transition-colors group/row"
                                                        >
                                                            <span className="text-sm font-bold text-primary min-w-[45px] tabular-nums">
                                                                {appointment.appointment_time?.substring(0, 5) || '--:--'}
                                                            </span>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-sm font-medium truncate">
                                                                    {appointment.patient?.full_name || 'Paciente'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {!isDoctor && appointment.doctor?.user?.full_name && `Dr. ${appointment.doctor.user.full_name} • `}
                                                                    {appointment.doctor?.specialty || 'Especialidade'}
                                                                    {appointment.patient?.phone && ` • ${appointment.patient.phone}`}
                                                                </p>
                                                            </div>
                                                            <Badge
                                                                variant={statusColors[appointment.status] as 'success' | 'warning' | 'destructive'}
                                                                className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                                                            >
                                                                {statusLabels[appointment.status] || appointment.status}
                                                            </Badge>
                                                            <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                                {appointment.patient?.phone && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={() => openWhatsApp(
                                                                            appointment.patient?.phone || '',
                                                                            appointment.patient?.full_name || 'Paciente',
                                                                            appointment.video_link
                                                                        )}
                                                                        title="Enviar WhatsApp"
                                                                    >
                                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                                {appointment.video_link && (
                                                                    <Link href={`/dashboard/consultas/${appointment.id}`}>
                                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Iniciar teleconsulta">
                                                                            <Video className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* === VIEW: CARDS (mini-cards em grid) === */}
                                            {appointmentView === 'cards' && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {appointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            className="flex items-start gap-3 p-3 border rounded-lg hover:shadow-sm hover:border-primary/30 transition-all group/card bg-background"
                                                        >
                                                            {/* Time block */}
                                                            <div className="flex items-center justify-center min-w-[56px] py-2 px-2 bg-primary/10 rounded-md">
                                                                <span className="text-lg font-bold text-primary tabular-nums">
                                                                    {appointment.appointment_time?.substring(0, 5) || '--:--'}
                                                                </span>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold truncate">
                                                                    {appointment.patient?.full_name || 'Paciente'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {!isDoctor && appointment.doctor?.user?.full_name && `Dr. ${appointment.doctor.user.full_name} • `}
                                                                    {appointment.doctor?.specialty || 'Especialidade'}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <Phone className="w-3 h-3" />
                                                                    {appointment.patient?.phone || 'Sem telefone'}
                                                                </p>
                                                                <div className="flex items-center gap-1.5 mt-1.5">
                                                                    <Badge
                                                                        variant={statusColors[appointment.status] as 'success' | 'warning' | 'destructive'}
                                                                        className="text-[10px] px-1.5 py-0 h-4"
                                                                    >
                                                                        {statusLabels[appointment.status] || appointment.status}
                                                                    </Badge>
                                                                    {appointment.patient?.phone && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-5 px-1.5 text-[10px] bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                                            onClick={() => openWhatsApp(
                                                                                appointment.patient?.phone || '',
                                                                                appointment.patient?.full_name || 'Paciente',
                                                                                appointment.video_link
                                                                            )}
                                                                        >
                                                                            <MessageCircle className="w-3 h-3 mr-0.5" />
                                                                            WhatsApp
                                                                        </Button>
                                                                    )}
                                                                    {appointment.video_link && (
                                                                        <Link href={`/dashboard/consultas/${appointment.id}`}>
                                                                            <Button size="sm" className="h-5 px-1.5 text-[10px]">
                                                                                <Video className="w-3 h-3 mr-0.5" />
                                                                                Iniciar
                                                                            </Button>
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* === VIEW: EXPANDED (layout original organizado por dia) === */}
                                            {appointmentView === 'expanded' && (
                                                <div className="space-y-2">
                                                    {appointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-center min-w-[60px] py-1.5 px-2 bg-primary/10 rounded-lg">
                                                                    <p className="text-base font-bold text-primary leading-tight">
                                                                        {appointment.appointment_time?.substring(0, 5) || '--:--'}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-sm">
                                                                        {appointment.patient?.full_name || 'Paciente'}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {!isDoctor && appointment.doctor?.user?.full_name && `Dr. ${appointment.doctor.user.full_name} • `}
                                                                        {appointment.doctor?.specialty || 'Especialidade'}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                        <Phone className="w-3 h-3" />
                                                                        {appointment.patient?.phone || 'Sem telefone'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge
                                                                    variant={statusColors[appointment.status] as 'success' | 'warning' | 'destructive'}
                                                                >
                                                                    {statusLabels[appointment.status] || appointment.status}
                                                                </Badge>
                                                                {appointment.patient?.phone && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                                                        onClick={() => openWhatsApp(
                                                                            appointment.patient?.phone || '',
                                                                            appointment.patient?.full_name || 'Paciente',
                                                                            appointment.video_link
                                                                        )}
                                                                    >
                                                                        <MessageCircle className="w-4 h-4 mr-1" />
                                                                        WhatsApp
                                                                    </Button>
                                                                )}
                                                                {appointment.video_link && (
                                                                    <Link href={`/dashboard/consultas/${appointment.id}`}>
                                                                        <Button size="sm">
                                                                            <Video className="w-4 h-4 mr-1" />
                                                                            Iniciar
                                                                        </Button>
                                                                    </Link>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium text-sm">Nenhuma consulta confirmada</p>
                                    <p className="text-xs">As consultas aparecem aqui após o pagamento</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            }

            {/* Quick Actions - Clinic Admin */}
            {
                (isClinicAdmin || isReceptionist) && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Link href="/dashboard/medicos">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                            <Users className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="font-medium">{profLabel.plural}</p>
                                        <p className="text-xs text-muted-foreground">Gerenciar equipe</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/horarios">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                            <Clock className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <p className="font-medium">Horários</p>
                                        <p className="text-xs text-muted-foreground">Configurar agenda</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/whatsapp">
                                <Card className="hover:shadow-md transition-all cursor-pointer group border-green-200">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                            <MessageCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <p className="font-medium">WhatsApp</p>
                                        <p className="text-xs text-muted-foreground">Enviar mensagens</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/pagamentos">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                            <CreditCard className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <p className="font-medium">Pagamentos</p>
                                        <p className="text-xs text-muted-foreground">Ver recebimentos</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/pacientes">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                                            <UserPlus className="w-6 h-6 text-rose-600" />
                                        </div>
                                        <p className="font-medium">Pacientes</p>
                                        <p className="text-xs text-muted-foreground">Ver cadastros</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/prontuarios">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                            <FileText className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="font-medium">Prontuários</p>
                                        <p className="text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="text-[10px] px-1">PRO</Badge>
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/relatorios">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                                            <BarChart3 className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <p className="font-medium">Relatórios</p>
                                        <p className="text-xs text-muted-foreground">Ver métricas</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/configuracoes">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                            <Settings className="w-6 h-6 text-slate-600" />
                                        </div>
                                        <p className="font-medium">Configurações</p>
                                        <p className="text-xs text-muted-foreground">Personalizar</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                )
            }

            {/* Quick Actions - Super Admin (only when NOT impersonating) */}
            {
                isSuperAdmin && !isImpersonating && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Link href="/dashboard/clinicas">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                            <Building2 className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="font-medium">Clínicas</p>
                                        <p className="text-xs text-muted-foreground">Gerenciar</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/planos">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                            <Layers className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <p className="font-medium">Planos</p>
                                        <p className="text-xs text-muted-foreground">Configurar</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/auditoria">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                                            <Shield className="w-6 h-6 text-red-600" />
                                        </div>
                                        <p className="font-medium">Auditoria</p>
                                        <p className="text-xs text-muted-foreground">Logs</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/health">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                            <Activity className="w-6 h-6 text-green-600" />
                                        </div>
                                        <p className="font-medium">Health Check</p>
                                        <p className="text-xs text-muted-foreground">Sistema</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* Atalhos Master Hub */}
                            <Link href="/system-master-hub/clinicas">
                                <Card className="hover:shadow-md transition-all cursor-pointer group border-indigo-200">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                            <Building2 className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="font-medium">Gestão de Clínicas</p>
                                        <p className="text-xs text-muted-foreground">Master Hub</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/system-master-hub/clinics">
                                <Card className="hover:shadow-md transition-all cursor-pointer group border-cyan-200">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                                            <Users className="w-6 h-6 text-cyan-600" />
                                        </div>
                                        <p className="font-medium">Usuários</p>
                                        <p className="text-xs text-muted-foreground">Master Hub</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/auditoria">
                                <Card className="hover:shadow-md transition-all cursor-pointer group border-orange-200">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                            <BarChart3 className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <p className="font-medium">Logs do Sistema</p>
                                        <p className="text-xs text-muted-foreground">Auditoria</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>

                )
            }

            {/* Doctor Quick Actions */}
            {
                isDoctor && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Link href="/dashboard/minha-agenda">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                            <Calendar className="w-6 h-6 text-blue-600" />
                                        </div>
                                        <p className="font-medium">Minha Agenda</p>
                                        <p className="text-xs text-muted-foreground">Ver consultas</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/consultas">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                            <Video className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <p className="font-medium">Consultas</p>
                                        <p className="text-xs text-muted-foreground">Teleconsulta</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/prontuarios">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                            <FileText className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <p className="font-medium">Prontuários</p>
                                        <p className="text-xs text-muted-foreground">Pacientes</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/dashboard/prescricoes">
                                <Card className="hover:shadow-md transition-all cursor-pointer group">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                            <Plus className="w-6 h-6 text-emerald-600" />
                                        </div>
                                        <p className="font-medium">Prescrições</p>
                                        <p className="text-xs text-muted-foreground">Receitas</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                )
            }

            {/* Feature Highlights */}
            {
                isClinicAdmin && clinicInfo?.plan_type !== 'ENTERPRISE' && clinicInfo?.plan_type !== 'NETWORK' && (
                    <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Zap className="w-8 h-8 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">Desbloqueie mais recursos</h3>
                                        <p className="text-muted-foreground">
                                            Prontuário premium, white-label e muito mais
                                        </p>
                                    </div>
                                </div>
                                <Button>
                                    Ver Planos
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    )
}

