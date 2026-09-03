'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRole } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { MoreVertical, Plus, Search, User, ShieldAlert, ShieldCheck, Trash2, Pencil, Calendar, Users, Stethoscope, DollarSign } from 'lucide-react'
import { DoctorFormDialog } from '@/components/forms/doctor-form-dialog'
import { type Doctor, api } from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

export default function DoctorsPage() {
    const { clinicId } = useRole()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const profLabel = useProfessionalLabel()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (searchParams.get('action') === 'novo') {
            setEditingDoctor(null)
            setIsDialogOpen(true)
        }
    }, [searchParams])


    const { data: response, isLoading, error } = useQuery({
        queryKey: ['doctors', clinicId, page, search, statusFilter],
        queryFn: () =>
            api.getFull<Doctor[]>(`/doctors`, {
                page: page.toString(),
                pageSize: '100', // Aumentado para 100 para suportar contas Pro que não tem controle de paginação
                search: search || undefined,
                is_accepting: statusFilter !== 'all' ? statusFilter : undefined,
            }),
    })

    const doctors = response?.data || []

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, is_accepting_appointments }: { id: string; is_accepting_appointments: boolean }) =>
            api.patch(`/doctors/detail?id=${id}`, { is_accepting_appointments }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            toast.success(`Status do ${profLabel.singular.toLowerCase()} atualizado`)
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao atualizar status')
        }
    })

    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, is_accepting_appointments }: { ids: string[]; is_accepting_appointments: boolean }) =>
            api.patch(`/clinics/${clinicId}/doctors/bulk`, { ids, is_accepting_appointments }),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            setSelectedIds([])
            toast.success(data.message || `${profLabel.plural} atualizados com sucesso`)
        },
        onError: (err: any) => {
            toast.error(err.message || `Erro ao atualizar ${profLabel.plural.toLowerCase()}`)
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api.delete(`/clinics/${clinicId}/doctors/bulk`, { ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            setSelectedIds([])
            toast.success(`${profLabel.plural} removidos com sucesso`)
        },
        onError: (err: any) => {
            toast.error(err.message || `Erro ao remover ${profLabel.plural.toLowerCase()}`)
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/doctors/detail?id=${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            toast.success(`${profLabel.singular} excluído com sucesso`)
        },
        onError: (err: any) => {
            toast.error(err.message || `Erro ao excluir ${profLabel.singular.toLowerCase()}`)
        }
    })

    const handleEdit = (doctor: Doctor) => {
        setEditingDoctor(doctor)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setEditingDoctor(null)
        setIsDialogOpen(true)
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setPage(1)
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === (doctors?.length || 0)) {
            setSelectedIds([])
        } else {
            setSelectedIds(doctors?.map(d => d.id) || [])
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">{profLabel.plural}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Gerencie o corpo clínico e suas informações</p>
                </div>
                <Button onClick={handleCreate} className="rounded-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-none h-9 px-4 text-xs font-medium min-h-[36px]">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {profLabel.novo}
                </Button>
            </div>

            {selectedIds.length > 0 && (
                <Card className="rounded-md bg-muted/40 border border-border">
                    <CardContent className="py-2.5 px-4 flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                            {selectedIds.length} selecionados
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: true })}
                                disabled={bulkUpdateMutation.isPending}
                                className="rounded-md h-8 text-xs"
                            >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                Reativar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: false })}
                                disabled={bulkUpdateMutation.isPending}
                                className="rounded-md h-8 text-xs text-destructive hover:bg-destructive/10"
                            >
                                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                                Indisponibilizar
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    if (confirm(`Deseja realmente remover/desativar os ${profLabel.plural.toLowerCase()} selecionados?`)) {
                                        bulkDeleteMutation.mutate(selectedIds)
                                    }
                                }}
                                disabled={bulkDeleteMutation.isPending}
                                className="rounded-md h-8 text-xs"
                            >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Excluir
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Barra de Busca e Filtros */}
            <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, CRM ou especialidade..."
                        className="pl-9 pr-3 h-9 bg-background border-border rounded-md focus-visible:ring-1 focus-visible:ring-primary text-xs font-normal text-foreground placeholder:text-muted-foreground"
                        value={search}
                        onChange={handleSearch}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                        setStatusFilter(value)
                        setPage(1)
                    }}
                >
                    <SelectTrigger className="w-full sm:w-[170px] h-9 rounded-md border-border bg-background text-xs font-normal">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                        <SelectItem value="all" className="text-xs">Todos os Status</SelectItem>
                        <SelectItem value="true" className="text-xs">Disponíveis</SelectItem>
                        <SelectItem value="false" className="text-xs">Indisponíveis</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabela Enterprise */}
            <Card className="rounded-md border border-border shadow-xs overflow-hidden bg-card">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/40 border-b border-border">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[40px] py-2.5 px-3">
                                        <Checkbox
                                            checked={doctors.length > 0 && selectedIds.length === doctors.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Especialidade</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Registro</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Valor Consulta</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Conexão</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell />
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-8 w-8 rounded-md" />
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-3.5 w-[140px]" />
                                                        <Skeleton className="h-3 w-[90px]" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[60px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[90px]" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-7 w-7 ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : doctors.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-32 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-1.5">
                                                <div className="w-10 h-10 rounded-md bg-muted/60 flex items-center justify-center">
                                                    <Users className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                                <p className="text-xs font-medium text-foreground">Nenhum {profLabel.singular.toLowerCase()} encontrado</p>
                                                <p className="text-[11px] text-muted-foreground">Cadastre seu primeiro profissional para começar</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    doctors.map((doctor: Doctor) => {
                                        const name = doctor.user?.full_name || ''
                                        return (
                                        <TableRow key={doctor.id} className={`hover:bg-muted/30 border-b border-border/60 transition-colors ${selectedIds.includes(doctor.id) ? 'bg-primary/5' : ''}`}>
                                            <TableCell className="py-2.5 px-3">
                                                <Checkbox
                                                    checked={selectedIds.includes(doctor.id)}
                                                    onCheckedChange={() => toggleSelect(doctor.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 font-normal">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-medium">
                                                            {getInitials(name)}
                                                        </div>
                                                        {doctor.is_online && (
                                                            <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground text-xs">{doctor.user?.full_name}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {doctor.user?.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-xs text-muted-foreground">{doctor.specialty || '—'}</TableCell>
                                            <TableCell className="py-2.5 px-4">
                                                <code className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded-xs text-muted-foreground font-mono">
                                                    {doctor.crm ? `${doctor.crm}/${doctor.crm_state || ''}` : '—'}
                                                </code>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-xs font-medium text-foreground">
                                                {formatCurrency(doctor.consultation_price)}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4">
                                                <Badge
                                                    variant={doctor.is_accepting_appointments ? 'outline' : 'secondary'}
                                                    className={doctor.is_accepting_appointments
                                                        ? "rounded-xs text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/60"
                                                        : "rounded-xs text-[10px] font-medium px-2 py-0.5"
                                                    }
                                                >
                                                    {doctor.is_accepting_appointments ? 'Ativo' : 'Indisponível'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4">
                                                {doctor.is_online ? (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                                        <span>Online</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"></span>
                                                        <span>Offline</span>
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2.5 px-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/dashboard/medicos/${doctor.id}`}>
                                                                <DollarSign className="w-4 h-4 mr-2 text-emerald-600" />
                                                                Valores por Paciente
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(doctor)}>
                                                            <Pencil className="w-4 h-4 mr-2" />
                                                            Editar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`./horarios?doctor_id=${doctor.id}`}>
                                                                <Calendar className="w-4 h-4 mr-2" />
                                                                Horários
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {doctor.is_accepting_appointments ? (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => updateStatusMutation.mutate({ id: doctor.id, is_accepting_appointments: false })}
                                                            >
                                                                <ShieldAlert className="w-4 h-4 mr-2" />
                                                                Indisponibilizar
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-success"
                                                                onClick={() => updateStatusMutation.mutate({ id: doctor.id, is_accepting_appointments: true })}
                                                            >
                                                                <ShieldCheck className="w-4 h-4 mr-2" />
                                                                Tornar Disponível
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm(`Deseja realmente excluir o ${profLabel.singular.toLowerCase()} ${doctor.user?.full_name}?`)) {
                                                                    deleteMutation.mutate(doctor.id)
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )})
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <DoctorFormDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                doctorToEdit={editingDoctor}
            />
        </div>
    )
}

