'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import Link from 'next/link'
import { OnboardingChecklist } from '@/components/onboarding'

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

export default function DashboardPage() {
    const { profile } = useAuth()
    const { role, isDoctor, isClinicAdmin, isSuperAdmin } = useRole()

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
                page_size: '5',
            })
        },
    })

    // Open WhatsApp
    const openWhatsApp = (phone: string, patientName: string, videoLink?: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = videoLink
            ? `Olá ${patientName.split(' ')[0]}! Lembrete da sua consulta. Acesse o link: ${videoLink}`
            : `Olá ${patientName.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        Olá, {profile?.full_name?.split(' ')[0]}! 👋
                    </h1>
                    <p className="text-muted-foreground">
                        {isClinicAdmin && 'Gerencie sua clínica de forma eficiente.'}
                        {isDoctor && 'Acompanhe suas consultas e pacientes.'}
                        {isSuperAdmin && 'Monitore a plataforma CliniGo.'}
                    </p>
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                    {role === 'SUPER_ADMIN' && <Shield className="w-4 h-4 mr-1" />}
                    {role === 'CLINIC_ADMIN' && <Building2 className="w-4 h-4 mr-1" />}
                    {role === 'DOCTOR' && <UserPlus className="w-4 h-4 mr-1" />}
                    {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'CLINIC_ADMIN' ? 'Admin Clínica' : 'Médico'}
                </Badge>
            </div>

            {/* Onboarding Checklist - Only for Clinic Admins */}
            {isClinicAdmin && (
                <OnboardingChecklist />
            )}

            {/* Stats Cards - Clinic Admin & Doctor */}
            {(isClinicAdmin || isDoctor) && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-blue-900">
                                Consultas Hoje
                            </CardTitle>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <div className="text-2xl font-bold text-blue-900">{stats?.todayCount || 0}</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-green-900">Confirmadas</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-600" />
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

                    <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-amber-900">
                                Aguardando Pagamento
                            </CardTitle>
                            <Clock className="h-4 w-4 text-amber-600" />
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

                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-purple-900">Faturamento</CardTitle>
                            <DollarSign className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-900">R$ 0</div>
                            <p className="text-xs text-purple-700">Este mês</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Stats Cards - Super Admin */}
            {isSuperAdmin && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-indigo-900">
                                Clínicas Ativas
                            </CardTitle>
                            <Building2 className="h-4 w-4 text-indigo-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-900">-</div>
                            <p className="text-xs text-indigo-700">Ver em Clínicas</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-emerald-900">Médicos</CardTitle>
                            <Users className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-900">-</div>
                            <p className="text-xs text-emerald-700">Ver em Relatórios</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-rose-50 to-rose-100 border-rose-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-rose-900">
                                Consultas Hoje
                            </CardTitle>
                            <Video className="h-4 w-4 text-rose-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-900">-</div>
                            <p className="text-xs text-rose-700">Ver em Relatórios</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-cyan-900">MRR</CardTitle>
                            <DollarSign className="h-4 w-4 text-cyan-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-cyan-900">-</div>
                            <p className="text-xs text-cyan-700">Ver em Relatórios</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Upcoming Appointments with WhatsApp */}
            {(isClinicAdmin || isDoctor) && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Próximas Consultas</CardTitle>
                            <CardDescription>Consultas confirmadas para hoje e próximos dias</CardDescription>
                        </div>
                        <Link href={isDoctor ? '/dashboard/minha-agenda' : '/dashboard/agenda'}>
                            <Button variant="outline" size="sm">
                                Ver todas
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {appointmentsLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-20" />
                                ))}
                            </div>
                        ) : upcomingAppointments && upcomingAppointments.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingAppointments.map((appointment) => (
                                    <div
                                        key={appointment.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-center min-w-[70px] p-2 bg-primary/10 rounded-lg">
                                                <p className="text-lg font-bold text-primary">
                                                    {appointment.appointment_time?.substring(0, 5) || '--:--'}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {appointment.appointment_date ? formatDate(appointment.appointment_date) : '--/--'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {appointment.patient?.full_name || 'Paciente'}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {!isDoctor && appointment.doctor?.user?.full_name && `Dr. ${appointment.doctor.user.full_name} • `}
                                                    {appointment.doctor?.specialty || 'Especialidade'}
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
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

                                            {/* WhatsApp Button - only show if has phone */}
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
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p className="font-medium">Nenhuma consulta confirmada</p>
                                <p className="text-sm">As consultas aparecem aqui após o pagamento</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Quick Actions - Clinic Admin */}
            {isClinicAdmin && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Ações Rápidas</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Link href="/dashboard/medicos">
                            <Card className="hover:shadow-md transition-all cursor-pointer group">
                                <CardContent className="pt-6 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                        <Users className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <p className="font-medium">Médicos</p>
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
            )}

            {/* Quick Actions - Super Admin */}
            {isSuperAdmin && (
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
                    </div>
                </div>
            )}

            {/* Doctor Quick Actions */}
            {isDoctor && (
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
            )}

            {/* Feature Highlights */}
            {isClinicAdmin && (
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
                                        Prontuário eletrônico, SMTP próprio, white-label e muito mais
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
            )}
        </div>
    )
}

