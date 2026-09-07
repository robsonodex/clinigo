'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Repeat,
    Calendar,
    Clock,
    User,
    Stethoscope,
    Search,
    Plus,
    Pencil,
    Trash2,
    Play,
    Pause,
    RefreshCw,
    Loader2,
    CalendarDays,
    Phone,
    ArrowUpRight,
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const DAYS_NAMES: Record<number, { full: string; short: string }> = {
    0: { full: 'Domingo', short: 'Dom' },
    1: { full: 'Segunda-feira', short: 'Seg' },
    2: { full: 'Terça-feira', short: 'Ter' },
    3: { full: 'Quarta-feira', short: 'Qua' },
    4: { full: 'Quinta-feira', short: 'Qui' },
    5: { full: 'Sexta-feira', short: 'Sex' },
    6: { full: 'Sábado', short: 'Sáb' },
}

interface RecurringSeries {
    id: string
    clinic_id: string
    patient_id: string
    doctor_id: string
    days_of_week: number[]
    appointment_time: string
    therapy_type?: string | null
    start_date: string
    end_date: string
    payment_type?: string | null
    appointment_type?: string | null
    notes?: string | null
    is_active: boolean
    created_at: string
    patient?: {
        id: string
        full_name: string
        phone?: string | null
    }
    doctor?: {
        id: string
        specialty: string
        user?: {
            full_name: string
        }
    }
    created_by_user?: {
        full_name: string
    }
}

interface RecurringSeriesListModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onNewSeries: () => void
    onEditSeries: (seriesId: string) => void
    onNavigateToDate: (dateStr: string, doctorId: string) => void
    initialDoctorId?: string
    doctors?: any[]
}

export function RecurringSeriesListModal({
    open,
    onOpenChange,
    onNewSeries,
    onEditSeries,
    onNavigateToDate,
    initialDoctorId,
    doctors: doctorsProp,
}: RecurringSeriesListModalProps) {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('ALL')
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED'>('ALL')
    const [cancellingSeriesId, setCancellingSeriesId] = useState<string | null>(null)
    const [seriesToCancelName, setSeriesToCancelName] = useState('')
    const [isCancelling, setIsCancelling] = useState(false)

    // Sincronizar filtro de profissional ao abrir modal
    useEffect(() => {
        if (open) {
            if (initialDoctorId) {
                setSelectedDoctorFilter(initialDoctorId)
            } else {
                setSelectedDoctorFilter('ALL')
            }
        }
    }, [open, initialDoctorId])

    // Fetch recurring series
    const {
        data: seriesList,
        isLoading,
        isRefetching,
        refetch,
    } = useQuery({
        queryKey: ['recurring-series-list'],
        queryFn: async () => {
            const res = await fetch('/api/appointments/recurring?active=false')
            if (!res.ok) throw new Error('Erro ao carregar séries recorrentes')
            const data = await res.json()
            return (Array.isArray(data) ? data : (data?.series || data?.data || [])) as RecurringSeries[]
        },
        enabled: open,
        staleTime: 30 * 1000,
    })

    // Fetch doctors for filter (ou usa lista repassada da tela de agenda)
    const { data: doctorsFromApi } = useQuery({
        queryKey: ['doctors-for-series-filter'],
        queryFn: async () => api.get<any[]>('/doctors', { pageSize: '100' }),
        enabled: open && (!doctorsProp || doctorsProp.length === 0),
        staleTime: 5 * 60 * 1000,
    })
    const doctors = (doctorsProp && doctorsProp.length > 0 ? doctorsProp : doctorsFromApi) || []

    // Toggle active status mutation
    const toggleStatusMutation = useMutation({
        mutationFn: async ({ seriesId, isActive }: { seriesId: string; isActive: boolean }) => {
            const res = await fetch(`/api/appointments/recurring/${seriesId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: isActive }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao alterar status da série')
            return data
        },
        onSuccess: (_, variables) => {
            toast.success(variables.isActive ? 'Série reativada com sucesso' : 'Série pausada com sucesso')
            queryClient.invalidateQueries({ queryKey: ['recurring-series-list'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
        },
        onError: (err: Error) => {
            toast.error(err.message)
        },
    })

    // Cancel series mutation
    const cancelSeries = async () => {
        if (!cancellingSeriesId) return
        setIsCancelling(true)
        try {
            const res = await fetch(`/api/appointments/recurring/${cancellingSeriesId}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar série recorrente')
            toast.success(data.message || 'Série recorrente cancelada com sucesso')
            queryClient.invalidateQueries({ queryKey: ['recurring-series-list'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            setCancellingSeriesId(null)
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cancelar série')
        } finally {
            setIsCancelling(false)
        }
    }

    // Filter series
    const filteredSeries = useMemo(() => {
        if (!seriesList || !Array.isArray(seriesList)) return []
        const search = searchTerm.trim().toLowerCase()
        return seriesList.filter((item) => {
            const matchesSearch =
                !search ||
                item.patient?.full_name?.toLowerCase().includes(search) ||
                item.doctor?.user?.full_name?.toLowerCase().includes(search) ||
                item.therapy_type?.toLowerCase().includes(search)

            const matchesDoctor =
                selectedDoctorFilter === 'ALL' || item.doctor_id === selectedDoctorFilter

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && item.is_active) ||
                (statusFilter === 'PAUSED' && !item.is_active)

            return matchesSearch && matchesDoctor && matchesStatus
        })
    }, [seriesList, searchTerm, selectedDoctorFilter, statusFilter])

    const totalActive = useMemo(() => {
        if (!seriesList || !Array.isArray(seriesList)) return 0
        return seriesList.filter((s) => s.is_active).length
    }, [seriesList])

    const formatDays = (days: number[]) => {
        if (!days || days.length === 0) return 'Nenhum dia'
        if (days.length === 1) return `Toda ${DAYS_NAMES[days[0]]?.full || 'Data'}`
        return days.map((d) => DAYS_NAMES[d]?.short || d).join(', ')
    }

    const formatDateBR = (dateStr?: string) => {
        if (!dateStr) return '-'
        const parts = dateStr.split('-')
        if (parts.length !== 3) return dateStr
        return `${parts[2]}/${parts[1]}/${parts[0]}`
    }

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                    {/* Header */}
                    <DialogHeader className="p-5 pb-4 border-b shrink-0 bg-slate-50/80 dark:bg-slate-900/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                    <Repeat className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Central de Agendamentos Recorrentes</span>
                                    <Badge variant="outline" className="ml-2 font-normal text-xs bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                                        {totalActive} {totalActive === 1 ? 'série ativa' : 'séries ativas'}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-1">
                                    Consulte, confirme, edite e gerencie os horários fixos semanais dos pacientes na clínica.
                                </DialogDescription>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetch()}
                                    disabled={isRefetching}
                                    className="h-9 px-3 gap-1.5 text-xs min-h-[44px] sm:min-h-[36px]"
                                    title="Recarregar lista"
                                >
                                    <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
                                    <span>Atualizar</span>
                                </Button>
                                <Button
                                    onClick={onNewSeries}
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-3.5 gap-1.5 text-xs font-semibold shadow-xs min-h-[44px] sm:min-h-[36px]"
                                    title="Criar novo agendamento recorrente"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Nova Série</span>
                                </Button>
                            </div>
                        </div>

                        {/* Filtros e Busca */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                            <div className="relative sm:col-span-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar paciente, terapeuta ou especialidade..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-10 text-base sm:text-sm bg-background"
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter}>
                                    <SelectTrigger className="h-10 text-xs sm:text-sm bg-background">
                                        <SelectValue placeholder="Profissional" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="ALL">Todos os Profissionais</SelectItem>
                                        {doctors?.filter((d: any) => d?.id).map((doc: any) => {
                                            const docName = doc.user?.full_name || doc.full_name || 'Profissional'
                                            return (
                                                <SelectItem key={doc.id} value={doc.id}>
                                                    {docName} {doc.specialty ? `(${doc.specialty})` : ''}
                                                </SelectItem>
                                            )
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-3">
                                <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                                    <SelectTrigger className="h-10 text-xs sm:text-sm bg-background">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="z-[9999]">
                                        <SelectItem value="ALL">Todos os Status</SelectItem>
                                        <SelectItem value="ACTIVE">Apenas Ativas</SelectItem>
                                        <SelectItem value="PAUSED">Apenas Pausadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Content List */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                        {isLoading ? (
                            <div className="py-16 text-center space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
                                <p className="text-sm text-muted-foreground">Carregando séries recorrentes da clínica...</p>
                            </div>
                        ) : filteredSeries.length === 0 ? (
                            <div className="py-16 text-center border-2 border-dashed rounded-xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
                                <Repeat className="h-10 w-10 mx-auto text-slate-400 mb-3 opacity-60" />
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                    {searchTerm || selectedDoctorFilter !== 'ALL' || statusFilter !== 'ALL'
                                        ? 'Nenhuma série encontrada para os filtros aplicados'
                                        : 'Nenhuma série recorrente cadastrada'}
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
                                    Séries recorrentes criam automaticamente agendamentos semanais para tratamentos continuados na clínica.
                                </p>
                                <Button
                                    onClick={onNewSeries}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold h-10 px-4 min-h-[44px]"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Cadastrar Primeira Série</span>
                                </Button>
                            </div>
                        ) : (
                            filteredSeries.map((item) => {
                                const doctorName = item.doctor?.user?.full_name || 'Profissional'
                                const patientName = item.patient?.full_name || 'Paciente'
                                const timeStr = item.appointment_time?.substring(0, 5) || 'Horário'

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "rounded-xl border p-4 transition-all duration-200 bg-card hover:shadow-sm space-y-3",
                                            !item.is_active && "opacity-75 bg-slate-50 dark:bg-slate-950/40 border-slate-200"
                                        )}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            {/* Informações Principais */}
                                            <div className="space-y-1.5 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold text-base text-foreground flex items-center gap-1.5">
                                                        <User className="h-4 w-4 text-emerald-600 shrink-0" />
                                                        {patientName}
                                                    </span>
                                                    {item.patient?.phone && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Phone className="h-3 w-3" />
                                                            {item.patient.phone}
                                                        </span>
                                                    )}
                                                    <Badge
                                                        variant={item.is_active ? 'default' : 'secondary'}
                                                        className={cn(
                                                            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5",
                                                            item.is_active
                                                                ? "bg-emerald-600 text-white"
                                                                : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                                        )}
                                                    >
                                                        {item.is_active ? 'Ativa' : 'Pausada'}
                                                    </Badge>
                                                    {item.payment_type && (
                                                        <Badge variant="outline" className="text-[10px] uppercase font-medium">
                                                            {item.payment_type}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                        <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                                                        {doctorName}
                                                    </span>
                                                    {item.doctor?.specialty && (
                                                        <span className="text-slate-500">({item.doctor.specialty})</span>
                                                    )}
                                                    {item.therapy_type && (
                                                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                                            {item.therapy_type}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Detalhes de Agenda (Dia, Hora, Período) */}
                                            <div className="flex items-center sm:flex-col sm:items-end gap-1.5 shrink-0 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                                                    <Clock className="h-3.5 w-3.5 text-emerald-600" />
                                                    <span>{formatDays(item.days_of_week)} às {timeStr}</span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <CalendarDays className="h-3 w-3" />
                                                    <span>{formatDateBR(item.start_date)} até {formatDateBR(item.end_date)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rodapé do Card com Ações */}
                                        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-850 flex flex-wrap items-center justify-between gap-2">
                                            <div className="text-[11px] text-slate-400">
                                                {item.created_by_user?.full_name
                                                    ? `Cadastrado por ${item.created_by_user.full_name}`
                                                    : `Criado em ${formatDateBR(item.created_at?.split('T')[0])}`}
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* Botão Ver na Agenda */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onNavigateToDate(item.start_date, item.doctor_id)}
                                                    className="h-9 px-2.5 text-xs gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 min-h-[44px] sm:min-h-[36px]"
                                                    title="Visualizar agendamento na grade do calendário"
                                                >
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span>Ver na Agenda</span>
                                                    <ArrowUpRight className="h-3 w-3 opacity-60" />
                                                </Button>

                                                {/* Botão Editar Série */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onEditSeries(item.id)}
                                                    className="h-9 px-2.5 text-xs gap-1.5 font-medium min-h-[44px] sm:min-h-[36px]"
                                                    title="Modificar dia, horário ou observações da série"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                    <span>Editar</span>
                                                </Button>

                                                {/* Botão Pausar / Retomar */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleStatusMutation.mutate({
                                                        seriesId: item.id,
                                                        isActive: !item.is_active,
                                                    })}
                                                    disabled={toggleStatusMutation.isPending}
                                                    className="h-9 px-2.5 text-xs gap-1 text-slate-600 dark:text-slate-300 min-h-[44px] sm:min-h-[36px]"
                                                    title={item.is_active ? "Pausar agendamentos futuros da série" : "Retomar agendamentos da série"}
                                                >
                                                    {item.is_active ? (
                                                        <>
                                                            <Pause className="h-3.5 w-3.5 text-amber-600" />
                                                            <span>Pausar</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-3.5 w-3.5 text-emerald-600" />
                                                            <span>Retomar</span>
                                                        </>
                                                    )}
                                                </Button>

                                                {/* Botão Cancelar Série */}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setCancellingSeriesId(item.id)
                                                        setSeriesToCancelName(`${patientName} (${formatDays(item.days_of_week)} às ${timeStr})`)
                                                    }}
                                                    className="h-9 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 min-h-[44px] sm:min-h-[36px]"
                                                    title="Cancelar toda a série recorrente e seus agendamentos futuros"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    <span className="hidden sm:inline">Cancelar</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between shrink-0">
                        <span className="text-xs text-muted-foreground">
                            Mostrando {filteredSeries.length} de {seriesList?.length || 0} séries cadastradas
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="h-10 px-5 text-xs font-semibold min-h-[44px]"
                        >
                            Fechar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmação de Cancelamento de Série */}
            <AlertDialog open={!!cancellingSeriesId} onOpenChange={(open) => !open && setCancellingSeriesId(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                            <Trash2 className="h-5 w-5" />
                            Cancelar Série Recorrente
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-sm text-foreground">
                            <p>
                                Tem certeza que deseja cancelar a série recorrente de <strong>{seriesToCancelName}</strong>?
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Esta ação cancelará permanentemente todos os agendamentos futuros não realizados desta série. As sessões que já foram concluídas ou realizadas no passado serão mantidas no histórico.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0 mt-3">
                        <AlertDialogCancel
                            disabled={isCancelling}
                            className="h-10 px-4 text-xs font-semibold min-h-[44px]"
                        >
                            Voltar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                cancelSeries()
                            }}
                            disabled={isCancelling}
                            className="bg-red-600 hover:bg-red-700 text-white h-10 px-4 text-xs font-semibold min-h-[44px]"
                        >
                            {isCancelling ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                    Cancelando...
                                </>
                            ) : (
                                'Confirmar Cancelamento'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
