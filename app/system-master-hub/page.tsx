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
    CheckCircle2,
    MessageCircle,
    Send,
    Loader2,
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
        approvalStatus: string | null
        trialEndsAt: string | null
        subscriptionDueDate: string | null
    }>
    users: Array<{
        id: string
        email: string
        displayName: string
        role: string
        clinicName: string
        clinicId: string | null
        createdAt: string
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
    const [users, setUsers] = useState<DashboardData['users']>([])
    const [loadingUsers, setLoadingUsers] = useState(false)
    const [sendingBilling, setSendingBilling] = useState<string | null>(null)

    useEffect(() => {
        loadDashboard()
        loadUsers()
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
            if (result.data) {
                setData(result.data)
            } else {
                setData(result)
            }
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const loadUsers = async () => {
        setLoadingUsers(true)
        try {
            const res = await fetch('/api/super-admin/users')
            if (res.ok) {
                const result = await res.json()
                setUsers(result.data || [])
            }
        } catch (error) {
            console.error('Error loading users:', error)
        } finally {
            setLoadingUsers(false)
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

    const handleDeleteClinic = async (clinicId: string, clinicName: string) => {
        const confirmed = confirm(
            `ATENÇÃO: Você está prestes a deletar a clínica "${clinicName}".\n\n` +
            `Isso irá remover PERMANENTEMENTE:\n` +
            `- Todos os usuários\n` +
            `- Todos os pacientes\n` +
            `- Todas as consultas\n` +
            `- Todos os dados financeiros\n` +
            `- Todos os documentos\n\n` +
            `Esta ação NÃO PODE SER DESFEITA!\n\n` +
            `Digite OK para confirmar.`
        )

        if (!confirmed) return

        const doubleConfirm = confirm(
            `ÚLTIMA CONFIRMAÇÃO!\n\n` +
            `Deletar clínica: ${clinicName}\n\n` +
            `Tem ABSOLUTA CERTEZA?`
        )

        if (!doubleConfirm) return

        try {
            const res = await fetch(`/api/super-admin/clinics/delete?id=${clinicId}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to delete clinic')
            }

            alert(`Clínica "${clinicName}" deletada com sucesso!`)
            loadDashboard() // Reload data
        } catch (error) {
            console.error('Delete error:', error)
            alert(`Erro ao deletar clínica: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleDeleteUser = async (userId: string, userName: string, deleteClinic: boolean = false) => {
        const confirmed = confirm(
            `ATENÇÃO: Você está prestes a deletar o usuário "${userName}".\n\n` +
            `Isso irá remover PERMANENTEMENTE:\n` +
            `- O usuário do sistema\n` +
            `- Liberar o email para reuso\n` +
            (deleteClinic ? `- A clínica associada e TODOS os dados\n` : '') +
            `\nEsta ação NÃO PODE SER DESFEITA!`
        )

        if (!confirmed) return

        try {
            const res = await fetch(`/api/super-admin/users?id=${userId}&deleteClinic=${deleteClinic}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to delete user')
            }

            alert(`Usuário "${userName}" deletado com sucesso!`)
            loadUsers() // Reload users
            if (deleteClinic) loadDashboard() // Reload dashboard if clinic was deleted
        } catch (error) {
            console.error('Delete error:', error)
            alert(`Erro ao deletar usuário: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleActivatePlan = async (clinicId: string, clinicName: string) => {
        const confirmed = confirm(
            `Ativar plano da clínica "${clinicName}"?\n\n` +
            `Isso irá:\n` +
            `- Remover o período de teste\n` +
            `- Ativar a clínica como cliente ativo\n` +
            `- O banner de trial desaparecerá imediatamente\n\n` +
            `Confirmar?`
        )

        if (!confirmed) return

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'activate_plan' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to activate clinic')
            }

            alert(`Clínica "${clinicName}" ativada com sucesso! Trial removido.`)
            loadDashboard()
        } catch (error) {
            console.error('Activation error:', error)
            alert(`Erro ao ativar clínica: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    const handleSendBilling = async (clinicId: string, clinicName: string, dueDate: string | null) => {
        const confirmed = confirm(
            `Enviar lembrete de cobrança para "${clinicName}"?\n\n` +
            `Uma notificação profissional será enviada para o(s) administrador(es) da clínica ` +
            `informando sobre o vencimento da mensalidade` +
            (dueDate ? ` em ${new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}.` : '.') +
            `\n\nConfirmar envio?`
        )

        if (!confirmed) return

        setSendingBilling(clinicId)
        try {
            const res = await fetch('/api/super-admin/clinics/send-billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, clinicName, dueDate }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Falha ao enviar cobrança')
            }

            const result = await res.json()
            alert(`✅ ${result.data?.message || 'Notificação de cobrança enviada com sucesso!'}`)
        } catch (error) {
            console.error('Billing notification error:', error)
            alert(`Erro ao enviar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setSendingBilling(null)
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">System Master Hub</h1>
                            <p className="text-xs text-gray-500">CliniGo Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/chat')}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat
                        </Button>
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
                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">Clínicas Ativas</CardDescription>
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

                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">MRR (Receita Mensal)</CardDescription>
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

                    <Card className="bg-white border-gray-200">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-gray-600">Churn Rate</CardDescription>
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
                </div>

                {/* Tabs */}
                <Tabs defaultValue="clinics" className="space-y-4">
                    <TabsList className="bg-white border border-gray-200">
                        <TabsTrigger value="clinics">Gestão de Clínicas</TabsTrigger>
                        <TabsTrigger value="users">Usuários</TabsTrigger>
                        <TabsTrigger value="logs">Logs do Sistema</TabsTrigger>
                    </TabsList>

                    {/* Clinics Tab */}
                    <TabsContent value="clinics">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-gray-900">Todas as Clínicas</CardTitle>
                                <CardDescription className="text-gray-600">
                                    Gerencie e monitore todas as clínicas
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-200">
                                            <TableHead className="text-gray-600">Clínica</TableHead>
                                            <TableHead className="text-gray-600">Plano</TableHead>
                                            <TableHead className="text-gray-600">Status</TableHead>
                                            <TableHead className="text-gray-600">Faturamento</TableHead>
                                            <TableHead className="text-gray-600">Renovação</TableHead>
                                            <TableHead className="text-gray-600">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.clinics.map((clinic) => (
                                            <TableRow key={clinic.id} className="border-gray-200 hover:bg-gray-50">
                                                <TableCell className="font-medium">{clinic.name}</TableCell>
                                                <TableCell>{getPlanBadge(clinic.planType)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant={clinic.isActive ? 'default' : 'destructive'}>
                                                            {clinic.isActive ? 'Ativo' : 'Inativo'}
                                                        </Badge>
                                                        {clinic.approvalStatus === 'trial' && (
                                                            <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50">
                                                                Trial
                                                            </Badge>
                                                        )}
                                                        {clinic.approvalStatus === 'expired' && (
                                                            <Badge variant="destructive">
                                                                Expirado
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    R$ {clinic.revenue.toLocaleString('pt-BR')}
                                                </TableCell>
                                                <TableCell>
                                                    {format(new Date(clinic.renewalDate), 'dd/MM/yyyy', { locale: ptBR })}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleImpersonate(clinic.id, clinic.name)}
                                                            className="text-blue-400 hover:text-blue-300"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Ver
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/system-master-hub/clinics/${clinic.id}/permissions`)}
                                                            className="text-purple-400 hover:text-purple-300"
                                                        >
                                                            <Shield className="h-4 w-4 mr-1" />
                                                            Permissões
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteClinic(clinic.id, clinic.name)}
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                                            Deletar
                                                        </Button>
                                                        {clinic.approvalStatus === 'trial' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleActivatePlan(clinic.id, clinic.name)}
                                                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                                Ativar Plano
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleSendBilling(clinic.id, clinic.name, clinic.subscriptionDueDate)}
                                                            disabled={sendingBilling === clinic.id}
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        >
                                                            {sendingBilling === clinic.id ? (
                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <Send className="h-4 w-4 mr-1" />
                                                            )}
                                                            Cobrar
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Users Tab */}
                    <TabsContent value="users">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-gray-900">Todos os Usuários</CardTitle>
                                <CardDescription className="text-gray-600">
                                    Gerencie todos os usuários do sistema
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingUsers ? (
                                    <div className="text-center py-8">
                                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                                        <p className="text-gray-500 mt-2">Carregando usuários...</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-gray-200">
                                                <TableHead className="text-gray-600">UID</TableHead>
                                                <TableHead className="text-gray-600">Display name</TableHead>
                                                <TableHead className="text-gray-600">Email</TableHead>
                                                <TableHead className="text-gray-600">Role</TableHead>
                                                <TableHead className="text-gray-600">Clínica</TableHead>
                                                <TableHead className="text-gray-600">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.map((user) => (
                                                <TableRow key={user.id} className="border-gray-200 hover:bg-gray-50">
                                                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                                                    <TableCell className="font-medium">{user.displayName}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{user.role}</Badge>
                                                    </TableCell>
                                                    <TableCell>{user.clinicName}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteUser(user.id, user.displayName, false)}
                                                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                            >
                                                                <AlertTriangle className="h-4 w-4 mr-1" />
                                                                Deletar Usuário
                                                            </Button>
                                                            {user.clinicId && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteUser(user.id, user.displayName, true)}
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                >
                                                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                                                    Deletar + Clínica
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Logs Tab */}
                    <TabsContent value="logs">
                        <Card className="bg-white border-gray-200">
                            <CardHeader>
                                <CardTitle className="text-gray-900">Logs do Sistema</CardTitle>
                                <CardDescription className="text-gray-600">
                                    Últimas ações do Super Admin
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-gray-200">
                                            <TableHead className="text-gray-600">Ação</TableHead>
                                            <TableHead className="text-gray-600">Descrição</TableHead>
                                            <TableHead className="text-gray-600">Clínica</TableHead>
                                            <TableHead className="text-gray-600">Data/Hora</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recentLogs.map((log) => (
                                            <TableRow key={log.id} className="border-gray-200 hover:bg-gray-50">
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

