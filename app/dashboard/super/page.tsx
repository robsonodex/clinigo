'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    DollarSign,
    Building2,
    TrendingDown,
    Brain,
    Activity,
    AlertTriangle,
    Loader2,
    RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface SuperMetrics {
    revenue: {
        total: number
        formatted: string
    }
    clinics: {
        total: number
        active: number
        inactive: number
        churnRate: string
    }
    plans: {
        BASIC: number
        PRO: number
        ENTERPRISE: number
    }
    ai: {
        totalTokens: number
        tokensByTenant: Array<{
            clinicId: string
            clinicName: string
            tokens: number
        }>
    }
    topClinics: Array<{
        id: string
        name: string
        plan: string
        revenue: number
        tokens: number
    }>
    activity: {
        appointmentsToday: number
    }
    billing: {
        pendingCharges: number
        upcomingRenewals: Array<{
            id: string
            name: string
            plan: string
            dueDate: string
            daysUntil: number
        }>
    }
    generatedAt: string
}

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [metrics, setMetrics] = useState<SuperMetrics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Helper for manual charge (copied logic due to component isolation)
    const handleCharge = (clinicId: string) => {
        router.push(`/dashboard/clinicas/${clinicId}?tab=billing`)
    }

    const fetchMetrics = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/super/metrics')
            const data = await response.json()

            if (!response.ok) {
                if (response.status === 403) {
                    router.push('/dashboard')
                    return
                }
                throw new Error(data.error || 'Failed to fetch metrics')
            }

            setMetrics(data.data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMetrics()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Carregando métricas globais...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
                <p className="text-lg font-medium">{error}</p>
                <Button onClick={fetchMetrics}>Tentar novamente</Button>
            </div>
        )
    }

    if (!metrics) return null

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">🏛️ Painel do Super Admin</h1>
                    <p className="text-muted-foreground">
                        Visão global de todas as clínicas (bypass RLS)
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={fetchMetrics} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Billing Alerts Widget */}
            {(metrics.billing.pendingCharges > 0 || metrics.billing.upcomingRenewals.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pending Charges */}
                    <Card className="border-amber-200 bg-amber-50">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-amber-800">Cobranças Pendentes</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-700">
                                {metrics.billing.pendingCharges}
                            </div>
                            <p className="text-xs text-amber-600">aguardando pagamento</p>
                        </CardContent>
                    </Card>

                    {/* Quick Renewals List */}
                    <Card className="border-blue-200 bg-blue-50 md:col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-blue-800">
                                Vencimentos Próximos (7 dias)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {metrics.billing.upcomingRenewals.length === 0 ? (
                                <p className="text-sm text-blue-600">Nenhuma renovação próxima.</p>
                            ) : (
                                <div className="space-y-2">
                                    {metrics.billing.upcomingRenewals.map(clinic => (
                                        <div key={clinic.id} className="flex items-center justify-between bg-white/50 p-2 rounded text-sm">
                                            <div>
                                                <span className="font-medium text-blue-900">{clinic.name}</span>
                                                <span className="text-xs text-blue-700 ml-2">({clinic.plan})</span>
                                                <div className="text-[10px] text-blue-600">
                                                    Vence em {new Date(clinic.dueDate).toLocaleDateString('pt-BR')} ({clinic.daysUntil} dias)
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-7 text-xs"
                                                onClick={() => handleCharge(clinic.id)}
                                            >
                                                Cobrar
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Revenue */}
                <Card className="border-green-200 bg-green-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {metrics.revenue.formatted}
                        </div>
                        <p className="text-xs text-muted-foreground">Todas as clínicas</p>
                    </CardContent>
                </Card>

                {/* Active Clinics */}
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Clínicas Ativas</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {metrics.clinics.active}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            de {metrics.clinics.total} total
                        </p>
                    </CardContent>
                </Card>

                {/* Churn Rate */}
                <Card className="border-red-200 bg-red-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {metrics.clinics.churnRate}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.clinics.inactive} clínicas inativas
                        </p>
                    </CardContent>
                </Card>

                {/* AiA Tokens */}
                <Card className="border-purple-200 bg-purple-50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Tokens AiA</CardTitle>
                        <Brain className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-700">
                            {metrics.ai.totalTokens.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Consumo total</p>
                    </CardContent>
                </Card>
            </div>

            {/* Plan Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Distribuição de Planos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary">BASIC</Badge>
                            <span className="font-bold">{metrics.plans.BASIC}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="default">PRO</Badge>
                            <span className="font-bold">{metrics.plans.PRO}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500">ENTERPRISE</Badge>
                            <span className="font-bold">{metrics.plans.ENTERPRISE}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Top Clinics Table */}
            <Card>
                <CardHeader>
                    <CardTitle>🏆 Top 10 Clínicas por Faturamento</CardTitle>
                    <CardDescription>Ranking de receita + consumo de IA</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Clínica</TableHead>
                                <TableHead>Plano</TableHead>
                                <TableHead className="text-right">Faturamento</TableHead>
                                <TableHead className="text-right">Tokens AiA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metrics.topClinics.map((clinic, index) => (
                                <TableRow key={clinic.id}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{clinic.name}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={clinic.plan === 'ENTERPRISE' ? 'default' : 'secondary'}
                                            className={clinic.plan === 'ENTERPRISE' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}
                                        >
                                            {clinic.plan}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        R$ {(clinic.revenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right font-mono">
                                        {clinic.tokens.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* AiA Token Usage by Tenant */}
            <Card>
                <CardHeader>
                    <CardTitle>🧠 Consumo AiA por Tenant</CardTitle>
                    <CardDescription>Top 10 clínicas que mais usam a Inteligência Artificial</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Clínica</TableHead>
                                <TableHead className="text-right">Tokens Consumidos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {metrics.ai.tokensByTenant.map((tenant, index) => (
                                <TableRow key={tenant.clinicId}>
                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell>{tenant.clinicName}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {tenant.tokens.toLocaleString()}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground">
                <Activity className="inline h-4 w-4 mr-1" />
                Dados atualizados em: {new Date(metrics.generatedAt).toLocaleString('pt-BR')}
            </div>
        </div>
    )
}
