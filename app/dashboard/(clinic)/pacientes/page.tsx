'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { formatDate, formatCPF, formatPhone, cn } from '@/lib/utils'
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
    Shield,
    ShieldCheck,
    TrendingUp,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Cake,
    LayoutGrid,
    List,
    X,
    Filter,
    ExternalLink,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Validation schema
const PatientFormSchema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    cpf: z.string().optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
    date_of_birth: z.string().optional(),
    gender: z.enum(['M', 'F', 'O']).optional(),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_complement: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
    address_zip_code: z.string().optional(),
    insurance_holder_name: z.string().optional(),
    insurance_holder_cpf: z.string().optional(),
    address: z.string().optional(),
    billing_type: z.enum(['particular', 'convenio']).default('particular'),
    health_insurance_id: z.string().optional(),
    insurance_card_number: z.string().optional(),
    insurance_validity: z.string().optional(),
    insurance_plan_name: z.string().optional(),
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
    billing_type?: 'particular' | 'convenio'
    health_insurance_id?: string
    insurance_card_number?: string
    insurance_validity?: string
    insurance_plan_name?: string
    health_insurances?: {
        id: string
        name: string
        code?: string
    }
}

export default function PacientesPage() {
    const { toast } = useToast()
    const router = useRouter()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [billingFilter, setBillingFilter] = useState<'ALL' | 'particular' | 'convenio'>('ALL')
    const [selectedLetter, setSelectedLetter] = useState<string>('ALL')
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
    const [pageSize, setPageSize] = useState<number>(25)
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [isHolder, setIsHolder] = useState(true)
    const [showQuickInsuranceModal, setShowQuickInsuranceModal] = useState(false)
    const [quickInsuranceName, setQuickInsuranceName] = useState('')
    const [quickInsuranceCode, setQuickInsuranceCode] = useState('')
    const [isCreatingInsurance, setIsCreatingInsurance] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isLoadingCep, setIsLoadingCep] = useState(false)

    // Reset pagination when search, letter or filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedLetter, billingFilter, search, pageSize])

    // Buscar lista de convênios credenciados ativos da clínica
    const { data: insurances = [] } = useQuery<any[]>({
        queryKey: ['health-insurances-active'],
        queryFn: async () => {
            try {
                const res = await fetch('/api/health-insurances?status=ACTIVE&pageSize=100')
                if (!res.ok) return []
                const json = await res.json()
                return json.data || []
            } catch (err) {
                console.error('Erro ao buscar operadoras ativas:', err)
                return []
            }
        }
    })

    // Form
    const form = useForm<PatientFormData>({
        resolver: zodResolver(PatientFormSchema),
        defaultValues: {
            full_name: '',
            cpf: '',
            email: '',
            phone: '',
            date_of_birth: '',
            gender: 'M',
            address_street: '',
            address_number: '',
            address_complement: '',
            address_neighborhood: '',
            address_city: '',
            address_state: '',
            address_zip_code: '',
            insurance_holder_name: '',
            insurance_holder_cpf: '',
            billing_type: 'particular',
            health_insurance_id: '',
            insurance_card_number: '',
            insurance_validity: '',
            insurance_plan_name: '',
        },
    })

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '')
        if (cep.length !== 8) return

        setIsLoadingCep(true)
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            if (res.ok) {
                const data = await res.json()
                if (!data.erro) {
                    if (data.logradouro) form.setValue('address_street', data.logradouro)
                    if (data.bairro) form.setValue('address_neighborhood', data.bairro)
                    if (data.localidade) form.setValue('address_city', data.localidade)
                    if (data.uf) form.setValue('address_state', data.uf)
                    toast({
                        title: 'Endereço encontrado!',
                        description: `${data.logradouro || ''}, ${data.bairro || ''} - ${data.localidade}/${data.uf}`,
                    })
                }
            }
        } catch (err) {
            console.error('Erro ao consultar CEP:', err)
        } finally {
            setIsLoadingCep(false)
        }
    }

    // Fetch patients from real API (limit 1000 to retrieve full patient roster)
    const { data: patients, isLoading } = useQuery<Patient[]>({
        queryKey: ['patients', search],
        queryFn: async () => {
            const response = await fetch(`/api/patients?search=${encodeURIComponent(search)}&limit=1000`)
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

    // Delete mutation (LGPD - soft delete ou exclusão)
    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'DELETE',
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || 'Não foi possível remover o paciente.')
            }
            return response.json()
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            toast({
                title: 'Paciente removido',
                description: data?.message || 'O paciente foi removido com sucesso.',
            })
            setShowDeleteDialog(false)
            setSelectedPatient(null)
        },
        onError: (error: any) => {
            toast({
                title: 'Erro',
                description: error?.message || 'Não foi possível remover o paciente.',
                variant: 'destructive',
            })
        },
    })

    // Submit handler
    const onSubmit = (data: PatientFormData) => {
        createMutation.mutate(data)
    }

    // Quick add health insurance from inside patient modal
    const handleQuickCreateInsurance = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickInsuranceName.trim()) return
        setIsCreatingInsurance(true)
        try {
            const res = await fetch('/api/health-insurances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: quickInsuranceName.trim(),
                    code: quickInsuranceCode.trim() || undefined,
                    status: 'ACTIVE'
                })
            })
            const result = await res.json()
            if (!res.ok) {
                throw new Error(result.error || 'Erro ao cadastrar convênio')
            }
            toast({
                title: 'Convênio cadastrado!',
                description: `O convênio ${result.data?.name || quickInsuranceName} foi adicionado com sucesso.`,
            })
            await queryClient.invalidateQueries({ queryKey: ['health-insurances-active'] })
            if (result.data?.id) {
                form.setValue('health_insurance_id', result.data.id)
            }
            setShowQuickInsuranceModal(false)
            setQuickInsuranceName('')
            setQuickInsuranceCode('')
        } catch (err: any) {
            toast({
                title: 'Erro ao cadastrar convênio',
                description: err.message,
                variant: 'destructive',
            })
        } finally {
            setIsCreatingInsurance(false)
        }
    }

    // Open WhatsApp
    const openWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = `Olá ${name.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    // Normalização e sanitização de caracteres oriundos de encodings antigos do banco
    const cleanPatientName = (name?: string) => {
        return (name || '')
            .replace(/Joo/g, 'João')
            .replace(/Andr/g, 'André')
            .replace(/Antnio/g, 'Antônio')
            .replace(/Clavi\?o/g, 'Clavião')
            .replace(/Clavio/g, 'Clavião')
            .replace(/S\?o/g, 'São')
            .replace(/\uFFFD/g, 'a')
            .replace(/\?/g, 'ã')
    }

    // Alfabeto completo para o Diretório A-Z
    const ALPHABET = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), [])

    // Contagem em tempo real de pacientes por letra inicial
    const letterCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        if (!patients) return counts

        patients.forEach(p => {
            const name = cleanPatientName(p.full_name).trim().toUpperCase()
            const firstLetter = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0]
            if (firstLetter && firstLetter >= 'A' && firstLetter <= 'Z') {
                counts[firstLetter] = (counts[firstLetter] || 0) + 1
            }
        })
        return counts
    }, [patients])

    // Filtro composto: billingFilter + selectedLetter
    const filteredPatients = useMemo(() => {
        if (!patients) return []
        return patients.filter(patient => {
            // Filtro por tipo de faturamento
            if (billingFilter === 'convenio' && patient.billing_type !== 'convenio') return false
            if (billingFilter === 'particular' && patient.billing_type === 'convenio') return false

            // Filtro por letra inicial
            if (selectedLetter !== 'ALL') {
                const name = cleanPatientName(patient.full_name).trim().toUpperCase()
                const firstLetter = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')[0]
                if (firstLetter !== selectedLetter) return false
            }

            return true
        })
    }, [patients, billingFilter, selectedLetter])

    // Paginação
    const totalFiltered = filteredPatients.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const safeCurrentPage = Math.min(currentPage, totalPages)

    const paginatedPatients = useMemo(() => {
        const start = (safeCurrentPage - 1) * pageSize
        return filteredPatients.slice(start, start + pageSize)
    }, [filteredPatients, safeCurrentPage, pageSize])

    // Estatísticas reais calculadas sobre os dados
    const stats = useMemo(() => {
        const total = patients?.length || 0
        const now = new Date()
        const thisMonth = patients?.filter(p => {
            const created = new Date(p.created_at)
            return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        }).length || 0
        const particular = patients?.filter(p => p.billing_type !== 'convenio').length || 0
        const convenio = patients?.filter(p => p.billing_type === 'convenio').length || 0
        return { total, thisMonth, particular, convenio }
    }, [patients])

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Corporativo Enterprise */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <UserPlus className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                        <h1 className="text-xl font-semibold text-foreground tracking-tight">
                            Pacientes
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Gerencie os pacientes de sua clínica
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="h-8 rounded-xs border-border text-foreground px-3 text-xs font-medium shadow-none">
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        Importar
                    </Button>
                    <Button variant="outline" className="h-8 rounded-xs border-border text-foreground px-3 text-xs font-medium shadow-none">
                        <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        Exportar
                    </Button>
                    <Button onClick={() => setShowCreateModal(true)} className="h-8 rounded-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white px-3 text-xs font-medium shadow-none border-0">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
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
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Particular</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mt-1" />
                            ) : (
                                <div className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1 tracking-tight">{stats.particular}</div>
                            )}
                        </div>
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 rounded-xl">
                            <User className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900/40">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">Convênios</p>
                            {isLoading ? (
                                <Skeleton className="h-8 w-16 mt-1" />
                            ) : (
                                <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tracking-tight">{stats.convenio}</div>
                            )}
                        </div>
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl">
                            <Shield className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Box - Premium Rounded Design */}
            {/* Search Box & Filters - Premium Responsive Design */}
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <Input
                        placeholder="Buscar paciente por nome, CPF ou telefone..."
                        className="pl-11 pr-10 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
                            title="Limpar busca"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filter by billing type (Todos / Particular / Convênio) */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl shrink-0 self-start md:self-auto overflow-x-auto max-w-full">
                    <button
                        type="button"
                        onClick={() => setBillingFilter('ALL')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5",
                            billingFilter === 'ALL'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingFilter('particular')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5",
                            billingFilter === 'particular'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Particular
                    </button>
                    <button
                        type="button"
                        onClick={() => setBillingFilter('convenio')}
                        className={cn(
                            "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all min-h-[36px] flex items-center gap-1.5",
                            billingFilter === 'convenio'
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Shield className="w-3.5 h-3.5" />
                        Convênio
                    </button>
                </div>
            </div>

            {/* Diretório Alfabético A-Z Inteligente */}
            <div className="bg-white dark:bg-slate-900/40 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-thin">
                <button
                    type="button"
                    onClick={() => setSelectedLetter('ALL')}
                    className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 min-h-[36px]",
                        selectedLetter === 'ALL'
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                >
                    Todos ({patients?.length || 0})
                </button>
                <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
                {ALPHABET.map((letter) => {
                    const count = letterCounts[letter] || 0
                    const isSelected = selectedLetter === letter
                    const hasPatients = count > 0

                    return (
                        <button
                            key={letter}
                            type="button"
                            disabled={!hasPatients}
                            onClick={() => setSelectedLetter(isSelected ? 'ALL' : letter)}
                            className={cn(
                                "min-w-[34px] h-[34px] px-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center justify-center gap-0.5 relative",
                                isSelected
                                    ? "bg-emerald-600 text-white shadow-xs font-bold"
                                    : hasPatients
                                    ? "text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600"
                                    : "text-slate-300 dark:text-slate-700 opacity-40 cursor-not-allowed"
                            )}
                            title={hasPatients ? `${count} paciente(s) com a letra ${letter}` : `Nenhum paciente com ${letter}`}
                        >
                            <span>{letter}</span>
                            {hasPatients && (
                                <span className={cn(
                                    "text-[9px] px-1 py-0.2 rounded-full leading-none font-bold",
                                    isSelected ? "bg-emerald-700 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Barra de Controle de Visualização e Resumo */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                        Exibindo <strong className="text-slate-900 dark:text-white">{filteredPatients.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}–{Math.min(safeCurrentPage * pageSize, filteredPatients.length)}</strong> de <strong className="text-slate-900 dark:text-white">{filteredPatients.length}</strong> pacientes encontrados
                        {selectedLetter !== 'ALL' && (
                            <span className="ml-2 inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                                Letra &quot;{selectedLetter}&quot;
                                <button type="button" onClick={() => setSelectedLetter('ALL')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
                            </span>
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Toggle Tabela vs Cards */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all min-h-[32px]",
                                viewMode === 'table'
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                            title="Modo Tabela Compacta"
                        >
                            <List className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tabela</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={cn(
                                "px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all min-h-[32px]",
                                viewMode === 'cards'
                                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            )}
                            title="Modo Cartões Visuais"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Cartões</span>
                        </button>
                    </div>

                    {/* Itens por página */}
                    <div className="flex items-center gap-1.5">
                        <span className="hidden sm:inline text-slate-400">Por pág:</span>
                        <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                            <SelectTrigger className="h-8 w-[76px] text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                                <SelectItem value="1000">Todos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Patients Grid / Table */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs overflow-hidden bg-card">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-xl" />
                            ))}
                        </div>
                    ) : filteredPatients && filteredPatients.length > 0 ? (
                        viewMode === 'cards' ? (
                            /* Modo Cartões Visuais (Organizado sem rolagem infinita) */
                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                                {paginatedPatients.map((patient) => {
                                    const cleanName = cleanPatientName(patient.full_name)
                                    const initials = cleanName
                                        ? cleanName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                                        : 'PA'
                                    
                                    const isBirthdayToday = (() => {
                                        if (!patient.date_of_birth) return false
                                        const parts = patient.date_of_birth.split('-')
                                        if (parts.length < 3) return false
                                        const birthMonth = parseInt(parts[1], 10)
                                        const birthDay = parseInt(parts[2], 10)
                                        const today = new Date()
                                        return birthDay === today.getDate() && birthMonth === (today.getMonth() + 1)
                                    })()

                                    return (
                                        <div
                                            key={patient.id}
                                            className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 flex flex-col justify-between gap-3 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group relative"
                                        >
                                            {/* Header do Card */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 
                                                            onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
                                                            className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 cursor-pointer transition-colors" 
                                                            title={cleanName}
                                                        >
                                                            {cleanName}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            {patient.billing_type === 'convenio' ? (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.2 rounded">
                                                                    <Shield className="w-2.5 h-2.5" />
                                                                    {patient.health_insurances?.name || 'Convênio'}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                                                    Particular
                                                                </span>
                                                            )}
                                                            {isBirthdayToday && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-955/40 px-1.5 py-0.2 rounded" title="Aniversariante hoje">
                                                                    <Cake className="w-2.5 h-2.5" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0">
                                                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-xl p-1.5 shadow-md border-slate-100 dark:border-slate-855 min-w-[160px]">
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)} className="rounded-lg py-1.5">
                                                            <Eye className="w-4 h-4 mr-2 text-slate-450" />
                                                            Ver detalhes
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/pacientes/${patient.id}?tab=signatures`)} className="rounded-lg py-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                                            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
                                                            Contratos & Termos
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/prontuarios?search=${encodeURIComponent(patient.full_name)}`)} className="rounded-lg py-1.5">
                                                            <FileText className="w-4 h-4 mr-2 text-slate-450" />
                                                            Prontuários
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-850" />
                                                        <DropdownMenuItem
                                                            onClick={() => openWhatsApp(patient.phone, patient.full_name)}
                                                            className="rounded-lg py-1.5 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                                        >
                                                            <MessageCircle className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-450" />
                                                            WhatsApp
                                                        </DropdownMenuItem>
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
                                            </div>

                                            {/* Dados de Contato e CPF */}
                                            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-350 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="text-slate-400">CPF:</span>
                                                    <span className="font-mono text-slate-700 dark:text-slate-300">{patient.cpf ? formatCPF(patient.cpf) : '—'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 text-[11px]">Tel:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatPhone(patient.phone)}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => openWhatsApp(patient.phone, patient.full_name)}
                                                            className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                            title="Abrir no WhatsApp"
                                                        >
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer do Card com Ações Rápidas */}
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
                                                    className="flex-1 h-8 text-xs font-medium border-slate-200 dark:border-slate-800"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                    Ficha
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => router.push(`/dashboard/prontuarios?search=${encodeURIComponent(patient.full_name)}`)}
                                                    className="h-8 px-2.5 text-xs border-slate-200 dark:border-slate-800"
                                                    title="Abrir Prontuário"
                                                >
                                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            /* Modo Tabela */
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
                                        {paginatedPatients.map((patient) => {
                                            const cleanName = cleanPatientName(patient.full_name)
                                            const initials = cleanName
                                                ? cleanName.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase()
                                                : 'PA'

                                            return (
                                                <TableRow key={patient.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200">
                                                    <TableCell className="py-3 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div 
                                                                className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-medium"
                                                            >
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p 
                                                                        onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)}
                                                                        className="font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors cursor-pointer"
                                                                    >
                                                                        {cleanName}
                                                                    </p>
                                                                    {(() => {
                                                                        if (!patient.date_of_birth) return null
                                                                        const parts = patient.date_of_birth.split('-')
                                                                        if (parts.length < 3) return null
                                                                        const birthMonth = parseInt(parts[1], 10)
                                                                        const birthDay = parseInt(parts[2], 10)
                                                                        const today = new Date()
                                                                        if (birthDay === today.getDate() && birthMonth === (today.getMonth() + 1)) {
                                                                            return (
                                                                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-xs" title="Aniversariante hoje">
                                                                                    <Cake className="w-3 h-3" />
                                                                                    Aniversariante hoje
                                                                                </span>
                                                                            )
                                                                        }
                                                                        return null
                                                                    })()}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    {patient.gender && (
                                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-none">
                                                                            {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Feminino' : 'Outro'}
                                                                        </p>
                                                                    )}
                                                                    {patient.billing_type === 'convenio' ? (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 px-1.5 py-0.5 rounded-md">
                                                                            <Shield className="w-3 h-3 text-emerald-600" />
                                                                            {patient.health_insurances?.name || 'Convênio'}
                                                                            {patient.insurance_card_number && ` • ${patient.insurance_card_number}`}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 px-1.5 py-0.5 rounded-md">
                                                                            Particular
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xs border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850">
                                                                    <MoreHorizontal className="w-4 h-4 text-slate-450" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="rounded-xl p-1.5 shadow-md border-slate-100 dark:border-slate-855 min-w-[160px]">
                                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/pacientes/${patient.id}`)} className="rounded-lg py-1.5">
                                                                    <Eye className="w-4 h-4 mr-2 text-slate-450" />
                                                                    Ver detalhes
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => router.push(`/dashboard/pacientes/${patient.id}?tab=signatures`)} className="rounded-lg py-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                                                                    <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
                                                                    Contratos & Termos
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
                        )
                    ) : (
                        /* Empty State */
                        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900/40">
                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-850 flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">Nenhum paciente encontrado</h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5 max-w-sm mx-auto">
                                {selectedLetter !== 'ALL' || search || billingFilter !== 'ALL'
                                    ? 'Nenhum paciente corresponde aos filtros selecionados. Tente limpar os filtros ou selecionar outra letra.'
                                    : 'Cadastre pacientes para começar a gerenciar consultas e prontuários médicos.'}
                            </p>
                            {(selectedLetter !== 'ALL' || search || billingFilter !== 'ALL') ? (
                                <Button 
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedLetter('ALL')
                                        setSearch('')
                                        setBillingFilter('ALL')
                                    }} 
                                    className="h-9 font-semibold rounded-xl text-xs"
                                >
                                    Limpar todos os filtros
                                </Button>
                            ) : (
                                <Button onClick={() => setShowCreateModal(true)} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Cadastrar Paciente
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Barra de Paginação Inferior */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Página <strong className="text-slate-800 dark:text-slate-200">{safeCurrentPage}</strong> de <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({filteredPatients.length} pacientes)
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safeCurrentPage <= 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="h-8 px-3 text-xs min-w-[44px]"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            Anterior
                        </Button>
                        
                        {/* Páginas numéricas */}
                        <div className="hidden sm:flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(page => page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1)
                                .map((page, idx, arr) => {
                                    const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1
                                    return (
                                        <div key={page} className="flex items-center gap-1">
                                            {showEllipsisBefore && <span className="px-1 text-slate-400">...</span>}
                                            <button
                                                type="button"
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    "w-8 h-8 rounded-lg text-xs font-semibold transition-all",
                                                    safeCurrentPage === page
                                                        ? "bg-emerald-600 text-white shadow-xs"
                                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                {page}
                                            </button>
                                        </div>
                                    )
                                })
                            }
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={safeCurrentPage >= totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="h-8 px-3 text-xs min-w-[44px]"
                        >
                            Próximo
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

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
                <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" />
                            Novo Paciente
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Preencha os dados do paciente para cadastrá-lo no sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
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

                            {/* Endereço - Campos separados e estruturados (Rua, Número, Complemento, Bairro, Cidade, UF, CEP) */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold text-sm">Endereço</Label>
                                    {isLoadingCep && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Buscando CEP...
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_street" className="text-xs text-muted-foreground">Rua</Label>
                                        <Input id="address_street" placeholder="Nome da rua" {...form.register('address_street')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_number" className="text-xs text-muted-foreground">Número</Label>
                                        <Input id="address_number" placeholder="Nº" {...form.register('address_number')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <Label htmlFor="address_complement" className="text-xs text-muted-foreground">Complemento</Label>
                                        <Input id="address_complement" placeholder="Apto, Bloco..." {...form.register('address_complement')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_neighborhood" className="text-xs text-muted-foreground">Bairro</Label>
                                        <Input id="address_neighborhood" placeholder="Bairro" {...form.register('address_neighborhood')} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2 space-y-1">
                                        <Label htmlFor="address_city" className="text-xs text-muted-foreground">Cidade</Label>
                                        <Input id="address_city" placeholder="Cidade" {...form.register('address_city')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_state" className="text-xs text-muted-foreground">UF</Label>
                                        <Input id="address_state" placeholder="SP" maxLength={2} {...form.register('address_state')} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="address_zip_code" className="text-xs text-muted-foreground">CEP</Label>
                                        <Input
                                            id="address_zip_code"
                                            placeholder="00000-000"
                                            maxLength={9}
                                            {...form.register('address_zip_code')}
                                            onBlur={handleCepBlur}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modalidade de Atendimento: Particular vs Convênio */}
                            <div className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Tipo de Atendimento *
                                </Label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl">
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('billing_type', 'particular')}
                                        className={cn(
                                            "py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-h-[44px]",
                                            form.watch('billing_type') === 'particular'
                                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <User className="w-4 h-4" />
                                        Particular
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('billing_type', 'convenio')}
                                        className={cn(
                                            "py-2.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 min-h-[44px]",
                                            form.watch('billing_type') === 'convenio'
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        )}
                                    >
                                        <Shield className="w-4 h-4" />
                                        Convênio
                                    </button>
                                </div>

                                {form.watch('billing_type') === 'convenio' && (
                                    <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between flex-wrap gap-1">
                                                <Label htmlFor="health_insurance_id" className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                                    Operadora / Convênio *
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowQuickInsuranceModal(true)}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline min-h-[44px] px-1.5"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        + Novo Convênio
                                                    </button>
                                                    <Link
                                                        href="/dashboard/convenios"
                                                        target="_blank"
                                                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:underline min-h-[44px] px-1.5"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Gerenciar
                                                    </Link>
                                                </div>
                                            </div>
                                            <Select
                                                value={form.watch('health_insurance_id') || ''}
                                                onValueChange={(val) => form.setValue('health_insurance_id', val)}
                                            >
                                                <SelectTrigger className="bg-white dark:bg-slate-900 min-h-[44px] text-sm">
                                                    <SelectValue placeholder="Selecione o convênio da clínica..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {insurances.length === 0 ? (
                                                        <div className="p-3 text-xs text-slate-500 text-center">
                                                            Nenhum convênio cadastrado ainda. Clique em "+ Novo Convênio".
                                                        </div>
                                                    ) : (
                                                        insurances.map((ins: any) => (
                                                            <SelectItem key={ins.id} value={ins.id}>
                                                                {ins.name} {ins.code ? `(ANS: ${ins.code})` : ''}
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label htmlFor="insurance_card_number" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                    Nº Carteirinha / Matrícula
                                                </Label>
                                                <Input
                                                    id="insurance_card_number"
                                                    placeholder="Ex: 0023456789"
                                                    className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                    {...form.register('insurance_card_number')}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="insurance_validity" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                    Validade da Carteirinha
                                                </Label>
                                                <Input
                                                    id="insurance_validity"
                                                    type="date"
                                                    className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                    {...form.register('insurance_validity')}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label htmlFor="insurance_plan_name" className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                Plano / Categoria (opcional)
                                            </Label>
                                            <Input
                                                id="insurance_plan_name"
                                                placeholder="Ex: Básico, Executivo, Top Nacional..."
                                                className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                {...form.register('insurance_plan_name')}
                                            />
                                        </div>

                                        {/* Titularidade */}
                                        <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-900/30 space-y-2">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 min-h-[44px]">
                                                <input
                                                    type="checkbox"
                                                    checked={isHolder}
                                                    onChange={(e) => setIsHolder(e.target.checked)}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                                />
                                                O paciente é o próprio titular do plano
                                            </label>

                                            {!isHolder && (
                                                <div className="grid grid-cols-2 gap-3 pt-1">
                                                    <div className="space-y-1">
                                                        <Label htmlFor="insurance_holder_name" className="text-xs text-slate-600 dark:text-slate-400">
                                                            Nome do Titular
                                                        </Label>
                                                        <Input
                                                            id="insurance_holder_name"
                                                            placeholder="Nome do pai/mãe ou titular"
                                                            className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                            {...form.register('insurance_holder_name')}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label htmlFor="insurance_holder_cpf" className="text-xs text-slate-600 dark:text-slate-400">
                                                            CPF do Titular
                                                        </Label>
                                                        <Input
                                                            id="insurance_holder_cpf"
                                                            placeholder="000.000.000-00"
                                                            className="bg-white dark:bg-slate-900 min-h-[44px] text-sm"
                                                            {...form.register('insurance_holder_cpf')}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {form.watch('billing_type') === 'particular' && (
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_holder_name">Nome dos Responsáveis (se menor)</Label>
                                        <Input
                                            id="insurance_holder_name"
                                            placeholder="Ex: Maria da Silva (Mãe)"
                                            className="min-h-[44px] text-sm"
                                            {...form.register('insurance_holder_name')}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="insurance_holder_cpf">CPF do Responsável</Label>
                                        <Input
                                            id="insurance_holder_cpf"
                                            placeholder="000.000.000-00"
                                            className="min-h-[44px] text-sm"
                                            {...form.register('insurance_holder_cpf')}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="p-4 px-6 border-t bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur shrink-0 flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="min-h-[44px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending} className="font-semibold shadow-sm min-h-[44px]">
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

            {/* Quick Create Health Insurance Modal */}
            <Dialog open={showQuickInsuranceModal} onOpenChange={setShowQuickInsuranceModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Cadastrar Novo Convênio
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Cadastre a operadora de saúde rapidamente. Ela ficará disponível para todos os atendimentos da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuickCreateInsurance} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="quick_name">Nome do Convênio / Operadora *</Label>
                            <Input
                                id="quick_name"
                                placeholder="Ex: Unimed, Bradesco Saúde, Amil..."
                                value={quickInsuranceName}
                                onChange={(e) => setQuickInsuranceName(e.target.value)}
                                className="min-h-[44px]"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick_code">Registro ANS / Código (opcional)</Label>
                            <Input
                                id="quick_code"
                                placeholder="Ex: 005711"
                                value={quickInsuranceCode}
                                onChange={(e) => setQuickInsuranceCode(e.target.value)}
                                className="min-h-[44px]"
                            />
                        </div>
                        <DialogFooter className="gap-2 pt-2">
                            <Button type="button" variant="outline" onClick={() => setShowQuickInsuranceModal(false)} className="min-h-[44px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isCreatingInsurance || !quickInsuranceName.trim()} className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px] text-white font-semibold">
                                {isCreatingInsurance ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Salvar e Selecionar
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                            <span>Cadastrou convênio com erro?</span>
                            <Link
                                href="/dashboard/convenios"
                                target="_blank"
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                            >
                                Gerenciar / Excluir Convênios
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
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
                                <div>
                                    <Label className="text-muted-foreground">Tipo de Atendimento</Label>
                                    <p className="font-medium flex items-center gap-1.5 mt-0.5">
                                        {selectedPatient.billing_type === 'convenio' ? (
                                            <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                                {selectedPatient.health_insurances?.name || 'Convênio'}
                                                {selectedPatient.insurance_card_number ? ` • ${selectedPatient.insurance_card_number}` : ''}
                                            </span>
                                        ) : (
                                            'Particular'
                                        )}
                                    </p>
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
