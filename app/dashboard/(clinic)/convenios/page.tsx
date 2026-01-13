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
        notes: ''
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
                notes: item.notes || ''
            })
        } else {
            setEditingItem(null)
            setFormData({ name: '', code: '', phone: '', email: '', notes: '' })
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar operadora..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={() => openDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Operadora
                </Button>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Código ANS</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Planos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                </TableRow>
                            ))
                        ) : insurances.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhuma operadora cadastrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            insurances.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <Building2 className="w-4 h-4 text-blue-600" />
                                            </div>
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.code || '-'}</TableCell>
                                    <TableCell>{item.phone || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {item.plans_count || 0} planos
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={item.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                            {item.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openDialog(item)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (confirm('Tem certeza que deseja remover esta operadora?')) {
                                                            deleteMutation.mutate(item.id)
                                                        }
                                                    }}
                                                    className="text-destructive"
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar plano..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={insuranceFilter} onValueChange={setInsuranceFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filtrar por operadora" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas operadoras</SelectItem>
                            {insurances.map((ins) => (
                                <SelectItem key={ins.id} value={ins.id}>
                                    {ins.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={() => openDialog()} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Plano
                </Button>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Plano</TableHead>
                            <TableHead>Operadora</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Cobertura</TableHead>
                            <TableHead>Médicos</TableHead>
                            <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                </TableRow>
                            ))
                        ) : plans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Nenhum plano cadastrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            plans.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p>{item.name}</p>
                                                {item.code && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Cód: {item.code}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{(item.health_insurance as any)?.name || '-'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{typeLabel[item.type]}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{coverageLabel[item.coverage_type]}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {item.doctors_count || 0} médicos
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openDialog(item)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (confirm('Tem certeza que deseja remover este plano?')) {
                                                            deleteMutation.mutate(item.id)
                                                        }
                                                    }}
                                                    className="text-destructive"
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
        queryFn: () => api.getFull<DoctorHealthInsurance[]>(`/doctors/${selectedDoctor?.id}/health-insurances`),
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
            api.post(`/doctors/${doctorId}/health-insurances`, data),
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
            api.patch(`/doctors/${doctorId}/health-insurances/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctor-insurances', selectedDoctor?.id] })
            toast.success('Convênio atualizado')
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar')
    })

    // Remove insurance mutation
    const removeInsuranceMutation = useMutation({
        mutationFn: ({ doctorId, id }: { doctorId: string; id: string }) =>
            api.delete(`/doctors/${doctorId}/health-insurances/${id}`),
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar médico..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Table */}
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Médico</TableHead>
                            <TableHead>Especialidade</TableHead>
                            <TableHead>CRM</TableHead>
                            <TableHead>Convênios</TableHead>
                            <TableHead className="w-[120px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loadingDoctors ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                </TableRow>
                            ))
                        ) : doctors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    Nenhum médico encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            doctors.map((doctor: any) => (
                                <TableRow key={doctor.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                                {doctor.user?.full_name?.charAt(0) || 'M'}
                                            </div>
                                            {doctor.user?.full_name || 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{doctor.specialty}</TableCell>
                                    <TableCell>{doctor.crm}/{doctor.crm_state}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="gap-1">
                                            <Heart className="w-3 h-3" />
                                            {doctor.insurances_count || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openManageDialog(doctor)}
                                        >
                                            Gerenciar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Dados do Beneficiário</CardTitle>
                    <CardDescription>
                        Preencha os dados conforme a carteirinha do convênio
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Operadora</Label>
                        <Select
                            value={formData.insurance_company}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, insurance_company: v }))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Unimed">Unimed</SelectItem>
                                <SelectItem value="Bradesco Saúde">Bradesco Saúde</SelectItem>
                                <SelectItem value="Amil">Amil</SelectItem>
                                <SelectItem value="SulAmérica">SulAmérica</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Número da Carteirinha</Label>
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                value={formData.card_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, card_number: e.target.value }))}
                                placeholder="0000 0000 0000 0000"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>CPF do Paciente</Label>
                        <Input
                            value={formData.patient_cpf}
                            onChange={(e) => setFormData(prev => ({ ...prev, patient_cpf: e.target.value }))}
                            placeholder="000.000.000-00"
                            maxLength={11}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Nome Completo</Label>
                        <div className="relative">
                            <Users className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                className="pl-9"
                                value={formData.patient_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
                            />
                        </div>
                    </div>

                    <Button
                        className="w-full"
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

            {/* Result */}
            <div className="space-y-6">
                {checkMutation.isPending && (
                    <Card>
                        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                            <Skeleton className="w-12 h-12 rounded-full" />
                            <div>
                                <h3 className="text-lg font-medium">Consultando Operadora...</h3>
                                <p className="text-sm text-muted-foreground">
                                    Aguardando resposta do webservice
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {result && !checkMutation.isPending && (
                    <Card className={result.is_active ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                {result.is_active ? (
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                )}
                                <div>
                                    <CardTitle className={result.is_active ? 'text-green-700' : 'text-red-700'}>
                                        {result.is_active ? 'Beneficiário Ativo' : 'Beneficiário Inativo/Não Encontrado'}
                                    </CardTitle>
                                    <CardDescription className={result.is_active ? 'text-green-600' : 'text-red-600'}>
                                        Verificação concluída com sucesso
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        {result.is_active && (
                            <CardContent className="space-y-4">
                                <div className="bg-white/50 p-4 rounded-lg space-y-2">
                                    <p className="text-sm font-medium text-green-800">Plano Identificado</p>
                                    <p className="text-lg font-bold text-green-900">{result.plan_name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-xs text-green-800 mb-1">Carência</p>
                                        <Badge variant="outline" className="text-green-700 border-green-200 bg-green-100">
                                            Cumprida
                                        </Badge>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg">
                                        <p className="text-xs text-green-800 mb-1">Coparticipação</p>
                                        <p className="font-medium text-green-900">
                                            {result.coverage_details?.copay_value
                                                ? `R$ ${result.coverage_details.copay_value}`
                                                : 'Isento'}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-green-800 mb-2">Coberturas Principais</p>
                                    <div className="flex flex-wrap gap-2">
                                        {result.coverage_details?.procedures_covered?.map((proc: string) => (
                                            <Badge key={proc} variant="secondary" className="bg-white">
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
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>O resultado da verificação aparecerá aqui</p>
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Convênios</h1>
                <p className="text-muted-foreground">
                    Gerencie operadoras, planos e regras de atendimento
                </p>
            </div>

            <Tabs defaultValue="operadoras" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                    <TabsTrigger value="operadoras" className="gap-2">
                        <Building2 className="w-4 h-4" />
                        Operadoras
                    </TabsTrigger>
                    <TabsTrigger value="planos" className="gap-2">
                        <CreditCard className="w-4 h-4" />
                        Planos
                    </TabsTrigger>
                    <TabsTrigger value="medicos" className="gap-2">
                        <Users className="w-4 h-4" />
                        Médicos
                    </TabsTrigger>
                    <TabsTrigger value="elegibilidade" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Elegibilidade
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="operadoras">
                    <OperadorasTab />
                </TabsContent>
                <TabsContent value="planos">
                    <PlanosTab />
                </TabsContent>
                <TabsContent value="medicos">
                    <MedicosTab />
                </TabsContent>
                <TabsContent value="elegibilidade">
                    <ElegibilidadeTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
