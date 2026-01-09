'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Building2,
    Users,
    CreditCard,
    Brain,
    TrendingUp,
    TrendingDown,
    Eye,
    Shield,
    AlertTriangle,
    DollarSign,
    BarChart3,
    Clock,
    RefreshCw,
    LogOut,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

interface DashboardData {
    metrics: {
        totalClinics: number
        activeClinics: number
        totalRevenue: number
        mrr: number
        churnRate: number
        totalConsultations: number
        aiTokensUsed: number
        aiCostBRL: number
    }
    clinics: Array<{
        id: string
        name: string
        planType: string
        isActive: boolean
        revenue: number
        renewalDate: string
        aiTokensUsed: number
    }>
    recentLogs: Array<{
        id: string
        actionType: string
        actionDescription: string
        targetClinic: string
        createdAt: string
    }>
}

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [data, setData] = useState<DashboardData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isImpersonating, setIsImpersonating] = useState<string | null>(null)

    useEffect(() => {
        loadDashboard()
    }, [])

    const loadDashboard = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/super-admin/dashboard')
            if (!res.ok) {
                if (res.status === 404) {
                    router.push('/login')
                    return
                }
                throw new Error('Failed to load dashboard')
            }
            const result = await res.json()
            setData(result)
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleImpersonate = async (clinicId: string, clinicName: string) => {
        try {
            const res = await fetch('/api/super-admin/impersonate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, clinicName }),
            })
            if (res.ok) {
                setIsImpersonating(clinicId)
                // Open in new tab
                window.open(`/dashboard?impersonate=${clinicId}`, '_blank')
            }
        } catch (error) {
            console.error('Impersonation error:', error)
        }
    }

    const getPlanBadge = (plan: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            BASIC: 'secondary',
            PRO: 'default',
            ENTERPRISE: 'destructive',
        }
        return <Badge variant={variants[plan] || 'outline'}>{plan}</Badge>
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <Skeleton className="h-12 w-64 bg-gray-800" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-32 bg-gray-800" />
                        ))}
                    </div>
                    <Skeleton className="h-96 bg-gray-800" />
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-red-500">Erro ao carregar dashboard</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-red-500" />
                        <div>
                            <h1 className="text-xl font-bold">System Master Hub</h1>
                            <p className="text-xs text-gray-400">CliniGo Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={loadDashboard}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-400">Clínicas Ativas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{data.metrics.activeClinics}</span>
                                <Building2 className="h-8 w-8 text-blue-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                de {data.metrics.totalClinics} cadastradas
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-400">MRR (Receita Mensal)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-green-500">
                                    R$ {data.metrics.mrr.toLocaleString('pt-BR')}
                                </span>
                                <TrendingUp className="h-8 w-8 text-green-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Total acumulado: R$ {data.metrics.totalRevenue.toLocaleString('pt-BR')}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-400">Churn Rate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-yellow-500">
                                    {data.metrics.churnRate.toFixed(1)}%
                                </span>
                                <TrendingDown className="h-8 w-8 text-yellow-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Meta: &lt; 5%
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-800 border-gray-700">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-400">Custo IA (Mês)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold text-purple-500">
                                    R$ {data.metrics.aiCostBRL.toFixed(2)}
                                </span>
                                <Brain className="h-8 w-8 text-purple-500" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {data.metrics.aiTokensUsed.toLocaleString()} tokens
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="clinics" className="space-y-4">
                    <TabsList className="bg-gray-800">
                        <TabsTrigger value="clinics">Gestão de Clínicas</TabsTrigger>
                        <TabsTrigger value="ai-costs">Monitor de IA</TabsTrigger>
                        <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
                    </TabsList>

                    {/* Clinics Tab */}
                    <TabsContent value="clinics">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle>Todas as Clínicas</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Gerencie e monitore todas as clínicas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-700">
                                            <TableHead className="text-gray-400">Clínica</TableHead>
                                            <TableHead className="text-gray-400">Plano</TableHead>
                                            <TableHead className="text-gray-400">Status</TableHead>
                                            <TableHead className="text-gray-400">Faturamento</TableHead>
                                            <TableHead className="text-gray-400">Renovação</TableHead>
                                            <TableHead className="text-gray-400">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.clinics.map((clinic) => (
                                            <TableRow key={clinic.id} className="border-gray-700">
                                                <TableCell className="font-medium">{clinic.name}</TableCell>
                                                <TableCell>{getPlanBadge(clinic.planType)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={clinic.isActive ? 'default' : 'destructive'}>
                                                        {clinic.isActive ? 'Ativo' : 'Inativo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    R$ {clinic.revenue.toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(clinic.renewalDate), 'dd/MM/yyyy', { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleImpersonate(clinic.id, clinic.name)}
                                                        className="text-blue-400 hover:text-blue-300"
                                                    >
                                                        <Eye className="h-4 w-4 mr-1" />
                                                        Visualizar
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* AI Costs Tab */}
                    <TabsContent value="ai-costs">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Brain className="h-5 w-5 text-purple-500" />
                                    Consumo de IA por Clínica
                                </CardTitle>
                                <CardDescription className="text-gray-400">
                                    Monitore tokens e custos em tempo real
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-700">
                                            <TableHead className="text-gray-400">Clínica</TableHead>
                                            <TableHead className="text-gray-400">Tokens</TableHead>
                                            <TableHead className="text-gray-400">Custo</TableHead>
                                            <TableHead className="text-gray-400">Limite</TableHead>
                                            <TableHead className="text-gray-400">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.clinics.map((clinic) => {
                                            const limit = clinic.planType === 'ENTERPRISE' ? Infinity : 100000
                                            const usage = (clinic.aiTokensUsed / limit) * 100
                                            const isAbusing = usage > 80

                                            return (
                                                <TableRow key={clinic.id} className="border-gray-700">
                                                    <TableCell className="font-medium">{clinic.name}</TableCell>
                                                    <TableCell>
                                                        {clinic.aiTokensUsed.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        R$ {(clinic.aiTokensUsed * 0.00002).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {limit === Infinity ? '∞' : limit.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isAbusing ? (
                                                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                Alto uso
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline">Normal</Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Logs Tab */}
                    <TabsContent value="logs">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle>Logs do Sistema</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Últimas ações do Super Admin
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-700">
                                            <TableHead className="text-gray-400">Ação</TableHead>
                                            <TableHead className="text-gray-400">Descrição</TableHead>
                                            <TableHead className="text-gray-400">Clínica</TableHead>
                                            <TableHead className="text-gray-400">Data/Hora</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recentLogs.map((log) => (
                                            <TableRow key={log.id} className="border-gray-700">
                                                <TableCell>
                                                    <Badge variant="outline">{log.actionType}</Badge>
                                                </TableCell>
                                                <TableCell>{log.actionDescription}</TableCell>
                                                <TableCell>{log.targetClinic || '-'}</TableCell>
                                                <TableCell className="text-gray-500">
                                                    {format(new Date(log.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}

