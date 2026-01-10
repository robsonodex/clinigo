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
import { MoreVertical, Plus, Search, User, ShieldAlert, ShieldCheck, Trash2, Pencil, Calendar } from 'lucide-react'
import { DoctorFormDialog } from '@/components/forms/doctor-form-dialog'
import { type Doctor, api } from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'
import Link from 'next/link'

export default function DoctorsPage() {
    const { clinicId } = useRole()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])


    const { data: response, isLoading, error } = useQuery({
        queryKey: ['doctors', clinicId, page, search, statusFilter],
        queryFn: () =>
            api.getFull<Doctor[]>(`/doctors`, {
                page: page.toString(),
                pageSize: '10',
                search: search || undefined,
                is_accepting: statusFilter !== 'all' ? statusFilter : undefined,
            }),
    })

    const doctors = response?.data || []

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, is_accepting_appointments }: { id: string; is_accepting_appointments: boolean }) =>
            api.patch(`/doctors/${id}`, { is_accepting_appointments }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            toast.success('Status do médico atualizado')
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
            toast.success(data.message || 'Médicos atualizados com sucesso')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao atualizar médicos')
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api.delete(`/clinics/${clinicId}/doctors/bulk`, { ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            setSelectedIds([])
            toast.success('Médicos removidos com sucesso')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao remover médicos')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/doctors/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            toast.success('Médico desativado com sucesso')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao desativar médico')
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Médicos</h1>
                    <p className="text-muted-foreground">
                        Gerencie o corpo clínico e suas informações
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Médico
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
                                    if (confirm('Deseja realmente remover/desativar os médicos selecionados?')) {
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

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle>Listagem</CardTitle>
                        <div className="flex w-full sm:w-auto items-center gap-4">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome, CRM ou especialidade..."
                                    className="pl-8"
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
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="true">Disponíveis</SelectItem>
                                    <SelectItem value="false">Indisponíveis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={doctors.length > 0 && selectedIds.length === doctors.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Especialidade</TableHead>
                                    <TableHead>CRM</TableHead>
                                    <TableHead>Valor Consulta</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
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
                                            colSpan={7}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            Nenhum médico encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    doctors.map((doctor: Doctor) => (
                                        <TableRow key={doctor.id} className={selectedIds.includes(doctor.id) ? 'bg-muted/50' : ''}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(doctor.id)}
                                                    onCheckedChange={() => toggleSelect(doctor.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {getInitials(doctor.user?.full_name || '')}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{doctor.user?.full_name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {doctor.user?.email}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{doctor.specialty}</TableCell>
                                            <TableCell>
                                                {doctor.crm}/{doctor.crm_state}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrency(doctor.consultation_price)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        doctor.is_accepting_appointments
                                                            ? 'success'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {doctor.is_accepting_appointments
                                                        ? 'Ativo'
                                                        : 'Indisponível'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
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
                                                                if (confirm(`Deseja realmente desativar o médico ${doctor.user?.full_name}?`)) {
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
                                    ))
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

