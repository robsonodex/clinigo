'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, formatDistanceToNow } from 'date-fns'
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
    UserCog,
    History,
    Receipt,
    Bot,
    Settings,
    Smartphone,
    CalendarClock,
    FileText,
    ChevronDown,
    ChevronUp,
    Search,
    Filter,
    Activity,
    Layers,
    Globe,
    UserCheck,
    UserX,
    Sparkles,
    Check,
    ExternalLink,
    ShieldCheck,
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
        isOnline?: boolean
        lastSeenAt?: string
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
    // Impersonation Dialog State
    const [impersonateModal, setImpersonateModal] = useState<{
        open: boolean
        clinicId: string
        clinicName: string
    }>({ open: false, clinicId: '', clinicName: '' })
    const [impersonateReason, setImpersonateReason] = useState('')
    const [startingImpersonation, setStartingImpersonation] = useState(false)
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
    const [isScheduling, setIsScheduling] = useState(false)
    const [scheduleDate, setScheduleDate] = useState('')
    const [scheduleTime, setScheduleTime] = useState('')
    const [scheduleTimes, setScheduleTimes] = useState<string[]>([])
    const [scheduledBillings, setScheduledBillings] = useState<any[]>([])
    const [loadingScheduled, setLoadingScheduled] = useState(false)

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

    // Reset Passwords by Clinic State
    const [searchClinic, setSearchClinic] = useState('')
    const [resetClinicModal, setResetClinicModal] = useState<{
        open: boolean
        clinicId: string
        clinicName: string
    }>({ open: false, clinicId: '', clinicName: '' })
    const [resetClinicResult, setResetClinicResult] = useState<Array<{
        email: string
        fullName: string
        newPassword: string
        success: boolean
        error?: string
    }> | null>(null)
    const [resettingClinicPwd, setResettingClinicPwd] = useState(false)

    // Users Tab Filter and Grouping States
    const [userSearchTerm, setUserSearchTerm] = useState('')
    const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL')
    const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL')
    const [userClinicFilter, setUserClinicFilter] = useState<string>('ALL')
    const [collapsedClinics, setCollapsedClinics] = useState<Record<string, boolean>>({})
    const [copiedUserId, setCopiedUserId] = useState<string | null>(null)
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null)

    const toggleClinicCollapse = (clinicKey: string) => {
        setCollapsedClinics(prev => ({
            ...prev,
            [clinicKey]: !prev[clinicKey],
        }))
    }

    const expandAllClinics = () => {
        setCollapsedClinics({})
    }

    const collapseAllClinics = (clinicKeys: string[]) => {
        const collapsed: Record<string, boolean> = {}
        clinicKeys.forEach(k => { collapsed[k] = true })
        setCollapsedClinics(collapsed)
    }

    const handleCopyText = (text: string, type: 'uid' | 'email', id: string) => {
        navigator.clipboard.writeText(text)
        if (type === 'uid') {
            setCopiedUserId(id)
            setTimeout(() => setCopiedUserId(null), 2000)
        } else {
            setCopiedEmail(id)
            setTimeout(() => setCopiedEmail(null), 2000)
        }
    }

    const formatLastSeen = (dateStr?: string, isOnline?: boolean) => {
        if (isOnline) return 'Online agora'
        if (!dateStr) return 'Sem registro'
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return 'Sem registro'
            return formatDistanceToNow(date, { addSuffix: true, locale: ptBR })
        } catch {
            return 'Sem registro'
        }
    }

    const loadScheduledBillings = async () => {
        setLoadingScheduled(true)
        try {
            // Gatilho fail-safe: processa disparos de cobrança pendentes vencidos
            fetch('/api/cron/billing/send-scheduled').catch(() => {})

            const res = await fetch('/api/super-admin/clinics/scheduled-billings')
            if (res.ok) {
                const result = await res.json()
                setScheduledBillings(result.data || [])
            }
        } catch (error) {
            console.error('Error loading scheduled billings:', error)
        } finally {
            setLoadingScheduled(false)
        }
    }

    useEffect(() => {
        loadDashboard()
        loadUsers()
        loadScheduledBillings()
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

    // Hard refresh - limpa cache da clínica (equivalente a Ctrl+Shift+R)
    const [refreshingClinic, setRefreshingClinic] = useState<string | null>(null)
    const hardRefreshClinic = async (clinicId: string, clinicName: string) => {
        setRefreshingClinic(clinicId)
        try {
            const res = await fetch('/api/super-admin/revalidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, clinicName }),
            })

            if (res.ok) {
                const result = await res.json()
                alert(`✅ ${result.message}`)
            } else {
                const err = await res.json()
                alert(`❌ Erro: ${err.error}`)
            }
            // Also reload the master hub data
            await silentRefresh()
        } catch (error) {
            console.error('Hard refresh error:', error)
            alert('❌ Erro ao limpar cache da clínica')
        } finally {
            setRefreshingClinic(null)
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

    const openImpersonateModal = (clinicId: string, clinicName: string) => {
        setImpersonateModal({ open: true, clinicId, clinicName })
        setImpersonateReason('')
    }

    const closeImpersonateModal = () => {
        setImpersonateModal({ open: false, clinicId: '', clinicName: '' })
        setImpersonateReason('')
    }

    const handleImpersonate = async () => {
        if (impersonateReason.trim().length < 10) {
            alert('O motivo deve ter pelo menos 10 caracteres.')
            return
        }

        setStartingImpersonation(true)
        try {
            const res = await fetch('/api/super-admin/impersonation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_id: impersonateModal.clinicId,
                    reason: impersonateReason.trim(),
                }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error?.message || 'Falha ao iniciar impersonation')
            }

            const result = await res.json()
            setIsImpersonating(impersonateModal.clinicId)
            closeImpersonateModal()

            // Abrir dashboard em nova aba
            window.open('/dashboard', '_blank')
        } catch (error) {
            console.error('Impersonation error:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setStartingImpersonation(false)
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
        setIsScheduling(false)
        const today = new Date()
        const localDate = today.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // Returns YYYY-MM-DD
        setScheduleDate(localDate)
        setScheduleTime('09:00')
        setScheduleTimes([])
    }

    const closeBillingModal = () => {
        setBillingModal({ open: false, clinicId: '', clinicName: '', dueDate: null })
        setBillingMessage('')
        setBillingTitle('Aviso de Faturamento: CliniGo')
        setIsScheduling(false)
        setScheduleDate('')
        setScheduleTime('')
        setScheduleTimes([])
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

    const handleSendBillingSubmit = async () => {
        if (isScheduling) {
            if (!billingMessage.trim()) {
                alert('Por favor, escreva uma mensagem antes de agendar.')
                return
            }
            if (!scheduleDate) {
                alert('Por favor, selecione a data do agendamento.')
                return
            }
            if (scheduleTimes.length === 0) {
                alert('Por favor, adicione pelo menos um horário de envio.')
                return
            }
            
            const { clinicId, clinicName } = billingModal
            setSendingBilling(clinicId)
            try {
                const res = await fetch('/api/super-admin/clinics/scheduled-billings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clinicId,
                        clinicName,
                        title: billingTitle.trim(),
                        message: billingMessage.trim(),
                        dates: [scheduleDate],
                        times: scheduleTimes
                    }),
                })

                if (!res.ok) {
                    const error = await res.json()
                    throw new Error(error.error || 'Falha ao salvar agendamento')
                }

                alert('✅ Cobrança agendada com sucesso!')
                closeBillingModal()
                loadScheduledBillings()
            } catch (error) {
                console.error('Scheduling billing error:', error)
                alert(`Erro ao agendar cobrança: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
            } finally {
                setSendingBilling(null)
            }
        } else {
            await confirmSendBilling()
        }
    }

    const handleUpdateScheduledStatus = async (id: string, status: string, actionLabel: string) => {
        const confirmed = confirm(`Deseja realmente ${actionLabel} este agendamento?`)
        if (!confirmed) return

        try {
            const res = await fetch('/api/super-admin/clinics/scheduled-billings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao atualizar agendamento')
            }

            alert(`Agendamento atualizado com sucesso!`)
            loadScheduledBillings()
        } catch (error) {
            console.error('Error updating scheduled status:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    const handleDeleteScheduled = async (id: string) => {
        const confirmed = confirm('⚠️ ATENÇÃO: Tem certeza que deseja excluir permanentemente este agendamento? Esta ação não pode ser desfeita.')
        if (!confirmed) return

        try {
            const res = await fetch(`/api/super-admin/clinics/scheduled-billings?id=${id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao excluir agendamento')
            }

            alert('Agendamento concluído com sucesso!')
            loadScheduledBillings()
        } catch (error) {
            console.error('Error deleting scheduled:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
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

    // === Reset Passwords by Clinic Handlers ===
    const openResetClinicPwdModal = (clinicId: string, clinicName: string) => {
        setResetClinicModal({ open: true, clinicId, clinicName })
        setResetClinicResult(null)
        setResettingClinicPwd(false)
    }

    const closeResetClinicPwdModal = () => {
        setResetClinicModal({ open: false, clinicId: '', clinicName: '' })
        setResetClinicResult(null)
        setResettingClinicPwd(false)
    }

    const handleResetClinicPasswords = async () => {
        const { clinicId, clinicName } = resetClinicModal
        if (!clinicId) return

        setResettingClinicPwd(true)
        try {
            const res = await fetch('/api/super-admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId }),
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao resetar senhas da clínica')
            }

            setResetClinicResult(result.results || [])
        } catch (error) {
            console.error('Reset clinic passwords error:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        } finally {
            setResettingClinicPwd(false)
        }
    }

    const copyAllClinicCredentials = () => {
        if (!resetClinicResult) return
        const text = resetClinicResult
            .filter(r => r.success)
            .map(r => `E-mail: ${r.email}\nSenha: ${r.newPassword}`)
            .join('\n\n')
        
        navigator.clipboard.writeText(text)
        alert('Todas as credenciais foram copiadas para a área de transferência!')
    }

    const handleExtendTrial = async (clinicId: string, clinicName: string) => {
        const confirmed = confirm(`⚠️ CONFIRMAÇÃO: Deseja liberar mais 7 dias de testes gratuitos para a clínica "${clinicName}"?\n\nEsta ação reativará a clínica no sistema e prorrogará o período de testes por 7 dias a partir de hoje (payment_confirmed será ativo temporariamente).`)
        if (!confirmed) return

        try {
            const res = await fetch('/api/super-admin/extend-trial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, days: 7 }),
            })

            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Erro ao estender período de testes')
            }

            alert(`✅ ${result.message}`)
            loadDashboard()
        } catch (error) {
            console.error('Extend trial error:', error)
            alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
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

    // Process and filter users grouped by clinic
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const term = userSearchTerm.toLowerCase().trim()
            const matchesSearch =
                term === '' ||
                user.displayName.toLowerCase().includes(term) ||
                user.email.toLowerCase().includes(term) ||
                user.clinicName.toLowerCase().includes(term) ||
                user.id.toLowerCase().includes(term)

            const matchesStatus =
                userStatusFilter === 'ALL' ||
                (userStatusFilter === 'ONLINE' && user.isOnline) ||
                (userStatusFilter === 'OFFLINE' && !user.isOnline)

            const matchesRole =
                userRoleFilter === 'ALL' || user.role === userRoleFilter

            const matchesClinic =
                userClinicFilter === 'ALL' ||
                (userClinicFilter === 'NO_CLINIC' && !user.clinicId) ||
                user.clinicId === userClinicFilter

            return matchesSearch && matchesStatus && matchesRole && matchesClinic
        })
    }, [users, userSearchTerm, userStatusFilter, userRoleFilter, userClinicFilter])

    // Grouping filtered users by clinic
    const clinicGroups = useMemo(() => {
        const groups: Record<
            string,
            {
                clinicId: string | null
                clinicName: string
                clinicData?: DashboardData['clinics'][0]
                users: typeof users
                onlineCount: number
            }
        > = {}

        filteredUsers.forEach((u) => {
            const key = u.clinicId || 'NO_CLINIC'
            if (!groups[key]) {
                const clinicInfo = data?.clinics?.find((c) => c.id === u.clinicId)
                groups[key] = {
                    clinicId: u.clinicId,
                    clinicName: u.clinicId
                        ? (clinicInfo?.name || u.clinicName || 'Clínica Desconhecida')
                        : 'Administradores Globais / Sem Clínica',
                    clinicData: clinicInfo,
                    users: [],
                    onlineCount: 0,
                }
            }
            groups[key].users.push(u)
            if (u.isOnline) {
                groups[key].onlineCount += 1
            }
        })

        // Sort groups: groups with online users first, then by clinic name
        return Object.entries(groups).sort(([keyA, a], [keyB, b]) => {
            if (keyA === 'NO_CLINIC') return -1
            if (keyB === 'NO_CLINIC') return 1
            if (b.onlineCount !== a.onlineCount) {
                return b.onlineCount - a.onlineCount
            }
            return a.clinicName.localeCompare(b.clinicName)
        })
    }, [filteredUsers, data?.clinics])

    const totalOnlineUsers = useMemo(() => {
        return users.filter((u) => u.isOnline).length
    }, [users])

    const totalClinicsWithOnline = useMemo(() => {
        return new Set(
            users.filter((u) => u.isOnline && u.clinicId).map((u) => u.clinicId)
        ).size
    }, [users])

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
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button size="sm" onClick={openFeatureModal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Megaphone className="h-4 w-4 mr-2" />
                            📢 Notificar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/chat')}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Chat
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/impersonacoes')}>
                            <History className="h-4 w-4 mr-2" />
                            Impersonações
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/cobrancas')}>
                            <Receipt className="h-4 w-4 mr-2" />
                            Cobranças
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/chatbot')}>
                            <Bot className="h-4 w-4 mr-2" />
                            Chatbot
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/configuracoes')}>
                            <Settings className="h-4 w-4 mr-2" />
                            Config
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push('/system-master-hub/clin-whatsapp')} className="border-green-300 text-green-700 hover:bg-green-50">
                            <Smartphone className="h-4 w-4 mr-2" />
                            WhatsApp QR
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
                    <TabsList className="bg-white border border-gray-200 h-auto flex-wrap gap-1 p-1.5 rounded-xl shadow-sm">
                        <TabsTrigger value="clinics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 font-semibold text-gray-600 transition-all duration-200 hover:bg-blue-50 flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Gestão de Clínicas</span>
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 font-semibold text-gray-600 transition-all duration-200 hover:bg-emerald-50 flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Usuários</span>
                        </TabsTrigger>
                        <TabsTrigger value="scheduled-billings" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 font-semibold text-gray-600 transition-all duration-200 hover:bg-amber-50 flex items-center gap-2">
                            <CalendarClock className="h-4 w-4" />
                            <span>Cobranças Agendadas</span>
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-100 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Logs do Sistema</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* Clinics Tab */}
                    <TabsContent value="clinics">
                        <Card className="bg-white border-gray-200">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                                <div>
                                    <CardTitle className="text-gray-900">Todas as Clínicas</CardTitle>
                                    <CardDescription className="text-gray-600">
                                        Gerencie e monitore todas as clínicas do sistema
                                    </CardDescription>
                                </div>
                                <div className="w-full sm:w-72">
                                    <Input
                                        placeholder="🔍 Localizar clínica pelo nome..."
                                        value={searchClinic}
                                        onChange={(e) => setSearchClinic(e.target.value)}
                                        className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
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
                                        {data.clinics
                                            .filter((clinic) => clinic.name.toLowerCase().includes(searchClinic.toLowerCase()))
                                            .map((clinic) => (
                                                <TableRow key={clinic.id} className="border-gray-200 hover:bg-gray-50">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-1.5">
                                                        {clinic.name}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => hardRefreshClinic(clinic.id, clinic.name)}
                                                            disabled={refreshingClinic === clinic.id}
                                                            className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                                                            title="Hard Refresh - Limpar cache da clínica (Ctrl+Shift+R)"
                                                        >
                                                            <RefreshCw className={`h-3.5 w-3.5 ${refreshingClinic === clinic.id ? 'animate-spin' : ''}`} />
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
                                                            onClick={() => openImpersonateModal(clinic.id, clinic.name)}
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            title="Entrar impersonado na clínica"
                                                        >
                                                            <UserCog className="h-4 w-4 mr-1" />
                                                            🔑 Entrar
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openResetClinicPwdModal(clinic.id, clinic.name)}
                                                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                            title="Redefinir as senhas de todos os usuários desta clínica"
                                                        >
                                                            <KeyRound className="h-4 w-4 mr-1" />
                                                            🔑 Resetar Senhas
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleExtendTrial(clinic.id, clinic.name)}
                                                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                            title="Reativar e conceder mais 7 dias de testes gratuitos para esta clínica"
                                                        >
                                                            <Clock className="h-4 w-4 mr-1" />
                                                            +7d Testes
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
                    <TabsContent value="users" className="space-y-6">
                        {/* Metrics Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Usuários</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{users.length}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Cadastrados no sistema</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Usuários Online Agora</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <h3 className="text-2xl font-bold text-emerald-600">{totalOnlineUsers}</h3>
                                            {totalOnlineUsers > 0 && (
                                                <span className="relative flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-emerald-600/90 font-medium mt-0.5">Conectados em tempo real</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                        <Activity className="w-6 h-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clínicas Ativas Conectadas</p>
                                        <h3 className="text-2xl font-bold text-indigo-600 mt-1">{totalClinicsWithOnline}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Com colaboradores online</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white border-gray-200 shadow-sm">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total de Clínicas</p>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                            {new Set(users.filter(u => u.clinicId).map(u => u.clinicId)).size}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-0.5">Com usuários cadastrados</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Search, Filters & Controls Card */}
                        <Card className="bg-white border-gray-200 shadow-sm">
                            <CardContent className="p-4 sm:p-5 space-y-4">
                                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                                    {/* Search Input */}
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            type="text"
                                            placeholder="Buscar por nome, e-mail, clínica ou UID..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            className="pl-9 text-base sm:text-sm bg-gray-50/50 border-gray-300 focus:bg-white h-10 w-full"
                                        />
                                        {userSearchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setUserSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded"
                                            >
                                                Limpar
                                            </button>
                                        )}
                                    </div>

                                    {/* Action Buttons (Refresh, Expand/Collapse) */}
                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={loadUsers}
                                            disabled={loadingUsers}
                                            className="h-10 px-3 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                                        >
                                            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingUsers ? 'animate-spin' : ''}`} />
                                            <span>Atualizar</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={expandAllClinics}
                                            className="h-10 px-3 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                                            title="Expandir todas as clínicas"
                                        >
                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                            <span>Expandir Todas</span>
                                        </Button>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => collapseAllClinics(clinicGroups.map(([key]) => key))}
                                            className="h-10 px-3 border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
                                            title="Recolher todas as clínicas"
                                        >
                                            <ChevronUp className="w-4 h-4 text-gray-500" />
                                            <span>Recolher Todas</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Filter Selects and Quick Pills */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-1 border-t border-gray-100 items-stretch sm:items-center justify-between flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status Filter Pills */}
                                        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
                                            <button
                                                type="button"
                                                onClick={() => setUserStatusFilter('ALL')}
                                                className={`px-3 py-1.5 rounded-md transition-colors ${
                                                    userStatusFilter === 'ALL'
                                                        ? 'bg-white text-gray-900 shadow-sm font-semibold'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Todos ({users.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUserStatusFilter('ONLINE')}
                                                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                                                    userStatusFilter === 'ONLINE'
                                                        ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                                                        : 'text-emerald-700 hover:bg-emerald-50'
                                                }`}
                                            >
                                                <span className="relative flex h-2 w-2">
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                                </span>
                                                <span>Online ({totalOnlineUsers})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUserStatusFilter('OFFLINE')}
                                                className={`px-3 py-1.5 rounded-md transition-colors ${
                                                    userStatusFilter === 'OFFLINE'
                                                        ? 'bg-slate-700 text-white shadow-sm font-semibold'
                                                        : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            >
                                                Offline ({users.length - totalOnlineUsers})
                                            </button>
                                        </div>

                                        {/* Clinic Dropdown Filter */}
                                        <select
                                            value={userClinicFilter}
                                            onChange={(e) => setUserClinicFilter(e.target.value)}
                                            aria-label="Filtrar por clínica"
                                            className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        >
                                            <option value="ALL">🏢 Todas as Clínicas</option>
                                            <option value="NO_CLINIC">🛡️ Admins Globais / Sem Clínica</option>
                                            {data?.clinics.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>

                                        {/* Role Dropdown Filter */}
                                        <select
                                            value={userRoleFilter}
                                            onChange={(e) => setUserRoleFilter(e.target.value)}
                                            aria-label="Filtrar por cargo"
                                            className="h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                        >
                                            <option value="ALL">👔 Todos os Cargos</option>
                                            <option value="SUPER_ADMIN">Super Admin</option>
                                            <option value="ADMIN">Administrador</option>
                                            <option value="DOCTOR">Profissional / Médico</option>
                                            <option value="RECEPTIONIST">Recepção</option>
                                            <option value="FINANCIAL">Financeiro</option>
                                            <option value="USER">Usuário Comum</option>
                                        </select>
                                    </div>

                                    {/* Active Filter Clear */}
                                    {(userSearchTerm || userStatusFilter !== 'ALL' || userRoleFilter !== 'ALL' || userClinicFilter !== 'ALL') && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setUserSearchTerm('')
                                                setUserStatusFilter('ALL')
                                                setUserRoleFilter('ALL')
                                                setUserClinicFilter('ALL')
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline self-center"
                                        >
                                            Limpar todos os filtros ({filteredUsers.length} encontrados)
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Grouped Clinic List */}
                        {loadingUsers ? (
                            <Card className="bg-white border-gray-200">
                                <CardContent className="py-12 text-center">
                                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                                    <p className="text-gray-600 font-medium mt-3">Carregando usuários e status de conexão...</p>
                                </CardContent>
                            </Card>
                        ) : clinicGroups.length === 0 ? (
                            <Card className="bg-white border-gray-200">
                                <CardContent className="py-12 text-center space-y-3">
                                    <UserX className="w-12 h-12 text-gray-400 mx-auto" />
                                    <h4 className="text-base font-semibold text-gray-800">Nenhum usuário encontrado</h4>
                                    <p className="text-sm text-gray-500 max-w-md mx-auto">
                                        Nenhum registro corresponde aos filtros de busca e status aplicados.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setUserSearchTerm('')
                                            setUserStatusFilter('ALL')
                                            setUserRoleFilter('ALL')
                                            setUserClinicFilter('ALL')
                                        }}
                                        className="mt-2"
                                    >
                                        Limpar Filtros
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {clinicGroups.map(([clinicKey, group]) => {
                                    const isCollapsed = !!collapsedClinics[clinicKey]
                                    const isNoClinic = clinicKey === 'NO_CLINIC'

                                    return (
                                        <Card
                                            key={clinicKey}
                                            className={`bg-white border-gray-200 shadow-sm transition-all duration-200 overflow-hidden ${
                                                group.onlineCount > 0 ? 'border-emerald-200/80 ring-1 ring-emerald-100' : ''
                                            }`}
                                        >
                                            {/* Clinic Accordion Header */}
                                            <div
                                                onClick={() => toggleClinicCollapse(clinicKey)}
                                                className="p-4 sm:p-5 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 select-none"
                                            >
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <div
                                                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                            isNoClinic
                                                                ? 'bg-purple-100 text-purple-700'
                                                                : group.onlineCount > 0
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}
                                                    >
                                                        {isNoClinic ? (
                                                            <ShieldCheck className="w-5 h-5" />
                                                        ) : (
                                                            <Building2 className="w-5 h-5" />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-base sm:text-lg font-bold text-gray-900">
                                                                {group.clinicName}
                                                            </h3>
                                                            {group.clinicData?.planType && (
                                                                <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-700 border-blue-200">
                                                                    {group.clinicData.planType}
                                                                </Badge>
                                                            )}
                                                            {group.clinicData?.approvalStatus === 'trial' && (
                                                                <Badge className="text-xs bg-amber-500 hover:bg-amber-600 text-white">
                                                                    Trial
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Status counters */}
                                                        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
                                                            <span className="text-gray-500 font-medium">
                                                                👥 {group.users.length} {group.users.length === 1 ? 'colaborador' : 'colaboradores'}
                                                            </span>
                                                            <span className="text-gray-300">•</span>
                                                            {group.onlineCount > 0 ? (
                                                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                                    <span className="relative flex h-2 w-2">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                    <span>{group.onlineCount} Online agora</span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500 font-medium">
                                                                    ⚪ 0 Online
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Header Actions */}
                                                <div
                                                    className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {group.clinicId && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openResetClinicPwdModal(group.clinicId!, group.clinicName)}
                                                                className="h-8 text-xs font-semibold text-amber-700 border-amber-300 hover:bg-amber-50"
                                                                title="Resetar as senhas de todos os usuários desta clínica"
                                                            >
                                                                <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                                                Resetar Senhas
                                                            </Button>

                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openImpersonateModal(group.clinicId!, group.clinicName)}
                                                                className="h-8 text-xs font-semibold text-blue-700 border-blue-300 hover:bg-blue-50"
                                                                title="Acessar o painel desta clínica"
                                                            >
                                                                <UserCog className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                                                Entrar
                                                            </Button>
                                                        </>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleClinicCollapse(clinicKey)}
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900"
                                                        title={isCollapsed ? 'Expandir' : 'Recolher'}
                                                    >
                                                        {isCollapsed ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronUp className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Clinic Users Table (Collapsible Body) */}
                                            {!isCollapsed && (
                                                <CardContent className="p-0">
                                                    {/* Desktop Table View (>= 768px) */}
                                                    <div className="hidden md:block overflow-x-auto">
                                                        <Table>
                                                            <TableHeader className="bg-gray-50/60">
                                                                <TableRow className="border-gray-200">
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3 w-[260px]">Usuário / Identificação</TableHead>
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3">E-mail</TableHead>
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3 w-[140px]">Cargo</TableHead>
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3 w-[150px]">Conexão Real</TableHead>
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3 w-[150px]">Última Atividade</TableHead>
                                                                    <TableHead className="text-gray-700 font-semibold text-xs py-3 text-right pr-4">Ações</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {group.users.map((user) => {
                                                                    const initials = (user.displayName || user.email || 'U')
                                                                        .split(' ')
                                                                        .map((n) => n[0])
                                                                        .filter(Boolean)
                                                                        .slice(0, 2)
                                                                        .join('')
                                                                        .toUpperCase()

                                                                    return (
                                                                        <TableRow
                                                                            key={user.id}
                                                                            className={`border-gray-200 hover:bg-gray-50/80 transition-colors ${
                                                                                user.isOnline ? 'bg-emerald-50/20' : ''
                                                                            }`}
                                                                        >
                                                                            {/* User Info */}
                                                                            <TableCell className="py-3">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="relative">
                                                                                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-700">
                                                                                            {initials}
                                                                                        </div>
                                                                                        <span
                                                                                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                                                                user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                                                                            }`}
                                                                                            title={user.isOnline ? 'Online' : 'Offline'}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="min-w-0">
                                                                                        <p className="font-semibold text-sm text-gray-900 truncate">
                                                                                            {user.displayName}
                                                                                        </p>
                                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                                            <span className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]">
                                                                                                {user.id}
                                                                                            </span>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleCopyText(user.id, 'uid', user.id)}
                                                                                                className="text-gray-400 hover:text-blue-600 p-0.5"
                                                                                                title="Copiar UID"
                                                                                            >
                                                                                                {copiedUserId === user.id ? (
                                                                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                                                                ) : (
                                                                                                    <Copy className="w-3 h-3" />
                                                                                                )}
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </TableCell>

                                                                            {/* Email */}
                                                                            <TableCell className="py-3">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-sm text-gray-700 font-medium truncate max-w-[200px]">
                                                                                        {user.email}
                                                                                    </span>
                                                                                    {user.email !== '-' && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleCopyText(user.email, 'email', user.id)}
                                                                                            className="text-gray-400 hover:text-blue-600 p-0.5 flex-shrink-0"
                                                                                            title="Copiar E-mail"
                                                                                        >
                                                                                            {copiedEmail === user.id ? (
                                                                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                                            ) : (
                                                                                                <Copy className="w-3.5 h-3.5" />
                                                                                            )}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>

                                                                            {/* Role Badge */}
                                                                            <TableCell className="py-3">
                                                                                {user.role === 'SUPER_ADMIN' ? (
                                                                                    <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold text-xs">
                                                                                        Super Admin
                                                                                    </Badge>
                                                                                ) : user.role === 'ADMIN' ? (
                                                                                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-xs">
                                                                                        Administrador
                                                                                    </Badge>
                                                                                ) : user.role === 'DOCTOR' ? (
                                                                                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-xs">
                                                                                        Profissional
                                                                                    </Badge>
                                                                                ) : user.role === 'RECEPTIONIST' ? (
                                                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-xs">
                                                                                        Recepção
                                                                                    </Badge>
                                                                                ) : user.role === 'FINANCIAL' ? (
                                                                                    <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-semibold text-xs">
                                                                                        Financeiro
                                                                                    </Badge>
                                                                                ) : (
                                                                                    <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-200 text-xs">
                                                                                        {user.role || 'USER'}
                                                                                    </Badge>
                                                                                )}
                                                                            </TableCell>

                                                                            {/* Connection Status */}
                                                                            <TableCell className="py-3">
                                                                                {user.isOnline ? (
                                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                                                                        <span className="relative flex h-2 w-2">
                                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                                        </span>
                                                                                        <span>Online</span>
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                                        <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                                                                                        <span>Offline</span>
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>

                                                                            {/* Last Seen Timestamp */}
                                                                            <TableCell className="py-3 text-xs text-gray-500 font-medium">
                                                                                {formatLastSeen(user.lastSeenAt || user.createdAt, user.isOnline)}
                                                                            </TableCell>

                                                                            {/* Action Buttons */}
                                                                            <TableCell className="py-3 text-right pr-4">
                                                                                <div className="flex items-center justify-end gap-1">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => openResetPwdModal(user)}
                                                                                        className="h-8 px-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                                        title="Redefinir senha individual deste usuário"
                                                                                    >
                                                                                        <KeyRound className="h-3.5 w-3.5 mr-1" />
                                                                                        Resetar Senha
                                                                                    </Button>

                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={() => handleDeleteUser(user.id, user.displayName, false)}
                                                                                        className="h-8 px-2 text-xs font-semibold text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                                                        title="Excluir apenas o usuário do sistema"
                                                                                    >
                                                                                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                                                        Deletar
                                                                                    </Button>

                                                                                    {user.clinicId && (
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            onClick={() => handleDeleteUser(user.id, user.displayName, true)}
                                                                                            className="h-8 px-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                            title="Excluir o usuário e a clínica inteira associada"
                                                                                        >
                                                                                            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                                                                                            Deletar + Clínica
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>

                                                    {/* Mobile Cards View (< 768px) */}
                                                    <div className="block md:hidden divide-y divide-gray-100">
                                                        {group.users.map((user) => {
                                                            const initials = (user.displayName || user.email || 'U')
                                                                .split(' ')
                                                                .map((n) => n[0])
                                                                .filter(Boolean)
                                                                .slice(0, 2)
                                                                .join('')
                                                                .toUpperCase()

                                                            return (
                                                                <div
                                                                    key={user.id}
                                                                    className={`p-4 space-y-3 ${
                                                                        user.isOnline ? 'bg-emerald-50/15' : ''
                                                                    }`}
                                                                >
                                                                    {/* User Header */}
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                                            <div className="relative flex-shrink-0">
                                                                                <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-xs text-gray-700">
                                                                                    {initials}
                                                                                </div>
                                                                                <span
                                                                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                                                                        user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                                                                                    }`}
                                                                                />
                                                                            </div>
                                                                            <div className="min-w-0">
                                                                                <p className="font-bold text-sm text-gray-900 truncate">
                                                                                    {user.displayName}
                                                                                </p>
                                                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                                    {user.email}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Connection status badge */}
                                                                        <div>
                                                                            {user.isOnline ? (
                                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                                                    <span className="relative flex h-1.5 w-1.5">
                                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                                                                                    </span>
                                                                                    Online
                                                                                </span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                                                                                    Offline
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Metadata grid */}
                                                                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                                                                        <div>
                                                                            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Cargo</span>
                                                                            <span className="font-medium text-gray-800">{user.role}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Última Atividade</span>
                                                                            <span className="font-medium text-gray-800">
                                                                                {formatLastSeen(user.lastSeenAt || user.createdAt, user.isOnline)}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Mobile Action Buttons (min 44px touch height) */}
                                                                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => openResetPwdModal(user)}
                                                                            className="min-h-[44px] flex-1 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                                                                        >
                                                                            <KeyRound className="w-3.5 h-3.5 mr-1" />
                                                                            Resetar Senha
                                                                        </Button>

                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteUser(user.id, user.displayName, false)}
                                                                            className="min-h-[44px] flex-1 text-xs font-semibold text-orange-700 border-orange-200 hover:bg-orange-50"
                                                                        >
                                                                            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                                                            Deletar
                                                                        </Button>

                                                                        {user.clinicId && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleDeleteUser(user.id, user.displayName, true)}
                                                                                className="min-h-[44px] flex-1 text-xs font-semibold text-red-700 border-red-200 hover:bg-red-50"
                                                                            >
                                                                                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                                                                Deletar + Clínica
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </CardContent>
                                            )}
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* Scheduled Billings Tab */}
                    <TabsContent value="scheduled-billings">
                        <Card className="bg-white border-gray-200">
                            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                                <div>
                                    <CardTitle className="text-gray-900">Cobranças Agendadas</CardTitle>
                                    <CardDescription className="text-gray-600">
                                        Monitore e gerencie os disparos programados de cobrança.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={loadScheduledBillings}
                                        disabled={loadingScheduled}
                                        className="h-10 px-4 border-gray-300 hover:bg-gray-50 flex items-center gap-2 font-semibold"
                                    >
                                        <RefreshCw className={`h-4 w-4 ${loadingScheduled ? 'animate-spin' : ''}`} />
                                        <span>Atualizar Lista</span>
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loadingScheduled ? (
                                    <div className="py-8 flex justify-center items-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                                    </div>
                                ) : scheduledBillings.length === 0 ? (
                                    <div className="py-12 text-center text-gray-500 font-medium">
                                        Nenhuma cobrança agendada encontrada.
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto w-full border border-gray-200 rounded-lg">
                                        <Table className="min-w-full">
                                            <TableHeader>
                                                <TableRow className="border-gray-200 bg-gray-50">
                                                    <TableHead className="text-gray-600 font-semibold">Clínica</TableHead>
                                                    <TableHead className="text-gray-600 font-semibold">Assunto</TableHead>
                                                    <TableHead className="text-gray-600 font-semibold">Mensagem</TableHead>
                                                    <TableHead className="text-gray-600 font-semibold">Data/Hora de Disparo</TableHead>
                                                    <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                                                    <TableHead className="text-gray-600 font-semibold text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {scheduledBillings.map((item) => (
                                                    <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                                                        <TableCell className="font-semibold text-gray-800">{item.clinic_name}</TableCell>
                                                        <TableCell className="text-gray-700">{item.title}</TableCell>
                                                        <TableCell className="text-gray-600 max-w-[200px] truncate">{item.message}</TableCell>
                                                        <TableCell className="text-gray-600">
                                                            {format(new Date(item.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.status === 'pending' && (
                                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium">
                                                                    Pendente
                                                                </Badge>
                                                            )}
                                                            {item.status === 'sent' && (
                                                                <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-medium">
                                                                    Enviado
                                                                </Badge>
                                                            )}
                                                            {item.status === 'paused' && (
                                                                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 font-medium">
                                                                    Pausado
                                                                </Badge>
                                                            )}
                                                            {item.status === 'cancelled' && (
                                                                <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-medium">
                                                                    Cancelado
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1.5">
                                                                {item.status === 'pending' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleUpdateScheduledStatus(item.id, 'paused', 'pausar')}
                                                                        className="h-10 px-3 border-yellow-300 text-yellow-700 hover:bg-yellow-50 hover:border-yellow-400 font-semibold"
                                                                        title="Pausar agendamento"
                                                                    >
                                                                        Pausar
                                                                    </Button>
                                                                )}
                                                                {item.status === 'paused' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleUpdateScheduledStatus(item.id, 'pending', 'retomar')}
                                                                        className="h-10 px-3 border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 font-semibold"
                                                                        title="Retomar agendamento"
                                                                    >
                                                                        Retomar
                                                                    </Button>
                                                                )}
                                                                {item.status !== 'sent' && item.status !== 'cancelled' && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleUpdateScheduledStatus(item.id, 'cancelled', 'cancelar')}
                                                                        className="h-10 px-3 border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 font-semibold"
                                                                        title="Cancelar disparo"
                                                                    >
                                                                        Cancelar
                                                                    </Button>
                                                                )}
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteScheduled(item.id)}
                                                                    className="h-10 px-3 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-semibold"
                                                                    title="Excluir permanentemente"
                                                                >
                                                                    Excluir
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
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
                                rows={4}
                                className="resize-y"
                            />
                            <p className="text-xs text-gray-500">
                                Esta mensagem aparecerá na notificação que os usuários da clínica receberão.
                            </p>
                        </div>

                        {/* Opção de Agendar Envio */}
                        <div className="flex flex-col space-y-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-semibold text-gray-800">Agendar envio para depois?</span>
                                    <p className="text-xs text-gray-500">Programe data e múltiplos horários de disparo</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={isScheduling}
                                    onChange={(e) => setIsScheduling(e.target.checked)}
                                    className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-gray-300 rounded cursor-pointer transition-all"
                                />
                            </div>

                            {isScheduling && (
                                <div className="space-y-3 mt-2 pt-2 border-t border-gray-200">
                                    <div className="space-y-1">
                                        <Label htmlFor="schedule-date" className="text-xs font-semibold text-gray-700">Data de Envio</Label>
                                        <input
                                            id="schedule-date"
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-gray-700">Adicionar Horário</Label>
                                        <div className="flex gap-2">
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="flex h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    if (!scheduleTime) return
                                                    if (scheduleTimes.includes(scheduleTime)) {
                                                        alert('Este horário já foi adicionado.')
                                                        return
                                                    }
                                                    setScheduleTimes(prev => [...prev, scheduleTime].sort())
                                                }}
                                                className="h-9 border-amber-600 text-amber-700 hover:bg-amber-50 flex items-center justify-center font-semibold"
                                            >
                                                Adicionar
                                            </Button>
                                        </div>
                                    </div>

                                    {scheduleTimes.length > 0 && (
                                        <div className="space-y-1">
                                            <span className="text-xs text-gray-500 font-semibold">Horários agendados para este dia:</span>
                                            <div className="flex flex-wrap gap-1.5 mt-1">
                                                {scheduleTimes.map((time, idx) => (
                                                    <Badge 
                                                        key={idx} 
                                                        variant="secondary"
                                                        className="px-2 py-0.5 text-xs bg-amber-50 text-amber-800 border-amber-200 flex items-center gap-1"
                                                    >
                                                        {time}
                                                        <button
                                                            type="button"
                                                            onClick={() => setScheduleTimes(prev => prev.filter(t => t !== time))}
                                                            className="text-amber-600 hover:text-amber-900 font-bold ml-1 focus:outline-none h-4 w-4 flex items-center justify-center rounded-full hover:bg-amber-100"
                                                        >
                                                            ×
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeBillingModal} disabled={sendingBilling === billingModal.clinicId}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSendBillingSubmit}
                            disabled={sendingBilling === billingModal.clinicId || !billingMessage.trim()}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {sendingBilling === billingModal.clinicId ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isScheduling ? 'Agendando...' : 'Enviando...'}</>
                            ) : (
                                <><Send className="h-4 w-4 mr-2" /> {isScheduling ? 'Agendar Cobrança' : 'Enviar Cobrança'}</>
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

            {/* Impersonation Modal */}
            <Dialog open={impersonateModal.open} onOpenChange={(open) => { if (!open) closeImpersonateModal() }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-blue-600" />
                            Entrar como Clínica
                        </DialogTitle>
                        <DialogDescription>
                            Você está prestes a operar como <strong>{impersonateModal.clinicName}</strong>.
                            Todas as suas ações serão registradas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm text-orange-800 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>Você verá e poderá modificar dados reais da clínica. Use com responsabilidade.</span>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="impersonate-reason">Motivo da impersonação *</Label>
                            <Textarea
                                id="impersonate-reason"
                                placeholder="Descreva o motivo (mínimo 10 caracteres)... Ex: Suporte técnico para configuração de agenda"
                                value={impersonateReason}
                                onChange={(e) => setImpersonateReason(e.target.value)}
                                rows={3}
                                className="resize-y"
                            />
                            <p className="text-xs text-gray-500">
                                {impersonateReason.trim().length}/10 caracteres mínimos
                                {impersonateReason.trim().length >= 10 && ' ✅'}
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={closeImpersonateModal} disabled={startingImpersonation}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleImpersonate}
                            disabled={startingImpersonation || impersonateReason.trim().length < 10}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {startingImpersonation ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Iniciando...</>
                            ) : (
                                <><UserCog className="h-4 w-4 mr-2" /> Confirmar e Entrar</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Clinic Passwords Modal */}
            <Dialog open={resetClinicModal.open} onOpenChange={(open) => { if (!open) closeResetClinicPwdModal() }}>
                <DialogContent className="sm:max-w-[600px] bg-white border-gray-200">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                            <KeyRound className="h-5 w-5 text-amber-600" />
                            Reset de Senha por Clínica
                        </DialogTitle>
                        <DialogDescription className="text-gray-600">
                            Clínica: <strong>{resetClinicModal.clinicName}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    {resetClinicResult === null ? (
                        <>
                            <div className="space-y-4 py-2 text-gray-900">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-800 flex items-start gap-2 font-medium">
                                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-600" />
                                        <span>⚠️ AVISO CRÍTICO E DE EXTREMA IMPORTÂNCIA:</span>
                                    </p>
                                    <p className="text-sm text-red-700 mt-2 pl-7 leading-relaxed font-bold">
                                        Esta ação redefinirá a senha de TODOS os colaboradores vinculados à clínica {resetClinicModal.clinicName} de maneira instantânea e permanente no Supabase.
                                    </p>
                                    <p className="text-sm text-red-700 mt-2 pl-7">
                                        Esta ação não pode ser desfeita. Novas senhas seguras serão geradas pelo servidor do CliniGo e notificações serão disparadas diretamente para cada usuário.
                                    </p>
                                </div>
                                <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 p-3 rounded-lg">
                                    <p>Confirmar reset geral das senhas dos usuários da clínica <strong>{resetClinicModal.clinicName}</strong>?</p>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0 mt-4">
                                <Button variant="outline" onClick={closeResetClinicPwdModal} disabled={resettingClinicPwd} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleResetClinicPasswords}
                                    disabled={resettingClinicPwd}
                                    className="bg-amber-600 hover:bg-amber-700 text-white"
                                >
                                    {resettingClinicPwd ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                                    ) : (
                                        <><KeyRound className="h-4 w-4 mr-2" /> Confirmar e Resetar Senhas</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    ) : (
                        <>
                            <div className="space-y-4 py-2 text-gray-900">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                    <p className="text-sm text-emerald-800 flex items-start gap-2 font-medium">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                        <span>Todas as senhas foram redefinidas! Copie as credenciais de acesso abaixo:</span>
                                    </p>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                                    <Table>
                                        <TableHeader className="bg-gray-50">
                                            <TableRow>
                                                <TableHead className="text-gray-700 font-bold">Colaborador</TableHead>
                                                <TableHead className="text-gray-700 font-bold">E-mail</TableHead>
                                                <TableHead className="text-gray-700 font-bold">Nova Senha</TableHead>
                                                <TableHead className="text-gray-700 w-16"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {resetClinicResult.map((res, idx) => (
                                                <TableRow key={idx} className="border-gray-200 hover:bg-gray-50">
                                                    <TableCell className="font-semibold text-xs max-w-[120px] truncate" title={res.fullName}>
                                                        {res.fullName}
                                                    </TableCell>
                                                    <TableCell className="text-xs truncate max-w-[150px]" title={res.email}>
                                                        {res.email}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono font-bold text-emerald-600 select-all">
                                                        {res.success ? res.newPassword : <span className="text-red-500 font-normal">Falhou: {res.error}</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {res.success && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`E-mail: ${res.email}\nSenha: ${res.newPassword}`)
                                                                    alert('Copiado com sucesso!')
                                                                }}
                                                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600"
                                                                title="Copiar dados de acesso do colaborador"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center mt-4">
                                <Button
                                    variant="outline"
                                    onClick={copyAllClinicCredentials}
                                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 w-full sm:w-auto"
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copiar Todos em Lote
                                </Button>
                                <Button onClick={closeResetClinicPwdModal} className="bg-gray-900 hover:bg-gray-800 text-white w-full sm:w-auto">
                                    Fechar
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

