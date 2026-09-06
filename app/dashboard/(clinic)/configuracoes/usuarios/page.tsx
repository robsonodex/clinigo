'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
    Settings,
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
    Lock
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface User {
    id: string
    email: string
    name: string
    role: 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'FINANCIAL' | 'READONLY'
    status: 'active' | 'inactive' | 'pending'
    created_at: string
    last_login?: string
}

interface Permission {
    id: string
    name: string
    description: string
    module: string
}

const ROLES = {
    'CLINIC_ADMIN': { label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
    'DOCTOR': { label: 'Médico', color: 'bg-blue-100 text-blue-800' },
    'RECEPTIONIST': { label: 'Recepcionista', color: 'bg-green-100 text-green-800' },
    'FINANCIAL': { label: 'Administrativo / Financeiro', color: 'bg-amber-100 text-amber-800' },
    'READONLY': { label: 'Apenas Leitura', color: 'bg-gray-100 text-gray-800' },
}

const PERMISSION_MODULES = [
    {
        name: 'Agendamento',
        permissions: [
            { id: 'agenda_view', name: 'Visualizar agenda', default: true },
            { id: 'agenda_create', name: 'Criar agendamentos', default: true },
            { id: 'agenda_edit', name: 'Editar agendamentos', default: true },
            { id: 'agenda_cancel', name: 'Cancelar agendamentos', default: true },
        ]
    },
    {
        name: 'Pacientes',
        permissions: [
            { id: 'patients_view', name: 'Visualizar pacientes', default: true },
            { id: 'patients_create', name: 'Cadastrar pacientes', default: true },
            { id: 'patients_edit', name: 'Editar pacientes', default: true },
            { id: 'patients_delete', name: 'Excluir pacientes', default: false },
        ]
    },
    {
        name: 'Prontuário',
        permissions: [
            { id: 'records_view', name: 'Visualizar prontuários', default: true },
            { id: 'records_create', name: 'Criar prontuários', default: false },
            { id: 'records_edit', name: 'Editar prontuários', default: false },
        ]
    },
    {
        name: 'Financeiro',
        permissions: [
            { id: 'financial_view', name: 'Visualizar financeiro', default: false },
            { id: 'financial_create', name: 'Criar lançamentos', default: false },
            { id: 'financial_edit', name: 'Editar lançamentos', default: false },
            { id: 'financial_reports', name: 'Ver relatórios', default: false },
        ]
    },
    {
        name: 'Configurações',
        permissions: [
            { id: 'settings_view', name: 'Visualizar configurações', default: false },
            { id: 'settings_edit', name: 'Editar configurações', default: false },
            { id: 'users_manage', name: 'Gerenciar usuários', default: false },
        ]
    },
]

export default function UsuariosPermissoesPage() {
    const [loading, setLoading] = useState(true)
    const [users, setUsers] = useState<User[]>([])
    const [clinicId, setClinicId] = useState<string | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
    const [resetPassword, setResetPassword] = useState('')
    const [showResetPassword, setShowResetPassword] = useState(false)
    const [resettingPassword, setResettingPassword] = useState(false)
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'RECEPTIONIST' as User['role'],
        permissions: {} as Record<string, boolean>
    })

    useEffect(() => {
        loadUsers()
    }, [])

    function generatePassword() {
        const length = 12
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        let password = ""
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n))
        }
        setNewUser(prev => ({ ...prev, password }))
    }

    function copyPassword() {
        navigator.clipboard.writeText(newUser.password)
        toast.success("Senha copiada!")
    }

    async function loadUsers() {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) return

            const { data: userData } = await supabase
                .from('users')
                .select('clinic_id')
                .eq('id', user.id)
                .single()

            if (!userData?.clinic_id) return
            setClinicId(userData.clinic_id)

            // Load users from clinic
            const { data: clinicUsers } = await supabase
                .from('users')
                .select('*')
                .eq('clinic_id', userData.clinic_id)
                .order('created_at', { ascending: false })

            if (clinicUsers) {
                setUsers(clinicUsers.map(u => ({
                    id: u.id,
                    email: u.email || '',
                    name: u.full_name || u.name || u.email?.split('@')[0] || 'Sem nome',
                    role: (u.role as User['role']) || 'READONLY',
                    status: u.is_active ? 'active' : 'inactive',
                    created_at: u.created_at,
                    last_login: u.last_login
                })))
            }
        } catch (error) {
            console.error('Error loading users:', error)
            toast.error('Erro ao carregar usuários')
        } finally {
            setLoading(false)
        }
    }

    async function handleInviteUser() {
        if (!clinicId || !newUser.email || !newUser.name) {
            toast.error('Preencha todos os campos')
            return
        }

        try {
            const response = await fetch('/api/users/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUser.email,
                    name: newUser.name,
                    role: newUser.role,
                    password: newUser.password || undefined,
                })
            })

            if (!response.ok) throw new Error('Erro ao convidar usuário')

            toast.success('Convite enviado com sucesso!')
            setDialogOpen(false)
            setNewUser({ name: '', email: '', password: '', role: 'RECEPTIONIST', permissions: {} })
            loadUsers()
        } catch (error) {
            toast.error('Erro ao enviar convite')
        }
    }

    async function handleUpdateUser() {
        if (!editingUser || !editingUser.name || !editingUser.role) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        try {
            const response = await fetch(`/api/users/${editingUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingUser.name,
                    role: editingUser.role,
                })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Erro ao atualizar usuário')
            }

            toast.success('Usuário atualizado com sucesso!')
            setEditingUser(null)
            loadUsers()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao atualizar usuário')
        }
    }

    async function handleToggleUserStatus(userId: string, active: boolean) {
        try {
            const supabase = createClient()

            const { error } = await supabase
                .from('users')
                .update({ is_active: active })
                .eq('id', userId)

            if (error) throw error

            toast.success(active ? 'Usuário ativado' : 'Usuário desativado')
            loadUsers()
        } catch (error) {
            toast.error('Erro ao atualizar usuário')
        }
    }

    async function handleResetPasswordEmail(email: string) {
        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email)

            if (error) throw error
            toast.success('Email de redefinição enviado!')
        } catch (error) {
            toast.error('Erro ao enviar email')
        }
    }

    function generateResetPassword() {
        const length = 12
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
        let pwd = ""
        for (let i = 0; i < length; i++) {
            pwd += charset.charAt(Math.floor(Math.random() * charset.length))
        }
        setResetPassword(pwd)
    }

    function copyResetPassword() {
        navigator.clipboard.writeText(resetPassword)
        toast.success('Senha copiada para a área de transferência!')
    }

    async function handleForceResetPassword() {
        if (!resetPasswordUser || !resetPassword) {
            toast.error('Digite ou gere uma nova senha')
            return
        }

        if (resetPassword.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres')
            return
        }

        setResettingPassword(true)
        try {
            const response = await fetch(`/api/users/${resetPasswordUser.id}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: resetPassword })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Erro ao redefinir senha')
            }

            toast.success(`Senha de ${resetPasswordUser.name} redefinida com sucesso!`)
            setResetPasswordUser(null)
            setResetPassword('')
            setShowResetPassword(false)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao redefinir senha')
        } finally {
            setResettingPassword(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Usuários e Permissões</h1>
                    <p className="text-muted-foreground">
                        Gerencie os usuários da clínica e suas permissões de acesso.
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Convidar Usuário
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Convidar Novo Usuário</DialogTitle>
                            <DialogDescription>
                                Envie um convite por email para adicionar um novo usuário à clínica.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                        placeholder="Nome do usuário"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Senha Inicial (Opcional)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder="Senha de acesso"
                                    />
                                    <Button type="button" variant="outline" size="icon" onClick={generatePassword} title="Gerar Senha Aleatória">
                                        <Dices className="w-4 h-4" />
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" onClick={copyPassword} disabled={!newUser.password} title="Copiar Senha">
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Se preenchido, o usuário poderá acessar o sistema imediatamente com essa senha.</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Perfil de Acesso</Label>
                                <Select
                                    value={newUser.role}
                                    onValueChange={(value) => setNewUser({ ...newUser, role: value as User['role'] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLES).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3 pt-4 border-t">
                                <Label>Permissões Customizadas</Label>
                                <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">
                                    {PERMISSION_MODULES.map((module) => (
                                        <Card key={module.name} className="p-3">
                                            <h4 className="font-medium mb-2">{module.name}</h4>
                                            <div className="space-y-2">
                                                {module.permissions.map((perm) => (
                                                    <div key={perm.id} className="flex items-center justify-between">
                                                        <span className="text-sm">{perm.name}</span>
                                                        <Switch
                                                            checked={newUser.permissions[perm.id] ?? perm.default}
                                                            onCheckedChange={(checked) => setNewUser({
                                                                ...newUser,
                                                                permissions: { ...newUser.permissions, [perm.id]: checked }
                                                            })}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleInviteUser}>
                                <Mail className="w-4 h-4 mr-2" />
                                Enviar Convite
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="usuarios" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="usuarios">
                        <Users className="w-4 h-4 mr-2" />
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="perfis">
                        <Shield className="w-4 h-4 mr-2" />
                        Perfis de Acesso
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Usuários */}
                <TabsContent value="usuarios">
                    <Card>
                        <CardHeader>
                            <CardTitle>Usuários da Clínica</CardTitle>
                            <CardDescription>
                                {users.length} usuário(s) cadastrado(s)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Perfil</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Último Acesso</TableHead>
                                        <TableHead className="w-[100px]">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("font-normal", ROLES[user.role]?.color)}>
                                                    {ROLES[user.role]?.label || user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.status === 'active' ? (
                                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Ativo
                                                    </Badge>
                                                ) : user.status === 'pending' ? (
                                                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                                                        Pendente
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                                        <X className="w-3 h-3 mr-1" />
                                                        Inativo
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {user.last_login ? (
                                                    new Date(user.last_login).toLocaleDateString('pt-BR')
                                                ) : (
                                                    <span className="text-muted-foreground">Nunca</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleResetPasswordEmail(user.email)}>
                                                            <Mail className="w-4 h-4 mr-2" />
                                                            Enviar Link por Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => {
                                                            setResetPasswordUser(user)
                                                            setResetPassword('')
                                                            setShowResetPassword(false)
                                                        }}>
                                                            <KeyRound className="w-4 h-4 mr-2" />
                                                            Forçar Nova Senha
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleUserStatus(user.id, user.status !== 'active')}
                                                        >
                                                            {user.status === 'active' ? (
                                                                <>
                                                                    <X className="w-4 h-4 mr-2" />
                                                                    Desativar
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Check className="w-4 h-4 mr-2" />
                                                                    Ativar
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB: Perfis */}
                <TabsContent value="perfis">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(ROLES).map(([key, value]) => (
                            <Card key={key}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{value.label}</CardTitle>
                                        <Badge className={cn("font-normal", value.color)}>
                                            {key}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        {key === 'CLINIC_ADMIN' && (
                                            <>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Acesso total a tudo</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Gerenciar usuários</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Configurações</p>
                                            </>
                                        )}
                                        {key === 'DOCTOR' && (
                                            <>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Agenda própria</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Prontuários</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Teleconsulta</p>
                                            </>
                                        )}
                                        {key === 'RECEPTIONIST' && (
                                            <>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Agendamentos</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Check-in</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Cadastros básicos</p>
                                            </>
                                        )}
                                        {key === 'FINANCIAL' && (
                                            <>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Pagamentos</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Lançamentos</p>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Relatórios</p>
                                            </>
                                        )}
                                        {key === 'READONLY' && (
                                            <>
                                                <p className="flex items-center gap-2"><Check className="w-4 h-4 text-green-600" /> Apenas visualização</p>
                                                <p className="flex items-center gap-2"><X className="w-4 h-4 text-red-500" /> Sem edição</p>
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Editar Acessos do Usuário</DialogTitle>
                        <DialogDescription>
                            Altere o nome e o perfil (cargo) para determinar os níveis de acesso deste usuário.
                        </DialogDescription>
                    </DialogHeader>

                    {editingUser && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email (Fixo)</Label>
                                <Input
                                    value={editingUser.email}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Perfil de Acesso</Label>
                                <Select
                                    value={editingUser.role}
                                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value as User['role'] })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(ROLES).map(([key, value]) => (
                                            <SelectItem key={key} value={key}>
                                                {value.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleUpdateUser}>
                            <Check className="w-4 h-4 mr-2" />
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Forçar Redefinição de Senha */}
            <Dialog open={!!resetPasswordUser} onOpenChange={(open) => {
                if (!open) {
                    setResetPasswordUser(null)
                    setResetPassword('')
                    setShowResetPassword(false)
                }
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-orange-500" />
                            Forçar Nova Senha
                        </DialogTitle>
                        <DialogDescription>
                            Defina uma nova senha para <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.email}).
                            O usuário poderá acessar imediatamente com a nova senha.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        type={showResetPassword ? 'text' : 'password'}
                                        value={resetPassword}
                                        onChange={(e) => setResetPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full"
                                        onClick={() => setShowResetPassword(!showResetPassword)}
                                    >
                                        {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={generateResetPassword}
                                    title="Gerar Senha Aleatória"
                                >
                                    <Dices className="w-4 h-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={copyResetPassword}
                                    disabled={!resetPassword}
                                    title="Copiar Senha"
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                A senha será aplicada imediatamente. Copie e envie ao usuário por um canal seguro.
                            </p>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <span>Esta ação é registrada no log de auditoria. O usuário será deslogado de todas as sessões ativas.</span>
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setResetPasswordUser(null)
                            setResetPassword('')
                            setShowResetPassword(false)
                        }}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleForceResetPassword}
                            disabled={resettingPassword || !resetPassword || resetPassword.length < 6}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {resettingPassword ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Key className="w-4 h-4 mr-2" />
                            )}
                            Redefinir Senha
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
