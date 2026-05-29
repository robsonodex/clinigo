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
    Camera,
    Upload,
    ShieldCheck,
    TrendingUp,
    ChevronRight,
    Sparkles,
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
    insurance_holder_name: z.string().optional(),
    insurance_holder_cpf: z.string().optional(),
    address: z.string().optional(),
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
            const data = await response.json()
            return data.patients || []
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
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/80 dark:border-indigo-900/30">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                            Pacientes
                        </h1>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                            Gerencie os pacientes de sua clínica
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-initial justify-center h-9 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all shadow-sm">
                        <Upload className="w-4 h-4 mr-2 text-slate-450" />
                        Importar
                    </Button>
                    <Button variant="outline" className="flex-1 sm:flex-initial justify-center h-9 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-all shadow-sm">
                        <Download className="w-4 h-4 mr-2 text-slate-450" />
                        Exportar
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} className="flex-1 sm:flex-initial justify-center h-9 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-md border-0">
                        <Plus className="w-4 h-4 mr-2" />
                        <span>Novo Paciente</span>
                    </Button>
                </div>
            </div>

            {/* Stats Dashboard - Premium Design */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Total de Pacientes</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mt-1" />
                            ) : (
                                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.total}</div>
                            )}
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-955/20 text-blue-500 rounded-xl">
                            <User className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Novos este mês</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mt-1" />
                            ) : (
                                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-550 mt-1 tracking-tight">{stats.thisMonth}</div>
                            )}
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-xl">
                            <UserPlus className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Consultas Agendadas</p>
                            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">-</div>
                        </div>
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Taxa de retorno</p>
                            <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">-</div>
                        </div>
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-955/20 text-amber-500 rounded-xl">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Box - Premium Rounded Design */}
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <Input
                        placeholder="Buscar paciente por nome, CPF ou telefone..."
                        className="pl-11 pr-4 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Patients Grid / Table */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden bg-white dark:bg-slate-900/40">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : patients && patients.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                                    <TableRow className="hover:bg-transparent border-none">
                                        <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paciente</TableHead>
                                        <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CPF</TableHead>
                                        <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Contato</TableHead>
                                        <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cadastro</TableHead>
                                        <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100/60 dark:divide-slate-850/60">
                                    {patients.map((patient) => {
                                        // Generate initials
                                        const initials = patient.full_name
                                            ? patient.full_name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                                            : 'PA'
                                        
                                        // Dynamic pastel gradient base on name hash
                                        const colors = [
                                            'from-blue-400 to-indigo-500',
                                            'from-teal-400 to-emerald-500',
                                            'from-purple-400 to-violet-500',
                                            'from-amber-400 to-orange-500',
                                            'from-sky-400 to-blue-500'
                                        ]
                                        const colorIndex = patient.full_name ? patient.full_name.charCodeAt(0) % colors.length : 0
                                        const gradColor = colors[colorIndex]

                                        return (
                                            <TableRow key={patient.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200">
                                                <TableCell className="py-3 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradColor} flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                                                            {initials}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors">
                                                                {patient.full_name}
                                                            </p>
                                                            {patient.gender && (
                                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none mt-0.5">
                                                                    {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-6">
                                                    <code className="text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400 font-mono tracking-tight">
                                                        {patient.cpf ? formatCPF(patient.cpf) : '—'}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="py-3 px-6">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-350 font-medium">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            {formatPhone(patient.phone)}
                                                        </div>
                                                        {patient.email && (
                                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                                                                <Mail className="w-3 h-3 text-slate-400/80" />
                                                                {patient.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {formatDate(patient.created_at)}
                                                </TableCell>
                                                <TableCell className="py-3 px-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850">
                                                                <MoreHorizontal className="w-4 h-4 text-slate-450" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="rounded-xl p-1.5 shadow-md border-slate-100 dark:border-slate-855 min-w-[160px]">
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)} className="rounded-lg py-1.5">
                                                                <Eye className="w-4 h-4 mr-2 text-slate-450" />
                                                                Ver detalhes
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.push(`/dashboard/prontuarios?search=${encodeURIComponent(patient.full_name)}`)} className="rounded-lg py-1.5">
                                                                <FileText className="w-4 h-4 mr-2 text-slate-450" />
                                                                Prontuários
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem className="rounded-lg py-1.5">
                                                                <History className="w-4 h-4 mr-2 text-slate-450" />
                                                                Histórico
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-850" />
                                                            <DropdownMenuItem
                                                                onClick={() => openWhatsApp(patient.phone, patient.full_name)}
                                                                className="rounded-lg py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                                            >
                                                                <MessageCircle className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-450" />
                                                                WhatsApp
                                                            </DropdownMenuItem>
                                                            {patient.email && (
                                                                <DropdownMenuItem
                                                                    onClick={() => window.open(`mailto:${patient.email}`)}
                                                                    className="rounded-lg py-1.5"
                                                                >
                                                                    <Mail className="w-4 h-4 mr-2 text-slate-455" />
                                                                    Enviar email
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-850" />
                                                            <DropdownMenuItem
                                                                className="text-rose-600 dark:text-rose-450 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg py-1.5"
                                                                onClick={() => {
                                                                    setSelectedPatient(patient)
                                                                    setShowDeleteDialog(true)
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2 text-rose-550" />
                                                                Excluir (LGPD)
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        /* Empty State */
                        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/40">
                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Nenhum paciente cadastrado</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 max-w-sm mx-auto">
                                Cadastre pacientes para começar a gerenciar consultas e prontuários médicos.
                            </p>
                            <Button onClick={() => setShowCreateModal(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Cadastrar Paciente
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LGPD Security Banner - Extremely Sophisticated Shield Design */}
            <div className="bg-slate-50/60 dark:bg-slate-900/30 border border-slate-150/40 dark:border-slate-850/60 rounded-2xl p-4.5 shadow-sm flex gap-3.5">
                <div className="p-2 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl h-fit border border-indigo-100/50 dark:border-indigo-900/20">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-250 flex items-center gap-1.5 uppercase tracking-wide">
                        Conformidade LGPD
                        <span className="text-[9px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100/30 px-1.5 py-0.5 rounded-full font-bold">Ativa</span>
                    </h4>
                    <p className="text-xs text-slate-450 dark:text-slate-450 mt-1 leading-relaxed font-medium">
                        Os dados pessoais dos pacientes são protegidos em conformidade com a Lei Geral de Proteção de Dados (LGPD). 
                        A exclusão de pacientes realiza uma anonimização estrutural dos dados (soft delete), 
                        preservando a integridade histórica de consultas e faturamento exclusivamente para fins de auditoria médica e legal.
                    </p>
                </div>
            </div>

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

                            <div className="space-y-2">
                                <Label htmlFor="address">Endereço (opcional)</Label>
                                <Input
                                    id="address"
                                    placeholder="Rua, Número, Complemento, Bairro - Cidade/UF"
                                    {...form.register('address')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="insurance_holder_name">Nome do Titular do Plano</Label>
                                    <Input
                                        id="insurance_holder_name"
                                        placeholder="Nome do titular"
                                        {...form.register('insurance_holder_name')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="insurance_holder_cpf">CPF do Titular</Label>
                                    <Input
                                        id="insurance_holder_cpf"
                                        placeholder="000.000.000-00"
                                        {...form.register('insurance_holder_cpf')}
                                    />
                                </div>
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
