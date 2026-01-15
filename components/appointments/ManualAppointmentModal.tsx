'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
    Loader2,
    Calendar,
    Clock,
    User,
    Stethoscope,
    AlertTriangle,
    Bell,
    Video,
    Building2,
} from 'lucide-react'
import { PatientSearchCombobox, type PatientSearchResult } from './PatientSearchCombobox'
import { QuickPatientForm } from './QuickPatientForm'
import { PaymentMethodSelector, type ManualPaymentType } from './PaymentMethodSelector'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/api-client'

// Types
interface Doctor {
    id: string
    specialty: string
    consultation_price: number
    user: {
        full_name: string
    }
}

interface HealthInsurance {
    id: string
    name: string
    plan_name?: string
}

// Form schema
const manualAppointmentSchema = z.object({
    doctor_id: z.string().min(1, 'Selecione um médico'),
    appointment_date: z.string().min(1, 'Selecione uma data'),
    appointment_time: z.string().min(1, 'Selecione um horário'),
    duration_minutes: z.number().default(30),
    type: z.enum(['presencial', 'telemedicina']).default('presencial'),
    payment_type: z.string().min(1, 'Selecione forma de pagamento'),
    health_insurance_id: z.string().optional(),
    insurance_card_number: z.string().optional(),
    notes: z.string().optional(),
    send_sms: z.boolean().default(true),
    send_whatsapp: z.boolean().default(true),
    send_email: z.boolean().default(false),
    ignore_schedule_constraints: z.boolean().default(false),
    override_reason: z.string().optional(),
})

type ManualAppointmentFormData = z.infer<typeof manualAppointmentSchema>

interface ManualAppointmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    preselectedDate?: string
    preselectedTime?: string
    preselectedDoctorId?: string
    appointmentToEdit?: any // Typed as any to avoid circular deps for now, but should be Appointment
}

export function ManualAppointmentModal({
    open,
    onOpenChange,
    preselectedDate,
    preselectedTime,
    preselectedDoctorId,
    appointmentToEdit,
}: ManualAppointmentModalProps) {
    const queryClient = useQueryClient()
    const [step, setStep] = useState<'search' | 'register' | 'form'>('search')
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)
    const [quickRegistration, setQuickRegistration] = useState<any>(null)
    const [showScheduleWarning, setShowScheduleWarning] = useState(false)

    // Check if we are in edit mode
    const isEditing = !!appointmentToEdit

    // Form
    const form = useForm<ManualAppointmentFormData>({
        resolver: zodResolver(manualAppointmentSchema),
        defaultValues: {
            appointment_date: preselectedDate || format(new Date(), 'yyyy-MM-dd'),
            appointment_time: preselectedTime || '',
            duration_minutes: 30,
            type: 'presencial',
            payment_type: 'cash',
            send_sms: true,
            send_whatsapp: true,
            send_email: false,
            ignore_schedule_constraints: false,
        },
    })

    const { watch, setValue, handleSubmit, reset, formState: { errors } } = form
    const selectedDoctorId = watch('doctor_id')
    const paymentType = watch('payment_type') as ManualPaymentType

    // Initial setup for edit mode
    useEffect(() => {
        if (open && appointmentToEdit) {
            setStep('form')
            setSelectedPatient({
                id: appointmentToEdit.patient.id,
                full_name: appointmentToEdit.patient.full_name,
                phone: appointmentToEdit.patient.phone,
                // other fields map as needed
            } as any)

            reset({
                doctor_id: appointmentToEdit.doctor_id,
                appointment_date: appointmentToEdit.appointment_date,
                appointment_time: appointmentToEdit.appointment_time,
                duration_minutes: 30, // Default or calc from end_time
                type: appointmentToEdit.video_link ? 'telemedicina' : 'presencial',
                payment_type: appointmentToEdit.payment?.payment_method || 'cash',
                notes: appointmentToEdit.notes || '',
                send_sms: false, // Don't resend by default on edit
                send_whatsapp: false,
                send_email: false,
                ignore_schedule_constraints: true, // Assume valid if existing
            })
        } else if (open && !appointmentToEdit) {
            // Reset for create mode
            if (preselectedDate) setValue('appointment_date', preselectedDate)
            if (preselectedTime) setValue('appointment_time', preselectedTime)
            if (preselectedDoctorId) setValue('doctor_id', preselectedDoctorId)
        }
    }, [open, appointmentToEdit, preselectedDate, preselectedTime, preselectedDoctorId, reset, setValue])

    // Fetch doctors with caching
    const { data: doctors, isLoading: doctorsLoading } = useQuery({
        queryKey: ['doctors-for-manual'],
        queryFn: () => api.get<Doctor[]>('/doctors'),
        enabled: open,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })

    // Get selected doctor data
    const selectedDoctor = doctors?.find(d => d.id === selectedDoctorId)
    const price = selectedDoctor?.consultation_price || 0

    // Create/Update appointment mutation
    const { mutate: saveAppointment, isPending } = useMutation({
        mutationFn: async (data: ManualAppointmentFormData) => {
            const payload = {
                // ... payload construction
                patient_id: selectedPatient?.id,
                quick_registration: quickRegistration,
                doctor_id: data.doctor_id,
                appointment_date: data.appointment_date,
                appointment_time: data.appointment_time,
                duration_minutes: data.duration_minutes,
                type: data.type,
                payment: {
                    type: data.payment_type,
                    amount_paid: price,
                    health_insurance_id: data.health_insurance_id,
                    insurance_card_number: data.insurance_card_number,
                },
                overrides: data.ignore_schedule_constraints ? {
                    ignore_schedule_constraints: true,
                    reason: data.override_reason || 'Encaixe autorizado',
                } : undefined,
                notifications: {
                    send_sms: data.send_sms,
                    send_whatsapp: data.send_whatsapp,
                    send_email: data.send_email,
                },
                notes: data.notes,
            }

            let response;
            if (isEditing && appointmentToEdit) {
                response = await fetch(`/api/appointments/${appointmentToEdit.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            } else {
                response = await fetch('/api/appointments/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            }

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Erro ao salvar agendamento')
            }

            return response.json()
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Agendamento atualizado!' : 'Agendamento criado com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['appointments'] })
            handleClose()
        },
        onError: (error: Error) => {
            toast.error(error.message)
        },
    })

    // Handlers
    const handlePatientSelect = (patient: PatientSearchResult | null) => {
        setSelectedPatient(patient)
        setQuickRegistration(null)
        if (patient) {
            setStep('form')
        }
    }

    const handleCreateNewPatient = () => {
        setStep('register')
    }

    const handleQuickRegister = (data: any) => {
        setQuickRegistration(data)
        setSelectedPatient(null)
        setStep('form')
    }

    const handleBackToSearch = () => {
        setStep('search')
    }

    const handleClose = () => {
        setStep('search')
        setSelectedPatient(null)
        setQuickRegistration(null)
        form.reset()
        onOpenChange(false)
    }

    const onSubmit = (data: ManualAppointmentFormData) => {
        if (!selectedPatient && !quickRegistration && !isEditing) {
            toast.error('Selecione ou cadastre um paciente')
            setStep('search')
            return
        }
        saveAppointment(data)
    }

    // Generate time slots
    const timeSlots = Array.from({ length: 24 }, (_, hour) =>
        Array.from({ length: 2 }, (_, half) => {
            const h = hour.toString().padStart(2, '0')
            const m = (half * 30).toString().padStart(2, '0')
            return `${h}:${m}`
        })
    ).flat()

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Novo Agendamento Manual
                    </DialogTitle>
                </DialogHeader>

                {/* Step: Patient Search */}
                {step === 'search' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Paciente
                            </Label>
                            <PatientSearchCombobox
                                onSelect={handlePatientSelect}
                                onCreateNew={handleCreateNewPatient}
                            />
                        </div>

                        {selectedPatient && (
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="font-medium text-green-800">{selectedPatient.full_name}</p>
                                <p className="text-sm text-green-600">
                                    {selectedPatient.cpf || selectedPatient.phone}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Quick Registration */}
                {step === 'register' && (
                    <QuickPatientForm
                        onSubmit={handleQuickRegister}
                        onBack={handleBackToSearch}
                    />
                )}

                {/* Step: Appointment Form */}
                {step === 'form' && (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Patient Info */}
                        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                    {selectedPatient?.full_name || quickRegistration?.full_name}
                                </span>
                                {quickRegistration && (
                                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                        Novo cadastro
                                    </span>
                                )}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToSearch}
                            >
                                Trocar
                            </Button>
                        </div>

                        <Separator />

                        {/* Doctor Selection */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Stethoscope className="h-4 w-4" />
                                Médico
                            </Label>
                            <Controller
                                name="doctor_id"
                                control={form.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger className={errors.doctor_id ? 'border-destructive' : ''}>
                                            <SelectValue placeholder="Selecione o médico" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctorsLoading && (
                                                <div className="p-2 text-center">
                                                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                </div>
                                            )}
                                            {doctors?.map((doctor) => (
                                                <SelectItem key={doctor.id} value={doctor.id}>
                                                    {doctor.user.full_name} - {doctor.specialty}
                                                    {doctor.consultation_price > 0 && (
                                                        <span className="text-muted-foreground ml-2">
                                                            ({formatCurrency(doctor.consultation_price)})
                                                        </span>
                                                    )}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.doctor_id && (
                                <p className="text-xs text-destructive">{errors.doctor_id.message}</p>
                            )}
                        </div>

                        {/* Date and Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Data
                                </Label>
                                <Input
                                    type="date"
                                    {...form.register('appointment_date')}
                                    className={errors.appointment_date ? 'border-destructive' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Horário
                                </Label>
                                <Controller
                                    name="appointment_time"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className={errors.appointment_time ? 'border-destructive' : ''}>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {timeSlots.map((time) => (
                                                    <SelectItem key={time} value={time}>
                                                        {time}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Schedule Override Warning */}
                        {showScheduleWarning && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-yellow-800">
                                            Atenção: Horário fora do expediente
                                        </p>
                                        <p className="text-sm text-yellow-700">
                                            Este horário está fora do expediente padrão do médico.
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Checkbox
                                                id="override"
                                                checked={form.watch('ignore_schedule_constraints')}
                                                onCheckedChange={(checked) =>
                                                    setValue('ignore_schedule_constraints', checked as boolean)
                                                }
                                            />
                                            <Label htmlFor="override" className="text-sm cursor-pointer">
                                                Sim, é um encaixe autorizado
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Appointment Type */}
                        <div className="space-y-2">
                            <Label>Tipo de Consulta</Label>
                            <Controller
                                name="type"
                                control={form.control}
                                render={({ field }) => (
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={field.onChange}
                                        className="flex gap-4"
                                    >
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="presencial" id="presencial" />
                                            <Label htmlFor="presencial" className="flex items-center gap-1 cursor-pointer">
                                                <Building2 className="h-4 w-4" />
                                                Presencial
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <RadioGroupItem value="telemedicina" id="telemedicina" />
                                            <Label htmlFor="telemedicina" className="flex items-center gap-1 cursor-pointer">
                                                <Video className="h-4 w-4" />
                                                Telemedicina
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                )}
                            />
                        </div>

                        <Separator />

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label>Forma de Pagamento</Label>
                            <PaymentMethodSelector
                                price={price}
                                selectedType={paymentType}
                                onTypeChange={(type) => setValue('payment_type', type)}
                                selectedInsuranceId={watch('health_insurance_id')}
                                onInsuranceChange={(id) => setValue('health_insurance_id', id)}
                                insuranceCardNumber={watch('insurance_card_number')}
                                onCardNumberChange={(val) => setValue('insurance_card_number', val)}
                            />
                        </div>

                        <Separator />

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label>Observações (opcional)</Label>
                            <Textarea
                                placeholder="Motivo da consulta, observações importantes..."
                                {...form.register('notes')}
                                rows={3}
                            />
                        </div>

                        {/* Notifications */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Bell className="h-4 w-4" />
                                Notificações
                            </Label>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="send_sms"
                                        checked={form.watch('send_sms')}
                                        onCheckedChange={(checked) => setValue('send_sms', checked as boolean)}
                                    />
                                    <Label htmlFor="send_sms" className="cursor-pointer">
                                        Enviar SMS
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="send_whatsapp"
                                        checked={form.watch('send_whatsapp')}
                                        onCheckedChange={(checked) => setValue('send_whatsapp', checked as boolean)}
                                    />
                                    <Label htmlFor="send_whatsapp" className="cursor-pointer">
                                        Enviar WhatsApp
                                    </Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="send_email"
                                        checked={form.watch('send_email')}
                                        onCheckedChange={(checked) => setValue('send_email', checked as boolean)}
                                    />
                                    <Label htmlFor="send_email" className="cursor-pointer">
                                        Enviar Email
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Agendamento
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
