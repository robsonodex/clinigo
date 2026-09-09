'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { useDoctors, useUpdateSchedules } from '@/lib/hooks/use-doctors'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, Plus, Trash2, Clock, Copy, RotateCcw, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/lib/hooks/use-auth'
import { SavedSchedulesList } from '@/components/doctors/SavedSchedulesList'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

const DAYS_OF_WEEK = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
]

const STANDARD_DURATIONS = [
    { value: 15, label: '15 min (Triagem rápida)' },
    { value: 20, label: '20 min (Avaliação breve)' },
    { value: 30, label: '30 min (Consulta padrão)' },
    { value: 40, label: '40 min (Terapia)' },
    { value: 45, label: '45 min (Atendimento clínico)' },
    { value: 50, label: '50 min (Terapia 2)' },
    { value: 60, label: '60 min (1 hora padrão)' },
    { value: 75, label: '75 min (1h15 estendida)' },
    { value: 80, label: '80 min (1h20 sessão)' },
    { value: 90, label: '90 min (1h30 integração sensorial)' },
    { value: 120, label: '120 min (2h - Programa ABA)' },
    { value: 150, label: '150 min (2h30 intensivo)' },
    { value: 180, label: '180 min (3h - Turno ABA intensivo)' },
    { value: 240, label: '240 min (4h - Meio período ABA)' },
]

interface ShiftBlock {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
    is_custom_duration?: boolean
}

// Generate a unique ID for each shift block
let shiftIdCounter = 0
function generateShiftId(): string {
    return `shift-${Date.now()}-${++shiftIdCounter}`
}

function calculateSlotPreview(start: string, end: string, duration: number): { count: number; slots: string[] } {
    if (!start || !end || !duration || duration <= 0) return { count: 0, slots: [] }
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return { count: 0, slots: [] }
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    if (startMin >= endMin) return { count: 0, slots: [] }

    const slots: string[] = []
    let current = startMin
    while (current + duration <= endMin) {
        const h = Math.floor(current / 60).toString().padStart(2, '0')
        const m = (current % 60).toString().padStart(2, '0')
        slots.push(`${h}:${m}`)
        current += duration
    }
    return { count: slots.length, slots }
}

export default function SchedulePage() {
    const { clinicId } = useRole()
    const { data: doctors } = useDoctors(clinicId)
    const updateSchedules = useUpdateSchedules()
    const profLabel = useProfessionalLabel()

    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
    const [shifts, setShifts] = useState<ShiftBlock[]>([])

    // Fetch schedules for selected doctor
    const { data: currentSchedules, isLoading: isLoadingSchedules } = useQuery({
        queryKey: ['schedules', selectedDoctorId],
        queryFn: async () => {
            if (!selectedDoctorId) return null
            const doctor = await api.get<any>(`/doctors/detail?id=${selectedDoctorId}&action=profile`)
            return doctor.schedules as any[]
        },
        enabled: !!selectedDoctorId,
    })

    // Update local state when schedules load
    useEffect(() => {
        if (currentSchedules && currentSchedules.length > 0) {
            const loadedShifts: ShiftBlock[] = currentSchedules.map((s: any) => {
                const duration = s.slot_duration_minutes || 30
                const isStandard = STANDARD_DURATIONS.some(d => d.value === duration)
                return {
                    id: generateShiftId(),
                    day_of_week: s.day_of_week,
                    start_time: s.start_time?.substring(0, 5) || '09:00',
                    end_time: s.end_time?.substring(0, 5) || '18:00',
                    slot_duration_minutes: duration,
                    is_custom_duration: !isStandard,
                }
            })
            setShifts(loadedShifts)
        } else {
            setShifts([])
        }
    }, [currentSchedules])

    // Group shifts by day
    const shiftsByDay = DAYS_OF_WEEK.map(day => ({
        ...day,
        shifts: shifts.filter(s => s.day_of_week === day.value),
    }))

    // Add a new shift to a specific day (permite ate 10 turnos por dia)
    const addShift = (dayOfWeek: number) => {
        const dayShifts = shifts.filter(s => s.day_of_week === dayOfWeek)
        if (dayShifts.length >= 10) {
            toast.error('Limite de 10 turnos por dia atingido')
            return
        }

        // Smart default: if already has shifts, pick next logical block
        let defaultStart = '09:00'
        let defaultEnd = '18:00'
        if (dayShifts.length > 0) {
            const lastShift = dayShifts.sort((a, b) => a.end_time.localeCompare(b.end_time))[dayShifts.length - 1]
            const [h, m] = lastShift.end_time.split(':').map(Number)
            const newStartMinutes = (h * 60 + m) + 15 // 15 min buffer
            if (newStartMinutes < 23 * 60) {
                defaultStart = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}`
                const newEndMinutes = Math.min(newStartMinutes + 240, 23 * 60)
                defaultEnd = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}`
            }
        }

        setShifts(prev => [...prev, {
            id: generateShiftId(),
            day_of_week: dayOfWeek,
            start_time: defaultStart,
            end_time: defaultEnd,
            slot_duration_minutes: 50, // Padrão terapia
        }])
    }

    // Remove a shift
    const removeShift = (shiftId: string) => {
        setShifts(prev => prev.filter(s => s.id !== shiftId))
    }

    // Clear all shifts for a day
    const clearDayShifts = (dayOfWeek: number) => {
        setShifts(prev => prev.filter(s => s.day_of_week !== dayOfWeek))
        const dayName = DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label
        toast.success(`Turnos de ${dayName} limpos`)
    }

    // Copy shifts from one day to target days
    const copyDayShifts = (sourceDay: number, targetDays: number[]) => {
        const sourceShifts = shifts.filter(s => s.day_of_week === sourceDay)
        if (sourceShifts.length === 0) {
            toast.error('O dia selecionado não possui turnos para copiar')
            return
        }

        setShifts(prev => {
            const filtered = prev.filter(s => !targetDays.includes(s.day_of_week))
            const cloned: ShiftBlock[] = []
            for (const targetDay of targetDays) {
                for (const s of sourceShifts) {
                    cloned.push({
                        id: generateShiftId(),
                        day_of_week: targetDay,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        slot_duration_minutes: s.slot_duration_minutes,
                        is_custom_duration: s.is_custom_duration,
                    })
                }
            }
            return [...filtered, ...cloned]
        })

        const targetLabels = targetDays.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.short).join(', ')
        toast.success(`Turnos replicados com sucesso para: ${targetLabels}`)
    }

    // Update a shift field
    const updateShift = (shiftId: string, field: keyof ShiftBlock, value: any) => {
        setShifts(prev => prev.map(s => {
            if (s.id !== shiftId) return s
            if (field === 'slot_duration_minutes') {
                if (value === 'custom') {
                    return { ...s, is_custom_duration: true }
                } else {
                    return { ...s, slot_duration_minutes: Number(value), is_custom_duration: false }
                }
            }
            return { ...s, [field]: value }
        }))
    }

    // Validate and submit
    const onSubmit = () => {
        if (!selectedDoctorId) {
            toast.error(`Selecione um ${profLabel.singular.toLowerCase()}`)
            return
        }

        // Validate: start < end for all shifts
        for (const shift of shifts) {
            const [sh, sm] = shift.start_time.split(':').map(Number)
            const [eh, em] = shift.end_time.split(':').map(Number)
            if (sh * 60 + sm >= eh * 60 + em) {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === shift.day_of_week)?.label
                toast.error(`${dayLabel}: Hora de início deve ser anterior à hora de término`)
                return
            }
            if (!shift.slot_duration_minutes || shift.slot_duration_minutes < 5 || shift.slot_duration_minutes > 480) {
                const dayLabel = DAYS_OF_WEEK.find(d => d.value === shift.day_of_week)?.label
                toast.error(`${dayLabel}: Duração do slot deve ser entre 5 e 480 minutos`)
                return
            }
        }

        // Validate: no overlapping shifts on same day
        for (const day of DAYS_OF_WEEK) {
            const dayShifts = shifts.filter(s => s.day_of_week === day.value)
            for (let i = 0; i < dayShifts.length; i++) {
                for (let j = i + 1; j < dayShifts.length; j++) {
                    const a = dayShifts[i]
                    const b = dayShifts[j]
                    const [ash, asm] = a.start_time.split(':').map(Number)
                    const [aeh, aem] = a.end_time.split(':').map(Number)
                    const [bsh, bsm] = b.start_time.split(':').map(Number)
                    const [beh, bem] = b.end_time.split(':').map(Number)
                    const aStart = ash * 60 + asm
                    const aEnd = aeh * 60 + aem
                    const bStart = bsh * 60 + bsm
                    const bEnd = beh * 60 + bem

                    if (aStart < bEnd && aEnd > bStart) {
                        toast.error(`${day.label}: Turnos não podem se sobrepor`)
                        return
                    }
                }
            }
        }

        const schedulesToSave = shifts.map(s => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            slot_duration_minutes: Number(s.slot_duration_minutes),
        }))

        updateSchedules.mutate({
            doctorId: selectedDoctorId,
            schedules: schedulesToSave,
        })
    }

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto px-1 sm:px-4 py-2">
            {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <Clock className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Configurar Horários</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Defina a disponibilidade semanal dos {profLabel.plural.toLowerCase()}</p>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Seleção</CardTitle>
                    <CardDescription>
                        Escolha o {profLabel.singular.toLowerCase()} para configurar a agenda
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Select
                        value={selectedDoctorId || ''}
                        onValueChange={setSelectedDoctorId}
                    >
                        <SelectTrigger className="w-[300px]">
                            <SelectValue placeholder={`Selecione um ${profLabel.singular.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {doctors?.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                    {d.user.full_name} - {d.specialty}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {/* SHOW SAVED SCHEDULES IMMEDIATELY */}
            {selectedDoctorId && (
                <SavedSchedulesList doctorId={selectedDoctorId} />
            )}

            {selectedDoctorId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Configurar Agenda Semanal</CardTitle>
                        <CardDescription>
                            Adicione múltiplos turnos para cada dia com durações flexíveis (15m a 240m ou personalizada). O sistema calcula a capacidade de vagas automaticamente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSchedules ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="grid gap-4">
                                    {shiftsByDay.map((day) => (
                                        <div
                                            key={day.value}
                                            className={`p-4 border rounded-lg transition-colors ${
                                                day.shifts.length > 0
                                                    ? 'bg-green-50/40 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                                                    : 'bg-card border-border'
                                            }`}
                                        >
                                            {/* Day Header with Copy Action */}
                                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                            day.shifts.length > 0
                                                                ? 'bg-green-600 text-white'
                                                                : 'bg-muted text-muted-foreground'
                                                        }`}
                                                    >
                                                        {day.short}
                                                    </div>
                                                    <span className="font-medium">{day.label}</span>
                                                    {day.shifts.length > 0 && (
                                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 font-normal">
                                                            {day.shifts.length} {day.shifts.length === 1 ? 'turno' : 'turnos'}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {day.shifts.length > 0 && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" className="text-xs h-8">
                                                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                                                    Copiar dia...
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => copyDayShifts(day.value, [1, 2, 3, 4, 5])}>
                                                                    <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                                                    Copiar para Seg a Sex
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => copyDayShifts(day.value, [0, 1, 2, 3, 4, 5, 6].filter(d => d !== day.value))}>
                                                                    <CalendarDays className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                                                    Copiar para todos os outros dias
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => clearDayShifts(day.value)} className="text-destructive focus:text-destructive">
                                                                    <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                                                    Limpar turnos deste dia
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addShift(day.value)}
                                                        disabled={day.shifts.length >= 10}
                                                        className="text-xs h-8"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" />
                                                        Adicionar turno
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Shifts list */}
                                            {day.shifts.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic pl-10">
                                                    Nenhum turno configurado para este dia
                                                </p>
                                            ) : (
                                                <div className="space-y-3 pl-0 sm:pl-10">
                                                    {day.shifts
                                                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                                        .map((shift, idx) => {
                                                            const preview = calculateSlotPreview(
                                                                shift.start_time,
                                                                shift.end_time,
                                                                shift.slot_duration_minutes
                                                            )

                                                            return (
                                                                <div
                                                                    key={shift.id}
                                                                    className="p-3 bg-white dark:bg-gray-900 border rounded-lg shadow-2xs space-y-2"
                                                                >
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <span className="text-xs text-muted-foreground font-semibold w-16">
                                                                            Turno {idx + 1}
                                                                        </span>

                                                                        <div className="grid gap-1">
                                                                            <Label className="text-xs text-muted-foreground">
                                                                                Início
                                                                            </Label>
                                                                            <Input
                                                                                type="time"
                                                                                value={shift.start_time}
                                                                                onChange={(e) => updateShift(shift.id, 'start_time', e.target.value)}
                                                                                className="w-28 h-8 text-sm"
                                                                            />
                                                                        </div>

                                                                        <div className="grid gap-1">
                                                                            <Label className="text-xs text-muted-foreground">
                                                                                Fim
                                                                            </Label>
                                                                            <Input
                                                                                type="time"
                                                                                value={shift.end_time}
                                                                                onChange={(e) => updateShift(shift.id, 'end_time', e.target.value)}
                                                                                className="w-28 h-8 text-sm"
                                                                            />
                                                                        </div>

                                                                        <div className="grid gap-1">
                                                                            <Label className="text-xs text-muted-foreground">
                                                                                Duração
                                                                            </Label>
                                                                            {!shift.is_custom_duration ? (
                                                                                <Select
                                                                                    value={String(shift.slot_duration_minutes)}
                                                                                    onValueChange={(val) => updateShift(shift.id, 'slot_duration_minutes', val)}
                                                                                >
                                                                                    <SelectTrigger className="w-52 h-8 text-xs">
                                                                                        <SelectValue />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {STANDARD_DURATIONS.map((dur) => (
                                                                                            <SelectItem key={dur.value} value={String(dur.value)}>
                                                                                                {dur.label}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                        <DropdownMenuSeparator />
                                                                                        <SelectItem value="custom">
                                                                                            Personalizado (digitar minutos)...
                                                                                        </SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            ) : (
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <Input
                                                                                        type="number"
                                                                                        min={5}
                                                                                        max={480}
                                                                                        value={shift.slot_duration_minutes}
                                                                                        onChange={(e) => updateShift(shift.id, 'slot_duration_minutes', Number(e.target.value))}
                                                                                        className="w-20 h-8 text-xs"
                                                                                        placeholder="Min"
                                                                                    />
                                                                                    <span className="text-xs text-muted-foreground">min</span>
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-8 px-2 text-xs"
                                                                                        onClick={() => updateShift(shift.id, 'slot_duration_minutes', 50)}
                                                                                    >
                                                                                        Padrões
                                                                                    </Button>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                                                                            onClick={() => removeShift(shift.id)}
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>

                                                                    {/* Slot preview calculation */}
                                                                    {preview.count > 0 ? (
                                                                        <div className="pt-1 border-t border-dashed border-border/70 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <Clock className="w-3 h-3 text-primary shrink-0" />
                                                                            <span>
                                                                                <strong>{preview.count} vaga(s)</strong> gerada(s): {preview.slots.slice(0, 6).join(', ')}
                                                                                {preview.slots.length > 6 ? ` ... e mais ${preview.slots.length - 6}` : ''}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="pt-1 border-t border-dashed border-border/70 text-xs text-amber-600 dark:text-amber-400">
                                                                            A duração selecionada ({shift.slot_duration_minutes} min) excede o intervalo entre início e fim.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="button"
                                        size="lg"
                                        disabled={updateSchedules.isPending}
                                        onClick={onSubmit}
                                    >
                                        {updateSchedules.isPending && (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        )}
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Horários
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
