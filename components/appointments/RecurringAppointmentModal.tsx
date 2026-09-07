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
import { Checkbox } from '@/components/ui/checkbox'
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
    Users,
} from 'lucide-react'
import { PatientSearchCombobox, type PatientSearchResult } from './PatientSearchCombobox'
import { QuickPatientForm } from './QuickPatientForm'
import { api } from '@/lib/api-client'
import { cn, formatCurrency } from '@/lib/utils'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface Doctor {
    id: string
    specialty: string
    consultation_price: number
    user: {
        full_name: string
    }
}

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

interface RecurringAppointmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultDoctorId?: string
    onSuccess?: (details?: { doctorId: string; startDate: string }) => void
}

export function RecurringAppointmentModal({
    open,
    onOpenChange,
    defaultDoctorId,
    onSuccess,
}: RecurringAppointmentModalProps) {
    const profLabel = useProfessionalLabel()
    const queryClient = useQueryClient()
    const [step, setStep] = useState<'patient' | 'register' | 'config' | 'review'>('patient')
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)
    const [quickRegistration, setQuickRegistration] = useState<any>(null)

    // Form state
    const [doctorId, setDoctorId] = useState(defaultDoctorId || '')
    const [coDoctorId, setCoDoctorId] = useState('')
    const [selectedDays, setSelectedDays] = useState<number[]>([])
    const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')

    useEffect(() => {
        if (open && defaultDoctorId) {
            setDoctorId(defaultDoctorId)
        }
    }, [open, defaultDoctorId])
    const [appointmentTime, setAppointmentTime] = useState('')
    const [therapyType, setTherapyType] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [paymentType, setPaymentType] = useState('PARTICULAR')
    const [notes, setNotes] = useState('')

    // Conflict state
    const [conflictDates, setConflictDates] = useState<string[]>([])

    // Fetch doctors
    const { data: doctors, isLoading: doctorsLoading } = useQuery({
        queryKey: ['doctors-for-recurring'],
        queryFn: async () => api.get<Doctor[]>('/doctors'),
        enabled: open,
        staleTime: 5 * 60 * 1000,
    })

    const selectedDoctor = doctors?.find(d => d.id === doctorId)
    const selectedCoDoctor = doctors?.find(d => d.id === coDoctorId)

    // Calculate total sessions respecting frequency interval (1=Semanal, 2=Quinzenal/15 em 15 dias, 4=Mensal)
    const calculateSessions = () => {
        if (!startDate || !endDate || selectedDays.length === 0) return 0
        const interval = frequency === 'biweekly' ? 2 : frequency === 'monthly' ? 4 : 1
        let count = 0
        const start = new Date(startDate + 'T00:00:00')
        const end = new Date(endDate + 'T00:00:00')

        const baseWeekStart = new Date(start)
        baseWeekStart.setDate(start.getDate() - start.getDay())
        baseWeekStart.setHours(0, 0, 0, 0)

        const current = new Date(start)
        while (current <= end) {
            if (selectedDays.includes(current.getDay())) {
                const currentWeekStart = new Date(current)
                currentWeekStart.setDate(current.getDate() - current.getDay())
                currentWeekStart.setHours(0, 0, 0, 0)

                const diffDays = Math.round((currentWeekStart.getTime() - baseWeekStart.getTime()) / (1000 * 60 * 60 * 24))
                const diffWeeks = Math.floor(diffDays / 7)

                if (diffWeeks % interval === 0) {
                    count++
                }
            }
            current.setDate(current.getDate() + 1)
        }
        return count
    }

    const totalSessions = calculateSessions()

    // Toggle day selection
    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const recurrenceInterval = frequency === 'biweekly' ? 2 : frequency === 'monthly' ? 4 : 1
            const response = await fetch('/api/appointments/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: selectedPatient?.id,
                    doctor_id: doctorId,
                    co_doctor_id: coDoctorId || undefined,
                    days_of_week: selectedDays,
                    appointment_time: appointmentTime,
                    therapy_type: therapyType || undefined,
                    start_date: startDate,
                    end_date: endDate,
                    recurrence_interval: recurrenceInterval,
                    frequency: frequency,
                    payment_type: paymentType,
                    appointment_type: 'presencial',
                    notes: notes || undefined,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                if (response.status === 409 && data.conflicting_dates) {
                    setConflictDates(data.conflicting_dates)
                    throw new Error(`${data.total_conflicts} conflito(s) de horário encontrado(s). Resolva os conflitos antes de criar a série.`)
                }
                throw new Error(data.error || 'Erro ao criar série recorrente')
            }

            return data
        },
        onSuccess: (data) => {
            toast.success(data.message || `${data.total_created} agendamentos criados com sucesso!`)
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            queryClient.invalidateQueries({ queryKey: ['recurring-series-list'], exact: false })
            onSuccess?.({ doctorId, startDate })
            handleClose()
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    const handleClose = () => {
        setStep('patient')
        setSelectedPatient(null)
        setQuickRegistration(null)
        setDoctorId(defaultDoctorId || '')
        setCoDoctorId('')
        setSelectedDays([])
        setAppointmentTime('')
        setTherapyType('')
        setStartDate('')
        setEndDate('')
        setPaymentType('PARTICULAR')
        setNotes('')
        setConflictDates([])
        onOpenChange(false)
    }

    const handlePatientSelect = (patient: PatientSearchResult | null) => {
        setSelectedPatient(patient)
        setQuickRegistration(null)
        if (patient) setStep('config')
    }

    const handleQuickRegister = (data: any) => {
        setQuickRegistration(data)
        setSelectedPatient(null)
        setStep('config')
    }

    const canProceedToReview = doctorId && selectedDays.length > 0 && appointmentTime && startDate && endDate && totalSessions > 0

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Repeat className="h-5 w-5 text-primary" />
                        Agendamento Recorrente
                    </DialogTitle>
                    <DialogDescription>
                        Crie uma série de agendamentos automáticos para terapias com agenda fixa semanal
                    </DialogDescription>
                </DialogHeader>

                {/* Step: Patient Selection */}
                {step === 'patient' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Paciente
                            </Label>
                            <PatientSearchCombobox
                                onSelect={handlePatientSelect}
                                onCreateNew={() => setStep('register')}
                            />
                        </div>
                    </div>
                )}

                {/* Step: Quick Registration */}
                {step === 'register' && (
                    <QuickPatientForm
                        onSubmit={handleQuickRegister}
                        onBack={() => setStep('patient')}
                    />
                )}

                {/* Step: Configuration */}
                {step === 'config' && (
                    <div className="space-y-6">
                        {/* Patient info bar */}
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                    {selectedPatient?.full_name || quickRegistration?.full_name}
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setStep('patient')}
                            >
                                Trocar
                            </Button>
                        </div>

                        <Separator />

                        {/* Doctor / Professional Selection */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                {profLabel.singular} (Titular)
                            </Label>
                            <Select value={doctorId} onValueChange={setDoctorId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Selecione o ${profLabel.singular.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                    {doctorsLoading && (
                                        <div className="p-2 text-center">
                                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        </div>
                                    )}
                                    {doctors?.filter(d => d.id && d.user).map((doctor) => (
                                        <SelectItem key={doctor.id} value={doctor.id}>
                                            {doctor.user?.full_name || profLabel.singular} - {doctor.specialty}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Co-Doctor / Co-Therapist Selection (Optional) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Users className="h-3.5 w-3.5" />
                                    Co-Terapeuta Coparticipante (Opcional — Co-Atendimento)
                                </Label>
                                {coDoctorId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCoDoctorId('')}
                                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                                    >
                                        Remover
                                    </Button>
                                )}
                            </div>
                            <Select value={coDoctorId || 'NONE'} onValueChange={(val) => setCoDoctorId(val === 'NONE' ? '' : val)}>
                                <SelectTrigger className="border-dashed">
                                    <SelectValue placeholder="Nenhum (atendimento individual)" />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                    <SelectItem value="NONE">
                                        <span className="text-muted-foreground">Nenhum (atendimento individual)</span>
                                    </SelectItem>
                                    {doctors?.filter(d => d.id && d.user && d.id !== doctorId).map((doctor) => (
                                        <SelectItem key={doctor.id} value={doctor.id}>
                                            {doctor.user?.full_name || 'Profissional'} - {doctor.specialty}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">
                                Ambos os profissionais visualizarão a sessão em suas agendas e poderão evoluir no prontuário.
                            </p>
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

                        {/* Periodicidade / Frequência */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                Periodicidade da Recorrência
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFrequency('weekly')}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col gap-1",
                                        frequency === 'weekly'
                                            ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs ring-1 ring-emerald-600"
                                            : "border-border bg-card hover:border-slate-300 text-muted-foreground"
                                    )}
                                >
                                    <span className="font-bold text-sm">Semanal</span>
                                    <span className="text-[11px] opacity-80">Toda semana</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFrequency('biweekly')}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col gap-1 relative",
                                        frequency === 'biweekly'
                                            ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs ring-1 ring-emerald-600"
                                            : "border-border bg-card hover:border-slate-300 text-muted-foreground"
                                    )}
                                >
                                    <span className="font-bold text-sm">Quinzenal</span>
                                    <span className="text-[11px] opacity-80">De 15 em 15 dias</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFrequency('monthly')}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left transition-all text-xs flex flex-col gap-1",
                                        frequency === 'monthly'
                                            ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold shadow-xs ring-1 ring-emerald-600"
                                            : "border-border bg-card hover:border-slate-300 text-muted-foreground"
                                    )}
                                >
                                    <span className="font-bold text-sm">Mensal</span>
                                    <span className="text-[11px] opacity-80">A cada 4 semanas</span>
                                </button>
                            </div>
                            {frequency === 'biweekly' && (
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md border border-emerald-200/60 dark:border-emerald-900/40">
                                    Atendimentos intercalados a cada 2 semanas (de 15 em 15 dias), mantendo os dias da semana selecionados e liberando as semanas alternadas para outros pacientes.
                                </p>
                            )}
                        </div>

                        {/* Days of Week */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Dias da Semana
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map((day) => {
                                    const isSelected = selectedDays.includes(day.value)
                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            className={`
                                                px-4 py-2 rounded-lg border text-sm font-medium transition-all
                                                ${isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:bg-primary/5'
                                                }
                                            `}
                                        >
                                            {day.short}
                                        </button>
                                    )
                                })}
                            </div>
                            {selectedDays.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {selectedDays.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).join(', ')}
                                </p>
                            )}
                        </div>

                        {/* Time */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Horário Fixo
                            </Label>
                            <Input
                                type="time"
                                value={appointmentTime}
                                onChange={(e) => setAppointmentTime(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        {/* Date Range */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data Início</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Data Fim</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Payment Type */}
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <Select value={paymentType} onValueChange={setPaymentType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PARTICULAR">Particular</SelectItem>
                                    <SelectItem value="CONVENIO">Convênio</SelectItem>
                                </SelectContent>
                            </Select>
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

                        {/* Summary before proceeding */}
                        {totalSessions > 0 && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <span className="font-semibold text-green-800">Resumo da Série</span>
                                </div>
                                <div className="text-sm text-green-700 space-y-1">
                                    <p><strong>{totalSessions} sessões</strong> serão agendadas automaticamente</p>
                                    <p>Periodicidade: <strong>{frequency === 'biweekly' ? 'Quinzenal (de 15 em 15 dias)' : frequency === 'monthly' ? 'Mensal (a cada 4 semanas)' : 'Semanal (toda semana)'}</strong></p>
                                    {selectedDoctor && (
                                        <p>Terapeuta Titular: <strong>{selectedDoctor.user?.full_name}</strong> ({selectedDoctor.specialty})</p>
                                    )}
                                    {selectedCoDoctor && (
                                        <p className="text-emerald-900 font-medium">
                                            Co-Terapeuta: <strong>{selectedCoDoctor.user?.full_name}</strong> ({selectedCoDoctor.specialty})
                                        </p>
                                    )}
                                    {therapyType && <p>Terapia: {therapyType}</p>}
                                    <p>Período: {startDate} a {endDate}</p>
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
                                            Já existem agendamentos nos seguintes dias:
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
                                        <p className="text-xs text-red-600 mt-2">
                                            Cancele ou mova esses agendamentos antes de criar a série.
                                        </p>
                                    </div>
                                </div>
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
                                    createMutation.mutate()
                                }}
                                disabled={!canProceedToReview || createMutation.isPending}
                            >
                                {createMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                <Repeat className="mr-2 h-4 w-4" />
                                Criar {totalSessions} Agendamentos
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
