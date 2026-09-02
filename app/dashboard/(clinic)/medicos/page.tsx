'use client'

import { useState } from 'react'
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
import { MoreVertical, Plus, Search, User, ShieldAlert, ShieldCheck, Trash2, Pencil, Calendar, Users, Stethoscope } from 'lucide-react'
import { DoctorFormDialog } from '@/components/forms/doctor-form-dialog'
import { type Doctor, api } from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'
import Link from 'next/link'
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
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #0EA5E9, #2563EB)' }}>
                        <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">{profLabel.plural}</h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Gerencie o corpo clínico e suas informações</p>
                    </div>
                </div>
                <Button onClick={handleCreate} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 text-sm font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    {profLabel.novo}
                </Button>
            </div>

            {selectedIds.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {selectedIds.length} selecionados
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: true })}
                                disabled={bulkUpdateMutation.isPending}
                            >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Reativar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: false })}
                                disabled={bulkUpdateMutation.isPending}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <ShieldAlert className="h-4 w-4 mr-2" />
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
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Barra de Busca Premium */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <Input
                        placeholder="Buscar por nome, CRM ou especialidade..."
                        className="pl-11 pr-4 h-11 bg-slate-50/50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800 rounded-xl focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 transition-all font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400/80"
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
                    <SelectTrigger className="w-full sm:w-[180px] h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        <SelectItem value="true">Disponíveis</SelectItem>
                        <SelectItem value="false">Indisponíveis</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tabela Premium */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden bg-white dark:bg-slate-900/40">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="w-[40px] py-3 px-4">
                                        <Checkbox
                                            checked={doctors.length > 0 && selectedIds.length === doctors.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nome</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Especialidade</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">CRM</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Valor Consulta</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Conexão</TableHead>
                                    <TableHead className="py-3 px-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell />
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-4 w-[150px]" />
                                                        <Skeleton className="h-3 w-[100px]" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-[80px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-[60px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-8 w-8 ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : doctors.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="h-32 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <Users className="h-7 w-7 text-slate-400" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Nenhum {profLabel.singular.toLowerCase()} encontrado</p>
                                                <p className="text-xs text-slate-400">Cadastre seu primeiro profissional para começar</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    doctors.map((doctor: Doctor) => {
                                        const gradients = [
                                            { from: '#4F46E5', to: '#06B6D4' },
                                            { from: '#0EA5E9', to: '#2563EB' },
                                            { from: '#10B981', to: '#059669' },
                                            { from: '#8B5CF6', to: '#D946EF' },
                                            { from: '#F59E0B', to: '#EF4444' }
                                        ]
                                        const name = doctor.user?.full_name || ''
                                        const charSum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
                                        const theme = gradients[charSum % gradients.length]
                                        return (
                                        <TableRow key={doctor.id} className={`group hover:bg-slate-50/40 dark:hover:bg-slate-850/30 border-none transition-all duration-200 ${selectedIds.includes(doctor.id) ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                                            <TableCell className="py-3 px-4">
                                                <Checkbox
                                                    checked={selectedIds.includes(doctor.id)}
                                                    onCheckedChange={() => toggleSelect(doctor.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="py-3 px-6 font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div
                                                            style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
                                                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm transition-transform duration-300 group-hover:scale-105"
                                                        >
                                                            {getInitials(name)}
                                                        </div>
                                                        {doctor.is_online && (
                                                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" title="Online agora" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-500 transition-colors">{doctor.user?.full_name}</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                                            {doctor.user?.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-6 text-sm text-slate-600 dark:text-slate-300">{doctor.specialty}</TableCell>
                                            <TableCell className="py-3 px-6">
                                                <code className="text-xs bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md text-slate-600 dark:text-slate-400 font-mono tracking-tight">{doctor.crm}/{doctor.crm_state}</code>
                                            </TableCell>
                                            <TableCell className="py-3 px-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                {formatCurrency(doctor.consultation_price)}
                                            </TableCell>
                                            <TableCell className="py-3 px-6">
                                                <Badge
                                                    variant={
                                                        doctor.is_accepting_appointments
                                                            ? 'success'
                                                            : 'secondary'
                                                    }
                                                    className="rounded-full text-[10px] font-semibold"
                                                >
                                                    {doctor.is_accepting_appointments
                                                        ? 'Ativo'
                                                        : 'Indisponível'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3 px-6">
                                                {doctor.is_online ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                        <span>Online</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                                        <span className="inline-flex rounded-full h-2 w-2 bg-slate-300 dark:bg-slate-700"></span>
                                                        <span>Offline</span>
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
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

