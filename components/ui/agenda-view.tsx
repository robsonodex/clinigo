'use client'

import { useState, useMemo } from 'react'
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
    Loader2,
    Repeat,
    UserX,
    Lightbulb,
    LayoutGrid,
    List,
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
import { RecurringAppointmentModal } from '@/components/appointments/RecurringAppointmentModal'
import { TherapistAbsenceModal } from '@/components/appointments/TherapistAbsenceModal'
import { SlotSuggestionModal } from '@/components/appointments/SlotSuggestionModal'
import { AppointmentDetailsDrawer } from '@/components/dashboard/AppointmentDetailsDrawer'
import { AlertTriangle } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7 // Start at 07:00
    const minute = i % 2 === 0 ? '00' : '30'
    return `${String(hour).padStart(2, '0')}:${minute}`
})

// Doctor color palette for visual distinction
const DOCTOR_COLORS = [
    // Tons claros (100)
    { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-800', accent: 'bg-emerald-500', hex: '#10b981' },
    { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-800', accent: 'bg-sky-500', hex: '#0ea5e9' },
    { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-800', accent: 'bg-amber-500', hex: '#f59e0b' },
    { bg: 'bg-rose-100', border: 'border-rose-400', text: 'text-rose-800', accent: 'bg-rose-500', hex: '#f43f5e' },
    { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-800', accent: 'bg-violet-500', hex: '#8b5cf6' },
    { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', accent: 'bg-orange-500', hex: '#f97316' },
    { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-800', accent: 'bg-cyan-500', hex: '#06b6d4' },
    { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800', accent: 'bg-pink-500', hex: '#ec4899' },
    { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800', accent: 'bg-blue-500', hex: '#3b82f6' },
    { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800', accent: 'bg-teal-500', hex: '#14b8a6' },
    { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800', accent: 'bg-indigo-500', hex: '#6366f1' },
    { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', accent: 'bg-red-500', hex: '#ef4444' },
    { bg: 'bg-fuchsia-100', border: 'border-fuchsia-400', text: 'text-fuchsia-800', accent: 'bg-fuchsia-500', hex: '#d946ef' },
    { bg: 'bg-lime-100', border: 'border-lime-400', text: 'text-lime-800', accent: 'bg-lime-500', hex: '#84cc16' },
    { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', accent: 'bg-green-500', hex: '#22c55e' },
    { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800', accent: 'bg-slate-500', hex: '#64748b' },
    { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', accent: 'bg-yellow-500', hex: '#eab308' },
    { bg: 'bg-stone-100', border: 'border-stone-400', text: 'text-stone-800', accent: 'bg-stone-500', hex: '#78716c' },
    { bg: 'bg-zinc-100', border: 'border-zinc-400', text: 'text-zinc-800', accent: 'bg-zinc-500', hex: '#71717a' },
    { bg: 'bg-neutral-100', border: 'border-neutral-400', text: 'text-neutral-800', accent: 'bg-neutral-500', hex: '#737373' },
    // Tons um pouco mais fortes (200) para garantir até 35 médicos
    { bg: 'bg-emerald-200', border: 'border-emerald-500', text: 'text-emerald-900', accent: 'bg-emerald-600', hex: '#10b981' },
    { bg: 'bg-sky-200', border: 'border-sky-500', text: 'text-sky-900', accent: 'bg-sky-600', hex: '#0ea5e9' },
    { bg: 'bg-amber-200', border: 'border-amber-500', text: 'text-amber-900', accent: 'bg-amber-600', hex: '#f59e0b' },
    { bg: 'bg-rose-200', border: 'border-rose-500', text: 'text-rose-900', accent: 'bg-rose-600', hex: '#f43f5e' },
    { bg: 'bg-violet-200', border: 'border-violet-500', text: 'text-violet-900', accent: 'bg-violet-600', hex: '#8b5cf6' },
    { bg: 'bg-orange-200', border: 'border-orange-500', text: 'text-orange-900', accent: 'bg-orange-600', hex: '#f97316' },
    { bg: 'bg-cyan-200', border: 'border-cyan-500', text: 'text-cyan-900', accent: 'bg-cyan-600', hex: '#06b6d4' },
    { bg: 'bg-pink-200', border: 'border-pink-500', text: 'text-pink-900', accent: 'bg-pink-600', hex: '#ec4899' },
    { bg: 'bg-blue-200', border: 'border-blue-500', text: 'text-blue-900', accent: 'bg-blue-600', hex: '#3b82f6' },
    { bg: 'bg-teal-200', border: 'border-teal-500', text: 'text-teal-900', accent: 'bg-teal-600', hex: '#14b8a6' },
    { bg: 'bg-indigo-200', border: 'border-indigo-500', text: 'text-indigo-900', accent: 'bg-indigo-600', hex: '#6366f1' },
    { bg: 'bg-red-200', border: 'border-red-500', text: 'text-red-900', accent: 'bg-red-600', hex: '#ef4444' },
    { bg: 'bg-fuchsia-200', border: 'border-fuchsia-500', text: 'text-fuchsia-900', accent: 'bg-fuchsia-600', hex: '#d946ef' },
    { bg: 'bg-lime-200', border: 'border-lime-500', text: 'text-lime-900', accent: 'bg-lime-600', hex: '#84cc16' },
    { bg: 'bg-green-200', border: 'border-green-500', text: 'text-green-900', accent: 'bg-green-600', hex: '#22c55e' }
]

// Timeline solid colors for Google Calendar style
const TIMELINE_COLORS = [
    // Padrão (600/500)
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-red-500',
    'bg-indigo-600', 'bg-teal-600', 'bg-orange-500', 'bg-pink-600',
    'bg-sky-600', 'bg-amber-500', 'bg-rose-500', 'bg-violet-600',
    'bg-cyan-600', 'bg-fuchsia-600', 'bg-lime-600', 'bg-green-600',
    'bg-slate-600', 'bg-yellow-500', 'bg-stone-600', 'bg-zinc-600',
    // Tons mais escuros (700) para diferenciar
    'bg-emerald-700', 'bg-sky-700', 'bg-amber-600', 'bg-rose-700',
    'bg-violet-700', 'bg-orange-600', 'bg-cyan-700', 'bg-pink-700',
    'bg-blue-700', 'bg-teal-700', 'bg-indigo-700', 'bg-red-600',
    'bg-fuchsia-700', 'bg-lime-700', 'bg-green-700'
]

// Map doctor IDs to colors (cached per render)
const doctorColorMap = new Map<string, typeof DOCTOR_COLORS[0]>()
let colorIndex = 0

function getDoctorColor(doctorId: string) {
    if (!doctorColorMap.has(doctorId)) {
        doctorColorMap.set(doctorId, DOCTOR_COLORS[colorIndex % DOCTOR_COLORS.length])
        colorIndex++
    }
    return doctorColorMap.get(doctorId)!
}

function getTimelineColor(doctorId: string): string {
    const keys = Array.from(doctorColorMap.keys())
    let idx = keys.indexOf(doctorId)
    if (idx === -1) {
        getDoctorColor(doctorId) // ensure it's registered
        idx = Array.from(doctorColorMap.keys()).indexOf(doctorId)
    }
    return TIMELINE_COLORS[idx % TIMELINE_COLORS.length]
}

// Calculate end time from start time and duration in minutes
function calcEndTime(startTime: string, durationMinutes: number = 60): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + durationMinutes
    const endHours = Math.floor(totalMinutes / 60) % 24
    const endMins = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
}


export default function AgendaPage() {
    const router = useRouter()
    const { isDoctor } = useRole()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [view, setView] = useState<'week' | 'day'>('week')
    const [calendarStyle, setCalendarStyle] = useState<'standard' | 'timeline'>('standard')
    const [manualAppointmentOpen, setManualAppointmentOpen] = useState(false)
    const [recurringAppointmentOpen, setRecurringAppointmentOpen] = useState(false)
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false)
    const [suggestionModalOpen, setSuggestionModalOpen] = useState(false)
    const [preselectedSlot, setPreselectedSlot] = useState<{ date: string; time: string } | null>(null)

    // Details Drawer
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())

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

    const goToToday = () => {
        setSelectedDate(new Date())
        // Scroll to current time
        setTimeout(() => {
            const currentHour = new Date().getHours()
            const currentMinute = new Date().getMinutes()
            const minuteSlot = currentMinute >= 30 ? '30' : '00'
            const timeId = `time-slot-${String(currentHour).padStart(2, '0')}:${minuteSlot}`
            const el = document.getElementById(timeId)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }, 100)
    }

    // Fetch appointments with caching
    const { data: appointments, isLoading } = useQuery({
        queryKey: ['appointments', view, currentDate.toISOString()],
        queryFn: () =>
            api.get<Appointment[]>('/appointments', {
                date_from: view === 'week' ? format(weekStart, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'),
                date_to: view === 'week' ? format(weekEnd, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'),
                pageSize: 1000, // Ensure we get all appointments for the period
            }),
        staleTime: 60 * 1000, // 1 minute cache
        refetchOnWindowFocus: false,
    })

    // Group appointments by date and time
    // Only exclude cancelled appointments from the agenda view
    // COMPLETED and NO_SHOW are shown (greyed out) so users can see their history
    const getAppointmentsForSlot = (date: Date, time: string): Appointment[] => {
        if (!appointments || !Array.isArray(appointments)) return []
        const dateStr = format(date, 'yyyy-MM-dd')
        return appointments.filter(
            (a) =>
                a.appointment_date === dateStr &&
                a.appointment_time?.substring(0, 5) === time &&
                a.status !== 'CANCELLED'
        )
    }

    // Get all non-cancelled appointments for a given day (for timeline view)
    const getAppointmentsForDay = (date: Date): Appointment[] => {
        if (!appointments || !Array.isArray(appointments)) return []
        const dateStr = format(date, 'yyyy-MM-dd')
        return appointments.filter(
            (a) => a.appointment_date === dateStr && a.status !== 'CANCELLED'
        ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
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
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            setCancellingId(null)
            setCancelReason('')
            toast.success('Agendamento cancelado')
        },
        onError: (error: Error) => toast.error(error.message),
    })

    // Cancel recurring series logic (double confirmation)
    const [cancellingSeriesId, setCancellingSeriesId] = useState<string | null>(null)
    const [cancelSeriesStep, setCancelSeriesStep] = useState<1 | 2>(1)

    const cancelSeriesMutation = useMutation({
        mutationFn: async () => {
            if (!cancellingSeriesId) return
            const res = await fetch(`/api/appointments/recurring/${cancellingSeriesId}`, {
                method: 'DELETE',
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao cancelar série')
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            setCancellingSeriesId(null)
            setCancelSeriesStep(1)
            toast.success(data?.message || 'Série recorrente cancelada com sucesso')
        },
        onError: (error: Error) => {
            toast.error(error.message)
            setCancellingSeriesId(null)
            setCancelSeriesStep(1)
        },
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
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
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
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setRecurringAppointmentOpen(true)}
                    >
                        <Repeat className="h-4 w-4" />
                        Recorrente
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setAbsenceModalOpen(true)}
                    >
                        <UserX className="h-4 w-4" />
                        Ausência
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => setSuggestionModalOpen(true)}
                    >
                        <Lightbulb className="h-4 w-4" />
                        Sugerir
                    </Button>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="flex border rounded-md overflow-hidden">
                        <Button
                            variant={calendarStyle === 'standard' ? 'default' : 'ghost'}
                            onClick={() => setCalendarStyle('standard')}
                            size="sm"
                            className="gap-1 rounded-none"
                        >
                            <LayoutGrid className="h-4 w-4" />
                            Padrão
                        </Button>
                        <Button
                            variant={calendarStyle === 'timeline' ? 'default' : 'ghost'}
                            onClick={() => setCalendarStyle('timeline')}
                            size="sm"
                            className="gap-1 rounded-none"
                        >
                            <List className="h-4 w-4" />
                            Timeline
                        </Button>
                    </div>
                    <div className="w-px h-6 bg-border" />
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
                {calendarStyle === 'standard' ? (
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
                            <div key={time} id={`time-slot-${time}`} className="grid grid-cols-8 border-b min-h-[80px]">
                                {/* Time Label */}
                                <div className="p-2 text-xs text-muted-foreground text-center border-r font-medium -mt-2">
                                    {time}
                                </div>

                                {/* Day Columns */}
                                {(view === 'week' ? days : [currentDate]).map((day) => {
                                    const slotAppointments = getAppointmentsForSlot(day, time)
                                    const hasAppointments = slotAppointments.length > 0

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className={cn(
                                                'border-r last:border-r-0 p-1 relative group hover:bg-muted/30 transition-colors cursor-pointer',
                                                !isSameMonth(day, currentDate) && 'bg-gray-50/50'
                                            )}
                                            onClick={() => {
                                                if (!hasAppointments) {
                                                    setPreselectedSlot({
                                                        date: format(day, 'yyyy-MM-dd'),
                                                        time: time
                                                    })
                                                    setManualAppointmentOpen(true)
                                                }
                                            }}
                                            onDragOver={(e) => !hasAppointments && handleDragOver(e, day, time)}
                                            onDrop={(e) => !hasAppointments && handleDrop(e, day, time)}
                                        >
                                            {hasAppointments ? (
                                                <div className="flex flex-col gap-1 h-full">
                                                    {(expandedSlots.has(`${day.toISOString()}-${time}`) ? slotAppointments : slotAppointments.slice(0, 2)).map((appointment) => {
                                                        const doctorColor = getDoctorColor(appointment.doctor.id)
                                                        const isOnline = (appointment as any).appointment_type === 'online'
                                                        const isCancelled = appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED'
                                                        const duration = (appointment.doctor as any).consultation_duration || 60
                                                        const endTime = calcEndTime(appointment.appointment_time.substring(0, 5), duration)

                                                        return (
                                                            <TooltipProvider key={appointment.id}>
                                                                <Tooltip delayDuration={200}>
                                                                    <TooltipTrigger asChild>
                                                                        <div
                                                                            draggable={!isCancelled}
                                                                            onDragStart={(e) => handleDragStart(e, appointment)}
                                                                            className={cn(
                                                                                'w-full rounded-lg border-l-4 p-1.5 text-xs flex flex-col shadow-sm cursor-pointer hover:shadow-lg transition-all',
                                                                                isCancelled
                                                                                    ? 'bg-gray-100 border-l-gray-400 text-gray-500 opacity-60'
                                                                                    : `${doctorColor.bg} ${doctorColor.text}`,
                                                                                !isCancelled && doctorColor.border.replace('border-', 'border-l-'),
                                                                                isOnline && !isCancelled && 'ring-2 ring-green-400 ring-offset-1',
                                                                                draggedAppointment?.id === appointment.id && 'opacity-50 border-dashed'
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                setSelectedAppointmentId(appointment.id)
                                                                                setDetailsDrawerOpen(true)
                                                                            }}
                                                                        >
                                                                            {/* Patient Name */}
                                                                            <div className="font-bold truncate text-sm leading-tight">
                                                                                {appointment.patient.full_name}
                                                                            </div>

                                                                            {/* Start Time - End Time */}
                                                                            <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium opacity-90">
                                                                                <Clock className="h-3 w-3 flex-shrink-0" />
                                                                                {appointment.appointment_time.substring(0, 5)} - {endTime}
                                                                                {(appointment as any).series_id && (
                                                                                    <Repeat className="h-3 w-3 ml-1 text-blue-600" />
                                                                                )}
                                                                                {isOnline && (
                                                                                    <Video className="h-3 w-3 ml-1 text-green-600" />
                                                                                )}
                                                                            </div>

                                                                            {/* Doctor Name */}
                                                                            <div className="text-[10px] font-medium mt-0.5 truncate opacity-80">
                                                                                Dr. {appointment.doctor.user?.full_name?.split(' ')[0] || 'N/A'}
                                                                            </div>

                                                                            <div className="flex items-center justify-end mt-1">
                                                                                <DropdownMenu>
                                                                                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                                        <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1 hover:bg-black/10">
                                                                                            <MoreVertical className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </DropdownMenuTrigger>
                                                                                    <DropdownMenuContent align="end">
                                                                                        <DropdownMenuItem onClick={() => {
                                                                                            setSelectedAppointmentId(appointment.id)
                                                                                            setDetailsDrawerOpen(true)
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
                                                                                        {(appointment as any).series_id && (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING_PAYMENT') && (
                                                                                            <DropdownMenuItem
                                                                                                className="text-destructive focus:text-destructive"
                                                                                                onClick={() => {
                                                                                                    setCancellingSeriesId((appointment as any).series_id)
                                                                                                    setCancelSeriesStep(1)
                                                                                                }}
                                                                                            >
                                                                                                <Repeat className="w-4 h-4 mr-2" />
                                                                                                Cancelar Série
                                                                                            </DropdownMenuItem>
                                                                                        )}
                                                                                    </DropdownMenuContent>
                                                                                </DropdownMenu>
                                                                            </div>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="right" className="max-w-xs">
                                                                        <div className="space-y-2">
                                                                            <div>
                                                                                <p className="font-semibold text-sm">{appointment.patient.full_name}</p>
                                                                                <p className="text-xs text-muted-foreground">
                                                                                    {appointment.patient.phone && `Tel: ${appointment.patient.phone}`}
                                                                                </p>
                                                                            </div>
                                                                            <div className="text-xs space-y-1">
                                                                                <p><strong>Médico:</strong> Dr. {appointment.doctor.user?.full_name || (appointment.doctor as any).full_name || 'N/A'}</p>
                                                                                <p><strong>Horário:</strong> {appointment.appointment_time.substring(0, 5)} - {endTime}</p>
                                                                                <p><strong>Status:</strong> <span className="capitalize">{appointment.status.replace('_', ' ').toLowerCase()}</span></p>
                                                                                {(appointment as any).type && (
                                                                                    <p><strong>Tipo:</strong> {(appointment as any).type === 'TELEMEDICINA' ? 'Telemedicina' : 'Presencial'}</p>
                                                                                )}
                                                                                {(appointment as any).payment_type && (
                                                                                    <p><strong>Pagamento:</strong> {(appointment as any).payment_type === 'CONVENIO' ? 'Convênio' : 'Particular'}</p>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )
                                                    })}
                                                    {slotAppointments.length > 2 && (
                                                        <button
                                                            className="text-[10px] text-primary font-semibold hover:underline text-left px-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                const key = `${day.toISOString()}-${time}`
                                                                setExpandedSlots(prev => {
                                                                    const next = new Set(prev)
                                                                    if (next.has(key)) next.delete(key)
                                                                    else next.add(key)
                                                                    return next
                                                                })
                                                            }}
                                                        >
                                                            {expandedSlots.has(`${day.toISOString()}-${time}`)
                                                                ? '− mostrar menos'
                                                                : `+${slotAppointments.length - 2} mais`
                                                            }
                                                        </button>
                                                    )}
                                                </div>
                                            ) : null}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                ) : (
                /* ============ TIMELINE / GOOGLE CALENDAR STYLE ============ */
                <div className="min-w-[800px]">
                    <table className="w-full table-fixed border-collapse">
                        {/* Header Row */}
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="border-b">
                                <th className="w-[56px] p-2 text-xs font-medium text-muted-foreground border-r" />
                                {(view === 'week' ? days : [currentDate]).map((day) => (
                                    <th
                                        key={day.toISOString()}
                                        className={cn(
                                            'p-2 text-center border-r last:border-r-0',
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
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        {/* Timeline Body */}
                        <tbody className="relative">
                            {TIME_SLOTS.map((time) => {
                                const daysToRender = view === 'week' ? days : [currentDate]
                                const hasAnyAppointment = daysToRender.some(day => getAppointmentsForSlot(day, time).length > 0)

                                return (
                                    <tr key={time} id={`time-slot-${time}`} className="border-b" style={{ height: '40px' }}>
                                        {/* Time Label */}
                                        <td className="w-[56px] py-1 px-1 text-[11px] text-muted-foreground text-right pr-2 border-r font-medium align-middle">
                                            {time}
                                        </td>

                                        {/* Day Columns */}
                                        {daysToRender.map((day) => {
                                            const slotAppointments = getAppointmentsForSlot(day, time)

                                            return (
                                                <td
                                                    key={day.toISOString()}
                                                    className={cn(
                                                        'border-r last:border-r-0 p-0 cursor-pointer overflow-hidden h-full',
                                                        isSameDay(day, new Date()) && 'bg-blue-50/30'
                                                    )}
                                                    onClick={() => {
                                                        if (slotAppointments.length === 0) {
                                                            setPreselectedSlot({
                                                                date: format(day, 'yyyy-MM-dd'),
                                                                time: time
                                                            })
                                                            setManualAppointmentOpen(true)
                                                        }
                                                    }}
                                                    onDragOver={(e) => slotAppointments.length === 0 && handleDragOver(e, day, time)}
                                                    onDrop={(e) => slotAppointments.length === 0 && handleDrop(e, day, time)}
                                                >
                                                    {slotAppointments.length > 0 && (
                                                        <div className="flex items-start gap-0.5 p-0.5 flex-wrap">
                                                            {slotAppointments.map((appointment) => {
                                                                const timelineColor = getTimelineColor(appointment.doctor.id)
                                                                const isCancelled = appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED'
                                                                const duration = (appointment.doctor as any).consultation_duration || 60
                                                                const endTime = calcEndTime(appointment.appointment_time.substring(0, 5), duration)
                                                                const doctorName = appointment.doctor.user?.full_name?.split(' ')[0] || 'N/A'
                                                                const specialty = (appointment.doctor as any).specialty || ''
                                                                const specShort = specialty ? specialty.substring(0, 4).toUpperCase() : ''

                                                                return (
                                                                    <TooltipProvider key={appointment.id}>
                                                                        <Tooltip delayDuration={200}>
                                                                            <TooltipTrigger asChild>
                                                                                <div
                                                                                    draggable={!isCancelled}
                                                                                    onDragStart={(e) => handleDragStart(e, appointment)}
                                                                                    className={cn(
                                                                                        'px-2 py-0.5 text-white cursor-pointer hover:brightness-110 transition-all flex flex-col justify-center overflow-hidden rounded-sm relative group/item',
                                                                                        isCancelled ? 'bg-gray-400 opacity-60' : timelineColor,
                                                                                        draggedAppointment?.id === appointment.id && 'opacity-50 border-dashed'
                                                                                    )}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation()
                                                                                        setSelectedAppointmentId(appointment.id)
                                                                                        setDetailsDrawerOpen(true)
                                                                                    }}
                                                                                >
                                                                                    <div className="text-[11px] font-bold leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                                                                        {appointment.patient.full_name.toUpperCase()}({doctorName.toUpperCase()}{specShort ? `-${specShort}` : ''})
                                                                                    </div>
                                                                                    <div className="text-[11px] opacity-90 leading-tight">
                                                                                        {appointment.appointment_time.substring(0, 5)} – {endTime}
                                                                                    </div>
                                                                                    {/* Menu de ações */}
                                                                                    <div className="absolute top-0 right-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                                        <DropdownMenu>
                                                                                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                                                                <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-black/20 text-white">
                                                                                                    <MoreVertical className="w-3 h-3" />
                                                                                                </Button>
                                                                                            </DropdownMenuTrigger>
                                                                                            <DropdownMenuContent align="end">
                                                                                                <DropdownMenuItem onClick={() => {
                                                                                                    setSelectedAppointmentId(appointment.id)
                                                                                                    setDetailsDrawerOpen(true)
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
                                                                                                {(appointment as any).series_id && (appointment.status === 'CONFIRMED' || appointment.status === 'PENDING_PAYMENT') && (
                                                                                                    <DropdownMenuItem
                                                                                                        className="text-destructive focus:text-destructive"
                                                                                                        onClick={() => {
                                                                                                            setCancellingSeriesId((appointment as any).series_id)
                                                                                                            setCancelSeriesStep(1)
                                                                                                        }}
                                                                                                    >
                                                                                                        <Repeat className="w-4 h-4 mr-2" />
                                                                                                        Cancelar Série
                                                                                                    </DropdownMenuItem>
                                                                                                )}
                                                                                            </DropdownMenuContent>
                                                                                        </DropdownMenu>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="top" className="max-w-xs">
                                                                                <div className="space-y-2">
                                                                                    <div>
                                                                                        <p className="font-semibold text-sm">{appointment.patient.full_name}</p>
                                                                                        <p className="text-xs text-muted-foreground">
                                                                                            {appointment.patient.phone && `Tel: ${appointment.patient.phone}`}
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="text-xs space-y-1">
                                                                                        <p><strong>Médico:</strong> Dr. {appointment.doctor.user?.full_name || (appointment.doctor as any).full_name || 'N/A'}</p>
                                                                                        <p><strong>Horário:</strong> {appointment.appointment_time.substring(0, 5)} - {endTime}</p>
                                                                                        <p><strong>Status:</strong> <span className="capitalize">{appointment.status.replace('_', ' ').toLowerCase()}</span></p>
                                                                                        {(appointment as any).type && (
                                                                                            <p><strong>Tipo:</strong> {(appointment as any).type === 'TELEMEDICINA' ? 'Telemedicina' : 'Presencial'}</p>
                                                                                        )}
                                                                                        {(appointment as any).payment_type && (
                                                                                            <p><strong>Pagamento:</strong> {(appointment as any).payment_type === 'CONVENIO' ? 'Convênio' : 'Particular'}</p>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                )}
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

            {/* Cancel Series - Step 1: First Confirmation */}
            <Dialog open={!!cancellingSeriesId && cancelSeriesStep === 1} onOpenChange={(open) => {
                if (!open) {
                    setCancellingSeriesId(null)
                    setCancelSeriesStep(1)
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Repeat className="h-5 w-5 text-destructive" />
                            Cancelar Série Recorrente
                        </DialogTitle>
                        <DialogDescription>
                            Deseja cancelar a série recorrente inteira? Todos os agendamentos futuros desta série serão cancelados.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-yellow-50 p-3 rounded-lg flex gap-3 border border-yellow-200">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                            <p className="text-sm text-yellow-800">
                                Apenas os agendamentos futuros com status &quot;Confirmado&quot; ou &quot;Pendente&quot; serão cancelados. Atendimentos já realizados não serão afetados.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setCancellingSeriesId(null)
                            setCancelSeriesStep(1)
                        }}>Voltar</Button>
                        <Button variant="destructive" onClick={() => setCancelSeriesStep(2)}>
                            Sim, cancelar série
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Series - Step 2: Final Confirmation */}
            <Dialog open={!!cancellingSeriesId && cancelSeriesStep === 2} onOpenChange={(open) => {
                if (!open) {
                    setCancellingSeriesId(null)
                    setCancelSeriesStep(1)
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirmação Final
                        </DialogTitle>
                        <DialogDescription>
                            Esta ação é irreversível. Todos os agendamentos futuros desta série serão cancelados permanentemente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-sm text-red-800 font-medium">
                                Tem certeza absoluta que deseja prosseguir com o cancelamento de toda a série recorrente?
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelSeriesStep(1)}>Voltar</Button>
                        <Button
                            variant="destructive"
                            onClick={() => cancelSeriesMutation.mutate()}
                            disabled={cancelSeriesMutation.isPending}
                        >
                            {cancelSeriesMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Confirmar Cancelamento da Série
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Appointment Modal */}
            <ManualAppointmentModal
                open={manualAppointmentOpen}
                onOpenChange={(open) => {
                    setManualAppointmentOpen(open)
                    if (!open) setPreselectedSlot(null)
                }}
                preselectedDate={preselectedSlot?.date}
                preselectedTime={preselectedSlot?.time}
                onSuccess={(appointmentDate) => {
                    // ✅ Navigate agenda to created appointment date so it appears immediately
                    setSelectedDate(parseISO(appointmentDate))
                }}
            />

            <RecurringAppointmentModal
                open={recurringAppointmentOpen}
                onOpenChange={setRecurringAppointmentOpen}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
                }}
            />

            <TherapistAbsenceModal
                open={absenceModalOpen}
                onOpenChange={setAbsenceModalOpen}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
                }}
            />

            <SlotSuggestionModal
                open={suggestionModalOpen}
                onOpenChange={setSuggestionModalOpen}
            />

            <AppointmentDetailsDrawer
                appointmentId={selectedAppointmentId}
                isOpen={detailsDrawerOpen}
                onClose={() => {
                    setDetailsDrawerOpen(false)
                    setSelectedAppointmentId(null)
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
