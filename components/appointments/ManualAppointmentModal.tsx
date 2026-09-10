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
    DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import {
    Loader2,
    Calendar,
    Clock,
    User,
    Users,
    Stethoscope,
    AlertTriangle,
    Bell,
    Video,
    Building2,
    GraduationCap,
    BookOpen,
} from 'lucide-react'
import { PatientSearchCombobox, type PatientSearchResult } from './PatientSearchCombobox'
import { QuickPatientForm } from './QuickPatientForm'
import { PaymentMethodSelector, type ManualPaymentType } from './PaymentMethodSelector'
import { AppointmentSuccessModal } from '@/components/dashboard/AppointmentSuccessModal'
import { NoShowPatientBadge } from '@/components/patients/NoShowPatientBadge'
import { formatCurrency, cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

// Types
interface Doctor {
    id: string
    specialty: string
    consultation_price: number
    consultation_duration?: number
    allows_supervision?: boolean
    specialties_additional?: string[] | null
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
    doctor_id: z.string().min(1, 'Selecione um profissional'),
    event_category: z.enum(['appointment', 'supervision', 'student']).default('appointment'),
    professional_supervised_id: z.string().optional(),
    supervision_notes: z.string().optional(),
    student_id: z.string().optional(),
    mentoring_notes: z.string().optional(),
    appointment_date: z.string().min(1, 'Selecione uma data'),
    appointment_time: z.string().min(1, 'Selecione um horário').regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Horário inválido (use HH:MM)'),
    duration_minutes: z.number().default(30),
    type: z.enum(['presencial', 'telemedicina']).default('presencial'),
    payment_type: z.string().min(1, 'Selecione forma de pagamento'),
    health_insurance_id: z.string().optional(),
    insurance_card_number: z.string().optional(),
    notes: z.string().optional(),
    send_whatsapp: z.boolean().default(true),
    send_email: z.boolean().default(true),
    ignore_schedule_constraints: z.boolean().default(false),
    override_reason: z.string().optional(),
    specialty: z.string().optional(),
    co_doctor_id: z.string().optional(),
})

type ManualAppointmentFormData = z.infer<typeof manualAppointmentSchema>

interface ManualAppointmentModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    preselectedDate?: string
    preselectedTime?: string
    preselectedDoctorId?: string
    appointmentToEdit?: any
    onSuccess?: (appointmentDate: string) => void
    isEncaixe?: boolean
}

export function ManualAppointmentModal({
    open,
    onOpenChange,
    preselectedDate,
    preselectedTime,
    preselectedDoctorId,
    appointmentToEdit,
    onSuccess,
    isEncaixe,
}: ManualAppointmentModalProps) {
    const profLabel = useProfessionalLabel()
    const queryClient = useQueryClient()
    const [step, setStep] = useState<'search' | 'register' | 'form'>('search')
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)
    const [quickRegistration, setQuickRegistration] = useState<any>(null)
    const [showScheduleWarning, setShowScheduleWarning] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)
    const [createdAppointment, setCreatedAppointment] = useState<any>(null)
    const [patientNoShowCount, setPatientNoShowCount] = useState(0)

    // Check if we are in edit mode
    const isEditing = !!appointmentToEdit

    // Form
    const form = useForm<ManualAppointmentFormData>({
        resolver: zodResolver(manualAppointmentSchema),
        defaultValues: {
            doctor_id: preselectedDoctorId || '',
            event_category: 'appointment',
            professional_supervised_id: '',
            supervision_notes: '',
            student_id: '',
            mentoring_notes: '',
            appointment_date: preselectedDate || format(new Date(), 'yyyy-MM-dd'),
            appointment_time: preselectedTime || '',
            duration_minutes: 30,
            type: 'presencial',
            payment_type: 'cash',
            send_whatsapp: true,
            send_email: true,
            ignore_schedule_constraints: false,
            specialty: '',
            notes: '',
            co_doctor_id: '',
        },
    })

    const { watch, setValue, handleSubmit, reset, formState: { errors } } = form
    const selectedDoctorId = watch('doctor_id')
    const eventCategory = watch('event_category')
    const isSupervision = eventCategory === 'supervision'
    const isStudent = eventCategory === 'student'
    const isNonPatient = isSupervision || isStudent
    const paymentType = watch('payment_type') as ManualPaymentType

    // Student quick creation state
    const [isCreateStudentOpen, setIsCreateStudentOpen] = useState(false)
    const [newStudentName, setNewStudentName] = useState('')
    const [newStudentPhone, setNewStudentPhone] = useState('')
    const [newStudentEmail, setNewStudentEmail] = useState('')
    const [newStudentProgram, setNewStudentProgram] = useState('')
    const [isSavingStudent, setIsSavingStudent] = useState(false)

    // Fetch active students for this clinic
    const { data: students, refetch: refetchStudents } = useQuery({
        queryKey: ['students-active'],
        queryFn: async () => {
            const res = await fetch('/api/students?status=active&limit=100')
            const json = await res.json()
            return (json.data || []) as any[]
        },
        enabled: open,
        staleTime: 60 * 1000,
    })

    const handleCreateStudent = async () => {
        const trimmedName = newStudentName.trim()
        if (!trimmedName) {
            toast.error('Informe o nome da aluna')
            return
        }

        try {
            setIsSavingStudent(true)
            const res = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: trimmedName,
                    contact_phone: newStudentPhone || undefined,
                    contact_email: newStudentEmail || undefined,
                    program: newStudentProgram || undefined,
                    supervising_doctor_id: selectedDoctorId || undefined,
                })
            })

            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Erro ao cadastrar aluna')
            }

            toast.success(`Aluna ${json.data.full_name} cadastrada com sucesso!`)
            await refetchStudents()
            setValue('student_id', json.data.id)
            setIsCreateStudentOpen(false)
            setNewStudentName('')
            setNewStudentPhone('')
            setNewStudentEmail('')
            setNewStudentProgram('')
        } catch (err: any) {
            toast.error(err.message || 'Erro ao cadastrar aluna')
        } finally {
            setIsSavingStudent(false)
        }
    }

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

            let editingSpecialty = ''
            if (appointmentToEdit.reception_notes && appointmentToEdit.reception_notes.startsWith('[ESP:')) {
                const match = appointmentToEdit.reception_notes.match(/^\[ESP:([^\]]+)\]/)
                if (match) editingSpecialty = match[1]
            }

            reset({
                doctor_id: appointmentToEdit.doctor_id,
                appointment_date: appointmentToEdit.appointment_date,
                appointment_time: appointmentToEdit.appointment_time,
                duration_minutes: 30, // Default or calc from end_time
                type: appointmentToEdit.video_link ? 'telemedicina' : 'presencial',
                payment_type: appointmentToEdit.payment?.payment_method || 'cash',
                notes: appointmentToEdit.notes || '',
                send_whatsapp: false,
                send_email: false,
                ignore_schedule_constraints: true, // Assume valid if existing
                specialty: editingSpecialty || appointmentToEdit.doctor?.specialty || '',
                co_doctor_id: appointmentToEdit.co_doctor_id || '',
            })
        } else if (open && !appointmentToEdit) {
            // Reset for create mode
            if (preselectedDate) setValue('appointment_date', preselectedDate)
            if (preselectedTime) setValue('appointment_time', preselectedTime)
            if (preselectedDoctorId) setValue('doctor_id', preselectedDoctorId)
            setValue('ignore_schedule_constraints', !!isEncaixe)
            if (isEncaixe) setValue('override_reason', 'Encaixe de Emergência / Extra')
        }
    }, [open, appointmentToEdit, preselectedDate, preselectedTime, preselectedDoctorId, isEncaixe, reset, setValue])

    // Fetch doctors with caching
    const { data: doctors, isLoading: doctorsLoading, error: doctorsError } = useQuery({
        queryKey: ['doctors', 'manual'],
        queryFn: async () => {
            console.log('[ManualAppointment] Fetching doctors...');
            const result = await api.get<Doctor[]>('/doctors');
            console.log('[ManualAppointment] Doctors result:', result);
            return result;
        },
        enabled: open,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    })

    // Fetch health insurances for payment selector
    const { data: healthInsurancesRes } = useQuery({
        queryKey: ['health-insurances', 'manual'],
        queryFn: async () => {
            const res = await api.getFull<HealthInsurance[]>('/health-insurances', { status: 'ACTIVE', pageSize: '100' })
            return res?.data || []
        },
        enabled: open,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    })
    const healthInsurances = healthInsurancesRes || []

    // Get selected doctor data
    const selectedDoctor = doctors?.find(d => d.id === selectedDoctorId)
    const price = selectedDoctor?.consultation_price || 0

    const specialtiesList = (() => {
        if (!selectedDoctor) return []
        const list = [selectedDoctor.specialty]
        if (selectedDoctor.specialties_additional && Array.isArray(selectedDoctor.specialties_additional)) {
            selectedDoctor.specialties_additional.forEach((spec) => {
                const trimmed = spec?.trim()
                if (trimmed && !list.includes(trimmed)) {
                    list.push(trimmed)
                }
            })
        }
        return list.filter(Boolean)
    })()

    // Automatically set specialty when selectedDoctor changes
    useEffect(() => {
        if (selectedDoctor) {
            let defaultSpec = selectedDoctor.specialty
            if (isEditing && appointmentToEdit) {
                if (appointmentToEdit.reception_notes && appointmentToEdit.reception_notes.startsWith('[ESP:')) {
                    const match = appointmentToEdit.reception_notes.match(/^\[ESP:([^\]]+)\]/)
                    if (match) {
                        defaultSpec = match[1]
                    }
                }
            }
            setValue('specialty', defaultSpec)
            if (selectedDoctor.consultation_duration) {
                setValue('duration_minutes', selectedDoctor.consultation_duration)
            }
        } else {
            setValue('specialty', '')
        }
    }, [selectedDoctor, setValue, isEditing, appointmentToEdit])

    // Create/Update appointment mutation
    const { mutate: saveAppointment, isPending } = useMutation({
        mutationFn: async (data: ManualAppointmentFormData) => {
            const cleanCoDoctorId = data.co_doctor_id && data.co_doctor_id !== 'none' && data.co_doctor_id !== data.doctor_id
                ? data.co_doctor_id
                : null

            let payload: any = {}
            if (data.event_category === 'student') {
                payload = {
                    doctor_id: data.doctor_id,
                    is_student: true,
                    student_id: data.student_id,
                    mentoring_notes: data.mentoring_notes || undefined,
                    appointment_date: data.appointment_date,
                    appointment_time: data.appointment_time,
                    duration_minutes: data.duration_minutes,
                    type: data.type,
                    notes: data.notes || data.mentoring_notes,
                    specialty: data.specialty,
                    payment: {
                        type: 'particular',
                    },
                    overrides: data.ignore_schedule_constraints ? {
                        ignore_schedule_constraints: true,
                        reason: data.override_reason || 'Mentoria / Aluna autorizada',
                    } : undefined,
                }
            } else if (data.event_category === 'supervision') {
                payload = {
                    doctor_id: data.doctor_id,
                    is_supervision: true,
                    professional_supervised_id: data.professional_supervised_id || undefined,
                    supervision_notes: data.supervision_notes || undefined,
                    appointment_date: data.appointment_date,
                    appointment_time: data.appointment_time,
                    duration_minutes: data.duration_minutes,
                    type: data.type,
                    notes: data.notes || data.supervision_notes,
                    specialty: data.specialty,
                    payment: {
                        type: 'particular',
                    },
                    overrides: data.ignore_schedule_constraints ? {
                        ignore_schedule_constraints: true,
                        reason: data.override_reason || 'Supervisão técnica autorizada',
                    } : undefined,
                }
            } else {
                payload = {
                    patient_id: selectedPatient?.id,
                    quick_registration: quickRegistration,
                    doctor_id: data.doctor_id,
                    co_doctor_id: cleanCoDoctorId || undefined,
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
                        send_whatsapp: data.send_whatsapp,
                        send_email: data.send_email,
                    },
                    notes: data.notes,
                    specialty: data.specialty,
                }
            }

            let response;
            if (isEditing && appointmentToEdit) {
                // PATCH uses updateAppointmentSchema - map fields correctly
                const patchPayload: Record<string, unknown> = {
                    appointment_date: data.appointment_date,
                    appointment_time: data.appointment_time,
                    appointment_type: data.type === 'telemedicina' ? 'online' : 'presencial',
                    notes: data.notes,
                    reception_notes: data.specialty ? `[ESP:${data.specialty}]` : null,
                    co_doctor_id: cleanCoDoctorId,
                }
                response = await fetch(`/api/appointments/${appointmentToEdit.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patchPayload),
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
        onSuccess: (data) => {
            if (isEditing) {
                toast.success('Agendamento atualizado!')
            } else {
                // Store appointment data and show success modal
                setCreatedAppointment(data.appointment)
                setShowSuccessModal(true)
                toast.success('Agendamento criado com sucesso!')
                // Notify parent to navigate agenda to created appointment date
                onSuccess?.(data.appointment.appointment_date)
            }
            queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false })
            // Only close if editing (success modal handles closing for new appointments)
            if (isEditing) {
                handleClose()
            }
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
            // Fetch patient no-show stats
            fetch(`/api/patients/${patient.id}/noshow-stats`)
                .then(res => res.json())
                .then(data => {
                    if (data.total_no_shows) {
                        setPatientNoShowCount(data.total_no_shows)
                    }
                })
                .catch(err => console.error('Error fetching patient stats:', err))
        } else {
            setPatientNoShowCount(0)
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
        setShowSuccessModal(false)
        setCreatedAppointment(null)
        form.reset()
        onOpenChange(false)
    }

    const onSubmit = (data: ManualAppointmentFormData) => {
        if (data.event_category !== 'supervision' && data.event_category !== 'student' && !selectedPatient && !quickRegistration && !isEditing) {
            toast.error('Selecione ou cadastre um paciente')
            setStep('search')
            return
        }
        if (data.event_category === 'supervision' && !data.professional_supervised_id) {
            toast.error('Selecione o profissional que receberá a supervisão')
            return
        }
        if (data.event_category === 'student' && !data.student_id) {
            toast.error('Selecione ou cadastre a aluna')
            return
        }
        saveAppointment(data)
    }


    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {isStudent ? (
                                <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                            ) : isSupervision ? (
                                <GraduationCap className="h-5 w-5 text-indigo-600" />
                            ) : (
                                <Calendar className="h-5 w-5" />
                            )}
                            {isStudent 
                                ? 'Sessão com Aluna / Mentoria' 
                                : isSupervision 
                                    ? 'Nova Supervisão Técnica / Clínica' 
                                    : isEditing 
                                        ? 'Editar Agendamento' 
                                        : isEncaixe 
                                            ? 'Encaixe Extra / Emergência' 
                                            : 'Novo Agendamento Manual'}
                        </DialogTitle>
                        <DialogDescription>
                            {isStudent
                                ? 'Agende uma sessão formativa, mentoria técnica ou de estágio com aluna (sem prontuário de paciente).'
                                : isSupervision
                                    ? 'Agende uma sessão interna de mentoria ou supervisão técnica entre profissionais da clínica.'
                                    : isEncaixe 
                                        ? `Crie um encaixe que ignora bloqueios ou limite de horários do ${profLabel.singular.toLowerCase()}. Confirme com o profissional antes de realizar o encaixe.`
                                        : `Crie um agendamento manual selecionando o paciente, ${profLabel.singular.toLowerCase()} e horário desejado.`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step: Patient Search */}
                    {step === 'search' && (
                        <div className="space-y-4">
                            {/* Banner de Mentoria / Formacao */}
                            <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    <BookOpen className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                                            Mentoria Clínica / Formação Técnica
                                        </p>
                                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                            Sessão formativa ou mentoria técnica (sem vínculo com paciente nem prontuário clínico).
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-100/60 dark:text-emerald-300 shrink-0"
                                    onClick={() => {
                                        if (selectedDoctorId) {
                                            setValue('doctor_id', selectedDoctorId)
                                        } else if (doctors && doctors.length > 0) {
                                            setValue('doctor_id', doctors[0].id)
                                        }
                                        setValue('event_category', 'student')
                                        setStep('form')
                                    }}
                                >
                                    Agendar Mentoria
                                </Button>
                            </div>

                            {doctors?.some(d => d.allows_supervision) && (
                                <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <GraduationCap className="h-5 w-5 text-indigo-700 dark:text-indigo-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                                                Supervisão Técnica / Clínica
                                            </p>
                                            <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                                                Reunião técnica ou mentoria interna entre terapeutas (sem paciente).
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs font-semibold border-indigo-300 text-indigo-800 hover:bg-indigo-100/60 dark:text-indigo-300 shrink-0"
                                        onClick={() => {
                                            const supervisor = (selectedDoctorId && doctors.find(d => d.id === selectedDoctorId && d.allows_supervision)) || doctors.find(d => d.allows_supervision)
                                            if (supervisor) {
                                                setValue('doctor_id', supervisor.id)
                                            }
                                            setValue('event_category', 'supervision')
                                            setStep('form')
                                        }}
                                    >
                                        Registrar Supervisão
                                    </Button>
                                </div>
                            )}

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
                            {/* Modalidade / Categoria do Evento */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Modalidade do Registro
                                </Label>
                                <RadioGroup
                                    value={eventCategory}
                                    onValueChange={(val: 'appointment' | 'supervision' | 'student') => {
                                        setValue('event_category', val)
                                        if (val === 'appointment' && !selectedPatient && !quickRegistration) {
                                            setStep('search')
                                        }
                                    }}
                                    className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                                >
                                    <div className={cn(
                                        "flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer transition-colors",
                                        eventCategory === 'appointment' ? "border-primary bg-primary/5 text-primary font-semibold" : "border-slate-200 bg-white dark:bg-slate-900 text-muted-foreground"
                                    )}>
                                        <RadioGroupItem value="appointment" id="cat-appointment" />
                                        <Label htmlFor="cat-appointment" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" />
                                            Atendimento a Paciente
                                        </Label>
                                    </div>
                                    <div className={cn(
                                        "flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer transition-colors",
                                        eventCategory === 'student' ? "border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold" : "border-slate-200 bg-white dark:bg-slate-900 text-muted-foreground"
                                    )}>
                                        <RadioGroupItem value="student" id="cat-student" />
                                        <Label htmlFor="cat-student" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                            <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                                            Mentoria / Formação
                                        </Label>
                                    </div>
                                    {selectedDoctor?.allows_supervision && (
                                        <div className={cn(
                                            "flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer transition-colors",
                                            eventCategory === 'supervision' ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 font-semibold" : "border-slate-200 bg-white dark:bg-slate-900 text-muted-foreground"
                                        )}>
                                            <RadioGroupItem value="supervision" id="cat-supervision" />
                                            <Label htmlFor="cat-supervision" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                                                <GraduationCap className="h-3.5 w-3.5 text-indigo-600" />
                                                Supervisão Técnica
                                            </Label>
                                        </div>
                                    )}
                                </RadioGroup>
                            </div>

                            {/* Patient Info or Supervision/Student Banner */}
                            {isStudent ? (
                                <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/40 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                                                Mentoria Clínica / Formação Técnica
                                            </p>
                                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                                Sessão formativa ou mentoria de pós/estágio. Não gera cobrança nem prontuário clínico de paciente.
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
                                        Mentoria
                                    </Badge>
                                </div>
                            ) : isSupervision ? (
                                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/25 border border-indigo-200/70 dark:border-indigo-900/40 rounded-xl flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <GraduationCap className="h-4 w-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                                                Supervisão Técnica / Clínica
                                            </p>
                                            <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                                                Sessão interna de orientação e supervisão de caso clínico. Não gera cobrança nem prontuário de paciente.
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/50 dark:text-indigo-300">
                                        Supervisão
                                    </Badge>
                                </div>
                            ) : (
                                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">
                                            {selectedPatient?.full_name || quickRegistration?.full_name}
                                        </span>
                                        {quickRegistration && (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                                Novo cadastro
                                            </span>
                                        )}
                                        {patientNoShowCount >= 3 && (
                                            <NoShowPatientBadge noShowCount={patientNoShowCount} />
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
                            )}

                            <Separator />

                            {/* Doctor / Professional Selection */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4" />
                                    {profLabel.singular}
                                </Label>
                                <Controller
                                    name="doctor_id"
                                    control={form.control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <SelectTrigger className={errors.doctor_id ? 'border-destructive' : ''}>
                                                <SelectValue placeholder={`Selecione o ${profLabel.singular.toLowerCase()}`} />
                                            </SelectTrigger>
                                            <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                {doctorsLoading && (
                                                    <div className="p-2 text-center">
                                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                                    </div>
                                                )}
                                                {doctorsError && (
                                                    <div className="p-2 text-center text-sm text-destructive">
                                                        Erro ao carregar {profLabel.plural.toLowerCase()}
                                                    </div>
                                                )}
                                                {!doctorsLoading && !doctorsError && doctors && doctors.length === 0 && (
                                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                                        Nenhum {profLabel.singular.toLowerCase()} cadastrado
                                                    </div>
                                                )}
                                                {doctors?.filter(d => d.id && d.user).map((doctor) => (
                                                    <SelectItem key={doctor.id} value={doctor.id}>
                                                        {doctor.user?.full_name || profLabel.singular} - {doctor.specialty}
                                                        {doctor.consultation_price > 0 && !isNonPatient && (
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

                            {/* Specialty Selection */}
                            {selectedDoctor && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Stethoscope className="h-4 w-4" />
                                        Especialidade do Atendimento
                                    </Label>
                                    <Controller
                                        name="specialty"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select 
                                                onValueChange={field.onChange} 
                                                value={field.value || selectedDoctor.specialty || ''}
                                                disabled={specialtiesList.length <= 1}
                                            >
                                                <SelectTrigger className="w-full h-11 text-base md:h-10 md:text-sm">
                                                    <SelectValue placeholder="Selecione a especialidade" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                    {specialtiesList.map((spec) => (
                                                        <SelectItem key={spec} value={spec}>
                                                            {spec}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Mentoria / Mentorando(a) Selection (apenas em modo Mentoria) */}
                            {isStudent && (
                                <div className="space-y-3 p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-emerald-950 dark:text-emerald-200 font-semibold">
                                            <BookOpen className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                                            Mentorando(a) / Formando(a) Cadastrado(a) *
                                        </Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/70 dark:text-emerald-300"
                                            onClick={() => setIsCreateStudentOpen(true)}
                                        >
                                            + Novo(a) Mentorando(a)
                                        </Button>
                                    </div>
                                    <Controller
                                        name="student_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="w-full h-11 text-base md:h-10 md:text-sm border-emerald-300">
                                                    <SelectValue placeholder="Selecione o(a) mentorando(a) / formando(a)" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                    {(!students || students.length === 0) ? (
                                                        <div className="p-3 text-center text-xs text-muted-foreground">
                                                            Nenhum(a) mentorando(a) cadastrado(a). Clique em &quot;+ Novo(a) Mentorando(a)&quot; acima.
                                                        </div>
                                                    ) : (
                                                        students.map((st: any) => (
                                                             <SelectItem key={st.id} value={st.id}>
                                                                 {st.full_name} {st.program ? `(${st.program})` : ''}
                                                             </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.student_id && (
                                        <p className="text-xs text-destructive">{errors.student_id.message}</p>
                                    )}

                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-xs text-emerald-950 dark:text-emerald-200 font-medium">
                                            Pauta / Anotações da Mentoria
                                        </Label>
                                        <Textarea
                                            placeholder="Tema da mentoria, plano de estudos, dúvidas técnicas ou pauta do encontro..."
                                            {...form.register('mentoring_notes')}
                                            rows={3}
                                            className="border-emerald-200 bg-white dark:bg-slate-900"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Co-Doctor / Co-Therapist Selection (Optional, only for patient appointments) */}
                            {!isNonPatient && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-muted-foreground font-normal">
                                        <Users className="h-4 w-4" />
                                        Co-Terapeuta / 2º Profissional (Opcional)
                                    </Label>
                                    <Controller
                                        name="co_doctor_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select 
                                                onValueChange={(val) => field.onChange(val === 'none' ? '' : val)} 
                                                value={field.value || 'none'}
                                            >
                                                <SelectTrigger className="w-full h-11 text-base md:h-10 md:text-sm">
                                                    <SelectValue placeholder="Nenhum (atendimento individual)" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                    <SelectItem value="none">Nenhum (atendimento individual)</SelectItem>
                                                    {doctors?.filter(d => d.id && d.user && d.id !== selectedDoctorId).map((doctor) => (
                                                        <SelectItem key={doctor.id} value={doctor.id}>
                                                            {doctor.user?.full_name || profLabel.singular} - {doctor.specialty}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Permite que dois profissionais atendam simultaneamente na mesma sessão sem conflito de horário.
                                    </p>
                                </div>
                            )}

                            {/* Profissional Supervisionado (apenas em modo Supervisão) */}
                            {isSupervision && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-semibold">
                                        <Users className="h-4 w-4 text-indigo-700" />
                                        Profissional Supervisionado (Terapeuta / Mentorando)
                                    </Label>
                                    <Controller
                                        name="professional_supervised_id"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="w-full h-11 text-base md:h-10 md:text-sm border-indigo-300">
                                                    <SelectValue placeholder="Selecione o terapeuta supervisionado" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                                                    {doctors?.filter(d => d.id && d.user && d.id !== selectedDoctorId).map((doc) => (
                                                        <SelectItem key={doc.id} value={doc.id}>
                                                            {doc.user?.full_name} - {doc.specialty}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Terapeuta da equipe que participará desta sessão de supervisão clínica.
                                    </p>
                                </div>
                            )}

                            {/* Pauta / Anotações da Supervisão */}
                            {isSupervision && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 font-semibold">
                                        <BookOpen className="h-4 w-4 text-indigo-700" />
                                        Pauta / Anotações da Supervisão
                                    </Label>
                                    <Textarea
                                        placeholder="Descreva a pauta, casos a discutir ou alinhamento técnico..."
                                        {...form.register('supervision_notes')}
                                        rows={3}
                                        className="border-indigo-200"
                                    />
                                </div>
                            )}

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
                                        Horário (HH:MM)
                                    </Label>
                                    <Input
                                        type="time"
                                        step="60"
                                        {...form.register('appointment_time')}
                                        className={errors.appointment_time ? 'border-destructive' : ''}
                                    />
                                    {errors.appointment_time && (
                                        <p className="text-xs text-destructive">{errors.appointment_time.message}</p>
                                    )}
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
                                                Este horário está fora do expediente padrão do {profLabel.singular.toLowerCase()}.
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

                            {/* Payment Method (Apenas para consultas de pacientes) */}
                            {!isNonPatient && (
                                <>
                                    <Separator />
                                    <div className="space-y-2">
                                        <Label>Forma de Pagamento</Label>
                                        <PaymentMethodSelector
                                            price={price}
                                            selectedType={paymentType}
                                            onTypeChange={(type) => setValue('payment_type', type)}
                                            healthInsurances={healthInsurances}
                                            selectedInsuranceId={watch('health_insurance_id')}
                                            onInsuranceChange={(id) => setValue('health_insurance_id', id)}
                                            insuranceCardNumber={watch('insurance_card_number')}
                                            onCardNumberChange={(val) => setValue('insurance_card_number', val)}
                                        />
                                    </div>
                                </>
                            )}

                            {!isNonPatient && (
                                <div className="space-y-2">
                                    <Label>Observações (opcional)</Label>
                                    <Textarea
                                        placeholder="Motivo da consulta, observações importantes..."
                                        {...form.register('notes')}
                                        rows={3}
                                    />
                                </div>
                            )}

                            {/* Notifications (Apenas para pacientes) */}
                            {!isNonPatient && (
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Bell className="h-4 w-4" />
                                        Notificações
                                    </Label>
                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="send_whatsapp"
                                                checked={form.watch('send_whatsapp')}
                                                onCheckedChange={(checked) => setValue('send_whatsapp', checked as boolean)}
                                            />
                                            <Label htmlFor="send_whatsapp" className="cursor-pointer">
                                                Compartilhar no WhatsApp
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
                            )}

                            <Separator />

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Cancelar
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isPending} 
                                    className={
                                        isStudent 
                                            ? "bg-emerald-700 hover:bg-emerald-800 text-white" 
                                            : isSupervision 
                                                ? "bg-indigo-700 hover:bg-indigo-800 text-white" 
                                                : ""
                                    }
                                >
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isStudent ? 'Confirmar Sessão de Mentoria' : isSupervision ? 'Confirmar Supervisão Técnica' : 'Confirmar Agendamento'}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal Inline: Novo(a) Mentorando(a) */}
            <Dialog open={isCreateStudentOpen} onOpenChange={setIsCreateStudentOpen}>
                <DialogContent className="max-w-md z-[10000]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="h-4 w-4 text-emerald-700" />
                            Cadastrar Novo(a) Mentorando(a) / Formando(a)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Cadastre o(a) participante para agendamento de mentoria ou formação. Registro próprio e isolado de pacientes.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs">Nome Completo *</Label>
                            <Input
                                placeholder="Nome do(a) mentorando(a)"
                                value={newStudentName}
                                onChange={(e) => setNewStudentName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Telefone / WhatsApp</Label>
                                <Input
                                    placeholder="(00) 00000-0000"
                                    value={newStudentPhone}
                                    onChange={(e) => setNewStudentPhone(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">E-mail</Label>
                                <Input
                                    type="email"
                                    placeholder="mentorando@email.com"
                                    value={newStudentEmail}
                                    onChange={(e) => setNewStudentEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">Programa / Curso / Especialização (opcional)</Label>
                            <Input
                                placeholder="Ex: Pós-graduação em Neuropsicologia, Formação Clínica 2026..."
                                value={newStudentProgram}
                                onChange={(e) => setNewStudentProgram(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateStudentOpen(false)}
                            disabled={isSavingStudent}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800 text-white"
                            onClick={handleCreateStudent}
                            disabled={isSavingStudent}
                        >
                            {isSavingStudent && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Salvar Mentorando(a)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Success Modal with QR Code */}
            <AppointmentSuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false)
                    setCreatedAppointment(null)
                    handleClose()
                }}
                appointment={createdAppointment}
            />
        </>
    )
}
