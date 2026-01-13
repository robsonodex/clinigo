'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { formatDate, formatCPF, formatPhone } from '@/lib/utils'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
    UserPlus,
    Search,
    Phone,
    Mail,
    MoreHorizontal,
    FileText,
    MessageCircle,
    History,
    User,
    Download,
    Trash2,
    Eye,
    AlertTriangle,
    Loader2,
    Plus,
    Calendar,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useRouter } from 'next/navigation'

// Validation schema
const PatientFormSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['M', 'F', 'O']).optional(),
})

type PatientFormData = z.infer<typeof PatientFormSchema>

interface Patient {
    id: string
    cpf: string
    full_name: string
    email: string
    phone: string
    date_of_birth?: string
    gender?: string
    created_at: string
}

export default function PacientesPage() {
    const { toast } = useToast()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Form
    const form = useForm<PatientFormData>({
        resolver: zodResolver(PatientFormSchema),
        defaultValues: {
            full_name: '',
            cpf: '',
            email: '',
            phone: '',
            date_of_birth: '',
        },
    })

    // Fetch patients from real API
    const { data: patients, isLoading } = useQuery<Patient[]>({
        queryKey: ['patients', search],
        queryFn: async () => {
            const response = await fetch(`/api/patients?search=${encodeURIComponent(search)}`)
            if (!response.ok) {
                if (response.status === 404) return []
                throw new Error('Failed to fetch patients')
            }
            return response.json()
        },
    })

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: PatientFormData) => {
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao criar paciente')
            }
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            toast({
                title: 'Paciente cadastrado!',
                description: 'O paciente foi cadastrado com sucesso.',
            })
            setShowCreateModal(false)
            form.reset()
        },
        onError: (error) => {
            toast({
                title: 'Erro ao cadastrar',
                description: error.message,
                variant: 'destructive',
            })
        },
    })

    // Delete mutation (LGPD - soft delete)
    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete patient')
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            toast({
                title: 'Paciente removido',
                description: 'Os dados foram anonimizados conforme LGPD.',
            })
            setShowDeleteDialog(false)
            setSelectedPatient(null)
        },
        onError: () => {
            toast({
                title: 'Erro',
                description: 'Não foi possível remover o paciente.',
                variant: 'destructive',
            })
        },
    })

    // Submit handler
    const onSubmit = (data: PatientFormData) => {
        createMutation.mutate(data)
    }

    // Open WhatsApp
    const openWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = `Olá ${name.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // Calculate stats from real data
    const stats = {
        total: patients?.length || 0,
        thisMonth: patients?.filter(p => {
            const created = new Date(p.created_at)
            const now = new Date()
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        }).length || 0,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UserPlus className="w-7 h-7" />
                        Pacientes
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie os pacientes da sua clínica
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Paciente
                    </Button>
                </div>
            </div>

            {/* Stats - Real data */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold">{stats.total}</div>
                        )}
                        <p className="text-sm text-muted-foreground">Total de pacientes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? (
                            <Skeleton className="h-8 w-16" />
                        ) : (
                            <div className="text-2xl font-bold text-green-600">{stats.thisMonth}</div>
                        )}
                        <p className="text-sm text-muted-foreground">Novos este mês</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-sm text-muted-foreground">Consultas agendadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-sm text-muted-foreground">Taxa de retorno</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, CPF ou telefone..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full" />
                            ))}
                        </div>
                    ) : patients && patients.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.map((patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{patient.full_name}</p>
                                                    {patient.gender && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-sm">{patient.cpf ? formatCPF(patient.cpf) : '-'}</code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="w-3 h-3" />
                                                    {formatPhone(patient.phone)}
                                                </div>
                                                {patient.email && (
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <Mail className="w-3 h-3" />
                                                        {patient.email}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(patient.created_at)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedPatient(patient)
                                                        setShowDetailsDialog(true)
                                                    }}>
                                                        <Eye className="w-4 h-4 mr-2" />
                                                        Ver detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/prontuarios?search=${encodeURIComponent(patient.full_name)}`)}>
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Prontuários
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <History className="w-4 h-4 mr-2" />
                                                        Histórico
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => openWhatsApp(patient.phone, patient.full_name)}
                                                    >
                                                        <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                                                        WhatsApp
                                                    </DropdownMenuItem>
                                                    {patient.email && (
                                                        <DropdownMenuItem
                                                            onClick={() => window.open(`mailto:${patient.email}`)}
                                                        >
                                                            <Mail className="w-4 h-4 mr-2" />
                                                            Enviar email
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            setSelectedPatient(patient)
                                                            setShowDeleteDialog(true)
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Excluir (LGPD)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        /* Empty State */
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                <User className="w-10 h-10 text-primary" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhum paciente cadastrado</h3>
                            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                                Cadastre seu primeiro paciente para começar a gerenciar consultas e prontuários.
                            </p>
                            <Button onClick={() => setShowCreateModal(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Cadastrar Primeiro Paciente
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LGPD Info */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-amber-900">Conformidade LGPD</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                Os dados dos pacientes são protegidos conforme a Lei Geral de Proteção de Dados.
                                A exclusão de pacientes realiza um <strong>soft delete</strong> que anonimiza os dados
                                mas preserva o histórico de consultas para fins de auditoria médica.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create Patient Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5" />
                            Novo Paciente
                        </DialogTitle>
                        <DialogDescription>
                            Preencha os dados do paciente para cadastrá-lo no sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo *</Label>
                                <Input
                                    id="full_name"
                                    placeholder="Ex: João da Silva"
                                    {...form.register('full_name')}
                                />
                                {form.formState.errors.full_name && (
                                    <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input
                                        id="cpf"
                                        placeholder="000.000.000-00"
                                        {...form.register('cpf')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Sexo</Label>
                                    <Select onValueChange={(value) => form.setValue('gender', value as 'M' | 'F' | 'O')}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Masculino</SelectItem>
                                            <SelectItem value="F">Feminino</SelectItem>
                                            <SelectItem value="O">Outro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone *</Label>
                                <Input
                                    id="phone"
                                    placeholder="(11) 99999-9999"
                                    {...form.register('phone')}
                                />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">E-mail</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="paciente@email.com"
                                    {...form.register('email')}
                                />
                                {form.formState.errors.email && (
                                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                                <Input
                                    id="date_of_birth"
                                    type="date"
                                    {...form.register('date_of_birth')}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Cadastrar
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Detalhes do Paciente</DialogTitle>
                    </DialogHeader>
                    {selectedPatient && (
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{selectedPatient.full_name}</h3>
                                    <p className="text-sm text-muted-foreground">Paciente desde {formatDate(selectedPatient.created_at)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                    <Label className="text-muted-foreground">CPF</Label>
                                    <p className="font-medium">{selectedPatient.cpf ? formatCPF(selectedPatient.cpf) : '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Gênero</Label>
                                    <p className="font-medium">
                                        {selectedPatient.gender === 'M' ? 'Masculino' : selectedPatient.gender === 'F' ? 'Feminino' : 'Outro'}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Telefone</Label>
                                    <p className="font-medium">{formatPhone(selectedPatient.phone)}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">{selectedPatient.email || '-'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Data de Nascimento</Label>
                                    <p className="font-medium">{selectedPatient.date_of_birth || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Paciente (LGPD)</DialogTitle>
                        <DialogDescription>
                            Esta ação irá anonimizar os dados do paciente conforme a LGPD.
                            O histórico de consultas será mantido, mas os dados pessoais serão removidos.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPatient && (
                        <div className="py-4">
                            <div className="p-4 bg-red-50 rounded-lg">
                                <p className="font-medium text-red-900">{selectedPatient.full_name}</p>
                                <p className="text-sm text-red-700">{selectedPatient.email || selectedPatient.phone}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedPatient && deleteMutation.mutate(selectedPatient.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Dados'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
