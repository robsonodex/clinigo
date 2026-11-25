'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import {
    Plus,
    Search,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    Pencil,
    Calendar,
    Users,
    DollarSign,
    Download,
    FileSpreadsheet,
    FileText,
    Loader2,
    Eye,
    ChevronRight,
} from 'lucide-react'
import { DoctorFormDialog } from '@/components/forms/doctor-form-dialog'
import { type Doctor, api } from '@/lib/api-client'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'
import { exportDoctorsToExcel, exportDoctorsToCSV } from '@/lib/utils/export-doctors'

export default function DoctorsPage() {
    const router = useRouter()
    const { clinicId, role } = useRole()
    const queryClient = useQueryClient()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null)
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const profLabel = useProfessionalLabel()
    const searchParams = useSearchParams()

    const handleExportExcel = async () => {
        if (!doctors || doctors.length === 0) {
            toast.error(`Nenhum ${profLabel.singular.toLowerCase()} para exportar.`)
            return
        }

        setIsExporting(true)
        try {
            await exportDoctorsToExcel(doctors, profLabel, `corpo_clinico_${profLabel.plural.toLowerCase()}`)
            toast.success(`Relação de ${doctors.length} ${profLabel.plural.toLowerCase()} exportada com sucesso em Excel.`)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao exportar Excel')
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportCSV = () => {
        if (!doctors || doctors.length === 0) {
            toast.error(`Nenhum ${profLabel.singular.toLowerCase()} para exportar.`)
            return
        }

        setIsExporting(true)
        try {
            exportDoctorsToCSV(doctors, profLabel, `corpo_clinico_${profLabel.plural.toLowerCase()}`)
            toast.success(`Relação de ${doctors.length} ${profLabel.plural.toLowerCase()} exportada com sucesso em CSV.`)
        } catch (error: any) {
            toast.error(error.message || 'Erro ao exportar CSV')
        } finally {
            setIsExporting(false)
        }
    }

    useEffect(() => {
        if (searchParams.get('action') === 'novo') {
            setEditingDoctor(null)
            setIsDialogOpen(true)
        }
    }, [searchParams])

    const { data: response, isLoading } = useQuery({
        queryKey: ['doctors', clinicId, page, search, statusFilter],
        queryFn: () =>
            api.getFull<Doctor[]>(`/doctors`, {
                page: page.toString(),
                pageSize: '100',
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
        },
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
        },
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api.delete(`/clinics/${clinicId}/doctors/bulk`, { ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            setSelectedIds([])
            setBulkDeleteOpen(false)
            toast.success(`${profLabel.plural} removidos com sucesso`)
        },
        onError: (err: any) => {
            toast.error(err.message || `Erro ao remover ${profLabel.plural.toLowerCase()}`)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/doctors/detail?id=${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['doctors', clinicId] })
            setDoctorToDelete(null)
            toast.success(`${profLabel.singular} excluído com sucesso`)
        },
        onError: (err: any) => {
            toast.error(err.message || `Erro ao excluir ${profLabel.singular.toLowerCase()}`)
        },
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

    const isAdmin = role === 'CLINIC_ADMIN' || role === 'SUPER_ADMIN'

    return (
        <div className="space-y-5 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div>
                    <h1 className="text-xl font-semibold text-foreground tracking-tight">{profLabel.plural}</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Gerencie o corpo clínico e suas informações</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                disabled={isExporting || (doctors && doctors.length === 0)}
                                className="h-9 min-h-[44px] sm:min-h-[36px] rounded-md border-border text-foreground px-3 text-xs font-medium shadow-none"
                            >
                                {isExporting ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-muted-foreground" />
                                ) : (
                                    <Download className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                )}
                                {isExporting ? 'Exportando...' : 'Exportar'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-popover border border-border shadow-md">
                            <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer text-xs py-2">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" />
                                Exportar Excel (.xlsx)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer text-xs py-2">
                                <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                Exportar CSV (.csv)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={handleCreate} className="rounded-md bg-primary hover:bg-primary/90 text-white shadow-none h-9 px-4 text-xs font-medium min-h-[44px] sm:min-h-[36px]">
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        {profLabel.novo}
                    </Button>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <Card className="rounded-md bg-muted/40 border border-border">
                    <CardContent className="py-2.5 px-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">
                            {selectedIds.length} selecionado(s)
                        </span>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: true })}
                                disabled={bulkUpdateMutation.isPending}
                                className="rounded-md h-8 min-h-[36px] sm:min-h-[32px] text-xs"
                            >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                                Reativar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_accepting_appointments: false })}
                                disabled={bulkUpdateMutation.isPending}
                                className="rounded-md h-8 min-h-[36px] sm:min-h-[32px] text-xs text-destructive hover:bg-destructive/10"
                            >
                                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                                Indisponibilizar
                            </Button>
                            {isAdmin && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setBulkDeleteOpen(true)}
                                    disabled={bulkDeleteMutation.isPending}
                                    className="rounded-md h-8 min-h-[36px] sm:min-h-[32px] text-xs"
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                    Excluir Selecionados
                                </Button>
                            )}
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

            {/* Tabela Enterprise com Ações Rápidas Visíveis (mesma lógica de /dashboard/pacientes) */}
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
                                            aria-label="Selecionar todos os profissionais"
                                        />
                                    </TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Nome</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Especialidade</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Registro</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Valor Consulta</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden 2xl:table-cell">Conexão</TableHead>
                                    <TableHead className="py-2.5 px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">Ações Rápidas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-3 px-3"><Skeleton className="h-4 w-4" /></TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-8 w-8 rounded-md" />
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-3.5 w-[140px]" />
                                                        <Skeleton className="h-3 w-[90px]" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[80px]" /></TableCell>
                                            <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[70px]" /></TableCell>
                                            <TableCell className="hidden xl:table-cell"><Skeleton className="h-4 w-[70px]" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                                            <TableCell className="hidden 2xl:table-cell"><Skeleton className="h-4 w-[50px]" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-[240px] ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : doctors.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center">
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
                                            <TableRow
                                                key={doctor.id}
                                                onClick={() => router.push(`/dashboard/medicos/${doctor.id}`)}
                                                className={`group hover:bg-[#FAFAF8] dark:hover:bg-slate-850/30 border-b border-border/60 transition-colors cursor-pointer ${selectedIds.includes(doctor.id) ? 'bg-primary/5' : ''}`}
                                            >
                                                <TableCell
                                                    className="py-2.5 px-3"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Checkbox
                                                        checked={selectedIds.includes(doctor.id)}
                                                        onCheckedChange={() => toggleSelect(doctor.id)}
                                                        aria-label={`Selecionar ${name}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 font-normal">
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative shrink-0">
                                                            <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-xs font-medium group-hover:border-[#155E4B]/40 group-hover:bg-[#E6F2EE] group-hover:text-[#114D3E] transition-colors">
                                                                {getInitials(name)}
                                                            </div>
                                                            {doctor.is_online && (
                                                                <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-1">
                                                                <Link
                                                                    href={`/dashboard/medicos/${doctor.id}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="font-semibold text-foreground text-xs sm:text-sm group-hover:text-[#155E4B] dark:group-hover:text-emerald-400 group-hover:underline underline-offset-2 transition-colors truncate"
                                                                >
                                                                    {doctor.user?.full_name}
                                                                </Link>
                                                                <ChevronRight className="w-3.5 h-3.5 text-[#155E4B] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground truncate">
                                                                {doctor.user?.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 text-xs text-muted-foreground hidden md:table-cell">
                                                    {doctor.specialty || '—'}
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 hidden lg:table-cell">
                                                    <code className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded-xs text-muted-foreground font-mono">
                                                        {(() => {
                                                            if (!doctor.crm) return '—'
                                                            const councilPrefix = (doctor as any).council_name ? `${(doctor as any).council_name} ` : ''
                                                            const hasPrefix = /^[a-zA-Z]{3,7}/.test(doctor.crm.trim())
                                                            const displayStr = hasPrefix ? doctor.crm : `${councilPrefix}${doctor.crm}`
                                                            return `${displayStr}${doctor.crm_state ? `/${doctor.crm_state}` : ''}`
                                                        })()}
                                                    </code>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 text-xs font-medium text-foreground hidden xl:table-cell">
                                                    {formatCurrency(doctor.consultation_price)}
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4">
                                                    <Badge
                                                        variant={doctor.is_accepting_appointments ? 'outline' : 'secondary'}
                                                        className={doctor.is_accepting_appointments
                                                            ? 'rounded-xs text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/60'
                                                            : 'rounded-xs text-[10px] font-medium px-2 py-0.5'
                                                        }
                                                    >
                                                        {doctor.is_accepting_appointments ? 'Ativo' : 'Indisponível'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2.5 px-4 hidden 2xl:table-cell">
                                                    {doctor.is_online ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            <span>Online</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-normal">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                                                            <span>Offline</span>
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    className="py-2.5 px-4 text-right"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-end gap-1.5 flex-wrap sm:flex-nowrap">
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => router.push(`/dashboard/medicos/${doctor.id}`)}
                                                            className="h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md bg-[#E6F2EE] hover:bg-[#155E4B] text-[#114D3E] hover:text-white border border-[#C4E1D7] text-xs font-semibold gap-1.5 shadow-none transition-colors whitespace-nowrap"
                                                            title={`Abrir ficha e valores de ${name}`}
                                                        >
                                                            <Eye className="w-3.5 h-3.5 shrink-0" />
                                                            <span>Abrir Ficha</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.push(`/dashboard/medicos/${doctor.id}?tab=contratos-termos`)}
                                                            className="h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap"
                                                            title="Contratos e Termos do profissional"
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5 text-[#155E4B] shrink-0" />
                                                            <span className="hidden sm:inline">Contratos</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.push(`/dashboard/medicos/${doctor.id}`)}
                                                            className="h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap"
                                                            title="Configurar valores e repasses por paciente"
                                                        >
                                                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                                                            <span className="hidden sm:inline">Valores</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.push(`/dashboard/horarios?doctor_id=${doctor.id}`)}
                                                            className="h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap"
                                                            title="Gerenciar grade de horários"
                                                        >
                                                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                            <span className="hidden sm:inline">Horários</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(doctor)}
                                                            className="h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap"
                                                            title={`Editar cadastro de ${name}`}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                            <span className="hidden sm:inline">Editar</span>
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={updateStatusMutation.isPending}
                                                            onClick={() =>
                                                                updateStatusMutation.mutate({
                                                                    id: doctor.id,
                                                                    is_accepting_appointments: !doctor.is_accepting_appointments,
                                                                })
                                                            }
                                                            className={
                                                                doctor.is_accepting_appointments
                                                                    ? 'h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap'
                                                                    : 'h-8 min-h-[36px] sm:min-h-[32px] px-2.5 rounded-md border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-medium gap-1.5 shadow-none whitespace-nowrap'
                                                            }
                                                            title={
                                                                doctor.is_accepting_appointments
                                                                    ? 'Indisponibilizar para novos agendamentos'
                                                                    : 'Tornar disponível para agendamentos'
                                                            }
                                                        >
                                                            {doctor.is_accepting_appointments ? (
                                                                <>
                                                                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="hidden xl:inline">Indisponibilizar</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="hidden xl:inline">Ativar</span>
                                                                </>
                                                            )}
                                                        </Button>

                                                        {isAdmin && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setDoctorToDelete(doctor)}
                                                                className="h-8 min-h-[36px] sm:min-h-[32px] px-2 rounded-md border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium gap-1 shadow-none whitespace-nowrap"
                                                                title={`Excluir ${name}`}
                                                                aria-label={`Excluir ${name}`}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
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

            {/* Modal de Confirmação de Exclusão Individual de Profissional */}
            <Dialog open={!!doctorToDelete} onOpenChange={(open) => !open && !deleteMutation.isPending && setDoctorToDelete(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            Excluir {profLabel.singular}
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm text-foreground">
                            Tem certeza que deseja excluir permanentemente o {profLabel.singular.toLowerCase()} <strong>{doctorToDelete?.user?.full_name}</strong>?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3 text-xs text-red-700 dark:text-red-300">
                        Esta ação é permanente e irreversível. O perfil profissional será removido, as dependências de agenda desvinculadas e o usuário correspondente será excluído do sistema.
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => setDoctorToDelete(null)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            className="min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => doctorToDelete && deleteMutation.mutate(doctorToDelete.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Definitivamente'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Confirmação de Exclusão em Massa (diálogo formal) */}
            <Dialog open={bulkDeleteOpen} onOpenChange={(open) => !open && !bulkDeleteMutation.isPending && setBulkDeleteOpen(false)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            Excluir {selectedIds.length} {profLabel.plural}
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm text-foreground">
                            Você selecionou <strong>{selectedIds.length}</strong> {profLabel.plural.toLowerCase()} para remover/desativar. Deseja confirmar esta operação?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => setBulkDeleteOpen(false)}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            className="min-h-[44px] bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => bulkDeleteMutation.mutate(selectedIds)}
                            disabled={bulkDeleteMutation.isPending}
                        >
                            {bulkDeleteMutation.isPending ? 'Excluindo...' : 'Confirmar Exclusão'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
