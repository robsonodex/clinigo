'use client'

import { useEffect, useState, useCallback } from 'react'
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
    EyeOff,
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
    Lock,
    Unlock,
    Megaphone,
    Key,
    KeyRound,
    Dices,
    Copy,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    const [generatingBoleto, setGeneratingBoleto] = useState<string | null>(null)
    const [markingPaid, setMarkingPaid] = useState<string | null>(null)
    const [billingModal, setBillingModal] = useState<{
        open: boolean
        clinicId: string
        clinicName: string
        dueDate: string | null
    }>({ open: false, clinicId: '', clinicName: '', dueDate: null })
    const [billingMessage, setBillingMessage] = useState('')
    const [billingTitle, setBillingTitle] = useState('Aviso de Faturamento: CliniGo')

    // Feature Announcement State
    const [featureModal, setFeatureModal] = useState(false)
    const [featureTitle, setFeatureTitle] = useState('')
    const [featureMessage, setFeatureMessage] = useState('')
    const [featureTargetPlans, setFeatureTargetPlans] = useState<string[]>([])

    // Reset Password State
    const [resetPwdUser, setResetPwdUser] = useState<DashboardData['users'][0] | null>(null)
    const [resetPwdValue, setResetPwdValue] = useState('')
    const [showResetPwd, setShowResetPwd] = useState(false)
    const [resettingPwd, setResettingPwd] = useState(false)
    const [sendingFeature, setSendingFeature] = useState(false)

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

    // Silent refresh - atualiza dados sem mostrar tela de loading
    const silentRefresh = async () => {
        try {
            const res = await fetch('/api/super-admin/dashboard')
            if (res.ok) {
                const result = await res.json()
                if (result.data) {
                    setData(result.data)
                } else {
                    setData(result)
                }
            }
        } catch (error) {
            console.error('Silent refresh error:', error)
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

    const handleBlockClinic = async (clinicId: string, clinicName: string) => {
        const reason = prompt(
            `Bloquear acesso da clínica "${clinicName}"?\n\n` +
            `Isso irá IMPEDIR todos os usuários de acessar o sistema.\n\n` +
            `Digite o motivo do bloqueio:`
        )

        if (reason === null) return // cancelled

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'block_clinic', reason: reason || 'Bloqueio manual' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to block clinic')
            }

            alert(`🔒 Clínica "${clinicName}" bloqueada com sucesso!`)
            loadDashboard()
        } catch (error) {
            console.error('Block error:', error)
            alert(`Erro ao bloquear: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    const handleUnblockClinic = async (clinicId: string, clinicName: string) => {
        const confirmed = confirm(
            `Desbloquear acesso da clínica "${clinicName}"?\n\n` +
            `Isso irá RESTAURAR o acesso de todos os usuários ao sistema.`
        )

        if (!confirmed) return

        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unblock_clinic' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to unblock clinic')
            }

            alert(`🔓 Clínica "${clinicName}" desbloqueada com sucesso!`)
            loadDashboard()
        } catch (error) {
            console.error('Unblock error:', error)
            alert(`Erro ao desbloquear: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    const handleMarkPaid = async (clinicId: string, clinicName: string) => {
        const confirmed = confirm(
            `Confirmar pagamento da clínica "${clinicName}"?\n\n` +
            `Isso irá renovar a assinatura por +1 mês a partir do vencimento atual.`
        )

        if (!confirmed) return

        setMarkingPaid(clinicId)
        try {
            const res = await fetch(`/api/super-admin/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_paid' }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Falha ao confirmar pagamento')
            }

            const result = await res.json()
            alert(`✅ ${result.message || 'Pagamento confirmado!'}`)
            loadDashboard()
        } catch (error) {
            console.error('Mark paid error:', error)
            alert(`Erro ao confirmar pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setMarkingPaid(null)
        }
    }

    const openBillingModal = (clinicId: string, clinicName: string, dueDate: string | null) => {
        setBillingModal({ open: true, clinicId, clinicName, dueDate })
        setBillingMessage('')
        setBillingTitle('Aviso de Faturamento: CliniGo')
    }

    const closeBillingModal = () => {
        setBillingModal({ open: false, clinicId: '', clinicName: '', dueDate: null })
        setBillingMessage('')
        setBillingTitle('Aviso de Faturamento: CliniGo')
    }

    const confirmSendBilling = async () => {
        if (!billingMessage.trim()) {
            alert('Por favor, escreva uma mensagem antes de enviar.')
            return
        }

        const { clinicId, clinicName, dueDate } = billingModal
        setSendingBilling(clinicId)
        try {
            const res = await fetch('/api/super-admin/clinics/send-billing', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, clinicName, dueDate, customMessage: billingMessage.trim(), customTitle: billingTitle.trim() }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Falha ao enviar cobrança')
            }

            const result = await res.json()
            alert(`✅ ${result.data?.message || 'Notificação de cobrança enviada com sucesso!'}`)
            closeBillingModal()
        } catch (error) {
            console.error('Billing notification error:', error)
            alert(`Erro ao enviar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setSendingBilling(null)
        }
    }

    // === Feature Announcement Handlers ===
    const openFeatureModal = () => {
        setFeatureModal(true)
        setFeatureTitle('')
        setFeatureMessage('')
        setFeatureTargetPlans([])
    }

    const closeFeatureModal = () => {
        setFeatureModal(false)
        setFeatureTitle('')
        setFeatureMessage('')
        setFeatureTargetPlans([])
    }

    const handleSendFeatureNotification = async () => {
        if (!featureTitle.trim() || !featureMessage.trim()) {
            alert('Preencha o título e a mensagem.')
            return
        }

        const clinicCount = data?.clinics?.filter(c => c.isActive)?.length || 0
        const planLabel = featureTargetPlans.length > 0 ? featureTargetPlans.join(', ') : 'TODOS'
        const confirmed = confirm(
            `📢 Enviar notificação de nova feature?\n\n` +
            `Título: ${featureTitle.trim()}\n` +
            `Planos alvo: ${planLabel}\n` +
            `Clínicas ativas: ~${clinicCount}\n\n` +
            `TODOS os usuários dessas clínicas serão notificados.\nConfirmar?`
        )
        if (!confirmed) return

        setSendingFeature(true)
        try {
            const res = await fetch('/api/super-admin/clinics/notify-feature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: featureTitle.trim(),
                    message: featureMessage.trim(),
                    targetPlans: featureTargetPlans.length > 0 ? featureTargetPlans : undefined,
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Falha ao enviar notificação')
            }

            const result = await res.json()
            alert(`✅ ${result.data?.message || 'Notificação enviada com sucesso!'}`)
            closeFeatureModal()
        } catch (error) {
            console.error('Feature notification error:', error)
            alert(`Erro ao enviar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setSendingFeature(false)
        }
    }

    const togglePlanFilter = (plan: string) => {
        setFeatureTargetPlans(prev =>
            prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
        )
    }

    // === Reset Password Handlers ===
    const openResetPwdModal = (user: DashboardData['users'][0]) => {
        setResetPwdUser(user)
        setResetPwdValue('')
        setShowResetPwd(false)
    }

    const closeResetPwdModal = () => {
        setResetPwdUser(null)
        setResetPwdValue('')
        setShowResetPwd(false)
    }

    const generateResetPwd = () => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
        let pwd = ''
        for (let i = 0; i < 12; i++) {
            pwd += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        setResetPwdValue(pwd)
    }

    const copyResetPwd = () => {
        navigator.clipboard.writeText(resetPwdValue)
        alert('Senha copiada para a área de transferência!')
    }

    const handleForceResetPwd = async () => {
        if (!resetPwdUser || !resetPwdValue) {
            alert('Digite ou gere uma nova senha')
            return
        }
        if (resetPwdValue.length < 6) {
            alert('A senha deve ter no mínimo 6 caracteres')
            return
        }

        setResettingPwd(true)
        try {
            const res = await fetch(`/api/users/${resetPwdUser.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPwdValue }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao redefinir senha')
            }

            alert(`✅ Senha de "${resetPwdUser.displayName}" (${resetPwdUser.email}) redefinida com sucesso!`)
            closeResetPwdModal()
        } catch (error) {
            console.error('Reset password error:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setResettingPwd(false)
        }
    }

    const handleGenerateBoleto = async (clinicId: string, clinicName: string, planType: string) => {
        const confirmed = confirm(`Deseja gerar um boleto referente ao plano ${planType} para a clínica "${clinicName}"?\n\nO boleto será registrado no sistema e a clínica será notificada imediatamente.`)
        if (!confirmed) return

        setGeneratingBoleto(clinicId)
        try {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinic_id: clinicId, plan_type: planType }),
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.details || result.error || 'Falha ao gerar boleto')
            }

            alert(`✅ Boleto gerado com sucesso!\n\nLinha Digitável: ${result.boleto?.linha_digitavel}\n\n-> O PDF do boleto vai abrir em uma nova aba agora!`)
            
            if (result.boleto?.nosso_numero) {
                window.open(`/api/billing/boleto-pdf?nossoNumero=${result.boleto.nosso_numero}`, '_blank')
            }

            loadDashboard()
        } catch (error) {
            console.error('Boleto error:', error)
            alert(`Erro ao gerar boleto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setGeneratingBoleto(null)
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
                        <Button size="sm" onClick={openFeatureModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Megaphone className="h-4 w-4 mr-2" />
                            📢 Notificar Features
                        </Button>
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
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        {clinic.name}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={silentRefresh}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                                            title="Atualizar dados"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getPlanBadge(clinic.planType)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant={clinic.isActive ? 'default' : 'destructive'}>
                                                            {clinic.isActive ? 'Ativo' : 'Bloqueado'}
                                                        </Badge>
                                                        {!clinic.isActive && (
                                                            <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50">
                                                                <Lock className="h-3 w-3 mr-1" />
                                                                Sem Acesso
                                                            </Badge>
                                                        )}
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
                                                        {clinic.isActive ? (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleBlockClinic(clinic.id, clinic.name)}
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Lock className="h-4 w-4 mr-1" />
                                                                Bloquear
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUnblockClinic(clinic.id, clinic.name)}
                                                                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <Unlock className="h-4 w-4 mr-1" />
                                                                Desbloquear
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openBillingModal(clinic.id, clinic.name, clinic.subscriptionDueDate)}
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
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleGenerateBoleto(clinic.id, clinic.name, clinic.planType)}
                                                            disabled={generatingBoleto === clinic.id}
                                                            className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                                                        >
                                                            {generatingBoleto === clinic.id ? (
                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <CreditCard className="h-4 w-4 mr-1" />
                                                            )}
                                                            Gerar Boleto
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMarkPaid(clinic.id, clinic.name)}
                                                            disabled={markingPaid === clinic.id}
                                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        >
                                                            {markingPaid === clinic.id ? (
                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                            ) : (
                                                                <DollarSign className="h-4 w-4 mr-1" />
                                                            )}
                                                            Marcar Pago
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
                                                                onClick={() => openResetPwdModal(user)}
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            >
                                                                <KeyRound className="h-4 w-4 mr-1" />
                                                                Resetar Senha
                                                            </Button>
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
            {/* Billing Modal */}
            <Dialog open={billingModal.open} onOpenChange={(open) => { if (!open) closeBillingModal() }}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-amber-600" />
                            Enviar Cobrança
                        </DialogTitle>
                        <DialogDescription>
                            Enviar notificação para <strong>{billingModal.clinicName}</strong>
                            {billingModal.dueDate && (
                                <> — Vencimento: {new Date(billingModal.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</>  
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="billing-title">Título da notificação</Label>
                            <input
                                id="billing-title"
                                type="text"
                                value={billingTitle}
                                onChange={(e) => setBillingTitle(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                placeholder="Ex: Aviso de Faturamento: CliniGo"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="billing-message">Mensagem para a clínica</Label>
                            <Textarea
                                id="billing-message"
                                placeholder="Digite aqui a mensagem que será enviada para os usuários da clínica..."
                                value={billingMessage}
                                onChange={(e) => setBillingMessage(e.target.value)}
                                rows={6}
                                className="resize-y"
                            />
                            <p className="text-xs text-gray-500">
                                Esta mensagem aparecerá na notificação que os usuários da clínica receberão.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeBillingModal} disabled={sendingBilling === billingModal.clinicId}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmSendBilling}
                            disabled={sendingBilling === billingModal.clinicId || !billingMessage.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {sendingBilling === billingModal.clinicId ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                            ) : (
                                <><Send className="h-4 w-4 mr-2" /> Enviar Cobrança</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Feature Announcement Modal */}
            <Dialog open={featureModal} onOpenChange={(open) => { if (!open) closeFeatureModal() }}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-indigo-600" />
                            Notificar Novas Features
                        </DialogTitle>
                        <DialogDescription>
                            Envie uma notificação para <strong>todas as clínicas ativas</strong> sobre novas funcionalidades.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Plan Filter */}
                        <div className="space-y-2">
                            <Label>Filtrar por plano (opcional)</Label>
                            <div className="flex gap-2 flex-wrap">
                                {['BASIC', 'PRO', 'ENTERPRISE'].map((plan) => (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => togglePlanFilter(plan)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                            featureTargetPlans.includes(plan)
                                                ? 'bg-indigo-100 border-indigo-400 text-indigo-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}
                                    >
                                        {plan}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400">
                                {featureTargetPlans.length === 0
                                    ? 'Nenhum filtro = envia para TODOS os planos'
                                    : `Enviando apenas para: ${featureTargetPlans.join(', ')}`}
                            </p>
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="feature-title">Título da notificação</Label>
                            <input
                                id="feature-title"
                                type="text"
                                value={featureTitle}
                                onChange={(e) => setFeatureTitle(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder="Ex: 🚀 Nova funcionalidade: Assinatura Digital"
                            />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                            <Label htmlFor="feature-message">Mensagem</Label>
                            <Textarea
                                id="feature-message"
                                placeholder="Descreva a nova funcionalidade para as clínicas...&#10;&#10;Ex: Agora você pode assinar digitalmente seus prontuários com certificado ICP-Brasil A1!&#10;&#10;Acesse: Dashboard → Prontuários → Assinar Digitalmente"
                                value={featureMessage}
                                onChange={(e) => setFeatureMessage(e.target.value)}
                                rows={7}
                                className="resize-y"
                            />
                            <p className="text-xs text-gray-500">
                                Esta mensagem aparecerá no sino de notificações de TODOS os usuários das clínicas selecionadas.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeFeatureModal} disabled={sendingFeature}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSendFeatureNotification}
                            disabled={sendingFeature || !featureTitle.trim() || !featureMessage.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {sendingFeature ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
                            ) : (
                                <><Megaphone className="h-4 w-4 mr-2" /> Enviar para Todas</>  
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Modal */}
            <Dialog open={!!resetPwdUser} onOpenChange={(open) => { if (!open) closeResetPwdModal() }}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-blue-600" />
                            Resetar Senha do Usuário
                        </DialogTitle>
                        <DialogDescription>
                            Definir nova senha para <strong>{resetPwdUser?.displayName}</strong> ({resetPwdUser?.email})
                            {resetPwdUser?.clinicName && (
                                <> — Clínica: <strong>{resetPwdUser.clinicName}</strong></>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showResetPwd ? 'text' : 'password'}
                                        value={resetPwdValue}
                                        onChange={(e) => setResetPwdValue(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowResetPwd(!showResetPwd)}
                                    >
                                        {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={generateResetPwd}
                                    title="Gerar Senha Aleatória"
                                >
                                    <Dices className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={copyResetPwd}
                                    disabled={!resetPwdValue}
                                    title="Copiar Senha"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                A senha será aplicada imediatamente. Copie e envie ao usuário por um canal seguro.
                            </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm text-amber-800 flex items-start gap-2">
                                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>O usuário será deslogado de todas as sessões ativas e precisará usar a nova senha.</span>
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeResetPwdModal} disabled={resettingPwd}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleForceResetPwd}
                            disabled={resettingPwd || !resetPwdValue || resetPwdValue.length < 6}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {resettingPwd ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redefinindo...</>
                            ) : (
                                <><Key className="h-4 w-4 mr-2" /> Redefinir Senha</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

