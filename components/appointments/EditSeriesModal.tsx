'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
    Loader2,
    Calendar,
    Clock,
    User,
    Stethoscope,
    Repeat,
    AlertTriangle,
    CheckCircle2,
    Pencil,
} from 'lucide-react'

const DAYS_OF_WEEK = [
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
    { value: 0, label: 'Domingo', short: 'Dom' },
]

const TIME_OPTIONS = Array.from({ length: 28 }, (_, i) => {
    const hour = Math.floor(i / 2) + 7
    const minute = i % 2 === 0 ? '00' : '30'
    return `${String(hour).padStart(2, '0')}:${minute}`
})

interface EditSeriesModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    seriesId: string | null
    onSuccess?: () => void
}

export function EditSeriesModal({
    open,
    onOpenChange,
    seriesId,
    onSuccess,
}: EditSeriesModalProps) {
    const queryClient = useQueryClient()

    // Form state
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [appointmentTime, setAppointmentTime] = useState('')
    const [therapyType, setTherapyType] = useState('')
    const [notes, setNotes] = useState('')

    // Conflict state
    const [conflictDates, setConflictDates] = useState<string[]>([])

    // Fetch series details
    const { data: series, isLoading } = useQuery({
        queryKey: ['recurring-series', seriesId],
        queryFn: async () => {
            const response = await fetch(`/api/appointments/recurring/${seriesId}`)
            if (!response.ok) throw new Error('Erro ao buscar série')
            return response.json()
        },
        enabled: open && !!seriesId,
    })

    // Populate form when series loads
    useEffect(() => {
        if (series) {
            setSelectedDays(series.days_of_week || [])
            setAppointmentTime(series.appointment_time?.substring(0, 5) || '')
            setTherapyType(series.therapy_type || '')
            setNotes(series.notes || '')
            setConflictDates([])
        }
    }, [series])

    // Toggle day selection
    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    // Detect if schedule changed
    const hasScheduleChanged = series && (
        JSON.stringify([...selectedDays].sort()) !== JSON.stringify([...(series.days_of_week || [])].sort()) ||
        appointmentTime !== (series.appointment_time?.substring(0, 5) || '')
    )

    const hasAnyChange = series && (
        hasScheduleChanged ||
        therapyType !== (series.therapy_type || '') ||
        notes !== (series.notes || '')
    )

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            const payload: Record<string, unknown> = {}

            if (hasScheduleChanged) {
                payload.days_of_week = selectedDays
                payload.appointment_time = appointmentTime
            }
            if (therapyType !== (series?.therapy_type || '')) {
                payload.therapy_type = therapyType
            }
            if (notes !== (series?.notes || '')) {
                payload.notes = notes
            }

            const response = await fetch(`/api/appointments/recurring/${seriesId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 409 && data.conflicting_dates) {
                    setConflictDates(data.conflicting_dates)
                    throw new Error(`${data.total_conflicts} conflito(s) de horário encontrado(s). Resolva os conflitos antes de salvar.`)
                }
                throw new Error(data.error || 'Erro ao atualizar série')
            }

            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Série atualizada com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['recurring-series'], exact: false })
            onSuccess?.()
            handleClose()
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    const handleClose = () => {
        setSelectedDays([])
        setAppointmentTime('')
        setTherapyType('')
        setNotes('')
        setConflictDates([])
        onOpenChange(false)
    }

    const patientName = series?.patient?.full_name || 'Paciente'
    const doctorName = series?.doctor?.user?.full_name || 'Terapeuta'

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-primary" />
                        Editar Série Recorrente
                    </DialogTitle>
                    <DialogDescription>
                        Altere o dia da semana, horário ou outras informações da série
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : series ? (
                    <div className="space-y-5">
                        {/* Patient & Doctor info (read-only) */}
                        <div className="p-3 bg-muted rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{patientName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                <span>{doctorName}</span>
                                {series.doctor?.specialty && (
                                    <Badge variant="outline" className="text-xs">{series.doctor.specialty}</Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Período: {series.start_date} a {series.end_date}</span>
                            </div>
                            {series.future_appointments_count > 0 && (
                                <div className="text-xs text-muted-foreground">
                                    <strong>{series.future_appointments_count}</strong> agendamentos futuros serão afetados
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* Days of Week */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Dias da Semana
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = selectedDays.includes(day.value)
                                    const wasOriginal = series.days_of_week?.includes(day.value)
                                    const isChanged = isSelected !== wasOriginal

                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            className={`
                                                px-4 py-2 rounded-lg border text-sm font-medium transition-all relative
                                                ${isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                                                }
                                                ${isChanged ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                                            `}
                                        >
                                            {day.short}
                                            {isChanged && (
                                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                            {selectedDays.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedDays
                                        .sort((a, b) => a - b)
                                        .map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label)
                                        .join(', ')}
                                </p>
                            )}
                        </div>

                        {/* Time */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Horário Fixo
                            </Label>
                            <Select value={appointmentTime} onValueChange={setAppointmentTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o horário" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_OPTIONS.map((time) => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                            {time === series.appointment_time?.substring(0, 5) && ' (atual)'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Therapy Type */}
                        <div className="space-y-2">
                            <Label>Tipo de Terapia</Label>
                            <Input
                                placeholder="Ex: ABA, Fono, TO, Psicologia..."
                                value={therapyType}
                                onChange={(e) => setTherapyType(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Observações (opcional)</Label>
                            <Textarea
                                placeholder="Informações adicionais sobre a série..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <Separator />

                        {/* Change warning */}
                        {hasScheduleChanged && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-amber-800">Atenção: mudança de horário</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Todos os <strong>{series.future_appointments_count || 'futuros'}</strong> agendamentos
                                            serão <strong>removidos e recriados</strong> nos novos dias/horários.
                                            Agendamentos já realizados não serão afetados.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conflict Warning */}
                        {conflictDates.length > 0 && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-800">
                                            {conflictDates.length} conflito(s) encontrado(s)
                                        </p>
                                        <p className="text-sm text-red-700 mt-1">
                                            Já existem agendamentos deste profissional nos dias:
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {conflictDates.slice(0, 10).map(date => (
                                                <Badge key={date} variant="destructive" className="text-xs">
                                                    {date}
                                                </Badge>
                                            ))}
                                            {conflictDates.length > 10 && (
                                                <Badge variant="outline" className="text-xs">
                                                    +{conflictDates.length - 10} mais
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Success preview */}
                        {hasAnyChange && !hasScheduleChanged && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-700">Apenas informações da série serão atualizadas (sem mover agendamentos)</span>
                            </div>
                        )}

                        {/* Actions */}
                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => {
                                    setConflictDates([])
                                    updateMutation.mutate()
                                }}
                                disabled={!hasAnyChange || selectedDays.length === 0 || !appointmentTime || updateMutation.isPending}
                            >
                                {updateMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <Pencil className="mr-2 h-4 w-4" />
                                {hasScheduleChanged ? 'Salvar e Reagendar' : 'Salvar Alterações'}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        Série não encontrada
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
