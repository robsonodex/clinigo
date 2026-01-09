'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Users,
    Building2,
    Calendar,
    Download,
    ArrowUpRight,
    ArrowDownRight,
    Video,
    CreditCard,
    Activity,
    PieChart,
} from 'lucide-react'

export default function RelatoriosGlobaisPage() {
    const [period, setPeriod] = useState('30d')

    // Mock data cleared
    const metrics = {
        mrr: 0,
        mrrChange: 0,
        totalClinics: 0,
        clinicsChange: 0,
        totalAppointments: 0,
        appointmentsChange: 0,
        avgTicket: 0,
        ticketChange: 0,
    }

    const topClinics: any[] = []

    const planDistribution: any[] = []

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-7 h-7" />
                        Relatórios Globais
                    </h1>
                    <p className="text-muted-foreground">
                        Métricas e análises de toda a plataforma
                    </p>
                </div>
                <div className="flex gap-2">
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Últimos 7 dias</SelectItem>
                            <SelectItem value="30d">Últimos 30 dias</SelectItem>
                            <SelectItem value="90d">Últimos 90 dias</SelectItem>
                            <SelectItem value="12m">Últimos 12 meses</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Main Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-900">
                            MRR
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">
                            R$ {metrics.mrr.toLocaleString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {metrics.mrrChange > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm ${metrics.mrrChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {Math.abs(metrics.mrrChange)}% vs mês anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900">
                            Clínicas Ativas
                        </CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">{metrics.totalClinics}</div>
                        <div className="flex items-center gap-1 mt-1">
                            <ArrowUpRight className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600">
                                +{metrics.clinicsChange} este mês
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900">
                            Consultas
                        </CardTitle>
                        <Video className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">
                            {metrics.totalAppointments.toLocaleString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <ArrowUpRight className="w-4 h-4 text-purple-600" />
                            <span className="text-sm text-purple-600">
                                +{metrics.appointmentsChange}% vs período anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900">
                            Ticket Médio
                        </CardTitle>
                        <CreditCard className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">
                            R$ {metrics.avgTicket}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            {metrics.ticketChange > 0 ? (
                                <ArrowUpRight className="w-4 h-4 text-amber-600" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm ${metrics.ticketChange > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                {Math.abs(metrics.ticketChange)}% vs período anterior
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="revenue">Receita</TabsTrigger>
                    <TabsTrigger value="clinics">Clínicas</TabsTrigger>
                    <TabsTrigger value="usage">Uso</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Top Clinics */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Clínicas por Receita</CardTitle>
                                <CardDescription>Maiores faturamentos do período</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {topClinics.map((clinic, idx) => (
                                        <div
                                            key={clinic.name}
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{clinic.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {clinic.appointments} consultas
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-green-600">
                                                    R$ {clinic.revenue.toLocaleString('pt-BR')}
                                                </p>
                                                <Badge variant="secondary" className="text-xs">
                                                    {clinic.plan}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {topClinics.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8">
                                            Nenhum dado disponível
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Plan Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribuição por Plano</CardTitle>
                                <CardDescription>Clínicas por tipo de plano</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {planDistribution.map((item) => (
                                        <div key={item.plan}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium">{item.plan}</span>
                                                <span className="text-muted-foreground">
                                                    {item.count} clínicas ({item.percentage}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-muted rounded-full h-3">
                                                <div
                                                    className={`h-3 rounded-full ${item.plan === 'Básico'
                                                        ? 'bg-blue-500'
                                                        : item.plan === 'Profissional'
                                                            ? 'bg-purple-500'
                                                            : 'bg-emerald-500'
                                                        }`}
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {planDistribution.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8">
                                            Nenhum dado disponível
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
                                    <p className="text-sm">
                                        <strong>Oportunidade:</strong> Nenhuma oportunidade detectada.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">0</div>
                                        <p className="text-xs text-muted-foreground">Médicos ativos</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 rounded-lg">
                                        <Activity className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">100%</div>
                                        <p className="text-xs text-muted-foreground">Uptime</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-100 rounded-lg">
                                        <PieChart className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">0</div>
                                        <p className="text-xs text-muted-foreground">NPS médio</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 rounded-lg">
                                        <Calendar className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">0%</div>
                                        <p className="text-xs text-muted-foreground">Churn mensal</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="revenue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análise de Receita</CardTitle>
                            <CardDescription>
                                Gráficos e métricas detalhadas de faturamento
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Gráficos de receita serão exibidos aqui</p>
                                <p className="text-sm">Integre com biblioteca de charts como Recharts</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="clinics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análise de Clínicas</CardTitle>
                            <CardDescription>
                                Performance e métricas por clínica
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Métricas de clínicas serão exibidas aqui</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="usage" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análise de Uso</CardTitle>
                            <CardDescription>
                                Métricas de utilização da plataforma
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Métricas de uso serão exibidas aqui</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
