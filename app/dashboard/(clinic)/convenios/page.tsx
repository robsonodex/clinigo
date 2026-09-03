'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
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
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
    Building2,
    CreditCard,
    Users,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Shield,
    Heart
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { formatCurrency, cn } from '@/lib/utils'
import type {
    HealthInsurance,
    HealthInsurancePlan,
    DoctorHealthInsurance,
    DoctorWithInsurances
} from '@/lib/types/health-insurance'
import { TissVersionSelector } from '@/components/tiss/version-selector'
import type { TissVersion } from '@/lib/types/tiss-versions'

// =============================================================================
// TAB: OPERADORAS
// =============================================================================

function OperadorasTab() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<HealthInsurance | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        phone: '',
        email: '',
        phone: '',
        email: '',
        notes: '',
        tiss_version: '4.01.00' as TissVersion
    })

    const { data: response, isLoading } = useQuery({
        queryKey: ['health-insurances', search],
        queryFn: () => api.getFull<HealthInsurance[]>('/health-insurances', {
            search: search || undefined,
            status: 'ACTIVE'
        }),
    })

    const insurances = response?.data || []

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/health-insurances', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurances'] })
            toast.success('Operadora criada com sucesso')
            closeDialog()
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao criar operadora')
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.patch(`/health-insurances/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurances'] })
            toast.success('Operadora atualizada com sucesso')
            closeDialog()
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar operadora')
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/health-insurances/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurances'] })
            toast.success('Operadora removida com sucesso')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao remover operadora')
    })

    const openDialog = (item?: HealthInsurance) => {
        if (item) {
            setEditingItem(item)
            setFormData({
                name: item.name,
                code: item.code || '',
                phone: item.phone || '',
                email: item.email || '',
                notes: item.notes || '',
                tiss_version: (item.tiss_version as TissVersion) || '4.01.00'
            })
        } else {
            setEditingItem(null)
            setFormData({ name: '', code: '', phone: '', email: '', notes: '', tiss_version: '4.01.00' })
        }
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setEditingItem(null)
        setFormData({ name: '', code: '', phone: '', email: '', notes: '' })
    }

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório')
            return
        }

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data: formData })
        } else {
            createMutation.mutate(formData)
        }
    }

    return (
        <div className="space-y-4">
            {/* Header / Barra de Busca Premium */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-450 dark:text-slate-500" />
                    <Input
                        placeholder="Buscar operadora..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-11 pr-4 h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                    />
                </div>
                <Button onClick={() => openDialog()} className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm h-10 px-5 text-sm font-semibold hover:bg-slate-850 dark:hover:bg-slate-100 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Operadora
                </Button>
            </div>

            {/* Table Premium */}
            <Card className="rounded-md border border-border shadow-xs overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Nome</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Código ANS</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Telefone</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Planos</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Status</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider text-right w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100/60 dark:divide-slate-850/60">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <TableRow key={i} className="border-none">
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-12 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6 text-right"><Skeleton className="h-5 w-8 rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : insurances.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
                                        Nenhuma operadora cadastrada
                                    </TableCell>
                                </TableRow>
                            ) : (
                                insurances.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200">
                                        <TableCell className="py-3.5 px-6 font-medium text-slate-800 dark:text-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                                    <Building2 className="w-4.5 h-4.5 text-slate-650 dark:text-slate-350" />
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{item.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-sm text-slate-505 dark:text-slate-400">{item.code || '-'}</TableCell>
                                        <TableCell className="py-3.5 px-6 text-sm text-slate-505 dark:text-slate-400">{item.phone || '-'}</TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {item.plans_count || 0} planos
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                {item.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-xs h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-850">
                                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-slate-800">
                                                    <DropdownMenuItem onClick={() => openDialog(item)} className="rounded-lg text-xs font-medium py-2">
                                                        <Edit className="w-4 h-4 mr-2 text-slate-500" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm('Tem certeza que deseja remover esta operadora?')) {
                                                                deleteMutation.mutate(item.id)
                                                            }
                                                        }}
                                                        className="text-destructive rounded-lg text-xs font-medium py-2"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Editar Operadora' : 'Nova Operadora'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Atualize os dados da operadora' : 'Cadastre uma nova operadora de saúde'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Unimed"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code">Código ANS</Label>
                            <Input
                                id="code"
                                placeholder="Ex: 302147"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    placeholder="(11) 99999-9999"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="contato@unimed.com.br"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* TISS Version Selector */}
                        <div className="pt-2">
                            <Label className="mb-2 block">Configuração TISS</Label>
                            <TissVersionSelector
                                currentVersion={formData.tiss_version || '4.01.00'}
                                insuranceName={formData.name || 'Nova Operadora'}
                                onVersionChange={(v) => setFormData({ ...formData, tiss_version: v })}
                                showDetails={false}
                                className="border shadow-sm"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea
                                id="notes"
                                placeholder="Informações adicionais..."
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingItem ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// =============================================================================
// TAB: PLANOS
// =============================================================================

function PlanosTab() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [insuranceFilter, setInsuranceFilter] = useState<string>('all')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<HealthInsurancePlan | null>(null)
    const [formData, setFormData] = useState({
        health_insurance_id: '',
        name: '',
        code: '',
        type: 'INDIVIDUAL' as const,
        coverage_type: 'COMPLETO' as const,
        notes: ''
    })

    const { data: insurancesResponse } = useQuery({
        queryKey: ['health-insurances-list'],
        queryFn: () => api.getFull<HealthInsurance[]>('/health-insurances', { status: 'ACTIVE' }),
    })
    const insurances = insurancesResponse?.data || []

    const { data: response, isLoading } = useQuery({
        queryKey: ['health-insurance-plans', search, insuranceFilter],
        queryFn: () => api.getFull<HealthInsurancePlan[]>('/health-insurance-plans', {
            search: search || undefined,
            insurance_id: insuranceFilter !== 'all' ? insuranceFilter : undefined,
            status: 'ACTIVE'
        }),
    })
    const plans = response?.data || []

    const createMutation = useMutation({
        mutationFn: (data: any) => api.post('/health-insurance-plans', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurance-plans'] })
            toast.success('Plano criado com sucesso')
            closeDialog()
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao criar plano')
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            api.patch(`/health-insurance-plans/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurance-plans'] })
            toast.success('Plano atualizado com sucesso')
            closeDialog()
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar plano')
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/health-insurance-plans/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['health-insurance-plans'] })
            toast.success('Plano removido com sucesso')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao remover plano')
    })

    const openDialog = (item?: HealthInsurancePlan) => {
        if (item) {
            setEditingItem(item)
            setFormData({
                health_insurance_id: item.health_insurance_id,
                name: item.name,
                code: item.code || '',
                type: item.type,
                coverage_type: item.coverage_type,
                notes: item.notes || ''
            })
        } else {
            setEditingItem(null)
            setFormData({
                health_insurance_id: insuranceFilter !== 'all' ? insuranceFilter : '',
                name: '',
                code: '',
                type: 'INDIVIDUAL',
                coverage_type: 'COMPLETO',
                notes: ''
            })
        }
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setEditingItem(null)
    }

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            toast.error('Nome é obrigatório')
            return
        }
        if (!formData.health_insurance_id && !editingItem) {
            toast.error('Selecione uma operadora')
            return
        }

        if (editingItem) {
            const { health_insurance_id, ...updateData } = formData
            updateMutation.mutate({ id: editingItem.id, data: updateData })
        } else {
            createMutation.mutate(formData)
        }
    }

    const typeLabel: Record<string, string> = {
        'INDIVIDUAL': 'Individual',
        'EMPRESARIAL': 'Empresarial',
        'COLETIVO': 'Coletivo'
    }

    const coverageLabel: Record<string, string> = {
        'AMBULATORIAL': 'Ambulatorial',
        'HOSPITALAR': 'Hospitalar',
        'COMPLETO': 'Completo'
    }

    return (
        <div className="space-y-4">
            {/* Header / Barra de Busca / Filtros Premium */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-450 dark:text-slate-500" />
                        <Input
                            placeholder="Buscar plano..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-11 pr-4 h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                        />
                    </div>
                    <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                        <SelectTrigger className="w-full sm:w-[220px] h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-emerald-500/20 text-slate-700 dark:text-slate-350 text-sm font-medium">
                            <SelectValue placeholder="Filtrar por operadora" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800">
                            <SelectItem value="all" className="rounded-lg text-sm">Todas operadoras</SelectItem>
                            {insurances.map((ins) => (
                                <SelectItem key={ins.id} value={ins.id} className="rounded-lg text-sm">
                                    {ins.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => openDialog()} className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm h-10 px-5 text-sm font-semibold hover:bg-slate-850 dark:hover:bg-slate-100 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Plano
                </Button>
            </div>

            {/* Table Premium */}
            <Card className="rounded-md border border-border shadow-xs overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Plano</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Operadora</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Tipo</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Cobertura</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Médicos</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider text-right w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100/60 dark:divide-slate-850/60">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <TableRow key={i} className="border-none">
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-12 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6 text-right"><Skeleton className="h-5 w-8 rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : plans.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
                                        Nenhum plano cadastrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plans.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200">
                                        <TableCell className="py-3.5 px-6 font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                                    <CreditCard className="w-4.5 h-4.5 text-slate-650 dark:text-slate-350" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-750 dark:text-slate-200 text-sm">{item.name}</p>
                                                    {item.code && (
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                                                            Cód: {item.code}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-sm text-slate-600 dark:text-slate-400">{(item.health_insurance as any)?.name || '-'}</TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                                                {typeLabel[item.type]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {coverageLabel[item.coverage_type]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6">
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {item.doctors_count || 0} médicos
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 px-6 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-xs h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-850">
                                                        <MoreVertical className="w-4 h-4 text-slate-500" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl border-slate-100 dark:border-slate-800">
                                                    <DropdownMenuItem onClick={() => openDialog(item)} className="rounded-lg text-xs font-medium py-2">
                                                        <Edit className="w-4 h-4 mr-2 text-slate-500" />
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm('Tem certeza que deseja remover este plano?')) {
                                                                deleteMutation.mutate(item.id)
                                                            }
                                                        }}
                                                        className="text-destructive rounded-lg text-xs font-medium py-2"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Remover
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Editar Plano' : 'Novo Plano'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {!editingItem && (
                            <div className="grid gap-2">
                                <Label>Operadora *</Label>
                                <Select
                                    value={formData.health_insurance_id}
                                    onValueChange={(v) => setFormData({ ...formData, health_insurance_id: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione a operadora" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {insurances.map((ins) => (
                                            <SelectItem key={ins.id} value={ins.id}>
                                                {ins.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label>Nome do Plano *</Label>
                            <Input
                                placeholder="Ex: Premium"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Código do Plano</Label>
                            <Input
                                placeholder="Ex: PRM001"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(v: any) => setFormData({ ...formData, type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                                        <SelectItem value="EMPRESARIAL">Empresarial</SelectItem>
                                        <SelectItem value="COLETIVO">Coletivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Cobertura</Label>
                                <Select
                                    value={formData.coverage_type}
                                    onValueChange={(v: any) => setFormData({ ...formData, coverage_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="AMBULATORIAL">Ambulatorial</SelectItem>
                                        <SelectItem value="HOSPITALAR">Hospitalar</SelectItem>
                                        <SelectItem value="COMPLETO">Completo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingItem ? 'Salvar' : 'Criar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// =============================================================================
// TAB: MÉDICOS
// =============================================================================

function MedicosTab() {
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)

    // Fetch doctors (reusing existing endpoint)
    const { data: doctorsResponse, isLoading: loadingDoctors } = useQuery({
        queryKey: ['doctors-with-insurances', search],
        queryFn: () => api.getFull<any[]>('/doctors', { search: search || undefined }),
    })
    const doctors = doctorsResponse?.data || []

    // Fetch doctor's insurances when modal is open
    const { data: doctorInsurancesResponse, isLoading: loadingInsurances } = useQuery({
        queryKey: ['doctor-insurances', selectedDoctor?.id],
        queryFn: () => api.getFull<DoctorHealthInsurance[]>(`/doctors/detail?id=${selectedDoctor?.id}&action=health-insurances`),
        enabled: !!selectedDoctor?.id,
    })
    const doctorInsurances = doctorInsurancesResponse?.data || []

    // Fetch all plans for adding
    const { data: plansResponse } = useQuery({
        queryKey: ['all-plans-for-adding'],
        queryFn: () => api.getFull<HealthInsurancePlan[]>('/health-insurance-plans', { status: 'ACTIVE' }),
        enabled: isManageDialogOpen,
    })
    const allPlans = plansResponse?.data || []

    // Add insurance mutation
    const addInsuranceMutation = useMutation({
        mutationFn: ({ doctorId, data }: { doctorId: string; data: any }) =>
            api.post(`/doctors/detail?id=${doctorId}&action=health-insurances`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctor-insurances', selectedDoctor?.id] })
            queryClient.invalidateQueries({ queryKey: ['doctors-with-insurances'] })
            toast.success('Convênio vinculado com sucesso')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao vincular convênio')
    })

    // Update insurance mutation
    const updateInsuranceMutation = useMutation({
        mutationFn: ({ doctorId, id, data }: { doctorId: string; id: string; data: any }) =>
            api.patch(`/doctors/detail?id=${doctorId}&action=health-insurances&insuranceId=${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctor-insurances', selectedDoctor?.id] })
            toast.success('Convênio atualizado')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar')
    })

    // Remove insurance mutation
    const removeInsuranceMutation = useMutation({
        mutationFn: ({ doctorId, id }: { doctorId: string; id: string }) =>
            api.delete(`/doctors/detail?id=${doctorId}&action=health-insurances&insuranceId=${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctor-insurances', selectedDoctor?.id] })
            queryClient.invalidateQueries({ queryKey: ['doctors-with-insurances'] })
            toast.success('Convênio removido')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao remover')
    })

    const [newInsurance, setNewInsurance] = useState({
        plan_id: '',
        consultation_price: 0,
        accepts_new_patients: true,
        notes: ''
    })

    const handleAddInsurance = () => {
        if (!newInsurance.plan_id) {
            toast.error('Selecione um plano')
            return
        }
        if (newInsurance.consultation_price <= 0) {
            toast.error('Informe o valor da consulta')
            return
        }

        addInsuranceMutation.mutate({
            doctorId: selectedDoctor.id,
            data: {
                health_insurance_plan_id: newInsurance.plan_id,
                consultation_price: newInsurance.consultation_price,
                accepts_new_patients: newInsurance.accepts_new_patients,
                notes: newInsurance.notes || null
            }
        })

        // Reset form
        setNewInsurance({ plan_id: '', consultation_price: 0, accepts_new_patients: true, notes: '' })
    }

    const openManageDialog = (doctor: any) => {
        setSelectedDoctor(doctor)
        setIsManageDialogOpen(true)
    }

    // Filter plans already linked
    const linkedPlanIds = doctorInsurances.map(i => i.health_insurance_plan_id)
    const availablePlans = allPlans.filter(p => !linkedPlanIds.includes(p.id))

    return (
        <div className="space-y-4">
            {/* Header / Barra de Busca Premium */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-450 dark:text-slate-500" />
                    <Input
                        placeholder="Buscar médico..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-11 pr-4 h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                    />
                </div>
            </div>

            {/* Table Premium */}
            <Card className="rounded-md border border-border shadow-xs overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Médico</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Especialidade</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">CRM</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider">Convênios</TableHead>
                                <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-450 dark:text-slate-550 uppercase tracking-wider text-right w-[120px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100/60 dark:divide-slate-850/60">
                            {loadingDoctors ? (
                                Array(3).fill(0).map((_, i) => (
                                    <TableRow key={i} className="border-none">
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-32 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-24 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-20 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6"><Skeleton className="h-5 w-16 rounded" /></TableCell>
                                        <TableCell className="py-3 px-6 text-right"><Skeleton className="h-5 w-24 rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : doctors.length === 0 ? (
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm font-medium">
                                        Nenhum médico encontrado
                                    </TableCell>
                                </TableRow>
                            ) : (
                                doctors.map((doctor: any) => {
                                    const name = doctor.user?.full_name || 'Médico'
                                    const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'MD'
                                    const gradients = [
                                        { from: '#3B82F6', to: '#1D4ED8' },
                                        { from: '#10B981', to: '#047857' },
                                        { from: '#F59E0B', to: '#B45309' },
                                        { from: '#EC4899', to: '#BE185D' },
                                        { from: '#8B5CF6', to: '#6D28D9' }
                                    ]
                                    const charSum = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                                    const theme = gradients[charSum % gradients.length]

                                    return (
                                        <TableRow key={doctor.id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200">
                                            <TableCell className="py-3.5 px-6 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-medium"
                                                    >
                                                        {initials}
                                                    </div>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-6 text-sm text-slate-650 dark:text-slate-400">{doctor.specialty || '-'}</TableCell>
                                            <TableCell className="py-3.5 px-6 text-sm text-slate-650 dark:text-slate-400">{doctor.crm}/{doctor.crm_state}</TableCell>
                                            <TableCell className="py-3.5 px-6">
                                                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold gap-1 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60">
                                                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                                                    {doctor.insurances_count || 0} vinculados
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 px-6 text-right">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openManageDialog(doctor)}
                                                    className="rounded-xl h-8 text-xs font-semibold px-3 border-slate-200 dark:border-slate-800 text-slate-750 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                                                >
                                                    Gerenciar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Manage Dialog */}
            <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" />
                            Convênios de {selectedDoctor?.user?.full_name}
                        </DialogTitle>
                        <DialogDescription>
                            Gerencie os convênios aceitos por este médico
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-6 py-4">
                        {/* Current Insurances */}
                        <div>
                            <h4 className="font-medium mb-3">Convênios Vinculados</h4>
                            {loadingInsurances ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-16 w-full" />
                                    <Skeleton className="h-16 w-full" />
                                </div>
                            ) : doctorInsurances.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-lg">
                                    Nenhum convênio vinculado
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {doctorInsurances.map((ins) => (
                                        <div
                                            key={ins.id}
                                            className="border rounded-lg p-4 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">
                                                        {ins.insurance_name} - {ins.plan_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {ins.plan_type} • {ins.coverage_type}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm('Remover este convênio?')) {
                                                            removeInsuranceMutation.mutate({
                                                                doctorId: selectedDoctor.id,
                                                                id: ins.id
                                                            })
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <Label className="text-xs">Valor da Consulta</Label>
                                                    <Input
                                                        type="number"
                                                        value={ins.consultation_price}
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value)
                                                            if (!isNaN(value)) {
                                                                updateInsuranceMutation.mutate({
                                                                    doctorId: selectedDoctor.id,
                                                                    id: ins.id,
                                                                    data: { consultation_price: value }
                                                                })
                                                            }
                                                        }}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={ins.accepts_new_patients}
                                                        onCheckedChange={(checked) => {
                                                            updateInsuranceMutation.mutate({
                                                                doctorId: selectedDoctor.id,
                                                                id: ins.id,
                                                                data: { accepts_new_patients: checked }
                                                            })
                                                        }}
                                                    />
                                                    <Label className="text-xs">Aceita novos</Label>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Insurance */}
                        {availablePlans.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="font-medium mb-3">Adicionar Novo Convênio</h4>
                                <div className="grid gap-3">
                                    <Select
                                        value={newInsurance.plan_id}
                                        onValueChange={(v) => setNewInsurance({ ...newInsurance, plan_id: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o plano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availablePlans.map((plan: any) => (
                                                <SelectItem key={plan.id} value={plan.id}>
                                                    {plan.health_insurance?.name} - {plan.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs">Valor da Consulta</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={newInsurance.consultation_price}
                                                onChange={(e) => setNewInsurance({
                                                    ...newInsurance,
                                                    consultation_price: parseFloat(e.target.value) || 0
                                                })}
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <Switch
                                                checked={newInsurance.accepts_new_patients}
                                                onCheckedChange={(checked) => setNewInsurance({
                                                    ...newInsurance,
                                                    accepts_new_patients: checked
                                                })}
                                            />
                                            <Label className="text-xs mb-2">Aceita novos pacientes</Label>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleAddInsurance}
                                        disabled={addInsuranceMutation.isPending}
                                        className="w-full"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Adicionar Convênio
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// =============================================================================
// TAB: ELEGIBILIDADE
// =============================================================================

function ElegibilidadeTab() {
    const [formData, setFormData] = useState({
        insurance_company: '',
        card_number: '',
        patient_cpf: '',
        patient_name: '',
    });

    const checkMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch('/api/insurance/check-eligibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data;
        },
        onError: (error: Error) => toast.error(error.message),
    });

    const result = checkMutation.data;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Premium */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800/50">
                    <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Dados do Beneficiário</CardTitle>
                    <CardDescription className="text-xs text-slate-400 dark:text-slate-500">
                        Preencha os dados conforme a carteirinha do convênio
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">Operadora</Label>
                        <Select
                            value={formData.insurance_company}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, insurance_company: v }))}
                        >
                            <SelectTrigger className="h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus:ring-emerald-500/20 text-slate-700 dark:text-slate-350 text-sm font-medium">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 dark:border-slate-800">
                                <SelectItem value="Unimed" className="rounded-lg text-sm">Unimed</SelectItem>
                                <SelectItem value="Bradesco Saúde" className="rounded-lg text-sm">Bradesco Saúde</SelectItem>
                                <SelectItem value="Amil" className="rounded-lg text-sm">Amil</SelectItem>
                                <SelectItem value="SulAmérica" className="rounded-lg text-sm">SulAmérica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">Número da Carteirinha</Label>
                        <div className="relative">
                            <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                className="pl-10 h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                                value={formData.card_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, card_number: e.target.value }))}
                                placeholder="0000 0000 0000 0000"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">CPF do Paciente</Label>
                        <Input
                            value={formData.patient_cpf}
                            onChange={(e) => setFormData(prev => ({ ...prev, patient_cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            maxLength={11}
                            className="h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 dark:text-slate-450">Nome Completo</Label>
                        <div className="relative">
                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                className="pl-10 h-10 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 text-sm"
                                value={formData.patient_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full rounded-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm h-10 px-5 text-sm font-semibold hover:bg-slate-850 dark:hover:bg-slate-100 flex items-center justify-center gap-2 mt-2"
                        onClick={() => checkMutation.mutate(formData)}
                        disabled={
                            checkMutation.isPending ||
                            !formData.insurance_company ||
                            !formData.card_number
                        }
                    >
                        {checkMutation.isPending ? (
                            <Skeleton className="w-4 h-4 mr-2 animate-spin rounded-full" />
                        ) : (
                            <Search className="w-4 h-4 mr-2" />
                        )}
                        Verificar Elegibilidade
                    </Button>
                </CardContent>
            </Card>

            {/* Result Premium */}
            <div className="space-y-6">
                {checkMutation.isPending && (
                    <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-900/40 overflow-hidden">
                        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Consultando Operadora...</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Aguardando resposta do webservice TISS
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {result && !checkMutation.isPending && (
                    <Card className={`rounded-2xl border shadow-sm overflow-hidden ${result.is_active ? 'border-emerald-250 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/50' : 'border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900/50'}`}>
                        <CardHeader className="pb-4 border-b border-slate-50 dark:border-slate-800/50">
                            <div className="flex items-center gap-3">
                                {result.is_active ? (
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle className={`text-base font-bold ${result.is_active ? 'text-emerald-800 dark:text-emerald-450' : 'text-red-850 dark:text-red-400'}`}>
                                        {result.is_active ? 'Beneficiário Ativo' : 'Beneficiário Inativo/Não Encontrado'}
                                    </CardTitle>
                                    <CardDescription className={`text-xs ${result.is_active ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-650 dark:text-red-500'}`}>
                                        Verificação concluída com sucesso
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        {result.is_active && (
                            <CardContent className="space-y-4 pt-6">
                                <div className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100/55 dark:border-slate-800/50 space-y-1">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-450">Plano Identificado</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-white">{result.plan_name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100/55 dark:border-slate-800/50">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1.5">Carência</p>
                                        <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs font-semibold border-emerald-250 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                            Cumprida
                                        </Badge>
                                    </div>
                                    <div className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100/55 dark:border-slate-800/50">
                                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Coparticipação</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                                            {result.coverage_details?.copay_value
                                                ? `R$ ${result.coverage_details.copay_value}`
                                                : 'Isento'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/60 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100/55 dark:border-slate-800/50">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-450 mb-2">Coberturas Principais</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.coverage_details?.procedures_covered?.map((proc: string) => (
                                            <Badge key={proc} variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-850 text-slate-650 dark:text-slate-350">
                                                {proc}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}

                {!result && !checkMutation.isPending && (
                    <Card className="bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-2 border-slate-200 dark:border-slate-850 rounded-2xl">
                        <CardContent className="py-16 text-center text-slate-400 dark:text-slate-500">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50 text-slate-400" />
                            <p className="text-sm font-semibold">Resultado da Verificação</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Preencha o formulário ao lado para consultar a elegibilidade do paciente</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ConveniosPage() {
    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Heart className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Convênios</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Gerencie operadoras, planos e regras de atendimento</p>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="operadoras" className="space-y-4">
                <div className="overflow-x-auto pb-1">
                    <TabsList className="flex w-max bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
                        <TabsTrigger value="operadoras" className="rounded-lg text-xs font-semibold px-4 py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">
                            <Building2 className="w-3.5 h-3.5 mr-1.5" />
                            Operadoras
                        </TabsTrigger>
                        <TabsTrigger value="planos" className="rounded-lg text-xs font-semibold px-4 py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                            Planos
                        </TabsTrigger>
                        <TabsTrigger value="medicos" className="rounded-lg text-xs font-semibold px-4 py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
                            <Users className="w-3.5 h-3.5 mr-1.5" />
                            Médicos
                        </TabsTrigger>
                        <TabsTrigger value="elegibilidade" className="rounded-lg text-xs font-semibold px-4 py-2 text-slate-650 dark:text-slate-400 data-[state=active]:bg-white data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm">
                            <Shield className="w-3.5 h-3.5 mr-1.5" />
                            Elegibilidade
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="operadoras" className="mt-4 outline-none">
                    <OperadorasTab />
                </TabsContent>
                <TabsContent value="planos" className="mt-4 outline-none">
                    <PlanosTab />
                </TabsContent>
                <TabsContent value="medicos" className="mt-4 outline-none">
                    <MedicosTab />
                </TabsContent>
                <TabsContent value="elegibilidade" className="mt-4 outline-none">
                    <ElegibilidadeTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
