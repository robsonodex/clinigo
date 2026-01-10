'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Users, Calendar, DollarSign, BarChart3, PieChart, Download, RefreshCcw, Shield } from 'lucide-react'
import { toast } from 'sonner'

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
    const [dateRange, setDateRange] = useState('month')
    const [exporting, setExporting] = useState(false)

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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    const formatPercent = (value: number) => {
        return `${value.toFixed(1)}%`
    }

    const handleExport = async (format: 'csv' | 'pdf') => {
        setExporting(true)
        try {
            // TODO: Implement export to CSV/PDF
            toast.success(`Exportação ${format.toUpperCase()} iniciada`)
        } catch (error) {
            toast.error('Erro ao exportar relatório')
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
        <div className="container mx-auto py-8 px-4 space-y-8">
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
                            {kpis?.active_doctors || 0}/{kpis?.total_doctors || 0} médicos ativos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Tabs */}
            <Tabs defaultValue="revenue" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="revenue" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Receita por Médico
                    </TabsTrigger>
                    <TabsTrigger value="appointments" className="gap-2">
                        <PieChart className="h-4 w-4" />
                        Agendamentos
                    </TabsTrigger>
                    <TabsTrigger value="insurances" className="gap-2">
                        <Shield className="h-4 w-4" />
                        Convênios
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="revenue">
                    <Card>
                        <CardHeader>
                            <CardTitle>Receita por Médico</CardTitle>
                            <CardDescription>
                                Ranking de médicos por receita gerada
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
            </Tabs>
        </div>
    )
}

