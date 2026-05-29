'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
    Stethoscope,
    Users,
    UserPlus,
    EyeOff,
    Search,
    SlidersHorizontal,
    Megaphone,
    Pin,
    Edit3,
    Trash2,
    Plus,
    HelpCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRole, useAuth } from '@/lib/hooks/use-auth'
import { ManualAppointmentModal } from '@/components/appointments/ManualAppointmentModal'
import { RecurringAppointmentModal } from '@/components/appointments/RecurringAppointmentModal'
import { EditSeriesModal } from '@/components/appointments/EditSeriesModal'
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

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 7 // Start at 07:00, end at 23:00
    return `${String(hour).padStart(2, '0')}:00`
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
    { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800', accent: 'bg-yellow-500', hex: '#eab308' },
    // Cores cinzas removidas a pedido do usuário
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
    'bg-yellow-500',
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
    const { isDoctor, isCoordinator } = useRole()
    const { user } = useAuth()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [view, setView] = useState<'week' | 'day'>('week')
    const [calendarStyle, setCalendarStyle] = useState<'standard' | 'timeline'>('standard')
    const [manualAppointmentOpen, setManualAppointmentOpen] = useState(false)
    const [isEncaixeMode, setIsEncaixeMode] = useState(false)
    const [recurringAppointmentOpen, setRecurringAppointmentOpen] = useState(false)
    const [absenceModalOpen, setAbsenceModalOpen] = useState(false)
    const [suggestionModalOpen, setSuggestionModalOpen] = useState(false)
    const [preselectedSlot, setPreselectedSlot] = useState<{ date: string; time: string } | null>(null)

    // Details Drawer
    const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null)
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false)
    const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set())

    // Doctor filter
    const [selectedDoctorFilter, setSelectedDoctorFilter] = useState<string>('all')
    // Patient search filter
    const [patientSearch, setPatientSearch] = useState('')
    // Free slots toggle (Agenda Inversa)
    const [showFreeSlots, setShowFreeSlots] = useState(false)

    // Mural de Recados States
    const [isMuralOpen, setIsMuralOpen] = useState(false)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [editingBulletin, setEditingBulletin] = useState<any | null>(null)
    const [bulletinTitle, setBulletinTitle] = useState('')
    const [bulletinContent, setBulletinContent] = useState('')
    const [bulletinType, setBulletinType] = useState<'info' | 'success' | 'warning' | 'alert'>('info')
    const [bulletinTarget, setBulletinTarget] = useState<'internal' | 'patients' | 'all'>('internal')
    const [bulletinPinned, setBulletinPinned] = useState(false)
    const [isSubmittingBulletin, setIsSubmittingBulletin] = useState(false)
    const [unreadBulletinsCount, setUnreadBulletinsCount] = useState(0)

    const isClinicAdmin = user?.role === 'CLINIC_ADMIN' || user?.role === 'SUPER_ADMIN'
    const isReceptionist = user?.role === 'RECEPTIONIST'
    const canManageBulletins = isClinicAdmin || isReceptionist || isDoctor || isCoordinator || !!user

    // Fetch Bulletins (Mural)
    const { data: bulletins = [], isLoading: bulletinsLoading, refetch: refetchBulletins } = useQuery({
        queryKey: ['clinic-bulletins'],
        queryFn: async () => {
            const res = await fetch('/api/bulletins')
            if (!res.ok) throw new Error('Falha ao carregar mural')
            return res.json()
        },
        staleTime: 30 * 1000,
    })

    // Monitoramento de novos recados (Notificação ativa)
    useEffect(() => {
        if (bulletins && Array.isArray(bulletins)) {
            try {
                const readIdsString = localStorage.getItem('clinigo_read_bulletins') || '[]'
                const readIds = JSON.parse(readIdsString) as string[]
                const unread = bulletins.filter((b: any) => !readIds.includes(b.id))
                setUnreadBulletinsCount(unread.length)
            } catch (err) {
                console.error(err)
            }
        }
    }, [bulletins])

    const handleOpenMural = () => {
        setIsMuralOpen(true)
        if (bulletins && Array.isArray(bulletins)) {
            try {
                const allIds = bulletins.map((b: any) => b.id)
                localStorage.setItem('clinigo_read_bulletins', JSON.stringify(allIds))
                setUnreadBulletinsCount(0)
            } catch (err) {
                console.error(err)
            }
        }
    }

    const handleSaveBulletin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!bulletinTitle.trim() || !bulletinContent.trim()) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        setIsSubmittingBulletin(true)
        try {
            const payload = {
                title: bulletinTitle,
                content: bulletinContent,
                type: bulletinType,
                target: bulletinTarget,
                is_pinned: bulletinPinned,
            }

            const url = editingBulletin ? `/api/bulletins` : `/api/bulletins`
            const method = editingBulletin ? 'PUT' : 'POST'
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingBulletin ? { id: editingBulletin.id, ...payload } : payload)
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || 'Erro ao salvar comunicado')
            }

            toast.success(editingBulletin ? 'Comunicado atualizado com sucesso!' : 'Comunicado publicado com sucesso!')
            refetchBulletins()
            setIsCreateOpen(false)
            setEditingBulletin(null)
            setBulletinTitle('')
            setBulletinContent('')
            setBulletinType('info')
            setBulletinTarget('internal')
            setBulletinPinned(false)
        } catch (error: any) {
            toast.error(error.message || 'Erro inesperado ao salvar comunicado')
        } finally {
            setIsSubmittingBulletin(false)
        }
    }

    const handleTogglePin = async (bulletin: any) => {
        try {
            const res = await fetch(`/api/bulletins`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: bulletin.id,
                    title: bulletin.title,
                    content: bulletin.content,
                    type: bulletin.type,
                    target: bulletin.target,
                    is_pinned: !bulletin.is_pinned
                })
            })

            if (!res.ok) throw new Error('Falha ao alterar fixação')
            toast.success(bulletin.is_pinned ? 'Comunicado desafixado!' : 'Comunicado fixado no topo!')
            refetchBulletins()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar fixação')
        }
    }

    const handleDeleteBulletin = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este comunicado? Esta ação não pode ser desfeita.')) {
            return
        }

        try {
            const res = await fetch(`/api/bulletins?id=${id}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Falha ao excluir comunicado')
            toast.success('Comunicado removido do mural!')
            refetchBulletins()
        } catch (error: any) {
            toast.error(error.message || 'Erro ao excluir comunicado')
        }
    }

    const handleStartEdit = (bulletin: any) => {
        setEditingBulletin(bulletin)
        setBulletinTitle(bulletin.title)
        setBulletinContent(bulletin.content)
        setBulletinType(bulletin.type || 'info')
        setBulletinTarget(bulletin.target || 'internal')
        setBulletinPinned(bulletin.is_pinned || false)
        setIsCreateOpen(true)
    }


    // Fetch doctors for filter
    const { data: doctorsList } = useQuery({
        queryKey: ['doctors-for-agenda-filter'],
        queryFn: () => api.get<any[]>('/doctors'),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })

    // Auto-lock filter to own agenda when logged in as DOCTOR
    useEffect(() => {
        if (isDoctor && user && doctorsList && Array.isArray(doctorsList)) {
            const myDoctor = doctorsList.find((d: any) => d.user_id === user.id)
            if (myDoctor) {
                if (isCoordinator) {
                    setSelectedDoctorFilter(prev => prev === 'all' ? myDoctor.id : prev)
                } else {
                    setSelectedDoctorFilter(myDoctor.id)
                }
            }
        }
    }, [isDoctor, isCoordinator, user, doctorsList])

    // Fetch schedules for free slots view (Agenda Inversa)
    const { data: schedulesData } = useQuery({
        queryKey: ['schedules-for-agenda'],
        queryFn: async () => {
            const res = await fetch('/api/doctors/schedules')
            if (!res.ok) return []
            const data = await res.json()
            return data.schedules || data || []
        },
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        enabled: showFreeSlots,
    })

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
            let currentHour = new Date().getHours()
            const currentMinute = new Date().getMinutes()
            
            // Adjust for out-of-bounds hours (calendar starts at 07:00 and ends at 23:00)
            if (currentHour < 7) currentHour = 7
            else if (currentHour > 23) currentHour = 23
                
            const timeId = `time-slot-${String(currentHour).padStart(2, '0')}:00`
            
            // Fallback to exactly 07:00 if somehow timeId is not found
            const el = document.getElementById(timeId) || document.getElementById('time-slot-07:00')
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
        staleTime: 0, // Sem cache - sempre busca dados frescos
        refetchOnWindowFocus: true,
    })

    // Check if a time slot is within working hours for any (or filtered) doctor (Agenda Inversa)
    // Returns which specific therapists are free at each slot
    const getSlotFreeStatus = useMemo(() => {
        if (!showFreeSlots || !schedulesData) return () => ({ isWorking: false, isFree: false, freeDoctors: [] as { id: string; name: string }[] })
        return (day: Date, time: string) => {
            const dayOfWeek = day.getDay() // 0=Sunday
            const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])
            const relevantSchedules = (schedulesData as any[]).filter((s: any) => {
                if (!s.is_active) return false
                if (s.day_of_week !== dayOfWeek) return false
                if (selectedDoctorFilter !== 'all' && s.doctor_id !== selectedDoctorFilter) return false
                const startMin = parseInt(s.start_time.split(':')[0]) * 60 + parseInt(s.start_time.split(':')[1])
                const endMin = parseInt(s.end_time.split(':')[0]) * 60 + parseInt(s.end_time.split(':')[1])
                return timeMinutes >= startMin && timeMinutes < endMin
            })
            if (relevantSchedules.length === 0) return { isWorking: false, isFree: false, freeDoctors: [] as { id: string; name: string }[] }
            // For each schedule in this slot, check which doctors are free
            const dateStr = format(day, 'yyyy-MM-dd')
            const freeDoctors: { id: string; name: string }[] = []
            const seenDoctorIds = new Set<string>()
            for (const schedule of relevantSchedules) {
                if (seenDoctorIds.has(schedule.doctor_id)) continue
                seenDoctorIds.add(schedule.doctor_id)
                const doctorHasAppointment = appointments && Array.isArray(appointments) && appointments.some(
                    (a: any) => a.appointment_date === dateStr &&
                        a.appointment_time?.substring(0, 5) === time &&
                        a.status !== 'CANCELLED' &&
                        a.doctor?.id === schedule.doctor_id
                )
                if (!doctorHasAppointment) {
                    const doctorInfo = doctorsList?.find((d: any) => d.id === schedule.doctor_id)
                    const name = doctorInfo?.user?.full_name || 'Profissional'
                    freeDoctors.push({ id: schedule.doctor_id, name })
                }
            }
            return { isWorking: true, isFree: freeDoctors.length > 0, freeDoctors }
        }
    }, [showFreeSlots, schedulesData, appointments, selectedDoctorFilter, doctorsList])

    // Group appointments by date and time
    // Only exclude cancelled appointments from the agenda view
    // COMPLETED and NO_SHOW are shown (greyed out) so users can see their history
    const getAppointmentsForSlot = (date: Date, time: string): Appointment[] => {
        if (!appointments || !Array.isArray(appointments)) return []
        const dateStr = format(date, 'yyyy-MM-dd')
        const searchLower = patientSearch.trim().toLowerCase()
        return appointments.filter(
            (a) =>
                a.appointment_date === dateStr &&
                a.appointment_time?.substring(0, 5) === time &&
                (selectedDoctorFilter === 'all' || a.doctor?.id === selectedDoctorFilter) &&
                (!searchLower || a.patient?.full_name?.toLowerCase().includes(searchLower))
        )
    }

    // Get all appointments for a given day (for timeline view)
    const getAppointmentsForDay = (date: Date): Appointment[] => {
        if (!appointments || !Array.isArray(appointments)) return []
        const dateStr = format(date, 'yyyy-MM-dd')
        const searchLower = patientSearch.trim().toLowerCase()
        return appointments.filter(
            (a) => a.appointment_date === dateStr &&
                (selectedDoctorFilter === 'all' || a.doctor?.id === selectedDoctorFilter) &&
                (!searchLower || a.patient?.full_name?.toLowerCase().includes(searchLower))
        ).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
    }

    // Professional availability for current time
    const professionalAvailability = useMemo(() => {
        if (!doctorsList || !appointments || !Array.isArray(appointments)) return []
        const now = new Date()
        const todayStr = format(now, 'yyyy-MM-dd')
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:00`
        return doctorsList.filter((d: any) => d.id && d.user).map((doctor: any) => {
            const hasAppointmentNow = appointments.some(
                (a: any) =>
                    a.appointment_date === todayStr &&
                    a.doctor?.id === doctor.id &&
                    a.status !== 'CANCELLED' &&
                    a.status !== 'NO_SHOW' &&
                    a.appointment_time?.substring(0, 5) <= currentTime &&
                    calcEndTime(a.appointment_time?.substring(0, 5), (a.doctor as any)?.consultation_duration || 60) > currentTime
            )
            return {
                id: doctor.id,
                name: doctor.user?.full_name?.split(' ')[0] || 'N/A',
                fullName: doctor.user?.full_name || 'N/A',
                specialty: doctor.specialty || '',
                isBusy: hasAppointmentNow,
            }
        })
    }, [doctorsList, appointments])

    // Calculate cell height based on duration (1 slot = 1 hour)
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

    // Edit recurring series
    const [editingSeriesId, setEditingSeriesId] = useState<string | null>(null)

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

    const [showMobileFilters, setShowMobileFilters] = useState(false)

    return (
        <div className="flex flex-col h-[calc(100vh-11rem)] md:h-[calc(100vh-6rem)]">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 mb-3">
                {/* Linha Única: Título e Todas as Ações Integradas */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/60 shadow-sm">
                    {/* Título, Filtros e Controles de Navegação */}
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl md:text-2xl font-bold">Agenda</h1>
                        
                        {/* Botão de Filtros/Ações unificado (Desktop e Celular) */}
                        <Button
                            type="button"
                            variant="outline"
                            className={cn(
                                "flex gap-1.5 h-10 text-sm bg-white hover:bg-slate-50 border-slate-200 transition-all duration-200 shadow-sm rounded-xl px-4 font-semibold text-slate-700 dark:text-slate-300",
                                showMobileFilters && "bg-slate-100 border-slate-300 dark:bg-slate-800"
                            )}
                            onClick={() => setShowMobileFilters(!showMobileFilters)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {showMobileFilters ? 'Ocultar Filtros' : 'Filtros e Ações'}
                        </Button>

                        <div className="w-px h-6 bg-border hidden sm:block mx-1" />

                        {/* Navegação de Data */}
                        <div className="flex items-center border rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm h-10 overflow-hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={prevPeriod}
                                className="h-10 w-10 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="px-3 text-sm font-semibold min-w-[130px] text-center text-slate-700 dark:text-slate-300">
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
                                className="h-10 w-10 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800/60"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Botão Hoje */}
                        <Button variant="outline" onClick={goToToday} className="bg-white border-slate-200 dark:border-slate-800 shadow-sm h-10 text-sm font-semibold px-4 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            Hoje
                        </Button>
                        
                        {/* Seletor Dia / Semana */}
                        <div className="flex border rounded-xl overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm h-10">
                            <Button
                                variant={view === 'day' ? 'outline' : 'ghost'}
                                onClick={() => setView('day')}
                                className={cn(
                                    "h-10 rounded-none border-0 text-sm font-semibold px-4 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                    view === 'day' && "bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-200 font-semibold"
                                )}
                            >
                                Dia
                            </Button>
                            <Button
                                variant={view === 'week' ? 'default' : 'ghost'}
                                onClick={() => setView('week')}
                                className={cn(
                                    "h-10 rounded-none border-0 text-sm font-semibold px-4 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                    view === 'week' 
                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0 font-semibold" 
                                        : "bg-transparent text-foreground hover:bg-muted"
                                )}
                            >
                                Semana
                            </Button>
                        </div>

                        {/* Botão Mural de Recados */}
                        <Button
                            variant="outline"
                            onClick={handleOpenMural}
                            className="bg-white dark:bg-slate-900 shadow-sm h-10 flex items-center gap-1.5 border-amber-200 hover:bg-amber-50 hover:border-amber-300 dark:border-slate-800 transition-all duration-300 relative rounded-xl font-semibold text-amber-800 dark:text-amber-300 text-sm px-4"
                            title="Ver recados e comunicados importantes"
                        >
                            <Megaphone className={cn("h-4 w-4 text-amber-500", unreadBulletinsCount > 0 && "animate-bounce")} />
                            <span>Mural de Recados</span>
                            {unreadBulletinsCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[10px] text-white font-extrabold items-center justify-center">
                                        {unreadBulletinsCount}
                                    </span>
                                </span>
                            )}
                        </Button>

                        {/* Seletor Padrão / Timeline */}
                        <TooltipProvider>
                            <div className="flex border rounded-xl overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm h-10">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={calendarStyle === 'standard' ? 'default' : 'ghost'}
                                            onClick={() => setCalendarStyle('standard')}
                                            size="icon"
                                            className={cn(
                                                "h-10 w-10 rounded-none border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                                calendarStyle === 'standard' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground hover:bg-slate-50"
                                            )}
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modo Padrão</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={calendarStyle === 'timeline' ? 'ghost' : 'ghost'}
                                            onClick={() => setCalendarStyle('timeline')}
                                            size="icon"
                                            className={cn(
                                                "h-10 w-10 rounded-none border-0 hover:bg-slate-50 dark:hover:bg-slate-800/60",
                                                calendarStyle === 'timeline' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "text-muted-foreground hover:bg-slate-50"
                                            )}
                                        >
                                            <List className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modo Timeline</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>

                        {/* Novo Agendamento */}
                        <Button
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-10 px-5 text-sm font-semibold gap-1.5 border-0"
                            onClick={() => {
                                setPreselectedSlot(null)
                                setManualAppointmentOpen(true)
                            }}
                        >
                            <PlusCircle className="h-4 w-4" />
                            <span className="hidden sm:inline">Novo Agendamento</span>
                            <span className="inline sm:hidden">Novo</span>
                        </Button>
                    </div>
                </div>

                {/* Filtros e Ações Secundárias colapsáveis (Tanto Desktop quanto Mobile) */}
                <div className={cn(
                    "flex-wrap items-center gap-2 border-t pt-3 bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/60 transition-all duration-300 shadow-sm",
                    showMobileFilters ? "flex" : "hidden"
                )}>
                    <Button
                        variant="outline"
                        className="gap-2 h-10 text-sm rounded-xl px-4 font-semibold"
                        onClick={() => setRecurringAppointmentOpen(true)}
                    >
                        <Repeat className="h-4 w-4" />
                        Recorrente
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 h-10 text-sm rounded-xl px-4 font-semibold"
                        onClick={() => setAbsenceModalOpen(true)}
                    >
                        <UserX className="h-4 w-4" />
                        Ausência
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 h-10 text-sm rounded-xl px-4 font-semibold"
                        onClick={() => setSuggestionModalOpen(true)}
                    >
                        <Lightbulb className="h-4 w-4" />
                        Sugerir
                    </Button>
                    <Button
                        variant="outline"
                        className="gap-2 h-10 text-sm border-orange-300 text-orange-700 hover:bg-orange-50 rounded-xl px-4 font-semibold"
                        onClick={() => {
                            setPreselectedSlot(null)
                            setIsEncaixeMode(true)
                            setManualAppointmentOpen(true)
                        }}
                    >
                        <UserPlus className="h-4 w-4" />
                        Encaixe
                    </Button>
                    <Button
                        variant={showFreeSlots ? 'default' : 'outline'}
                        className={cn(
                            'gap-2 h-10 text-sm rounded-xl px-4 font-semibold',
                            showFreeSlots && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        )}
                        onClick={() => setShowFreeSlots(!showFreeSlots)}
                    >
                        <EyeOff className="h-4 w-4" />
                        {showFreeSlots ? 'Horários Livres ✓' : 'Horários Livres'}
                    </Button>
                    
                    <div className="hidden md:block w-px h-6 bg-border mx-1" />
                    
                    <Select value={selectedDoctorFilter} onValueChange={setSelectedDoctorFilter} disabled={isDoctor && !isCoordinator}>
                        <SelectTrigger className="w-full md:w-[220px] lg:w-[280px] h-10 text-sm rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <Stethoscope className="h-3.5 w-3.5 mr-1 text-muted-foreground shrink-0" />
                            <div className="flex-1 truncate text-left">
                                <SelectValue placeholder="Profissional" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Profissionais</SelectItem>
                            {doctorsList?.filter((d: any) => d.id && d.user).map((doctor: any) => {
                                const avail = professionalAvailability.find((p) => p.id === doctor.id)
                                return (
                                    <SelectItem key={doctor.id} value={doctor.id}>
                                        <div className="flex items-center gap-2 overflow-hidden w-full">
                                            <span className={cn(
                                                'w-2 h-2 rounded-full shrink-0',
                                                avail?.isBusy ? 'bg-red-500' : 'bg-green-500'
                                            )} />
                                            <span className="truncate min-w-0 font-medium">
                                                {doctor.user?.full_name || 'Profissional'}{' '}
                                                <span className="text-muted-foreground text-xs font-normal">
                                                    ({doctor.specialty || 'Geral'})
                                                </span>
                                            </span>
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                    
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="h-10 w-full md:w-[180px] pl-9 pr-8 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        />
                        {patientSearch && (
                            <button
                                type="button"
                                onClick={() => setPatientSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>



            {/* Calendar Grid */}
            <Card className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin select-none touch-pan-x touch-pan-y relative border shadow-inner">
                {calendarStyle === 'standard' ? (
                <div className="min-w-[950px] md:min-w-[1000px]">
                    {/* Header Row com Layout Original e Fundo Acetinado Discreto */}
                    <div className="grid grid-cols-8 border-b sticky top-0 bg-slate-50/90 backdrop-blur-md dark:bg-slate-900/90 z-10 shadow-sm border-slate-200/50 transition-all duration-300">
                        <div className="py-2 px-3 text-xs font-medium text-muted-foreground border-r text-center flex items-center justify-center h-full uppercase tracking-wider">
                            Horário
                        </div>
                        {(view === 'week' ? days : [currentDate]).map((day) => (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    'py-2 px-3 text-center border-r last:border-r-0 transition-colors duration-200',
                                    isSameDay(day, new Date()) && 'bg-blue-50 dark:bg-blue-950/20'
                                )}
                            >
                                <div className="text-xs font-medium text-muted-foreground uppercase">
                                    {format(day, 'EEE', { locale: ptBR })}
                                </div>
                                <div
                                    className={cn(
                                        'text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 transition-all duration-300',
                                        isSameDay(day, new Date())
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-foreground hover:bg-slate-200/50'
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
                                                'border-r last:border-r-0 p-1 relative group transition-all duration-200 cursor-pointer',
                                                isSameDay(day, new Date()) ? 'bg-emerald-50/[0.03] dark:bg-emerald-950/[0.01]' : '',
                                                'hover:bg-emerald-50/25 dark:hover:bg-emerald-950/5 hover:shadow-[inset_0_0_8px_rgba(16,185,129,0.04)]',
                                                !isSameMonth(day, currentDate) && 'bg-gray-50/50',
                                                showFreeSlots && (() => {
                                                    const status = getSlotFreeStatus(day, time)
                                                    if (status.isFree) return 'bg-emerald-50/80 hover:bg-emerald-100/80 ring-1 ring-inset ring-emerald-200'
                                                    if (status.isWorking) return 'bg-orange-50/40'
                                                    return 'bg-gray-50/60'
                                                })()
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
                                            {/* Free slot indicator - shows which therapists are free */}
                                            {showFreeSlots && (() => {
                                                const status = getSlotFreeStatus(day, time)
                                                if (!status.isFree) return null
                                                return (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-0.5 overflow-hidden">
                                                        <div className="flex flex-wrap gap-0.5 justify-center items-center max-w-full">
                                                            {status.freeDoctors.slice(0, 3).map((doc) => {
                                                                const color = getDoctorColor(doc.id)
                                                                const firstName = doc.name.split(' ')[0]
                                                                return (
                                                                    <span
                                                                        key={doc.id}
                                                                        className={cn(
                                                                            'text-[9px] font-semibold px-1.5 py-0.5 rounded-full truncate max-w-[80px]',
                                                                            color.bg, color.text
                                                                        )}
                                                                        title={doc.name}
                                                                    >
                                                                        {firstName}
                                                                    </span>
                                                                )
                                                            })}
                                                            {status.freeDoctors.length > 3 && (
                                                                <span className="text-[9px] font-medium text-muted-foreground">
                                                                    +{status.freeDoctors.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                            {!showFreeSlots && hasAppointments ? (
                                                <div className="flex flex-col gap-1 h-full">
                                                    {(expandedSlots.has(`${day.toISOString()}-${time}`) ? slotAppointments : slotAppointments.slice(0, 2)).map((appointment) => {
                                                        const doctorColor = getDoctorColor(appointment.doctor.id)
                                                        const isOnline = (appointment as any).appointment_type === 'online'
                                                        const isCancelled = appointment.status === 'CANCELLED'
                                                        const isCompleted = appointment.status === 'COMPLETED'
                                                        const duration = (appointment.doctor as any).consultation_duration || 60
                                                        const endTime = calcEndTime(appointment.appointment_time.substring(0, 5), duration)

                                                        return (
                                                            <TooltipProvider key={appointment.id}>
                                                                <Tooltip delayDuration={200}>
                                                                    <TooltipTrigger asChild>
                                                                        <div
                                                                            draggable={!isCancelled && !isCompleted}
                                                                            onDragStart={(e) => handleDragStart(e, appointment)}
                                                                            className={cn(
                                                                                'w-full rounded-lg border-l-4 p-1.5 text-xs flex flex-col shadow-sm cursor-pointer hover:shadow-lg transition-all',
                                                                                isCancelled
                                                                                    ? 'bg-red-50/90 dark:bg-red-950/20 border-l-red-500 text-red-700 dark:text-red-400 opacity-75 border-red-200/50'
                                                                                    : isCompleted
                                                                                        ? 'bg-gray-100 border-l-gray-400 text-gray-500 opacity-60'
                                                                                        : `${doctorColor.bg} ${doctorColor.text}`,
                                                                                (!isCancelled && !isCompleted) && doctorColor.border.replace('border-', 'border-l-'),
                                                                                isOnline && !isCancelled && !isCompleted && 'ring-2 ring-green-400 ring-offset-1',
                                                                                draggedAppointment?.id === appointment.id && 'opacity-50 border-dashed'
                                                                            )}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                setSelectedAppointmentId(appointment.id)
                                                                                setDetailsDrawerOpen(true)
                                                                            }}
                                                                        >
                                                                            {/* Patient Name */}
                                                                            <div className={cn("font-bold truncate text-sm leading-tight", isCancelled && "line-through opacity-70")}>
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
                                                                            {/* No Show Reason */}
                                                                            {appointment.status === 'NO_SHOW' && (appointment as any).no_show_reason && (
                                                                                <div className="text-[9px] mt-0.5 px-1 py-0.5 bg-red-200 text-red-800 rounded truncate">
                                                                                    ⚠ {(appointment as any).no_show_reason}
                                                                                </div>
                                                                            )}

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
                                                                                            <>
                                                                                                <DropdownMenuItem
                                                                                                    onClick={() => setEditingSeriesId((appointment as any).series_id)}
                                                                                                >
                                                                                                    <Repeat className="w-4 h-4 mr-2" />
                                                                                                    Editar Série
                                                                                                </DropdownMenuItem>
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
                                                                                            </>
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
                                                                                {appointment.status === 'NO_SHOW' && (appointment as any).no_show_reason && (
                                                                                    <p className="text-red-600"><strong>Motivo falta:</strong> {(appointment as any).no_show_reason}</p>
                                                                                )}
                                                                                {appointment.status === 'CANCELLED' && (appointment as any).cancellation_reason && (
                                                                                    <p className="text-red-600"><strong>Motivo cancelamento:</strong> {(appointment as any).cancellation_reason}</p>
                                                                                )}
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
                                                        isSameDay(day, new Date()) && 'bg-blue-50/30',
                                                        showFreeSlots && (() => {
                                                            const status = getSlotFreeStatus(day, time)
                                                            if (status.isFree) return 'bg-emerald-50/80'
                                                            if (status.isWorking) return 'bg-orange-50/40'
                                                            return 'bg-gray-50/60'
                                                        })()
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
                                                                const isCancelled = appointment.status === 'CANCELLED'
                                                                const isCompleted = appointment.status === 'COMPLETED'
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
                                                                                    draggable={!isCancelled && !isCompleted}
                                                                                    onDragStart={(e) => handleDragStart(e, appointment)}
                                                                                    className={cn(
                                                                                        'px-2 py-0.5 text-white cursor-pointer hover:brightness-110 transition-all flex flex-col justify-center overflow-hidden rounded-sm relative group/item',
                                                                                        isCancelled
                                                                                            ? 'bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 text-red-800 dark:text-red-400 line-through font-medium opacity-80'
                                                                                            : isCompleted
                                                                                                ? 'bg-gray-400 opacity-60'
                                                                                                : timelineColor,
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
                                                                                                    <>
                                                                                                        <DropdownMenuItem
                                                                                                            onClick={() => setEditingSeriesId((appointment as any).series_id)}
                                                                                                        >
                                                                                                            <Repeat className="w-4 h-4 mr-2" />
                                                                                                            Editar Série
                                                                                                        </DropdownMenuItem>
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
                                                                                                    </>
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
                                                                                        {appointment.status === 'NO_SHOW' && (appointment as any).no_show_reason && (
                                                                                            <p className="text-red-600"><strong>Motivo falta:</strong> {(appointment as any).no_show_reason}</p>
                                                                                        )}
                                                                                        {appointment.status === 'CANCELLED' && (appointment as any).cancellation_reason && (
                                                                                            <p className="text-red-600"><strong>Motivo cancelamento:</strong> {(appointment as any).cancellation_reason}</p>
                                                                                        )}
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
                isEncaixe={isEncaixeMode}
                onOpenChange={(open) => {
                    setManualAppointmentOpen(open)
                    if (!open) {
                        setPreselectedSlot(null)
                        setIsEncaixeMode(false)
                    }
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

            <EditSeriesModal
                open={!!editingSeriesId}
                onOpenChange={(open) => !open && setEditingSeriesId(null)}
                seriesId={editingSeriesId}
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

            {/* Modal/Drawer de Visualização Geral do Mural de Recados */}
            {isMuralOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-2xl h-full bg-slate-50 dark:bg-slate-950 border-l border-white/10 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-amber-500 animate-pulse" />
                                    <h3 className="text-lg font-bold text-slate-950 dark:text-slate-50">Mural de Recados</h3>
                                    <Link 
                                        href="/dashboard/help#mural-de-recados" 
                                        target="_blank"
                                        className="text-slate-400 hover:text-emerald-500 transition-colors"
                                        title="Para que serve? Clique para abrir o guia de ajuda."
                                    >
                                        <HelpCircle className="w-4 h-4" />
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canManageBulletins && (
                                        <Button
                                            onClick={() => {
                                                setEditingBulletin(null)
                                                setBulletinTitle('')
                                                setBulletinContent('')
                                                setBulletinType('info')
                                                setBulletinTarget('internal')
                                                setBulletinPinned(false)
                                                setIsCreateOpen(true)
                                            }}
                                            size="sm"
                                            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-500/10 font-semibold"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Novo Comunicado
                                        </Button>
                                    )}
                                    <Button 
                                        onClick={() => setIsMuralOpen(false)}
                                        variant="ghost" 
                                        size="icon" 
                                        className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Conteúdo do Mural */}
                            <div className="flex-1 overflow-y-auto py-6 pr-1 space-y-4" style={{ scrollbarWidth: 'thin' }}>
                                {bulletinsLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                                        <span className="text-sm text-muted-foreground">Carregando mural de comunicados...</span>
                                    </div>
                                ) : bulletins.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8">
                                        <Megaphone className="w-12 h-12 text-slate-400 mb-3 opacity-40" />
                                        <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum recado cadastrado</p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                            Avisos importantes, comunicados internos e notas da clínica aparecerão aqui.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                                        {bulletins.map((b: any) => {
                                            const typeStyles = {
                                                info: 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30 text-blue-950 dark:text-blue-200',
                                                success: 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-950 dark:text-emerald-200',
                                                warning: 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 text-amber-950 dark:text-amber-200',
                                                alert: 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200/50 dark:border-rose-800/30 text-rose-950 dark:text-rose-200',
                                            }[b.type || 'info'] || 'bg-white dark:bg-slate-900 border-slate-200 text-slate-950'

                                            const badgeTarget = {
                                                internal: { label: 'Interno', style: 'bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-300' },
                                                patients: { label: 'Pacientes', style: 'bg-blue-100/60 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
                                                all: { label: 'Todos', style: 'bg-indigo-100/60 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
                                            }[b.target || 'internal'] || { label: 'Interno', style: 'bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-slate-350' }

                                            return (
                                                <div 
                                                    key={b.id} 
                                                    className={`relative group p-5 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:shadow-md flex flex-col justify-between bg-white dark:bg-slate-900/90 ${typeStyles} ${b.is_pinned ? 'ring-1.5 ring-amber-500/30' : ''}`}
                                                >
                                                    <div>
                                                        <div className="flex items-start justify-between gap-2 mb-2">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${badgeTarget.style}`}>
                                                                    {badgeTarget.label}
                                                                </span>
                                                                {b.is_pinned && (
                                                                    <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                                        <Pin className="w-3.5 h-3.5 fill-current rotate-45" />
                                                                        Fixado
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Ações Rápidas (Apenas Admin/Recepção) */}
                                                            {canManageBulletins && (
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                                    <button 
                                                                        onClick={() => handleTogglePin(b)}
                                                                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground transition-colors"
                                                                        title={b.is_pinned ? "Desfixar recado" : "Fixar no topo"}
                                                                    >
                                                                        <Pin className={`w-3.5 h-3.5 ${b.is_pinned ? 'fill-current rotate-45 text-amber-500' : ''}`} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleStartEdit(b)}
                                                                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground transition-colors"
                                                                        title="Editar comunicado"
                                                                    >
                                                                        <Edit3 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteBulletin(b.id)}
                                                                        className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-rose-600 hover:text-rose-700 transition-colors"
                                                                        title="Excluir comunicado"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <h3 className="font-semibold text-sm mb-1 leading-snug">{b.title}</h3>
                                                        <p className="text-xs opacity-90 leading-relaxed whitespace-pre-line">{b.content}</p>
                                                    </div>

                                                    <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] opacity-75">
                                                        <span>Por: {b.author_name || 'Equipe CliniGo'}</span>
                                                        <span>{new Date(b.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                            <Button
                                onClick={() => setIsMuralOpen(false)}
                                variant="outline"
                                className="rounded-xl border-slate-200"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Criação e Edição de Recados (Sobreposição) */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-300">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col justify-between animate-in zoom-in-95 duration-200">
                        <div>
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-base font-bold flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-amber-500" />
                                    {editingBulletin ? 'Editar Comunicado' : 'Novo Comunicado'}
                                </h3>
                                <Button 
                                    onClick={() => {
                                        setIsCreateOpen(false)
                                        setEditingBulletin(null)
                                    }}
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <form onSubmit={handleSaveBulletin} className="space-y-4 mt-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">Título do Comunicado</label>
                                    <Input
                                        value={bulletinTitle}
                                        onChange={(e) => setBulletinTitle(e.target.value)}
                                        placeholder="Ex: Reunião Geral de Equipe"
                                        required
                                        maxLength={100}
                                        className="rounded-xl"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-500">Conteúdo / Descrição</label>
                                    <Textarea
                                        value={bulletinContent}
                                        onChange={(e) => setBulletinContent(e.target.value)}
                                        placeholder="Digite a mensagem completa que deseja transmitir..."
                                        rows={4}
                                        required
                                        className="rounded-xl resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500">Visualização / Destino</label>
                                        <select
                                            value={bulletinTarget}
                                            onChange={(e: any) => setBulletinTarget(e.target.value as any)}
                                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="internal">Apenas Interno (Equipe)</option>
                                            <option value="patients">Apenas Pacientes (Portal)</option>
                                            <option value="all">Todos (Equipe e Portal)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-500">Tipo de Alerta</label>
                                        <select
                                            value={bulletinType}
                                            onChange={(e: any) => setBulletinType(e.target.value as any)}
                                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="info">💡 Informativo (Azul)</option>
                                            <option value="success">✅ Positivo (Verde)</option>
                                            <option value="warning">⚠️ Atenção (Amarelo)</option>
                                            <option value="alert">🚨 Urgente (Vermelho)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="pinned"
                                        checked={bulletinPinned}
                                        onChange={(e) => setBulletinPinned(e.target.checked)}
                                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <label htmlFor="pinned" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer select-none">
                                        <Pin className="w-3.5 h-3.5 rotate-45 fill-current text-amber-500" />
                                        Fixar no topo do mural
                                    </label>
                                </div>
                            </form>
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 mt-6">
                            <Button
                                onClick={() => {
                                    if (window.confirm('Deseja limpar todos os campos do formulário?')) {
                                        setBulletinTitle('')
                                        setBulletinContent('')
                                        setBulletinType('info')
                                        setBulletinTarget('internal')
                                        setBulletinPinned(false)
                                    }
                                }}
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-slate-200 text-slate-600"
                            >
                                Limpar
                            </Button>
                            
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => {
                                        setIsCreateOpen(false)
                                        setEditingBulletin(null)
                                    }}
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-xl text-slate-500"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSaveBulletin}
                                    disabled={isSubmittingBulletin || !bulletinTitle.trim() || !bulletinContent.trim()}
                                    size="sm"
                                    className="bg-amber-500 text-white hover:bg-amber-600 rounded-xl px-5 shadow-lg shadow-amber-500/10 font-semibold"
                                >
                                    {isSubmittingBulletin ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Salvar'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
