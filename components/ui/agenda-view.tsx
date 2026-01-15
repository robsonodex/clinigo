'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Video,
    Clock,
    User,
    MoreVertical,
    X,
    CreditCard,
    PlusCircle,
    Loader2
} from 'lucide-react'
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addWeeks,
    subWeeks,
    startOfDay,
    parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Appointment } from '@/lib/api-client'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'
import { ManualAppointmentModal } from '@/components/appointments/ManualAppointmentModal'
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal'
import { AlertTriangle } from 'lucide-react'

const TIME_SLOTS = Array.from({ length: 19 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9 // Start at 09:00
    const minute = i % 2 === 0 ? '00' : '30'
    return `${String(hour).padStart(2, '0')}:${minute}`
})

export default function AgendaPage() {
    const router = useRouter()
    const { isDoctor } = useRole()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [view, setView] = useState<'week' | 'day'>('week')
    const [manualAppointmentOpen, setManualAppointmentOpen] = useState(false)
    const [preselectedSlot, setPreselectedSlot] = useState<{ date: string; time: string } | null>(null)

    // Details Modal
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [detailsModalOpen, setDetailsModalOpen] = useState(false)

    // Drag and Drop
    const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null)
    const [dropTarget, setDropTarget] = useState<{ date: Date; time: string } | null>(null)
    const [rescheduleConfirmOpen, setRescheduleConfirmOpen] = useState(false)

    // Date navigation
    const currentDate = startOfDay(selectedDate)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const nextPeriod = () => {
        if (view === 'week') setSelectedDate(addWeeks(currentDate, 1))
        else setSelectedDate(addDays(currentDate, 1))
    }

    const prevPeriod = () => {
        if (view === 'week') setSelectedDate(subWeeks(currentDate, 1))
        else setSelectedDate(addDays(currentDate, -1))
    }

    const goToToday = () => setSelectedDate(new Date())

    // Fetch appointments with caching
    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments', view, currentDate.toISOString()],
        queryFn: () =>
            api.get<Appointment[]>('/appointments', {
                date_from: view === 'week' ? format(weekStart, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'),
                date_to: view === 'week' ? format(weekEnd, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'),
            }),
        staleTime: 60 * 1000, // 1 minute cache
        refetchOnWindowFocus: false,
    })

    // Group appointments by date and time
    const getAppointment = (date: Date, time: string) => {
        if (!appointments) return null
        const dateStr = format(date, 'yyyy-MM-dd')
        return appointments.find(
            (a) =>
                a.appointment_date === dateStr &&
                a.appointment_time.substring(0, 5) === time
        )
    }

    // Calculate cell height based on duration (simple version: 1 slot = 30min)
    // For now we just show slot by slot. 

    // Cancellation logic
    const [cancellingId, setCancellingId] = useState<string | null>(null)
    const [cancelReason, setCancelReason] = useState('')
    const queryClient = useQueryClient()

    const cancelMutation = useMutation({
        mutationFn: async () => {
            if (!cancellingId) return
            await api.post(`/appointments/${cancellingId}/cancel`, {
                cancellation_reason: cancelReason,
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            setCancellingId(null)
            setCancelReason('')
            toast.success('Agendamento cancelado')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    // Reschedule Mutation
    const rescheduleMutation = useMutation({
        mutationFn: async () => {
            if (!draggedAppointment || !dropTarget) return

            const newDate = format(dropTarget.date, 'yyyy-MM-dd')

            await api.patch(`/appointments/${draggedAppointment.id}`, {
                appointment_date: newDate,
                appointment_time: dropTarget.time
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            setRescheduleConfirmOpen(false)
            setDraggedAppointment(null)
            setDropTarget(null)
            toast.success('Agendamento remarcado com sucesso')
        },
        onError: (error: Error) => {
            toast.error('Erro ao remarcar: ' + error.message)
            setRescheduleConfirmOpen(false)
        },
    })

    // Drag Handlers
    const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
        e.dataTransfer.setData('appointmentId', appointment.id)
        e.dataTransfer.effectAllowed = 'move'
        setDraggedAppointment(appointment)
    }

    const handleDragOver = (e: React.DragEvent, date: Date, time: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
    }

    const handleDrop = (e: React.DragEvent, date: Date, time: string) => {
        e.preventDefault()
        if (!draggedAppointment) return

        // Check if dropping on same slot
        if (draggedAppointment.appointment_date === format(date, 'yyyy-MM-dd') &&
            draggedAppointment.appointment_time.substring(0, 5) === time) {
            setDraggedAppointment(null)
            return
        }

        setDropTarget({ date, time })
        setRescheduleConfirmOpen(true)
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold">Agenda</h1>
                    <div className="flex items-center border rounded-md bg-white">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={prevPeriod}
                            className="h-8 w-8"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm font-medium min-w-[140px] text-center">
                            {view === 'week' ? (
                                <>
                                    {format(weekStart, 'd MMM', { locale: ptBR })} -{' '}
                                    {format(weekEnd, 'd MMM', { locale: ptBR })}
                                </>
                            ) : (
                                format(currentDate, "d 'de' MMMM", { locale: ptBR })
                            )}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={nextPeriod}
                            className="h-8 w-8"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Hoje
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                            setPreselectedSlot(null)
                            setManualAppointmentOpen(true)
                        }}
                    >
                        <PlusCircle className="h-4 w-4" />
                        Novo Agendamento
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={view === 'day' ? 'default' : 'outline'}
                        onClick={() => setView('day')}
                        size="sm"
                    >
                        Dia
                    </Button>
                    <Button
                        variant={view === 'week' ? 'default' : 'outline'}
                        onClick={() => setView('week')}
                        size="sm"
                    >
                        Semana
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="flex-1 overflow-auto">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 border-b sticky top-0 bg-white z-10">
                        <div className="p-4 text-xs font-medium text-muted-foreground border-r text-center">
                            Horário
                        </div>
                        {(view === 'week' ? days : [currentDate]).map((day) => (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    'p-4 text-center border-r last:border-r-0',
                                    isSameDay(day, new Date()) && 'bg-blue-50'
                                )}
                            >
                                <div className="text-xs font-medium text-muted-foreground uppercase">
                                    {format(day, 'EEE', { locale: ptBR })}
                                </div>
                                <div
                                    className={cn(
                                        'text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1',
                                        isSameDay(day, new Date())
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-foreground'
                                    )}
                                >
                                    {format(day, 'd')}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Time Slots */}
                    <div className="relative">
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                                <Skeleton className="w-full h-full" />
                            </div>
                        )}

                        {TIME_SLOTS.map((time) => (
                            <div key={time} className="grid grid-cols-8 border-b min-h-[80px]">
                                {/* Time Label */}
                                <div className="p-2 text-xs text-muted-foreground text-center border-r font-medium -mt-2">
                                    {time}
                                </div>

                                {/* Day Columns */}
                                {(view === 'week' ? days : [currentDate]).map((day) => {
                                    const appointment = getAppointment(day, time)

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={cn(
                                                'border-r last:border-r-0 p-1 relative group hover:bg-muted/30 transition-colors cursor-pointer',
                                                !isSameMonth(day, currentDate) && 'bg-gray-50/50'
                                            )}
                                            onClick={() => {
                                                if (!appointment) {
                                                    setPreselectedSlot({
                                                        date: format(day, 'yyyy-MM-dd'),
                                                        time: time
                                                    })
                                                    setManualAppointmentOpen(true)
                                                }
                                            }}
                                            onDragOver={(e) => !appointment && handleDragOver(e, day, time)}
                                            onDrop={(e) => !appointment && handleDrop(e, day, time)}
                                        >
                                            {appointment ? (
                                                <div
                                                    draggable={appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED'}
                                                    onDragStart={(e) => handleDragStart(e, appointment)}
                                                    className={cn(
                                                        'w-full h-full rounded-md border p-2 text-xs flex flex-col justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow',
                                                        appointment.status === 'CONFIRMED'
                                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                                            : appointment.status === 'PENDING_PAYMENT'
                                                                ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                                                                : 'bg-gray-50 border-gray-200 text-gray-500', // Completed/Cancelled
                                                        draggedAppointment?.id === appointment.id && 'opacity-50 border-dashed'
                                                    )}
                                                    onClick={() => {
                                                        setSelectedAppointment(appointment)
                                                        setDetailsModalOpen(true)
                                                    }}
                                                >
                                                    <div>
                                                        <div className="font-semibold truncate">
                                                            {appointment.patient.full_name}
                                                        </div>
                                                        <div className="text-[10px] opacity-80 mt-1 capitalize">
                                                            {isDoctor ? appointment.status.replace('_', ' ').toLowerCase() : `Dr. ${appointment.doctor.user.full_name}`}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        {appointment.status === 'CONFIRMED' && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="px-1 py-0 h-5 text-[10px] bg-white/50"
                                                            >
                                                                <Video className="w-3 h-3 mr-1" />
                                                                Meet
                                                            </Badge>
                                                        )}

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 hover:bg-black/10">
                                                                    <MoreVertical className="w-3 h-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => {
                                                                    setSelectedAppointment(appointment)
                                                                    setDetailsModalOpen(true)
                                                                }}>
                                                                    <User className="w-4 h-4 mr-2" />
                                                                    Ver Detalhes
                                                                </DropdownMenuItem>
                                                                {(appointment.status === 'CONFIRMED' || appointment.status === 'PENDING_PAYMENT') && (
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => setCancellingId(appointment.id)}
                                                                    >
                                                                        <X className="w-4 h-4 mr-2" />
                                                                        Cancelar
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Cancel Dialog */}
            <Dialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cancelar Agendamento</DialogTitle>
                        <DialogDescription>
                            O paciente será notificado e o reembolso será processado se aplicável.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Motivo do cancelamento</Label>
                            <Textarea
                                placeholder="Informe o motivo..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancellingId(null)}>Voltar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => cancelMutation.mutate()}
                            disabled={cancelMutation.isPending || !cancelReason}
                        >
                            {cancelMutation.isPending && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            )}
                            Confirmar Cancelamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Appointment Modal */}
            <ManualAppointmentModal
                open={manualAppointmentOpen}
                onOpenChange={(open) => {
                    setManualAppointmentOpen(open)
                    if (!open) setSelectedAppointment(null)
                }}
                preselectedDate={preselectedSlot?.date}
                preselectedTime={preselectedSlot?.time}
                appointmentToEdit={selectedAppointment}
            />

            <AppointmentDetailsModal
                appointment={selectedAppointment}
                open={detailsModalOpen}
                onOpenChange={setDetailsModalOpen}
                onEdit={(apt) => {
                    setSelectedAppointment(apt)
                    setDetailsModalOpen(false)
                    setManualAppointmentOpen(true)
                }}
            />

            {/* Reschedule Confirmation Dialog */}
            <Dialog open={rescheduleConfirmOpen} onOpenChange={setRescheduleConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Confirmar Reagendamento
                        </DialogTitle>
                        <DialogDescription>
                            Você está movendo o agendamento de <strong>{draggedAppointment?.patient.full_name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {draggedAppointment && dropTarget && (
                        <div className="py-4 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="text-sm">
                                    <p className="text-muted-foreground">Original</p>
                                    <p className="font-medium">
                                        {format(new Date(draggedAppointment.appointment_date), "dd/MM 'às' ")}
                                        {draggedAppointment.appointment_time.substring(0, 5)}
                                    </p>
                                </div>
                                <div className="text-primary">➔</div>
                                <div className="text-sm text-right">
                                    <p className="text-muted-foreground">Novo Horário</p>
                                    <p className="font-medium text-primary">
                                        {format(dropTarget.date, "dd/MM 'às' ")}
                                        {dropTarget.time}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-yellow-50 p-3 rounded-lg flex gap-3 border border-yellow-200">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                                <p className="text-sm text-yellow-800">
                                    O paciente receberá uma notificação sobre a alteração do horário.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRescheduleConfirmOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={() => rescheduleMutation.mutate()} disabled={rescheduleMutation.isPending}>
                            {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Mudança
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
