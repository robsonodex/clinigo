'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Users,
    UserPlus,
    Shield,
    Mail,
    MoreHorizontal,
    RefreshCw,
    Check,
    X,
    Trash2,
    Key,
    KeyRound,
    Edit,
    Dices,
    Copy,
    Eye,
    EyeOff,
    Lock,
    Search,
    Loader2,
    ShieldCheck,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { SeatMeter } from '@/components/billing/seat-meter'
import { SeatOverageDialog, type SeatQuote } from '@/components/billing/seat-overage-dialog'

function apiErrorMessage(data: any, fallback: string): string {
    const err = data?.error
    if (typeof err === 'string') return err
    return err?.message || fallback
}

type RoleKey = 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'FINANCIAL' | 'READONLY'

interface ClinicUser {
    id: string
    email: string
    name: string
    role: RoleKey
    status: 'active' | 'inactive'
    activation_status: string
    created_at: string
}

interface RoleMetadata {
    label: string
    badgeClass: string
    summary: string
    allowed: string[]
    restricted: string[]
}

const ROLES: Record<RoleKey, RoleMetadata> = {
    CLINIC_ADMIN: {
        label: 'Administrador',
        badgeClass: 'bg-primary/10 text-primary border border-primary/25',
        summary: 'Gestão completa da clínica, equipe, finanças, TISS e configurações.',
        allowed: [
            'Agenda geral, recepção e painel de TV',
            'Prontuários, evoluções e planos terapêuticos',
            'Financeiro, repasses, TISS e glosas',
            'Usuários, assinatura, dispositivos e configurações',
        ],
        restricted: [],
    },
    DOCTOR: {
        label: 'Profissional / Terapeuta',
        badgeClass: 'bg-accent text-accent-foreground border border-primary/20',
        summary: 'Acesso clínico focado nos atendimentos, evoluções e repasse pessoal.',
        allowed: [
            'Minha Agenda e fila de espera terapêutica',
            'Prontuários, evoluções por especialidade e planos terapêuticos',
            'Teleconsulta (quando habilitada para a clínica)',
            'Meu Financeiro (extrato individual de repasses)',
        ],
        restricted: [
            'Financeiro geral da clínica, TISS, convênios e usuários',
        ],
    },
    RECEPTIONIST: {
        label: 'Recepção',
        badgeClass: 'bg-secondary text-secondary-foreground border border-border',
        summary: 'Operação de agendamentos, check-in biométrico, pré-cadastros e guias.',
        allowed: [
            'Agenda geral, recorrências, horários e fila de espera',
            'Recepção, check-in, pré-cadastros e painel de TV',
            'Cadastro administrativo de pacientes e status do WhatsApp',
        ],
        restricted: [
            'Prontuários, evoluções clínicas, financeiro, TISS e usuários',
        ],
    },
    FINANCIAL: {
        label: 'Financeiro / Faturamento',
        badgeClass: 'bg-amber-50 text-amber-900 border border-amber-200',
        summary: 'Faturamento de convênios, TISS/Glosas, folha de repasse e DRE.',
        allowed: [
            'Financeiro, pagamentos, DRE e folha de repasse de terapeutas',
            'Faturamento TISS, lotes XML, convênios e gestão de glosas',
            'Regras de reembolso e relatórios gerenciais',
        ],
        restricted: [
            'Prontuários, evoluções clínicas, agenda e gestão de usuários',
        ],
    },
    READONLY: {
        label: 'Apenas Leitura',
        badgeClass: 'bg-muted text-muted-foreground border border-border',
        summary: 'Consulta básica ao painel inicial sem permissão de edição ou áreas sensíveis.',
        allowed: [
            'Visualização do painel inicial de indicadores gerais',
        ],
        restricted: [
            'Prontuários, agenda, financeiro, TISS e qualquer edição de cadastro',
        ],
    },
}

const INITIAL_NEW_USER = {
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST' as RoleKey,
}

export default function UsuariosPermissoesPage() {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [users, setUsers] = useState<ClinicUser[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('ALL')
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [isInviting, setIsInviting] = useState(false)
    const [newUser, setNewUser] = useState(INITIAL_NEW_USER)

    const [editingUser, setEditingUser] = useState<ClinicUser | null>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    const [userToToggle, setUserToToggle] = useState<ClinicUser | null>(null)
    const [isTogglingStatus, setIsTogglingStatus] = useState(false)

    const [userToDelete, setUserToDelete] = useState<ClinicUser | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const [resetPasswordUser, setResetPasswordUser] = useState<ClinicUser | null>(null)
    const [resetPassword, setResetPassword] = useState('')
    const [showResetPassword, setShowResetPassword] = useState(false)
    const [resettingPassword, setResettingPassword] = useState(false)

    const [overageDialogOpen, setOverageDialogOpen] = useState(false)
    const [pendingQuote, setPendingQuote] = useState<SeatQuote | null>(null)
    const [pendingAction, setPendingAction] = useState<((quote: SeatQuote) => Promise<void>) | null>(null)
    const [overageError, setOverageError] = useState<string | null>(null)

    const loadUsers = useCallback(async (manual = false) => {
        if (manual) setRefreshing(true)
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return
            setCurrentUserId(user.id)

            const { data: userData } = await (supabase
                .from('users') as any)
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) return
            setClinicId(userData.clinic_id)

            const { data: clinicUsers, error } = await (supabase
                .from('users') as any)
                .select('id, email, full_name, role, is_active, activation_status, created_at')
                .eq('clinic_id', userData.clinic_id)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (clinicUsers) {
                setUsers(clinicUsers.map((u: any) => ({
                    id: u.id,
                    email: u.email || '',
                    name: u.full_name || u.email?.split('@')[0] || 'Sem nome',
                    role: (ROLES[u.role as RoleKey] ? u.role : 'READONLY') as RoleKey,
                    status: u.is_active ? 'active' : 'inactive',
                    activation_status: u.activation_status || 'active',
                    created_at: u.created_at,
                })))
            }
            if (manual) toast.success('Lista de usuários atualizada.')
        } catch (error) {
            console.error('Error loading users:', error)
            toast.error('Erro ao carregar usuários da clínica.')
        } finally {
            setLoading(false)
            if (manual) setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        loadUsers()
    }, [loadUsers])

    function generatePassword() {
        const length = 12
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
        let password = ''
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n))
        }
        setNewUser(prev => ({ ...prev, password }))
    }

    async function copyPassword() {
        if (!newUser.password) return
        try {
            await navigator.clipboard.writeText(newUser.password)
            toast.success('Senha copiada para a área de transferência.')
        } catch {
            toast.error('Não foi possível copiar a senha automaticamente.')
        }
    }

    async function handleInviteUser() {
        const trimmedName = newUser.name.trim()
        const trimmedEmail = newUser.email.trim().toLowerCase()
        const trimmedPassword = newUser.password.trim()

        if (!clinicId || !trimmedName || !trimmedEmail) {
            toast.error('Preencha o nome completo e o e-mail do usuário.')
            return
        }

        if (trimmedName.length < 3) {
            toast.error('O nome completo deve ter pelo menos 3 caracteres.')
            return
        }

        if (trimmedPassword && trimmedPassword.length < 6) {
            toast.error('A senha inicial deve ter no mínimo 6 caracteres (ou deixe em branco para envio por convite).')
            return
        }

        setIsInviting(true)
        try {
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: trimmedEmail,
                    name: trimmedName,
                    role: newUser.role,
                    password: trimmedPassword || undefined,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                if (response.status === 409 && data.code === 'SEAT_LIMIT_CONFIRMATION_REQUIRED' && data.quote) {
                    setPendingQuote(data.quote)
                    setOverageError(null)
                    setPendingAction(() => async (confirmedQuote: SeatQuote) => {
                        const retryRes = await fetch('/api/users/invite', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Idempotency-Key': `inv-${confirmedQuote.quote_id}`,
                            },
                            body: JSON.stringify({
                                email: trimmedEmail,
                                name: trimmedName,
                                role: newUser.role,
                                password: trimmedPassword || undefined,
                                quote: confirmedQuote,
                            }),
                        })
                        const retryData = await retryRes.json().catch(() => ({}))
                        if (!retryRes.ok) {
                            if (retryRes.status === 409 && retryData.quote) {
                                setPendingQuote(retryData.quote)
                                throw new Error('A cotação foi atualizada devido a alterações recentes no número de usuários ativos. Por favor, confirme novamente.')
                            }
                            throw new Error(apiErrorMessage(retryData, 'Erro ao confirmar adição de usuário'))
                        }
                        toast.success(retryData.message || 'Usuário convidado e licença adicional confirmada.')
                        setOverageDialogOpen(false)
                        setDialogOpen(false)
                        setNewUser(INITIAL_NEW_USER)
                        loadUsers()
                    })
                    setOverageDialogOpen(true)
                    return
                }

                throw new Error(apiErrorMessage(data, 'Erro ao convidar usuário'))
            }

            toast.success(data.message || 'Convite enviado com sucesso.')
            setDialogOpen(false)
            setNewUser(INITIAL_NEW_USER)
            loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao enviar convite.')
        } finally {
            setIsInviting(false)
        }
    }

    async function handleUpdateUser() {
        if (!editingUser || !editingUser.name.trim() || !editingUser.role) {
            toast.error('Preencha os campos obrigatórios.')
            return
        }

        setIsUpdating(true)
        try {
            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingUser.name.trim(),
                    role: editingUser.role,
                }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(apiErrorMessage(data, 'Erro ao atualizar usuário'))
            }

            toast.success('Usuário atualizado com sucesso.')
            setEditingUser(null)
            loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar usuário.')
        } finally {
            setIsUpdating(false)
        }
    }

    async function handleToggleUserStatus(userId: string, active: boolean, quote?: SeatQuote) {
        setIsTogglingStatus(true)
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' }
            if (quote) {
                headers['Idempotency-Key'] = `status-${userId}-${quote.quote_id}`
            }

            const response = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({
                    is_active: active,
                    quote,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                if (response.status === 409 && data.quote && !quote) {
                    setUserToToggle(null)
                    setPendingQuote(data.quote)
                    setOverageError(null)
                    setPendingAction(() => async (confirmedQuote: SeatQuote) => {
                        await handleToggleUserStatus(userId, true, confirmedQuote)
                        setOverageDialogOpen(false)
                    })
                    setOverageDialogOpen(true)
                    return
                }

                if (response.status === 409 && data.quote) {
                    setPendingQuote(data.quote)
                    throw new Error('A cotação foi atualizada. Por favor, confirme novamente.')
                }

                throw new Error(apiErrorMessage(data, 'Erro ao alterar status do usuário'))
            }

            toast.success(active ? 'Usuário reativado com sucesso.' : 'Usuário desativado com sucesso.')
            setUserToToggle(null)
            loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar status do usuário.')
            throw error
        } finally {
            setIsTogglingStatus(false)
        }
    }

    async function handleResetPasswordEmail(email: string) {
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })

            const data = await res.json().catch(() => ({}))
            if (!res.ok || data?.success === false) {
                throw new Error(apiErrorMessage(data, 'Erro ao enviar e-mail de redefinição'))
            }

            toast.success(`Link oficial de redefinição enviado para ${email}.`)
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao enviar e-mail de redefinição.')
        }
    }

    function generateResetPassword() {
        const length = 12
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*'
        let pwd = ''
        for (let i = 0; i < length; i++) {
            pwd += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        setResetPassword(pwd)
    }

    async function copyResetPassword() {
        if (!resetPassword) return
        try {
            await navigator.clipboard.writeText(resetPassword)
            toast.success('Senha copiada para a área de transferência.')
        } catch {
            toast.error('Não foi possível copiar a senha automaticamente.')
        }
    }

    async function handleForceResetPassword() {
        if (!resetPasswordUser || !resetPassword) {
            toast.error('Digite ou gere uma nova senha.')
            return
        }

        if (resetPassword.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres.')
            return
        }

        setResettingPassword(true)
        try {
            const response = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPassword }),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(apiErrorMessage(data, 'Erro ao redefinir senha'))
            }

            toast.success(`Senha de ${resetPasswordUser.name} redefinida com sucesso.`)
            setResetPasswordUser(null)
            setResetPassword('')
            setShowResetPassword(false)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao redefinir senha.')
        } finally {
            setResettingPassword(false)
        }
    }

    async function handleConfirmDeleteUser() {
        if (!userToDelete) return
        setIsDeleting(true)
        try {
            const response = await fetch(`/api/users/${userToDelete.id}`, {
                method: 'DELETE',
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(apiErrorMessage(data, 'Erro ao excluir usuário em definitivo'))
            }
            toast.success(`Usuário ${userToDelete.name} excluído em definitivo.`)
            setUserToDelete(null)
            loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir usuário.')
        } finally {
            setIsDeleting(false)
        }
    }

    const filteredUsers = users.filter((u) => {
        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false
        if (!searchTerm.trim()) return true
        const term = searchTerm.toLowerCase()
        return (
            (u.name || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term) ||
            (ROLES[u.role]?.label || u.role || '').toLowerCase().includes(term)
        )
    })

    const selectedRoleMeta = ROLES[newUser.role]

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando usuários da clínica...</p>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto py-6 sm:py-8 px-4 space-y-6">
            {/* Cabeçalho editorial padrão CliniGo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Usuários e Permissões</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                            Gerencie os acessos da equipe clínica, recepção e financeiro conforme a LGPD
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => loadUsers(true)}
                        disabled={refreshing}
                        className="min-h-[44px] flex-1 sm:flex-none"
                    >
                        <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
                        Atualizar
                    </Button>

                    <Dialog
                        open={dialogOpen}
                        onOpenChange={(open) => {
                            if (!isInviting) {
                                setDialogOpen(open)
                                if (!open) setNewUser(INITIAL_NEW_USER)
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] flex-1 sm:flex-none font-medium">
                                <UserPlus className="w-4 h-4 mr-2" />
                                Convidar Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border-border">
                            <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border shrink-0 bg-card">
                                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                                    Convidar Novo Usuário
                                </DialogTitle>
                                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                                    Cadastre um colaborador com acesso individual e perfil RBAC aplicado automaticamente no servidor.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 p-5 sm:p-6 py-4 overflow-y-auto flex-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-name">Nome Completo *</Label>
                                        <Input
                                            id="invite-name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            placeholder="Ex: Ana Paula Mendes"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite-email">E-mail de Acesso *</Label>
                                        <Input
                                            id="invite-email"
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            placeholder="colaborador@clinica.com.br"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="invite-password">Senha Inicial (Opcional)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="invite-password"
                                            type="text"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                            placeholder="Deixe em branco para enviar link de criação de senha"
                                            className="min-h-[44px]"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={generatePassword}
                                            title="Gerar senha aleatória"
                                            aria-label="Gerar senha aleatória"
                                            className="min-h-[44px] min-w-[44px] shrink-0"
                                        >
                                            <Dices className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyPassword}
                                            disabled={!newUser.password}
                                            title="Copiar senha"
                                            aria-label="Copiar senha"
                                            className="min-h-[44px] min-w-[44px] shrink-0"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {newUser.password.trim()
                                            ? 'Com senha preenchida (mín. 6 caracteres), a conta já nasce ativa para login imediato.'
                                            : 'Sem senha preenchida, enviaremos um link oficial por e-mail válido por 7 dias para o usuário definir a própria senha.'}
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <Label>Perfil de Acesso *</Label>
                                    <Select
                                        value={newUser.role}
                                        onValueChange={(value) => setNewUser({ ...newUser, role: value as RoleKey })}
                                    >
                                        <SelectTrigger className="min-h-[44px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(Object.entries(ROLES) as [RoleKey, RoleMetadata][]).map(([key, value]) => (
                                                <SelectItem key={key} value={key}>
                                                    {value.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Resumo real das permissões RBAC do perfil selecionado */}
                                <div className="space-y-3 pt-4 border-t border-border">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                                            <span className="text-sm font-semibold text-foreground">
                                                O que o perfil {selectedRoleMeta.label} acessa no CliniGo
                                            </span>
                                        </div>
                                        <Badge className={cn('font-normal text-xs', selectedRoleMeta.badgeClass)}>
                                            RBAC Ativo
                                        </Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        {selectedRoleMeta.summary}
                                    </p>

                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                                                Módulos liberados
                                            </p>
                                            <ul className="space-y-1.5">
                                                {selectedRoleMeta.allowed.map((item) => (
                                                    <li key={item} className="flex items-start gap-2 text-xs text-foreground">
                                                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {selectedRoleMeta.restricted.length > 0 && (
                                            <div className="p-3.5 rounded-lg border border-border bg-card space-y-2">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Bloqueado por sigilo clínico e LGPD
                                                </p>
                                                <ul className="space-y-1.5">
                                                    {selectedRoleMeta.restricted.map((item) => (
                                                        <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                            <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="p-4 sm:px-6 border-t border-border bg-muted/20 shrink-0 flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-[44px]"
                                    onClick={() => setDialogOpen(false)}
                                    disabled={isInviting}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px] px-5 font-medium"
                                    onClick={handleInviteUser}
                                    disabled={isInviting}
                                >
                                    {isInviting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4 mr-2" />
                                            {newUser.password.trim() ? 'Cadastrar e Ativar' : 'Enviar Convite'}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="usuarios" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="usuarios" className="min-h-[40px] px-4">
                        <Users className="w-4 h-4 mr-2" />
                        Usuários ({users.length})
                    </TabsTrigger>
                    <TabsTrigger value="perfis" className="min-h-[40px] px-4">
                        <Shield className="w-4 h-4 mr-2" />
                        Perfis de Acesso
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Usuários */}
                <TabsContent value="usuarios" className="space-y-6">
                    <SeatMeter />

                    <Card className="border-border shadow-sm">
                        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <CardTitle className="text-base sm:text-lg font-semibold">Usuários da Clínica</CardTitle>
                                <CardDescription>
                                    {users.length} usuário(s) cadastrado(s)
                                    {(searchTerm || roleFilter !== 'ALL') && ` · ${filteredUsers.length} exibido(s)`}
                                </CardDescription>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nome ou e-mail..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 min-h-[44px]"
                                    />
                                </div>
                                <Select value={roleFilter} onValueChange={setRoleFilter}>
                                    <SelectTrigger className="w-full sm:w-48 min-h-[44px]">
                                        <SelectValue placeholder="Filtrar perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Todos os perfis</SelectItem>
                                        {(Object.entries(ROLES) as [RoleKey, RoleMetadata][]).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6 sm:pt-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Perfil</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Cadastro / Ativação</TableHead>
                                            <TableHead className="w-[80px] text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-sm text-muted-foreground">
                                                    Nenhum usuário encontrado com os filtros aplicados.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredUsers.map((user) => {
                                                const isPendingActivation = user.activation_status === 'pending_activation'
                                                const isSelf = user.id === currentUserId
                                                return (
                                                    <TableRow key={user.id}>
                                                        <TableCell>
                                                            <div className="min-w-[180px]">
                                                                <p className="font-medium text-foreground">
                                                                    {user.name}
                                                                    {isSelf && (
                                                                        <span className="ml-2 text-xs text-muted-foreground font-normal">(Você)</span>
                                                                    )}
                                                                </p>
                                                                <p className="text-xs sm:text-sm text-muted-foreground">{user.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className={cn('font-normal whitespace-nowrap', ROLES[user.role]?.badgeClass)}>
                                                                {ROLES[user.role]?.label || user.role}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {user.status === 'active' ? (
                                                                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 whitespace-nowrap">
                                                                    <Check className="w-3 h-3 mr-1" />
                                                                    Ativo
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 whitespace-nowrap">
                                                                    <X className="w-3 h-3 mr-1" />
                                                                    Inativo
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs space-y-0.5 whitespace-nowrap">
                                                                <p className="text-foreground font-medium">
                                                                    {isPendingActivation ? 'Convite pendente' : 'Conta ativada'}
                                                                </p>
                                                                <p className="text-muted-foreground tabular-nums">
                                                                    Desde {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '—'}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="min-h-[44px] min-w-[44px]"
                                                                        aria-label={`Ações para ${user.name}`}
                                                                    >
                                                                        <MoreHorizontal className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Editar Perfil
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleResetPasswordEmail(user.email)}>
                                                                        <Mail className="w-4 h-4 mr-2" />
                                                                        Enviar Link de Senha
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setResetPasswordUser(user)
                                                                            setResetPassword('')
                                                                            setShowResetPassword(false)
                                                                        }}
                                                                    >
                                                                        <KeyRound className="w-4 h-4 mr-2" />
                                                                        Forçar Nova Senha
                                                                    </DropdownMenuItem>
                                                                    {!isSelf && (
                                                                        <>
                                                                            <DropdownMenuItem onClick={() => setUserToToggle(user)}>
                                                                                {user.status === 'active' ? (
                                                                                    <>
                                                                                        <X className="w-4 h-4 mr-2" />
                                                                                        Desativar Acesso
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Check className="w-4 h-4 mr-2" />
                                                                                        Reativar Acesso
                                                                                    </>
                                                                                )}
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                                                                onClick={() => setUserToDelete(user)}
                                                                            >
                                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                                Excluir Definitivamente
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Perfis */}
                <TabsContent value="perfis">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(Object.entries(ROLES) as [RoleKey, RoleMetadata][]).map(([key, value]) => (
                            <Card key={key} className="border-border shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-base font-semibold">{value.label}</CardTitle>
                                        <Badge className={cn('font-normal text-[11px]', value.badgeClass)}>
                                            {key}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs">
                                        {value.summary}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-1.5 text-xs sm:text-sm">
                                        {value.allowed.map((item) => (
                                            <p key={item} className="flex items-start gap-2 text-foreground">
                                                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                                <span>{item}</span>
                                            </p>
                                        ))}
                                    </div>
                                    {value.restricted.length > 0 && (
                                        <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                                            {value.restricted.map((item) => (
                                                <p key={item} className="flex items-start gap-2 text-muted-foreground">
                                                    <X className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                                                    <span>Restrito: {item}</span>
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal: Editar Usuário */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && !isUpdating && setEditingUser(null)}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle>Editar Acessos do Usuário</DialogTitle>
                        <DialogDescription>
                            Altere o nome e o perfil (cargo) para definir os módulos liberados para este usuário.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-4 py-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-user-name">Nome Completo</Label>
                                <Input
                                    id="edit-user-name"
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    className="min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>E-mail (Fixo)</Label>
                                <Input
                                    value={editingUser.email}
                                    disabled
                                    className="bg-muted min-h-[44px]"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Perfil de Acesso</Label>
                                <Select
                                    value={editingUser.role}
                                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value as RoleKey })}
                                >
                                    <SelectTrigger className="min-h-[44px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.entries(ROLES) as [RoleKey, RoleMetadata][]).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => setEditingUser(null)}
                            disabled={isUpdating}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px]"
                            onClick={handleUpdateUser}
                            disabled={isUpdating}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Salvar Alterações
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Forçar Redefinição de Senha */}
            <Dialog
                open={!!resetPasswordUser}
                onOpenChange={(open) => {
                    if (!open && !resettingPassword) {
                        setResetPasswordUser(null)
                        setResetPassword('')
                        setShowResetPassword(false)
                    }
                }}
            >
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Forçar Nova Senha
                        </DialogTitle>
                        <DialogDescription>
                            Defina uma nova senha para <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.email}). O usuário poderá acessar imediatamente com a nova senha.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label>Nova Senha</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showResetPassword ? 'text' : 'password'}
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="pr-11 min-h-[44px]"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full min-w-[44px]"
                                        onClick={() => setShowResetPassword(!showResetPassword)}
                                        aria-label="Alternar visibilidade da senha"
                                    >
                                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={generateResetPassword}
                                    title="Gerar senha aleatória"
                                    aria-label="Gerar senha aleatória"
                                    className="min-h-[44px] min-w-[44px] shrink-0"
                                >
                                    <Dices className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={copyResetPassword}
                                    disabled={!resetPassword}
                                    title="Copiar senha"
                                    aria-label="Copiar senha"
                                    className="min-h-[44px] min-w-[44px] shrink-0"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                A senha será aplicada imediatamente. Copie e encaminhe ao usuário por um canal seguro.
                            </p>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs sm:text-sm text-amber-900 flex items-start gap-2">
                                <Shield className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
                                <span>Esta ação é registrada no log de auditoria e encerra sessões anteriores do usuário.</span>
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px]"
                            disabled={resettingPassword}
                            onClick={() => {
                                setResetPasswordUser(null)
                                setResetPassword('')
                                setShowResetPassword(false)
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleForceResetPassword}
                            disabled={resettingPassword || !resetPassword || resetPassword.length < 6}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[44px]"
                        >
                            {resettingPassword ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Key className="w-4 h-4 mr-2" />
                            )}
                            Redefinir Senha
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta: Ativar / Desativar Usuário */}
            <AlertDialog open={!!userToToggle} onOpenChange={(open) => !open && !isTogglingStatus && setUserToToggle(null)}>
                <AlertDialogContent className="max-w-md w-[95vw]">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {userToToggle?.status === 'active' ? 'Desativar acesso do usuário?' : 'Reativar acesso do usuário?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {userToToggle?.status === 'active'
                                ? `O usuário ${userToToggle.name} (${userToToggle.email}) perderá o acesso imediato ao CliniGo, mantendo todo o histórico preservado.`
                                : `O usuário ${userToToggle?.name} (${userToToggle?.email}) voltará a ter acesso ao CliniGo com o perfil ${userToToggle ? ROLES[userToToggle.role]?.label : ''}.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isTogglingStatus} className="min-h-[44px]">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isTogglingStatus}
                            onClick={(e) => {
                                e.preventDefault()
                                if (userToToggle) {
                                    handleToggleUserStatus(userToToggle.id, userToToggle.status !== 'active').catch(() => {})
                                }
                            }}
                            className={cn(
                                'min-h-[44px]',
                                userToToggle?.status === 'active'
                                    ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            )}
                        >
                            {isTogglingStatus ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : userToToggle?.status === 'active' ? (
                                'Confirmar Desativação'
                            ) : (
                                'Confirmar Reativação'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal: Excluir Usuário em Definitivo */}
            <Dialog open={!!userToDelete} onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}>
                <DialogContent className="max-w-md w-[95vw]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="w-5 h-5" />
                            Excluir Usuário em Definitivo
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm text-foreground">
                            Tem certeza que deseja excluir permanentemente o usuário <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
                        Esta ação é permanente e irreversível. O acesso do usuário será revogado, os registros serão desvinculados com segurança, o cadastro no Supabase Auth será removido e o e-mail será liberado.
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => setUserToDelete(null)}
                            disabled={isDeleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="min-h-[44px]"
                            onClick={handleConfirmDeleteUser}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir Definitivamente
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Licença de Assento Adicional */}
            <SeatOverageDialog
                open={overageDialogOpen}
                onOpenChange={setOverageDialogOpen}
                quote={pendingQuote}
                onConfirm={async (confirmedQuote) => {
                    if (!pendingAction) return
                    try {
                        setOverageError(null)
                        await pendingAction(confirmedQuote)
                    } catch (err: any) {
                        setOverageError(err?.message || 'Erro ao confirmar licença adicional')
                    }
                }}
                errorMessage={overageError}
            />
        </div>
    )
}
