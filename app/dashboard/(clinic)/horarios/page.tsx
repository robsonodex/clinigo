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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Plus, Trash2 } from 'lucide-react'
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

interface ShiftBlock {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_duration_minutes: number
}

// Generate a unique ID for each shift block
let shiftIdCounter = 0
function generateShiftId(): string {
    return `shift-${Date.now()}-${++shiftIdCounter}`
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
            const loadedShifts: ShiftBlock[] = currentSchedules.map((s: any) => ({
                id: generateShiftId(),
                day_of_week: s.day_of_week,
                start_time: s.start_time?.substring(0, 5) || '09:00',
                end_time: s.end_time?.substring(0, 5) || '18:00',
                slot_duration_minutes: s.slot_duration_minutes || 30,
            }))
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

    // Add a new shift to a specific day
    const addShift = (dayOfWeek: number) => {
        const dayShifts = shifts.filter(s => s.day_of_week === dayOfWeek)
        if (dayShifts.length >= 3) {
            toast.error('Máximo de 3 turnos por dia')
            return
        }

        // Smart default: if already has shifts, pick next logical block
        let defaultStart = '09:00'
        let defaultEnd = '18:00'
        if (dayShifts.length > 0) {
            const lastShift = dayShifts.sort((a, b) => a.end_time.localeCompare(b.end_time))[dayShifts.length - 1]
            // Start 1 hour after last shift ends (lunch break pattern)
            const [h, m] = lastShift.end_time.split(':').map(Number)
            const newStartMinutes = (h * 60 + m) + 60
            if (newStartMinutes < 23 * 60) {
                defaultStart = `${Math.floor(newStartMinutes / 60).toString().padStart(2, '0')}:${(newStartMinutes % 60).toString().padStart(2, '0')}`
                const newEndMinutes = Math.min(newStartMinutes + 240, 23 * 60) // 4h block or until 23:00
                defaultEnd = `${Math.floor(newEndMinutes / 60).toString().padStart(2, '0')}:${(newEndMinutes % 60).toString().padStart(2, '0')}`
            }
        }

        setShifts(prev => [...prev, {
            id: generateShiftId(),
            day_of_week: dayOfWeek,
            start_time: defaultStart,
            end_time: defaultEnd,
            slot_duration_minutes: 30,
        }])
    }

    // Remove a shift
    const removeShift = (shiftId: string) => {
        setShifts(prev => prev.filter(s => s.id !== shiftId))
    }

    // Update a shift field
    const updateShift = (shiftId: string, field: keyof ShiftBlock, value: string | number) => {
        setShifts(prev => prev.map(s =>
            s.id === shiftId ? { ...s, [field]: value } : s
        ))
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
            slot_duration_minutes: s.slot_duration_minutes,
        }))

        updateSchedules.mutate({
            doctorId: selectedDoctorId,
            schedules: schedulesToSave,
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Configurar Horários</h1>
                <p className="text-muted-foreground">
                    Defina a disponibilidade semanal dos {profLabel.plural.toLowerCase()} — configure múltiplos turnos por dia
                </p>
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

            {/* ✅ SHOW SAVED SCHEDULES IMMEDIATELY */}
            {selectedDoctorId && (
                <SavedSchedulesList doctorId={selectedDoctorId} />
            )}

            {selectedDoctorId && (
                <Card>
                    <CardHeader>
                        <CardTitle>Configurar Agenda Semanal</CardTitle>
                        <CardDescription>
                            Adicione turnos para cada dia. Use múltiplos turnos para bloquear horário de almoço ou saídas temporárias.
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
                                                    ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                                                    : 'bg-card border-border'
                                            }`}
                                        >
                                            {/* Day Header */}
                                            <div className="flex items-center justify-between mb-3">
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
                                                        <span className="text-xs text-green-600 font-medium">
                                                            ({day.shifts.length} {day.shifts.length === 1 ? 'turno' : 'turnos'})
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => addShift(day.value)}
                                                    disabled={day.shifts.length >= 3}
                                                    className="text-xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Adicionar turno
                                                </Button>
                                            </div>

                                            {/* Shifts list */}
                                            {day.shifts.length === 0 ? (
                                                <p className="text-sm text-muted-foreground italic pl-10">
                                                    Nenhum turno configurado — clique em &quot;Adicionar turno&quot;
                                                </p>
                                            ) : (
                                                <div className="space-y-2 pl-10">
                                                    {day.shifts
                                                        .sort((a, b) => a.start_time.localeCompare(b.start_time))
                                                        .map((shift, idx) => (
                                                            <div
                                                                key={shift.id}
                                                                className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-900 border rounded-md"
                                                            >
                                                                <span className="text-xs text-muted-foreground font-medium w-14">
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
                                                                    <Select
                                                                        value={String(shift.slot_duration_minutes)}
                                                                        onValueChange={(val) =>
                                                                            updateShift(shift.id, 'slot_duration_minutes', Number(val))
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="w-24 h-8 text-sm">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="15">15 min</SelectItem>
                                                                            <SelectItem value="30">30 min</SelectItem>
                                                                            <SelectItem value="45">45 min</SelectItem>
                                                                            <SelectItem value="60">60 min</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 mt-auto"
                                                                    onClick={() => removeShift(shift.id)}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        ))}
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
