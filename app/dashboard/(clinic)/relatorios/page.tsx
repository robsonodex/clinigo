'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Users, Calendar, DollarSign, BarChart3, PieChart, Download, RefreshCcw, Shield, FileText, Receipt, UserCheck, ListChecks } from 'lucide-react'
import { toast } from 'sonner'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface KPIs {
    total_revenue: number
    total_appointments: number
    completed_appointments: number
    cancelled_appointments: number
    no_show_count: number
    no_show_rate: number
    average_ticket: number
    new_patients: number
    total_doctors: number
    active_doctors: number
}

interface RevenueByDoctor {
    doctor_id: string
    doctor_name: string
    specialty: string
    total_appointments: number
    completed_appointments: number
    total_revenue: number
    average_ticket: number
}

interface AppointmentsByDay {
    day: string
    total: number
    completed: number
    cancelled: number
    no_show: number
}

export default function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState<KPIs | null>(null)
    const [revenueByDoctor, setRevenueByDoctor] = useState<RevenueByDoctor[]>([])
    const [appointmentsByDay, setAppointmentsByDay] = useState<AppointmentsByDay[]>([])
    const [insuranceStats, setInsuranceStats] = useState<any[]>([])
    const [agendaReport, setAgendaReport] = useState<{ data: any[], summary: any }>({ data: [], summary: {} })
    const [reimbursementReport, setReimbursementReport] = useState<{ data: any[], patient_summary: any[], summary: any }>({ data: [], patient_summary: [], summary: {} })
    const [frequencyReport, setFrequencyReport] = useState<{ data: any[], summary: any }>({ data: [], summary: {} })
    const [sessionsReport, setSessionsReport] = useState<{ data: any[], summary: any }>({ data: [], summary: {} })
    const [dateRange, setDateRange] = useState('month')
    const [exporting, setExporting] = useState(false)
    const profLabel = useProfessionalLabel()

    const getDateRange = () => {
        const now = new Date()
        let startDate: Date

        switch (dateRange) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                break
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
                break
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1)
                break
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }

        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: now.toISOString().split('T')[0],
        }
    }

    const fetchData = async () => {
        setLoading(true)
        try {
            const { start_date, end_date } = getDateRange()
            const params = new URLSearchParams({ start_date, end_date })

            // Fetch KPIs
            const kpisRes = await fetch(`/api/reports?type=kpis&${params}`)
            if (kpisRes.ok) {
                const data = await kpisRes.json()
                setKpis(data.kpis)
            }

            // Fetch Revenue by Doctor
            const revenueRes = await fetch(`/api/reports?type=revenue_by_doctor&${params}`)
            if (revenueRes.ok) {
                const data = await revenueRes.json()
                setRevenueByDoctor(data.data || [])
            }

            // Fetch Appointments by Day
            const appointmentsRes = await fetch(`/api/reports?type=appointments_by_day&${params}`)
            if (appointmentsRes.ok) {
                const data = await appointmentsRes.json()
                setAppointmentsByDay(data.data || [])
            }

            // Fetch Insurance Stats
            const insuranceRes = await fetch(`/api/reports?type=health_insurance_stats&${params}`)
            if (insuranceRes.ok) {
                const data = await insuranceRes.json()
                setInsuranceStats(data.data || [])
            }

            // Fetch Agenda Report
            const agendaRes = await fetch(`/api/reports?type=agenda_report&${params}`)
            if (agendaRes.ok) {
                const data = await agendaRes.json()
                setAgendaReport({ data: data.data || [], summary: data.summary || {} })
            }

            // Fetch Reimbursement Report
            const reimbursementRes = await fetch(`/api/reports?type=reimbursement_report&${params}`)
            if (reimbursementRes.ok) {
                const data = await reimbursementRes.json()
                setReimbursementReport({ data: data.data || [], patient_summary: data.patient_summary || [], summary: data.summary || {} })
            }

            // Fetch Patient Frequency
            const freqRes = await fetch(`/api/reports?type=patient_frequency&${params}`)
            if (freqRes.ok) {
                const data = await freqRes.json()
                setFrequencyReport({ data: data.data || [], summary: data.summary || {} })
            }

            // Fetch Patient Sessions
            const sessRes = await fetch(`/api/reports?type=patient_sessions&${params}`)
            if (sessRes.ok) {
                const data = await sessRes.json()
                setSessionsReport({ data: data.data || [], summary: data.summary || {} })
            }

        } catch (error) {
            console.error('Error fetching reports:', error)
            toast.error('Erro ao carregar relatórios')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [dateRange])

    const formatCurrency = (value: number | string | null | undefined) => {
        const num = Number(value) || 0
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(num)
    }

    const formatPercent = (value: number | string | null | undefined) => {
        const num = Number(value) || 0
        return `${num.toFixed(1)}%`
    }

    const handleExport = async (format: 'csv' | 'pdf') => {
        setExporting(true)
        try {
            if (format === 'csv') {
                const { exportToCSV, formatReportData } = await import('@/lib/utils/export')
                const data = formatReportData(kpis, revenueByDoctor, dateRange)
                exportToCSV(data, 'relatorio-clinigo')
                toast.success('Relatório CSV exportado com sucesso')
            } else {
                const { exportToPDF } = await import('@/lib/utils/export')
                await exportToPDF('report-content', 'relatorio-clinigo')
                toast.success('Relatório PDF exportado com sucesso')
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro ao exportar relatório')
        } finally {
            setExporting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div id="report-content" className="container mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Relatórios e Analytics</h1>
                    <p className="text-muted-foreground">
                        Visão geral de performance da clínica
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="week">Última Semana</SelectItem>
                            <SelectItem value="month">Este Mês</SelectItem>
                            <SelectItem value="quarter">Este Trimestre</SelectItem>
                            <SelectItem value="year">Este Ano</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" size="icon" onClick={fetchData}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" onClick={() => handleExport('csv')} disabled={exporting}>
                        <Download className="h-4 w-4 mr-2" />
                        CSV
                    </Button>

                    <Button variant="outline" onClick={() => handleExport('pdf')} disabled={exporting}>
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(kpis?.total_revenue || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Ticket médio: {formatCurrency(kpis?.average_ticket || 0)}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.total_appointments || 0}</div>
                        <div className="flex gap-2 mt-1">
                            <Badge variant="default" className="text-xs">
                                {kpis?.completed_appointments || 0} concluídos
                            </Badge>
                            <Badge variant="destructive" className="text-xs">
                                {kpis?.cancelled_appointments || 0} cancelados
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                        {(kpis?.no_show_rate || 0) > 10 ? (
                            <TrendingUp className="h-4 w-4 text-destructive" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatPercent(kpis?.no_show_rate || 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {kpis?.no_show_count || 0} não compareceram
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Novos Pacientes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.new_patients || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {kpis?.active_doctors || 0}/{kpis?.total_doctors || 0} {profLabel.plural.toLowerCase()} ativos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Tabs */}
            <Tabs defaultValue="revenue" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="revenue" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Receita por {profLabel.singular}
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="gap-2">
                        <PieChart className="h-4 w-4" />
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="insurances" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Convênios
                    </TabsTrigger>
                    <TabsTrigger value="agenda" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Relatório da Agenda
                    </TabsTrigger>
                    <TabsTrigger value="reimbursement" className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Reembolso
                    </TabsTrigger>
                    <TabsTrigger value="frequency" className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        Frequência
                    </TabsTrigger>
                    <TabsTrigger value="patient_sessions" className="gap-2">
                        <ListChecks className="h-4 w-4" />
                        Sessões Paciente
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="revenue">
                    <Card>
                        <CardHeader>
                            <CardTitle>Receita por {profLabel.singular}</CardTitle>
                            <CardDescription>
                                Ranking de {profLabel.plural.toLowerCase()} por receita gerada
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {revenueByDoctor.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum dado disponível para o período selecionado
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {revenueByDoctor.map((doctor, index) => (
                                        <div key={doctor.doctor_id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{doctor.doctor_name}</p>
                                                    <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{formatCurrency(doctor.total_revenue)}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {doctor.completed_appointments} consultas
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="appointments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agendamentos por Dia</CardTitle>
                            <CardDescription>
                                Distribuição de agendamentos no período
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {appointmentsByDay.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum dado disponível para o período selecionado
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {/* Simple bar chart representation */}
                                    <div className="grid grid-cols-7 gap-1 text-xs text-center">
                                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                                            <div key={day} className="font-medium text-muted-foreground">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="p-2 text-left">Data</th>
                                                    <th className="p-2 text-right">Total</th>
                                                    <th className="p-2 text-right">Concluídos</th>
                                                    <th className="p-2 text-right">Cancelados</th>
                                                    <th className="p-2 text-right">No-Show</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {appointmentsByDay.slice(-14).map((day) => (
                                                    <tr key={day.day} className="border-b hover:bg-muted/50">
                                                        <td className="p-2">
                                                            {new Date(day.day).toLocaleDateString('pt-BR', {
                                                                weekday: 'short',
                                                                day: '2-digit',
                                                                month: '2-digit'
                                                            })}
                                                        </td>
                                                        <td className="p-2 text-right font-medium">{day.total}</td>
                                                        <td className="p-2 text-right text-green-600">{day.completed}</td>
                                                        <td className="p-2 text-right text-red-600">{day.cancelled}</td>
                                                        <td className="p-2 text-right text-yellow-600">{day.no_show}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="insurances">
                    <Card>
                        <CardHeader>
                            <CardTitle>Consultas por Convênio</CardTitle>
                            <CardDescription>
                                Volume de atendimentos por operadora e plano
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {insuranceStats.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum dado de convênio disponível para o período
                                </p>
                            ) : (
                                <div className="space-y-6">
                                    {insuranceStats.map((stat) => (
                                        <div key={stat.insuranceName} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-full">
                                                        <Shield className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-lg">{stat.insuranceName}</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {stat.total} consultas totais
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-lg px-3 py-1">
                                                    {stat.total}
                                                </Badge>
                                            </div>

                                            <div className="pl-14">
                                                <p className="text-sm font-medium mb-2 text-muted-foreground">Detalhamento por Plano:</p>
                                                <div className="grid gap-2">
                                                    {stat.plans.map((plan: any) => (
                                                        <div key={plan.name} className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded">
                                                            <span>{plan.name}</span>
                                                            <span className="font-medium">{plan.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Agenda Report Tab */}
                <TabsContent value="agenda">
                    <Card>
                        <CardHeader>
                            <CardTitle>Relatório da Agenda</CardTitle>
                            <CardDescription>
                                Lista detalhada de agendamentos no período — {agendaReport.summary.total || 0} agendamentos,{' '}
                                {agendaReport.summary.completed || 0} concluídos,{' '}
                                {agendaReport.summary.cancelled || 0} cancelados
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {agendaReport.data.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">
                                    Nenhum agendamento encontrado para o período selecionado
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="p-2 text-left">Data</th>
                                                <th className="p-2 text-left">Horário</th>
                                                <th className="p-2 text-left">Paciente</th>
                                                <th className="p-2 text-left">Profissional</th>
                                                <th className="p-2 text-left">Especialidade</th>
                                                <th className="p-2 text-center">Status</th>
                                                <th className="p-2 text-right">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agendaReport.data.map((item: any) => (
                                                <tr key={item.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-2">
                                                        {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="p-2">
                                                        {item.start_time?.substring(0,5) || '-'}
                                                    </td>
                                                    <td className="p-2 font-medium">{item.patient_name}</td>
                                                    <td className="p-2">{item.doctor_name}</td>
                                                    <td className="p-2 text-muted-foreground">{item.specialty}</td>
                                                    <td className="p-2 text-center">
                                                        <Badge variant={
                                                            item.status === 'COMPLETED' ? 'default' :
                                                            item.status === 'CANCELLED' ? 'destructive' :
                                                            item.status === 'NO_SHOW' ? 'destructive' :
                                                            'secondary'
                                                        } className="text-xs">
                                                            {item.status_label}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-2 text-right">
                                                        {item.payment_amount > 0 ? formatCurrency(item.payment_amount) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Reimbursement Report Tab */}
                <TabsContent value="reimbursement">
                    <div className="space-y-6">
                        {/* Reimbursement Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Sessões com Regra</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reimbursementReport.summary.total_appointments || 0}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Faturamento</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">{formatCurrency(reimbursementReport.summary.total_billing || 0)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Total Reembolso</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{formatCurrency(reimbursementReport.summary.total_reimbursement || 0)}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">Guias Geradas</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{reimbursementReport.summary.total_guides || 0}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Patient Summary */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumo por Paciente</CardTitle>
                                <CardDescription>
                                    Valores de faturamento e reembolso agrupados por paciente
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {reimbursementReport.patient_summary.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhum atendimento com regra de reembolso no período.
                                        Configure regras em Configurações → Reembolso por Paciente.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="p-2 text-left">Paciente</th>
                                                    <th className="p-2 text-center">Sessões</th>
                                                    <th className="p-2 text-center">Guias</th>
                                                    <th className="p-2 text-right">Faturamento</th>
                                                    <th className="p-2 text-right">Reembolso</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reimbursementReport.patient_summary.map((p: any) => (
                                                    <tr key={p.name} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 font-medium">{p.name}</td>
                                                        <td className="p-2 text-center">{p.sessions}</td>
                                                        <td className="p-2 text-center">{p.guides}</td>
                                                        <td className="p-2 text-right text-blue-600">{formatCurrency(p.billing)}</td>
                                                        <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(p.reimbursement)}</td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 font-bold">
                                                    <td className="p-2">TOTAL</td>
                                                    <td className="p-2 text-center">{reimbursementReport.patient_summary.reduce((s: number, p: any) => s + p.sessions, 0)}</td>
                                                    <td className="p-2 text-center">{reimbursementReport.patient_summary.reduce((s: number, p: any) => s + p.guides, 0)}</td>
                                                    <td className="p-2 text-right text-blue-600">{formatCurrency(reimbursementReport.summary.total_billing || 0)}</td>
                                                    <td className="p-2 text-right text-green-600">{formatCurrency(reimbursementReport.summary.total_reimbursement || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Detailed Entries */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Detalhamento por Sessão</CardTitle>
                                <CardDescription>
                                    Cada sessão concluída com sua regra de reembolso aplicada
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {reimbursementReport.data.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhum dado disponível
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="p-2 text-left">Data</th>
                                                    <th className="p-2 text-left">Paciente</th>
                                                    <th className="p-2 text-left">Profissional</th>
                                                    <th className="p-2 text-left">Terapia</th>
                                                    <th className="p-2 text-center">Guias</th>
                                                    <th className="p-2 text-right">Faturamento</th>
                                                    <th className="p-2 text-right">Reembolso Unit.</th>
                                                    <th className="p-2 text-right">Total Reemb.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reimbursementReport.data.map((item: any, idx: number) => (
                                                    <tr key={`${item.appointment_id}-${idx}`} className="border-b hover:bg-muted/50">
                                                        <td className="p-2">
                                                            {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </td>
                                                        <td className="p-2 font-medium">{item.patient_name}</td>
                                                        <td className="p-2">{item.doctor_name}</td>
                                                        <td className="p-2">{item.therapy_type}</td>
                                                        <td className="p-2 text-center">{item.guides_per_session}</td>
                                                        <td className="p-2 text-right text-blue-600">{formatCurrency(item.billing_amount)}</td>
                                                        <td className="p-2 text-right">{formatCurrency(item.reimbursement_amount)}</td>
                                                        <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(item.total_reimbursement)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* FREQUÊNCIA */}
                <TabsContent value="frequency">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{frequencyReport.summary.total_patients || 0}</div><p className="text-xs text-muted-foreground">Pacientes</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{frequencyReport.summary.total_appointments || 0}</div><p className="text-xs text-muted-foreground">Total Agendamentos</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-600">{frequencyReport.summary.total_completed || 0}</div><p className="text-xs text-muted-foreground">Compareceram</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-600">{frequencyReport.summary.total_no_show || 0}</div><p className="text-xs text-muted-foreground">Faltaram</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{frequencyReport.summary.overall_attendance_rate || 0}%</div><p className="text-xs text-muted-foreground">Taxa Presença Geral</p></CardContent></Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle>Frequência por Paciente</CardTitle><CardDescription>Ordenado por menor taxa de presença (pacientes que mais faltam aparecem primeiro)</CardDescription></CardHeader>
                            <CardContent>
                                {frequencyReport.data.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="border-b"><th className="p-2 text-left">Paciente</th><th className="p-2 text-left">Profissional</th><th className="p-2 text-center">Total</th><th className="p-2 text-center">Presentes</th><th className="p-2 text-center">Faltas</th><th className="p-2 text-center">Canceladas</th><th className="p-2 text-center">Taxa Presença</th></tr></thead>
                                            <tbody>
                                                {frequencyReport.data.map((p: any) => (
                                                    <tr key={p.patient_id} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 font-medium">{p.patient_name}</td>
                                                        <td className="p-2">{p.professional}</td>
                                                        <td className="p-2 text-center">{p.total}</td>
                                                        <td className="p-2 text-center text-green-600">{p.completed}</td>
                                                        <td className="p-2 text-center text-red-600 font-bold">{p.no_show}</td>
                                                        <td className="p-2 text-center">{p.cancelled}</td>
                                                        <td className="p-2 text-center">
                                                            <Badge variant={p.attendance_rate >= 80 ? 'default' : p.attendance_rate >= 50 ? 'secondary' : 'destructive'}>{p.attendance_rate}%</Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* SESSÕES POR PACIENTE */}
                <TabsContent value="patient_sessions">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{sessionsReport.summary.total_sessions || 0}</div><p className="text-xs text-muted-foreground">Total Sessões</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-600">{sessionsReport.summary.completed || 0}</div><p className="text-xs text-muted-foreground">Realizadas</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-600">{sessionsReport.summary.no_show || 0}</div><p className="text-xs text-muted-foreground">Faltas</p></CardContent></Card>
                            <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-orange-600">{sessionsReport.summary.cancelled || 0}</div><p className="text-xs text-muted-foreground">Canceladas</p></CardContent></Card>
                        </div>
                        <Card>
                            <CardHeader><CardTitle>Sessões Realizadas</CardTitle><CardDescription>Listagem detalhada de todas as sessões no período</CardDescription></CardHeader>
                            <CardContent>
                                {sessionsReport.data.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Sem dados no período</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="border-b"><th className="p-2 text-left">Data</th><th className="p-2 text-left">Horário</th><th className="p-2 text-left">Paciente</th><th className="p-2 text-left">Profissional</th><th className="p-2 text-left">Especialidade</th><th className="p-2 text-left">Convênio</th><th className="p-2 text-center">Status</th></tr></thead>
                                            <tbody>
                                                {sessionsReport.data.map((s: any) => (
                                                    <tr key={s.id} className="border-b hover:bg-muted/50">
                                                        <td className="p-2">{new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                                        <td className="p-2">{s.start_time?.slice(0,5) || '-'}</td>
                                                        <td className="p-2 font-medium">{s.patient_name}</td>
                                                        <td className="p-2">{s.professional}</td>
                                                        <td className="p-2">{s.specialty}</td>
                                                        <td className="p-2">{s.insurance}</td>
                                                        <td className="p-2 text-center">
                                                            <Badge variant={s.status === 'COMPLETED' || s.status === 'CONFIRMED' ? 'default' : s.status === 'NO_SHOW' ? 'destructive' : 'secondary'}>
                                                                {s.status === 'COMPLETED' ? 'Realizada' : s.status === 'CONFIRMED' ? 'Confirmada' : s.status === 'NO_SHOW' ? 'Falta' : s.status === 'CANCELLED' ? 'Cancelada' : s.status}
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

