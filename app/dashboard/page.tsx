'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
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
    Cake,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { InitialSetup } from '@/components/dashboard/InitialSetup'
import { BirthdayWidget } from '@/components/dashboard/BirthdayWidget'
import { ClinicOperationalRadar } from '@/components/dashboard/ClinicOperationalRadar'
import { TherapistClinicalDayPanel } from '@/components/dashboard/TherapistClinicalDayPanel'
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
            <Link prefetch={false} href="/system-master-hub">
                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Clínicas Ativas
                        </CardTitle>
                        <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                {superData?.metrics?.activeClinics ?? 0}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                            de {superData?.metrics?.totalClinics ?? 0} cadastradas
                        </p>
                    </CardContent>
                </Card>
            </Link>

            <Link prefetch={false} href="/system-master-hub">
                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            MRR
                        </CardTitle>
                        <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                R$ {(superData?.metrics?.mrr ?? 0).toLocaleString('pt-BR')}
                            </div>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">Receita Mensal Recorrente</p>
                    </CardContent>
                </Card>
            </Link>

            <Card className="border-border bg-card h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Clínicas
                    </CardTitle>
                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                        <Building2 className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                            {superData?.metrics?.totalClinics ?? 0}
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Cadastradas na plataforma</p>
                </CardContent>
            </Card>

            <Card className="border-border bg-card h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Churn Rate
                    </CardTitle>
                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                    ) : (
                        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                            {(superData?.metrics?.churnRate ?? 0).toFixed(1)}%
                        </div>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">Meta operacional: &lt; 5%</p>
                </CardContent>
            </Card>
        </div>
    )
}

export default function DashboardPage() {
    const { profile, clinic, isLoading: authLoading } = useAuth()
    const { role, isDoctor, isClinicAdmin, isSuperAdmin, isReceptionist, isImpersonating, clinicId } = useRole()
    const profLabel = useProfessionalLabel()
    const [appointmentView, setAppointmentView] = useState<'list' | 'cards' | 'expanded'>('list')
    const effectiveClinicId = clinicId || profile?.clinic_id || clinic?.id
    const canViewClinicAgenda = Boolean(effectiveClinicId && (isClinicAdmin || isDoctor || isReceptionist))

    // Fetch stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        enabled: canViewClinicAgenda,
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
        enabled: canViewClinicAgenda,
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
        enabled: Boolean(isClinicAdmin && effectiveClinicId && !clinic?.plan_type),
        staleTime: 1000 * 60 * 10, // 10 minutes
    })

    const effectivePlanType = clinic?.plan_type || clinicInfo?.plan_type || ''

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

    // Estados de Aniversariantes do Mês
    const [showMonthBirthdaysModal, setShowMonthBirthdaysModal] = useState(false)
    const { data: birthdayData, isLoading: birthdaysLoading } = useQuery({
        queryKey: ['patients-birthdays'],
        queryFn: async () => {
            const res = await fetch('/api/patients/birthdays')
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!profile?.clinic_id && (isClinicAdmin || isDoctor || isReceptionist),
        staleTime: 1000 * 60 * 10,
    })
    const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())
    const capitalizedMonthName = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)
    const monthBirthdaysCount = birthdayData?.this_month?.length ?? 0

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
            toast.error(error.message || 'Erro ao salvar recado')
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
            toast.error(error.message || 'Erro ao excluir recado')
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
            toast.error(error.message || 'Erro ao fixar recado')
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

    // Guarda contra tela vazia: sem perfil resolvido, nunca renderiza o painel em branco.
    if (!profile && !isSuperAdmin) {
        if (authLoading) {
            return (
                <div className="space-y-6" aria-busy="true" aria-label="Carregando painel">
                    <Skeleton className="h-20 w-full rounded-xl" />
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                        <Skeleton className="h-28 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            )
        }
        return (
            <div className="flex items-center justify-center py-16 px-4">
                <Card className="w-full max-w-md border-slate-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                            <AlertCircle className="h-5 w-5 text-slate-600" />
                            Não foi possível carregar seu perfil
                        </CardTitle>
                        <CardDescription>
                            A conexão com o servidor oscilou durante o carregamento. Recarregue a página para continuar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            id="dashboard-reload-profile"
                            className="w-full min-h-[44px]"
                            onClick={() => window.location.reload()}
                        >
                            Recarregar
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border border-border shadow-xs w-full">
                {/* Lado Esquerdo: Mensagem de Boas-vindas */}
                <div className="flex-1 min-w-[240px]">
                    <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">
                        Painel Operacional
                    </p>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Olá, {profile?.full_name?.split(' ')[0] || (isSuperAdmin ? 'Robson' : '')}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {isClinicAdmin && 'Gerencie sua clínica com clareza e precisão.'}
                        {isDoctor && 'Acompanhe suas consultas, evoluções e pacientes.'}
                        {isSuperAdmin && !isImpersonating && 'Monitore a operação global da plataforma CliniGo.'}
                        {isReceptionist && 'Gerencie a recepção e os agendamentos do dia.'}
                    </p>
                </div>

                {/* Centro: Cards Inline para Recepção */}
                {isReceptionist && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-1">
                        <Link prefetch={false} href="/dashboard/agenda" className="w-full sm:w-44">
                            <Card className="bg-muted/40 border-border hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group w-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">
                                        Consultas Hoje
                                    </CardTitle>
                                    <Calendar className="h-4 w-4 text-primary transition-transform" />
                                </CardHeader>
                                <CardContent className="pb-2.5 px-3">
                                    {statsLoading ? (
                                        <Skeleton className="h-6 w-12" />
                                    ) : (
                                        <div className="text-xl font-bold tabular-nums text-foreground">{stats?.todayCount || 0}</div>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>

                        <Link prefetch={false} href="/dashboard/agenda" className="w-full sm:w-44">
                            <Card className="bg-accent/50 border-primary/20 hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group w-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2.5 px-3">
                                    <CardTitle className="text-xs font-medium text-accent-foreground">Confirmadas</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-primary transition-transform" />
                                </CardHeader>
                                <CardContent className="pb-2.5 px-3">
                                    {statsLoading ? (
                                        <Skeleton className="h-6 w-12" />
                                    ) : (
                                        <div className="text-xl font-bold tabular-nums text-foreground">
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
                    <Badge variant="outline" className="px-3 py-1.5 bg-muted/50 border-border text-foreground text-xs font-medium gap-1.5">
                        {((isSuperAdmin && !isImpersonating) || role === 'SUPER_ADMIN') && <Shield className="w-3.5 h-3.5 text-primary" />}
                        {role === 'CLINIC_ADMIN' && <Building2 className="w-3.5 h-3.5 text-primary" />}
                        {role === 'DOCTOR' && <UserPlus className="w-3.5 h-3.5 text-primary" />}
                        {((isSuperAdmin && !isImpersonating) || role === 'SUPER_ADMIN') ? 'Super Admin' : role === 'CLINIC_ADMIN' ? 'Admin Clínica' : role === 'RECEPTIONIST' ? 'Recepção' : profLabel.singular}
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
                    <div className="grid gap-4 md:grid-cols-3">
                        <Link prefetch={false} href={isDoctor ? '/dashboard/minha-agenda' : '/dashboard/agenda'}>
                            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Consultas Hoje
                                    </CardTitle>
                                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Calendar className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                            {stats?.todayCount || 0}
                                        </div>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-1">Agendadas para a data de hoje</p>
                                </CardContent>
                            </Card>
                        </Link>

                        <Link prefetch={false} href={isDoctor ? '/dashboard/minha-agenda?status=CONFIRMED' : '/dashboard/agenda?status=CONFIRMED'}>
                            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Confirmadas
                                    </CardTitle>
                                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <TrendingUp className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {statsLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                            {stats?.confirmedCount || 0}
                                        </div>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-1">Pacientes com presença confirmada</p>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Card Clicável: Aniversariantes do Mês */}
                        <div onClick={() => setShowMonthBirthdaysModal(true)} className="cursor-pointer">
                            <Card className="bg-card border-border hover:border-primary/40 hover:shadow-sm transition-all group h-full">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Aniversariantes do Mês
                                    </CardTitle>
                                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                        <Cake className="h-4 w-4" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {birthdaysLoading ? (
                                        <Skeleton className="h-8 w-16" />
                                    ) : (
                                        <div className="flex items-baseline justify-between">
                                            <div className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                                                {monthBirthdaysCount}
                                            </div>
                                            <span className="text-xs text-primary font-semibold group-hover:underline">
                                                Ver lista →
                                            </span>
                                        </div>
                                    )}
                                     <p className="text-sm text-muted-foreground mt-1">
                                        {capitalizedMonthName} • Clique para ver todos
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )
            }

            {/* Meu Dia Clínico — Fila Cronológica 1-Clique para o Terapeuta */}
            {isDoctor && !isClinicAdmin && <TherapistClinicalDayPanel compact />}

            {/* Modal Detalhado de Aniversariantes do Mês */}
            <Dialog open={showMonthBirthdaysModal} onOpenChange={setShowMonthBirthdaysModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="pb-3 border-b border-border">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Cake className="w-4 h-4" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Aniversariantes de {capitalizedMonthName}
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    {monthBirthdaysCount > 0
                                        ? `${monthBirthdaysCount} paciente${monthBirthdaysCount > 1 ? 's fazem' : ' faz'} aniversário neste mês`
                                        : `Nenhum paciente cadastrado faz aniversário em ${capitalizedMonthName}`}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="py-3 space-y-2">
                        {(!birthdayData?.this_month || birthdayData.this_month.length === 0) ? (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                                <Cake className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                                <p>Nenhum aniversariante registrado para o mês de {capitalizedMonthName}.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {birthdayData.this_month.map((p: any) => {
                                    const cleanPhone = p.phone ? p.phone.replace(/\D/g, '') : ''
                                    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
                                    const firstName = p.full_name.split(' ')[0]
                                    const ageText = p.turning_age > 0 ? ` pelos seus ${p.turning_age} anos` : ''
                                    const whatsappMsg = `Olá ${firstName}! Toda a equipe da clínica te deseja um Feliz Aniversário${ageText}! Muita saúde, realizações e momentos especiais!`

                                    return (
                                        <div
                                            key={p.id}
                                            className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                                p.is_today
                                                    ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs'
                                                    : 'bg-card border-border/70 hover:border-border'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {String(p.birth_day).padStart(2, '0')}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            prefetch={false}
                                                            href={`/dashboard/pacientes/${p.id}`}
                                                            className="font-semibold text-xs sm:text-sm text-foreground hover:text-primary hover:underline transition-colors"
                                                        >
                                                            {p.full_name}
                                                        </Link>
                                                        {p.is_today && (
                                                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0 h-4">
                                                                Hoje
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                        Dia {String(p.birth_day).padStart(2, '0')}/{String(p.birth_month).padStart(2, '0')}
                                                        {p.turning_age > 0 && ` • Completa ${p.turning_age} anos`}
                                                        {!p.is_today && p.days_until > 0 && ` • em ${p.days_until} dia${p.days_until > 1 ? 's' : ''}`}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                {p.phone ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(whatsappMsg)}`, '_blank')}
                                                        className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                                        title="Enviar mensagem de Parabéns pelo WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>Parabenizar</span>
                                                    </Button>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Sem telefone</span>
                                                )}
                                                <Button variant="outline" size="sm" asChild className="h-8 text-xs font-medium">
                                                    <Link prefetch={false} href={`/dashboard/pacientes/${p.id}`}>
                                                        Ver Ficha
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Stats Cards - Super Admin (only when NOT impersonating) */}
            {
                isSuperAdmin && !isImpersonating && (
                    <SuperAdminStats />
                )
            }

            {/* Aniversariantes de Hoje e Próximos */}
            {(isClinicAdmin || isReceptionist) && (
                <ClinicOperationalRadar />
            )}

            {(isClinicAdmin || isDoctor || isReceptionist) && (
                <BirthdayWidget />
            )}

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
                                <Link prefetch={false} href={isDoctor ? '/dashboard/minha-agenda' : '/dashboard/agenda'}>
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
                                                <div className="divide-y divide-border/60">
                                                    {appointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            className="flex items-center gap-3 py-2.5 px-2.5 hover:bg-muted/40 rounded-md transition-colors group/row"
                                                        >
                                                            <span className="text-sm font-bold text-primary min-w-[48px] tabular-nums">
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
                                                            <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover/row:opacity-100 transition-opacity">
                                                                {appointment.patient?.phone && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="h-7 w-7 p-0 text-primary hover:bg-accent"
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
                                                                    <Link prefetch={false} href={`/dashboard/consultas/${appointment.id}`}>
                                                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-primary hover:bg-accent" title="Iniciar teleconsulta">
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
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                    {appointments.map((appointment) => (
                                                        <div
                                                            key={appointment.id}
                                                            className="flex items-start gap-3 p-3 border border-border rounded-lg hover:border-primary/40 transition-all group/card bg-background/60"
                                                        >
                                                            {/* Time block */}
                                                            <div className="flex items-center justify-center min-w-[56px] py-2 px-2 bg-accent rounded-md">
                                                                <span className="text-base font-bold text-accent-foreground tabular-nums">
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
                                                                            className="h-6 px-2 text-[10px]"
                                                                            onClick={() => openWhatsApp(
                                                                                appointment.patient?.phone || '',
                                                                                appointment.patient?.full_name || 'Paciente',
                                                                                appointment.video_link
                                                                            )}
                                                                        >
                                                                            <MessageCircle className="w-3 h-3 mr-1" />
                                                                            WhatsApp
                                                                        </Button>
                                                                    )}
                                                                    {appointment.video_link && (
                                                                        <Link prefetch={false} href={`/dashboard/consultas/${appointment.id}`}>
                                                                            <Button size="sm" className="h-6 px-2 text-[10px]">
                                                                                <Video className="w-3 h-3 mr-1" />
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
                                                            className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-center min-w-[60px] py-1.5 px-2 bg-accent rounded-md">
                                                                    <p className="text-base font-bold tabular-nums text-accent-foreground leading-tight">
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
                                                                    <Link prefetch={false} href={`/dashboard/consultas/${appointment.id}`}>
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
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-foreground">
                                Ações Rápidas
                            </h2>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <Link prefetch={false} href="/dashboard/medicos">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">{profLabel.plural}</p>
                                            <p className="text-xs text-muted-foreground">Gerenciar equipe</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            {(isClinicAdmin || isReceptionist || isSuperAdmin) && (
                                <Link prefetch={false} href="/dashboard/horarios">
                                    <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                        <CardContent className="p-4 flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">Horários</p>
                                                <p className="text-xs text-muted-foreground">Configurar agenda</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )}

                            <Link prefetch={false} href="/dashboard/whatsapp">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">WhatsApp</p>
                                            <p className="text-xs text-muted-foreground">Enviar mensagens</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            {isClinicAdmin && (
                                <Link prefetch={false} href="/dashboard/pagamentos">
                                    <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                        <CardContent className="p-4 flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">Pagamentos</p>
                                                <p className="text-xs text-muted-foreground">Ver recebimentos</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )}

                            <Link prefetch={false} href="/dashboard/pacientes">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Pacientes</p>
                                            <p className="text-xs text-muted-foreground">Ver cadastros</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            {isClinicAdmin && (
                                <Link prefetch={false} href="/dashboard/prontuarios">
                                    <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                        <CardContent className="p-4 flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">Prontuários</p>
                                                <p className="text-xs text-muted-foreground">Registros clínicos</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )}

                            {isClinicAdmin && (
                                <Link prefetch={false} href="/dashboard/relatorios">
                                    <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                        <CardContent className="p-4 flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <BarChart3 className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">Relatórios</p>
                                                <p className="text-xs text-muted-foreground">Ver métricas</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            )}

                            <Link prefetch={false} href="/dashboard/configuracoes">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Settings className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Configurações</p>
                                            <p className="text-xs text-muted-foreground">Personalizar clínica</p>
                                        </div>
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
                        <h2 className="text-base font-semibold text-foreground mb-3">
                            Ações Rápidas
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <Link prefetch={false} href="/dashboard/clinicas">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Clínicas</p>
                                            <p className="text-xs text-muted-foreground">Gerenciar</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/planos">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Layers className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Planos</p>
                                            <p className="text-xs text-muted-foreground">Configurar</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/auditoria">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Auditoria</p>
                                            <p className="text-xs text-muted-foreground">Logs</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/health">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Health Check</p>
                                            <p className="text-xs text-muted-foreground">Sistema</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            {/* Atalhos Master Hub */}
                            <Link prefetch={false} href="/system-master-hub/clinicas">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Gestão de Clínicas</p>
                                            <p className="text-xs text-muted-foreground">Master Hub</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/system-master-hub/clinics">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Usuários</p>
                                            <p className="text-xs text-muted-foreground">Master Hub</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/auditoria">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Logs do Sistema</p>
                                            <p className="text-xs text-muted-foreground">Auditoria</p>
                                        </div>
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
                        <h2 className="text-base font-semibold text-foreground mb-3">
                            Ações Rápidas
                        </h2>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <Link prefetch={false} href="/dashboard/minha-agenda">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Minha Agenda</p>
                                            <p className="text-xs text-muted-foreground">Ver consultas</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/teleconsulta">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Video className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Teleconsulta</p>
                                            <p className="text-xs text-muted-foreground">Atendimento online</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/prontuarios">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Prontuários</p>
                                            <p className="text-xs text-muted-foreground">Pacientes</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link prefetch={false} href="/dashboard/prescricoes">
                                <Card className="border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                                    <CardContent className="p-4 flex items-center gap-3.5">
                                        <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm text-foreground truncate">Prescrições</p>
                                            <p className="text-xs text-muted-foreground">Receitas</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>
                    </div>
                )
            }

            {/* Feature Highlights - Apenas para planos de entrada (oculto para PRO, PROFESSIONAL, ENTERPRISE e NETWORK) */}
            {
                isClinicAdmin && !['PRO', 'PROFESSIONAL', 'ENTERPRISE', 'NETWORK'].includes(String(effectivePlanType).toUpperCase()) && (
                    <Card className="bg-card border-primary/25">
                        <CardContent className="p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-accent text-accent-foreground rounded-lg shrink-0">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-base text-foreground">Amplie os recursos da sua clínica</h3>
                                        <p className="text-sm text-muted-foreground">
                                            WhatsApp integrado, BI clínico, TISS e repasses automáticos nos planos Avançado e Professional.
                                        </p>
                                    </div>
                                </div>
                                <Button asChild className="shrink-0">
                                    <Link prefetch={false} href="/dashboard/configuracoes/assinatura">
                                        Ver Planos
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }
        </div>
    )
}

