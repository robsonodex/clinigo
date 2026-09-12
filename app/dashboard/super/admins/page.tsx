'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Trash2, Shield, Loader2, UserPlus, RefreshCw, ArrowLeft, Search, KeyRound, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Admin {
    id: string
    email: string
    full_name: string
    created_at: string
    is_active: boolean
}

export default function AdminsPage() {
    const [admins, setAdmins] = useState<Admin[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Estados para formulário de cadastro de novo admin
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        password: '',
    })

    // Estados para modal de alteração de senha
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<Admin | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

    const fetchAdmins = async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/super-admin/admins')
            if (!res.ok) {
                throw new Error('Falha na resposta do servidor')
            }
            const data = await res.json()
            if (data?.success && Array.isArray(data.admins)) {
                setAdmins(data.admins)
            } else if (Array.isArray(data?.data)) {
                setAdmins(data.data)
            } else {
                setAdmins([])
            }
        } catch (error) {
            console.error('[AdminsPage] Erro ao carregar administradores:', error)
            toast.error('Erro ao carregar administradores')
            setAdmins([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAdmins()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const res = await fetch('/api/super-admin/admins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao criar administrador')
            }

            toast.success(data.message || 'Administrador cadastrado com sucesso')
            setFormData({ email: '', full_name: '', password: '' })
            setIsDialogOpen(false)
            fetchAdmins()

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao criar administrador')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (adminId: string) => {
        try {
            const res = await fetch(`/api/super-admin/admins?id=${adminId}`, {
                method: 'DELETE',
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao remover administrador')
            }

            toast.success('Administrador removido com sucesso')
            fetchAdmins()

        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao remover administrador')
        }
    }

    const handleOpenPasswordDialog = (admin: Admin) => {
        setSelectedAdminForPassword(admin)
        setNewPassword('')
        setConfirmPassword('')
        setShowPassword(false)
        setIsPasswordDialogOpen(true)
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedAdminForPassword) return

        if (newPassword.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('As senhas digitadas não coincidem')
            return
        }

        setIsUpdatingPassword(true)

        try {
            const res = await fetch('/api/super-admin/admins', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminId: selectedAdminForPassword.id,
                    password: newPassword,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Erro ao alterar senha')
            }

            toast.success(`Senha de ${selectedAdminForPassword.email} alterada com sucesso`)
            setIsPasswordDialogOpen(false)
            setNewPassword('')
            setConfirmPassword('')
            setSelectedAdminForPassword(null)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao alterar senha')
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    const filteredAdmins = (admins || []).filter((admin) => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return true
        return (
            (admin?.full_name || '').toLowerCase().includes(query) ||
            (admin?.email || '').toLowerCase().includes(query)
        )
    })

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Top Navigation & Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/super">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[44px] px-3 gap-1.5 text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="text-xs font-medium">Voltar ao Painel Master</span>
                            </Button>
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-6 w-6 text-slate-800" />
                        Super Administradores
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie os administradores com privilégio total de plataforma
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={fetchAdmins}
                        disabled={loading}
                        className="min-h-[44px] gap-2 text-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="min-h-[44px] gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm shadow-sm">
                                <UserPlus className="h-4 w-4" />
                                Novo Admin
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Cadastrar Super Administrador</DialogTitle>
                                <DialogDescription>
                                    Este usuário terá acesso irrestrito a todas as clínicas e dados da plataforma.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name">Nome Completo</Label>
                                    <Input
                                        id="full_name"
                                        placeholder="Nome do administrador"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        required
                                        className="min-h-[44px] text-base sm:text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">E-mail Corporativo</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@clinigo.app"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="min-h-[44px] text-base sm:text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Senha de Acesso</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
                                        className="min-h-[44px] text-base sm:text-sm"
                                    />
                                </div>

                                <div className="flex gap-2.5 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        className="flex-1 min-h-[44px]"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Salvando...
                                            </>
                                        ) : (
                                            'Cadastrar'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter / Search Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Buscar administrador por nome ou e-mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 min-h-[44px] text-base sm:text-sm bg-white"
                    />
                </div>
            </div>

            {/* Main Table Card */}
            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
                    <CardTitle className="text-lg font-semibold text-slate-900">
                        Administradores Ativos
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        {filteredAdmins.length} de {(admins || []).length} administrador(es) cadastrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                            <span className="text-sm text-muted-foreground">Carregando administradores...</span>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="font-semibold text-slate-700">Nome</TableHead>
                                        <TableHead className="font-semibold text-slate-700">E-mail</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Cadastrado em</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Status</TableHead>
                                        <TableHead className="w-[120px] text-right font-semibold text-slate-700">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAdmins.map((admin) => (
                                        <TableRow key={admin.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="font-medium text-slate-900">
                                                {admin.full_name || 'Sem nome informado'}
                                            </TableCell>
                                            <TableCell className="text-slate-600 font-mono text-xs">
                                                {admin.email}
                                            </TableCell>
                                            <TableCell className="text-slate-600 text-xs">
                                                {admin.created_at ? new Date(admin.created_at).toLocaleDateString('pt-BR') : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${admin.is_active !== false
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    }`}>
                                                    {admin.is_active !== false ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenPasswordDialog(admin)}
                                                        className="min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                                        title="Alterar Senha"
                                                        aria-label="Alterar senha do administrador"
                                                    >
                                                        <KeyRound className="h-4 w-4" />
                                                    </Button>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="min-h-[44px] min-w-[44px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                                title="Remover Administrador"
                                                                aria-label="Remover administrador"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Remover Administrador?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação é irreversível. O usuário <strong>{admin.email}</strong> terá seu acesso totalmente revogado da plataforma.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="min-h-[44px]">Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleDelete(admin.id)}
                                                                    className="min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white"
                                                                >
                                                                    Confirmar Remoção
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                    {filteredAdmins.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                                                {searchQuery ? 'Nenhum administrador encontrado para os termos da busca.' : 'Nenhum administrador cadastrado.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Alteração de Senha */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5 text-slate-700" />
                            Alterar Senha do Administrador
                        </DialogTitle>
                        <DialogDescription>
                            Defina uma nova credencial de acesso para <strong>{selectedAdminForPassword?.email}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="new_password">Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="new_password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="min-h-[44px] pr-10 text-base sm:text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                            <Input
                                id="confirm_password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Repita a nova senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="min-h-[44px] text-base sm:text-sm"
                            />
                        </div>

                        <div className="flex gap-2.5 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPasswordDialogOpen(false)}
                                className="flex-1 min-h-[44px]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUpdatingPassword}
                                className="flex-1 min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                {isUpdatingPassword ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Senha'
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
